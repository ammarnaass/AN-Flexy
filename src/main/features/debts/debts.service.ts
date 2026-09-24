import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { payments } from './debts.schema'
import { customers } from '@main/features/customers'
import { sales } from '@main/features/sales'
import type { DB } from '@main/core/db/client'
import type { Audit } from '@main/core/audit'
import { AppError } from '@main/core/errors'
import { DEBTS_ERRORS } from '@shared/contracts/debts'
import type { CustomersApi } from '@main/features/customers'
import type { AddPaymentInput, DebtorInfo, PaymentInfo, ListPaymentsInput } from '@shared/contracts/debts'
import type { SessionUser } from '@shared/contracts/auth'

export type DebtsDeps = {
  db: DB
  audit: Audit
  customers: CustomersApi
}

function toPaymentInfo(row: typeof payments.$inferSelect): PaymentInfo {
  return {
    id: row.id,
    customerId: row.customerId,
    amount: row.amount,
    userId: row.userId,
    createdAt: row.createdAt,
  }
}

// دين الزبون = Σ(amount − paid_amount) للمبيعات غير الملغاة − Σ payments.amount (PRD §8).
function customerDebtTotal(db: DB, customerId: number): number {
  const salesDebt = db
    .select({ v: sql<number>`coalesce(sum(${sales.amount} - ${sales.paidAmount}), 0)` })
    .from(sales)
    .where(and(eq(sales.customerId, customerId), isNull(sales.voidedAt)))
    .get()

  const paidTotal = db
    .select({ v: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.customerId, customerId))
    .get()

  return Number(salesDebt?.v ?? 0) - Number(paidTotal?.v ?? 0)
}

// الديون والدفعات (المرحلة 3). الدين يُحسب بالاستعلام ولا يُخزَّن (RULES 7.8).
export function createDebtsService(deps: DebtsDeps) {
  const { db, audit } = deps

  return {
    // إجمالي الدين لزبون واحد.
    getCustomerDebt(customerId: number): number {
      return customerDebtTotal(db, customerId)
    },

    // قائمة الزبائن المدينين مرتبة بالأكبر مع تاريخ أقدم دين (FR-07).
    listDebtors(limit: number): DebtorInfo[] {
      // نستعلم كل الزبائن الذين لديهم مبيعات بدين (غير ملغاة)، ثم نحسب الإجمالي.
      const rawDebtors = db
        .select({
          customerId: customers.id,
          customerName: customers.name,
          customerPhone: customers.phone,
          salesDebt: sql<number>`coalesce(sum(${sales.amount} - ${sales.paidAmount}), 0)`,
          oldestDebtDate: sql<string | null>`min(${sales.createdAt})`,
        })
        .from(sales)
        .innerJoin(customers, eq(sales.customerId, customers.id))
        .where(
          and(
            isNull(sales.voidedAt),
            sql`${sales.amount} > ${sales.paidAmount}`,
          ),
        )
        .groupBy(customers.id)
        .all()

      // نجلب مجموع الدفعات لكل زبون.
      const paymentTotals = db
        .select({
          customerId: payments.customerId,
          total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
        })
        .from(payments)
        .groupBy(payments.customerId)
        .all()

      const paidMap = new Map(paymentTotals.map((p) => [p.customerId, Number(p.total)]))

      return rawDebtors
        .map((d) => ({
          customerId: d.customerId,
          customerName: d.customerName,
          customerPhone: d.customerPhone,
          totalDebt: Number(d.salesDebt) - (paidMap.get(d.customerId) ?? 0),
          oldestDebtDate: d.oldestDebtDate,
        }))
        .filter((d) => d.totalDebt > 0)
        .sort((a, b) => b.totalDebt - a.totalDebt)
        .slice(0, limit)
    },

    // تسجيل دفعة على حساب زبون (FR-07). لا يمكن أن تتجاوز الدين الحالي.
    addPayment(input: AddPaymentInput, user: SessionUser): PaymentInfo {
      return db.transaction((tx) => {
        const customer = deps.customers.getById(input.customerId)
        if (!customer) throw new AppError(DEBTS_ERRORS.CUSTOMER_NOT_FOUND, { id: input.customerId })

        const currentDebt = customerDebtTotal(db, input.customerId)
        if (input.amount > currentDebt) {
          throw new AppError(DEBTS_ERRORS.PAYMENT_EXCEEDS_DEBT, {
            amount: input.amount,
            debt: currentDebt,
          })
        }

        const row = tx
          .insert(payments)
          .values({
            customerId: input.customerId,
            amount: input.amount,
            userId: user.id,
          })
          .returning()
          .get()

        audit.log(tx, {
          userId: user.id,
          action: 'debts.payment',
          details: { id: row.id, customerId: input.customerId, amount: input.amount },
        })
        return toPaymentInfo(row)
      })
    },

    listPayments(input: ListPaymentsInput): PaymentInfo[] {
      return db
        .select()
        .from(payments)
        .where(eq(payments.customerId, input.customerId))
        .orderBy(desc(payments.id))
        .limit(input.limit)
        .all()
        .map(toPaymentInfo)
    },
  }
}

export type DebtsApi = ReturnType<typeof createDebtsService>
