import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createReportsFeature } from '@main/features/reports'
import { createSalesFeature } from '@main/features/sales'
import { createStockFeature } from '@main/features/stock'
import { createOperatorsFeature } from '@main/features/operators'
import { createDebtsFeature } from '@main/features/debts'
import { createCustomersFeature } from '@main/features/customers'
import { openTestDb } from '@main/core/db/testDb'
import { users } from '@main/features/auth'
import type { SessionUser } from '@shared/contracts/auth'

describe('reports.service — التقارير الإحصائية (FR-07)', () => {
  let t: ReturnType<typeof openTestDb>
  let reports: ReturnType<typeof createReportsFeature>['api']
  let sales: ReturnType<typeof createSalesFeature>['api']
  let debts: ReturnType<typeof createDebtsFeature>['api']
  let customers: ReturnType<typeof createCustomersFeature>['api']
  let admin: SessionUser
  let cashier: SessionUser
  let opId: number

  beforeEach(() => {
    t = openTestDb()
    reports = createReportsFeature({ db: t.db }).api

    const u1 = t.db.insert(users).values({ name: 'ammar', role: 'admin', pinHash: 'x' }).returning().get()
    const u2 = t.db.insert(users).values({ name: 'ali', role: 'cashier', pinHash: 'y' }).returning().get()
    admin = { id: u1.id, name: u1.name, role: 'admin' }
    cashier = { id: u2.id, name: u2.name, role: 'cashier' }

    const operators = createOperatorsFeature({ db: t.db, audit: t.audit }).api
    const stock = createStockFeature({ db: t.db, audit: t.audit, operators }).api
    customers = createCustomersFeature({ db: t.db, audit: t.audit }).api
    sales = createSalesFeature({ db: t.db, audit: t.audit, operators, stock }).api
    debts = createDebtsFeature({ db: t.db, audit: t.audit, customers }).api

    // إضافة متعامل ورصيد
    const op = operators.create({ name: 'Mobilis', marginBp: 150, lowBalanceAt: 1_000 }, admin)
    opId = op.id
    stock.addPurchase({ operatorId: opId, costAmount: 98_500, creditAmount: 100_000 }, admin)
  })

  afterEach(() => t.close())

  it('حساب إجمالي المبيعات والأرباح للمالك', () => {
    // بيع 10,000 دج بهامش 1.5% → ربح 150 دج
    sales.createSale({ operatorId: opId, targetPhone: '0661000001', amount: 10_000, paidAmount: 10_000 }, admin)
    // بيع 20,000 دج بهامش 1.5% → ربح 300 دج
    sales.createSale({ operatorId: opId, targetPhone: '0661000002', amount: 20_000, paidAmount: 20_000 }, admin)

    const res = reports.getReport({ period: 'today' }, admin)
    expect(res.summary.totalSales).toBe(30_000)
    expect(res.summary.salesCount).toBe(2)
    expect(res.summary.totalProfit).toBe(450)
  })

  it('الأرباح تُحجب بالكامل عن البائع (cashier)', () => {
    sales.createSale({ operatorId: opId, targetPhone: '0661000001', amount: 10_000, paidAmount: 10_000 }, admin)

    const res = reports.getReport({ period: 'today' }, cashier)
    expect(res.summary.totalSales).toBe(10_000)
    expect(res.summary.totalProfit).toBeNull()

    // وأيضًا في تصنيف المتعاملين والأيام
    expect(res.byOperator[0]?.totalProfit).toBeNull()
    expect(res.byDay[0]?.totalProfit).toBeNull()
  })

  it('العمليات الملغاة تُستبعد من إحصائيات التقرير', () => {
    const s1 = sales.createSale({ operatorId: opId, targetPhone: '0661000001', amount: 10_000, paidAmount: 10_000 }, admin)
    sales.createSale({ operatorId: opId, targetPhone: '0661000002', amount: 5_000, paidAmount: 5_000 }, admin)

    sales.voidSale({ id: s1.id, reason: 'خطأ' }, admin)

    const res = reports.getReport({ period: 'today' }, admin)
    expect(res.summary.totalSales).toBe(5_000)
    expect(res.summary.salesCount).toBe(1)
  })

  it('تتبع الديون المنشأة والمسددة في التقرير', () => {
    const cust = customers.create({ name: 'كريم', phone: '0555999888' }, admin)
    // بيع 10,000 مدفوع 4,000 → دين منشأ 6,000
    sales.createSale(
      { operatorId: opId, targetPhone: '0661000001', amount: 10_000, paidAmount: 4_000, customerId: cust.id },
      admin,
    )
    // تسديد دفعة 2,000
    debts.addPayment({ customerId: cust.id, amount: 2_000 }, admin)

    const res = reports.getReport({ period: 'today' }, admin)
    expect(res.summary.totalDebtCreated).toBe(6_000)
    expect(res.summary.totalDebtPaid).toBe(2_000)
  })

  it('تصنيف المبيعات حسب المتعامل واليوم', () => {
    sales.createSale({ operatorId: opId, targetPhone: '0661000001', amount: 8_000, paidAmount: 8_000 }, admin)

    const res = reports.getReport({ period: 'all' }, admin)
    expect(res.byOperator.length).toBe(1)
    expect(res.byOperator[0]?.operatorName).toBe('Mobilis')
    expect(res.byOperator[0]?.totalSales).toBe(8_000)

    expect(res.byDay.length).toBe(1)
    expect(res.byDay[0]?.totalSales).toBe(8_000)
  })
})
