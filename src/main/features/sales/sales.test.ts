import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { users } from '@main/features/auth'
import { createOperatorsFeature } from '@main/features/operators'
import { createStockFeature } from '@main/features/stock'
import { createSalesFeature } from '@main/features/sales'
import { openTestDb } from '@main/core/db/testDb'
import { SALES_ERRORS } from '@shared/contracts/sales'
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

describe('sales.service — رصيد وبيع وإلغاء (PRD §8)', () => {
  let t: ReturnType<typeof openTestDb>
  let operators: ReturnType<typeof createOperatorsFeature>['api']
  let stock: ReturnType<typeof createStockFeature>['api']
  let sales: ReturnType<typeof createSalesFeature>['api']
  let owner: SessionUser
  let opId: number

  beforeEach(() => {
    t = openTestDb()
    operators = createOperatorsFeature({ db: t.db, audit: t.audit }).api
    stock = createStockFeature({ db: t.db, audit: t.audit, operators }).api
    sales = createSalesFeature({ db: t.db, audit: t.audit, operators, stock }).api

    const u = t.db.insert(users).values({ name: 'ammar', role: 'admin', pinHash: 'x' }).returning().get()
    owner = { id: u.id, name: u.name, role: 'admin' }
    // هامش 10% = 1000 نقطة أساس.
    opId = operators.create({ name: 'Mobilis', marginBp: 1000, lowBalanceAt: 0 }, owner).id
  })

  afterEach(() => t.close())

  function balance(): number {
    return sales.getOperatorBalance(opId)!.balance
  }

  it('شحن ثم بيع → الرصيد ينقص بمبلغ البيع فقط', () => {
    stock.addPurchase({ operatorId: opId, costAmount: 50_000, creditAmount: 100_000 }, owner)
    expect(balance()).toBe(100_000)

    const sale = sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 20_000, paidAmount: 20_000 },
      owner,
    )
    expect(sale.profit).toBe(2_000) // round(20000 * 1000 / 10000)
    expect(balance()).toBe(80_000)
  })

  it('رصيد غير كافٍ → INSUFFICIENT_BALANCE ولا تُسجَّل العملية', () => {
    stock.addPurchase({ operatorId: opId, costAmount: 0, creditAmount: 10_000 }, owner)
    const err = expectAppError(() =>
      sales.createSale(
        { operatorId: opId, targetPhone: PHONE, amount: 50_000, paidAmount: 50_000 },
        owner,
      ),
    )
    expect(err.code).toBe(SALES_ERRORS.INSUFFICIENT_BALANCE)
    expect(balance()).toBe(10_000)
  })

  it('إلغاء البيع يعيد الرصيد (sold يستثني الملغاة)', () => {
    stock.addPurchase({ operatorId: opId, costAmount: 0, creditAmount: 100_000 }, owner)
    const sale = sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 30_000, paidAmount: 30_000 },
      owner,
    )
    expect(balance()).toBe(70_000)

    const voided = sales.voidSale({ id: sale.id, reason: 'خطأ من الكاشير' }, owner)
    expect(voided.voidedAt).not.toBeNull()
    expect(balance()).toBe(100_000)
  })

  it('إلغاء مرتين → SALE_ALREADY_VOIDED', () => {
    stock.addPurchase({ operatorId: opId, costAmount: 0, creditAmount: 100_000 }, owner)
    const sale = sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 5_000, paidAmount: 5_000 },
      owner,
    )
    sales.voidSale({ id: sale.id, reason: 'سبب' }, owner)
    const err = expectAppError(() => sales.voidSale({ id: sale.id, reason: 'سبب آخر' }, owner))
    expect(err.code).toBe(SALES_ERRORS.SALE_ALREADY_VOIDED)
  })

  it('بيع بالدين بلا عميل → DEBT_REQUIRES_CUSTOMER', () => {
    stock.addPurchase({ operatorId: opId, costAmount: 0, creditAmount: 100_000 }, owner)
    const err = expectAppError(() =>
      sales.createSale(
        { operatorId: opId, targetPhone: PHONE, amount: 10_000, paidAmount: 4_000 },
        owner,
      ),
    )
    expect(err.code).toBe(SALES_ERRORS.DEBT_REQUIRES_CUSTOMER)
  })

  it('التسوية (delta سالب) تعدّل الرصيد مع سبب إلزامي', () => {
    stock.addPurchase({ operatorId: opId, costAmount: 0, creditAmount: 100_000 }, owner)
    stock.addSettlement({ operatorId: opId, delta: -30_000, reason: 'فرع مع المتعامل' }, owner)
    expect(balance()).toBe(70_000)
  })

  it('متعامل غير موجود → OPERATOR_NOT_FOUND', () => {
    const err = expectAppError(() =>
      sales.createSale(
        { operatorId: 999, targetPhone: PHONE, amount: 1_000, paidAmount: 1_000 },
        owner,
      ),
    )
    expect(err.code).toBe(SALES_ERRORS.OPERATOR_NOT_FOUND)
  })

  it('كل عملية بيع/إلغاء تسجّل تدقيقًا (RULES 9)', () => {
    stock.addPurchase({ operatorId: opId, costAmount: 0, creditAmount: 100_000 }, owner)
    const sale = sales.createSale(
      { operatorId: opId, targetPhone: PHONE, amount: 2_000, paidAmount: 2_000 },
      owner,
    )
    sales.voidSale({ id: sale.id, reason: 'سبب' }, owner)
    const actions = t.db.select({ action: auditLog.action }).from(auditLog).all().map((r) => r.action)
    expect(actions).toContain('stock.purchase')
    expect(actions).toContain('sale.create')
    expect(actions).toContain('sale.void')
  })
})
