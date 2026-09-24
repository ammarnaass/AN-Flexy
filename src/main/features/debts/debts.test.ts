import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { users } from '@main/features/auth'
import { createOperatorsFeature } from '@main/features/operators'
import { createStockFeature } from '@main/features/stock'
import { createSalesFeature } from '@main/features/sales'
import { createCustomersFeature } from '@main/features/customers'
import { createDebtsFeature } from '@main/features/debts'
import { openTestDb } from '@main/core/db/testDb'
import { DEBTS_ERRORS } from '@shared/contracts/debts'
import { auditLog } from '@main/core/audit/audit.schema'
import type { SessionUser } from '@shared/contracts/auth'
import type { AppError } from '@main/core/errors'

function expectAppError(fn: () => unknown): AppError {
  try {
    fn()
  } catch (err) {
    expect((err as AppError).name).toBe('AppError')
    return err as AppError
  }
  throw new Error('expected AppError but nothing was thrown')
}

const PHONE = '0555123456'

// سلسلة اعتمادات حقيقية (قاعدة في الذاكرة) لا محاكاة (RULES 11.5).
describe('debts.service — الديون والدفعات (PRD §8, FR-07)', () => {
  let t: ReturnType<typeof openTestDb>
  let operators: ReturnType<typeof createOperatorsFeature>['api']
  let stock: ReturnType<typeof createStockFeature>['api']
  let sales: ReturnType<typeof createSalesFeature>['api']
  let customersApi: ReturnType<typeof createCustomersFeature>['api']
  let debts: ReturnType<typeof createDebtsFeature>['api']
  let owner: SessionUser
  let opId: number
  let custId: number

  beforeEach(() => {
    t = openTestDb()
    operators = createOperatorsFeature({ db: t.db, audit: t.audit }).api
    stock = createStockFeature({ db: t.db, audit: t.audit, operators }).api
    customersApi = createCustomersFeature({ db: t.db, audit: t.audit }).api
    sales = createSalesFeature({ db: t.db, audit: t.audit, operators, stock }).api
    debts = createDebtsFeature({ db: t.db, audit: t.audit, customers: customersApi }).api

    const u = t.db.insert(users).values({ name: 'ammar', role: 'admin', pinHash: 'x' }).returning().get()
    owner = { id: u.id, name: u.name, role: 'admin' }
    opId = operators.create({ name: 'Mobilis', marginBp: 1000, lowBalanceAt: 0 }, owner).id
    custId = customersApi.create({ name: 'أحمد' }, owner).id

    // شحن رصيد كافٍ.
    stock.addPurchase({ operatorId: opId, costAmount: 0, creditAmount: 500_000 }, owner)
  })

  afterEach(() => t.close())

  it('بيع بدين → الدين يظهر في القائمة', () => {
    // بيع 10,000 سنتيم مدفوع 4,000 = دين 6,000.
    sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 10_000, paidAmount: 4_000, customerId: custId },
      owner,
    )
    const debt = debts.getCustomerDebt(custId)
    expect(debt).toBe(6_000)

    const debtors = debts.listDebtors(50)
    expect(debtors.length).toBe(1)
    expect(debtors[0]!.customerId).toBe(custId)
    expect(debtors[0]!.totalDebt).toBe(6_000)
  })

  it('دفعة جزئية تنقص الدين', () => {
    sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 10_000, paidAmount: 2_000, customerId: custId },
      owner,
    )
    // دين = 8000.
    debts.addPayment({ customerId: custId, amount: 3_000 }, owner)
    expect(debts.getCustomerDebt(custId)).toBe(5_000)
  })

  it('دفعة كاملة تزيل الزبون من قائمة المدينين', () => {
    sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 10_000, paidAmount: 5_000, customerId: custId },
      owner,
    )
    // دين = 5000.
    debts.addPayment({ customerId: custId, amount: 5_000 }, owner)
    expect(debts.getCustomerDebt(custId)).toBe(0)

    const debtors = debts.listDebtors(50)
    expect(debtors.length).toBe(0)
  })

  it('دفعة أكبر من الدين → PAYMENT_EXCEEDS_DEBT', () => {
    sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 10_000, paidAmount: 7_000, customerId: custId },
      owner,
    )
    // دين = 3000.
    const err = expectAppError(() => debts.addPayment({ customerId: custId, amount: 5_000 }, owner))
    expect(err.code).toBe(DEBTS_ERRORS.PAYMENT_EXCEEDS_DEBT)
  })

  it('إلغاء بيع آجل ينقص الدين', () => {
    const sale = sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 10_000, paidAmount: 3_000, customerId: custId },
      owner,
    )
    // دين = 7000.
    expect(debts.getCustomerDebt(custId)).toBe(7_000)

    sales.voidSale({ id: sale.id, reason: 'خطأ' }, owner)
    // الملغى يُستبعد → دين = 0.
    expect(debts.getCustomerDebt(custId)).toBe(0)
  })

  it('عدة ديون من مبيعات مختلطة تُجمع صحيحًا', () => {
    // بيع 1: 10,000 مدفوع 6,000 = دين 4,000.
    sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 10_000, paidAmount: 6_000, customerId: custId },
      owner,
    )
    // بيع 2: 20,000 مدفوع 15,000 = دين 5,000.
    sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 20_000, paidAmount: 15_000, customerId: custId },
      owner,
    )
    // بيع 3: مدفوع بالكامل = دين 0.
    sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 5_000, paidAmount: 5_000, customerId: custId },
      owner,
    )
    // إجمالي الدين: 4000 + 5000 = 9000.
    expect(debts.getCustomerDebt(custId)).toBe(9_000)

    // دفعة 3000 → دين 6000.
    debts.addPayment({ customerId: custId, amount: 3_000 }, owner)
    expect(debts.getCustomerDebt(custId)).toBe(6_000)
  })

  it('قائمة الدفعات لزبون', () => {
    sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 20_000, paidAmount: 5_000, customerId: custId },
      owner,
    )
    debts.addPayment({ customerId: custId, amount: 3_000 }, owner)
    debts.addPayment({ customerId: custId, amount: 2_000 }, owner)

    const paymentsList = debts.listPayments({ customerId: custId, limit: 50 })
    expect(paymentsList.length).toBe(2)
    // الأحدث أولًا.
    expect(paymentsList[0]!.amount).toBe(2_000)
  })

  it('كل دفعة تسجّل تدقيقًا (RULES 9)', () => {
    sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 10_000, paidAmount: 5_000, customerId: custId },
      owner,
    )
    debts.addPayment({ customerId: custId, amount: 3_000 }, owner)
    const actions = t.db.select({ action: auditLog.action }).from(auditLog).all().map((r) => r.action)
    expect(actions).toContain('debts.payment')
  })
})
