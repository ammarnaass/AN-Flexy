import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { sales } from './sales.schema'
import type { DB, DbOrTx } from '@main/core/db/client'
import type { Audit } from '@main/core/audit'
import type { OperatorsApi } from '@main/features/operators'
import type { StockApi } from '@main/features/stock'
import { AppError } from '@main/core/errors'
import { SALES_ERRORS } from '@shared/contracts/sales'
import type {
  CreateSaleInput,
  VoidSaleInput,
  SaleInfo,
  OperatorBalanceInfo,
} from '@shared/contracts/sales'
import type { SessionUser } from '@shared/contracts/auth'

export type SalesDeps = {
  db: DB
  audit: Audit
  operators: OperatorsApi
  stock: StockApi
}

function toSaleInfo(row: typeof sales.$inferSelect): SaleInfo {
  return {
    id: row.id,
    operatorId: row.operatorId,
    customerId: row.customerId,
    targetPhone: row.targetPhone,
    amount: row.amount,
    paidAmount: row.paidAmount,
    profit: row.profit,
    userId: row.userId,
    voidedAt: row.voidedAt,
    voidReason: row.voidReason,
    createdAt: row.createdAt,
  }
}

// إجمالي المباع (غير الملغاة) — ملك sales (RULES 4.3).
function soldTotal(exec: DbOrTx, operatorId: number): number {
  const row = exec
    .select({ v: sql<number>`coalesce(sum(${sales.amount}), 0)` })
    .from(sales)
    .where(and(eq(sales.operatorId, operatorId), isNull(sales.voidedAt)))
    .get()
  return Number(row?.v ?? 0)
}

// منطق البيع مع فحص الرصيد الذرّي. كل عملية بيع/إلغاء في transaction واحدة (RULES 7.5).
export function createSalesService(deps: SalesDeps) {
  const { db, audit, operators, stock } = deps

  function balanceOf(operatorId: number): { credit: number; sold: number; balance: number } {
    const credit = stock.getCreditTotal(db, operatorId)
    const sold = soldTotal(db, operatorId)
    return { credit, sold, balance: credit - sold }
  }

  return {
    // رصيد متعامل واحد (يستهلكه dashboard/telegram لاحقًا) (RULES 4.3).
    getOperatorBalance(operatorId: number): OperatorBalanceInfo | null {
      const op = operators.getById(operatorId)
      if (!op) return null
      const { credit, sold, balance } = balanceOf(operatorId)
      return {
        operatorId: op.id,
        name: op.name,
        lowBalanceAt: op.lowBalanceAt,
        creditTotal: credit,
        soldTotal: sold,
        balance,
      }
    },

    listBalances(includeInactive: boolean): OperatorBalanceInfo[] {
      const list = includeInactive ? operators.list() : operators.listActive()
      return list.map((op) => {
        const { credit, sold, balance } = balanceOf(op.id)
        return {
          operatorId: op.id,
          name: op.name,
          lowBalanceAt: op.lowBalanceAt,
          creditTotal: credit,
          soldTotal: sold,
          balance,
        }
      })
    },

    createSale(input: CreateSaleInput, user: SessionUser): SaleInfo {
      return db.transaction((tx) => {
        const op = operators.getById(input.operatorId)
        if (!op || !op.active) throw new AppError(SALES_ERRORS.OPERATOR_NOT_FOUND, { id: input.operatorId })

        const debt = input.amount - input.paidAmount
        // البيع بالدين (غير مدفوع بالكامل) يتطلب عميلًا (FR-05).
        if (debt > 0 && !input.customerId) throw new AppError(SALES_ERRORS.DEBT_REQUIRES_CUSTOMER, { debt })

        // فحص الرصيد داخل نفس الـ transaction لمنع سباق الاستنزاف (RULES 7.5).
        const credit = stock.getCreditTotal(tx, input.operatorId)
        const sold = soldTotal(tx, input.operatorId)
        const balance = credit - sold
        if (balance < input.amount) {
          throw new AppError(SALES_ERRORS.INSUFFICIENT_BALANCE, { balance, amount: input.amount })
        }

        // الربح لقطة وقت البيع بهامش المتعامل الحالي (RULES 7.8).
        const profit = Math.round((input.amount * op.marginBp) / 10000)

        const row = tx
          .insert(sales)
          .values({
            operatorId: input.operatorId,
            customerId: input.customerId ?? null,
            targetPhone: input.targetPhone,
            amount: input.amount,
            paidAmount: input.paidAmount,
            profit,
            userId: user.id,
          })
          .returning()
          .get()

        audit.log(tx, {
          userId: user.id,
          action: 'sale.create',
          details: { id: row.id, operatorId: row.operatorId, amount: row.amount, profit: row.profit },
        })
        return toSaleInfo(row)
      })
    },

    // إلغاء منطقي: وسم voidedAt + السبب، الرصيد يعود ضمنيًا لأن sold يستثني الملغاة (RULES 7.7).
    voidSale(input: VoidSaleInput, user: SessionUser): SaleInfo {
      return db.transaction((tx) => {
        const existing = tx.select().from(sales).where(eq(sales.id, input.id)).get()
        if (!existing) throw new AppError(SALES_ERRORS.SALE_NOT_FOUND, { id: input.id })
        if (existing.voidedAt) throw new AppError(SALES_ERRORS.SALE_ALREADY_VOIDED, { id: input.id })

        const row = tx
          .update(sales)
          .set({ voidedAt: new Date().toISOString(), voidReason: input.reason })
          .where(eq(sales.id, input.id))
          .returning()
          .get()

        audit.log(tx, {
          userId: user.id,
          action: 'sale.void',
          details: { id: row.id, reason: input.reason, amount: row.amount },
        })
        return toSaleInfo(row)
      })
    },

    listRecent(limit: number): SaleInfo[] {
      return db
        .select()
        .from(sales)
        .orderBy(desc(sales.id))
        .limit(limit)
        .all()
        .map(toSaleInfo)
    },
  }
}

export type SalesApi = ReturnType<typeof createSalesService>
