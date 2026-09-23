import { desc, eq, sql } from 'drizzle-orm'
import { stockEntries } from './stock.schema'
import type { DB, DbOrTx } from '@main/core/db/client'
import type { Audit } from '@main/core/audit'
import type { OperatorsApi } from '@main/features/operators'
import { AppError } from '@main/core/errors'
import { STOCK_ERRORS } from '@shared/contracts/stock'
import type { PurchaseInput, SettlementInput, StockEntriesInput, StockEntryInfo } from '@shared/contracts/stock'
import type { SessionUser } from '@shared/contracts/auth'

export type StockDeps = {
  db: DB
  audit: Audit
  operators: OperatorsApi
}

// رصيد الائتمان المستلم (Σ credit) — يصدّره stock عبر api لتستخدمه sales في حساب الرصيد (RULES 4.3).
function creditTotal(exec: DbOrTx, operatorId: number): number {
  const row = exec
    .select({ v: sql<number>`coalesce(sum(${stockEntries.creditAmount}), 0)` })
    .from(stockEntries)
    .where(eq(stockEntries.operatorId, operatorId))
    .get()
  return Number(row?.v ?? 0)
}

function toEntryInfo(row: typeof stockEntries.$inferSelect): StockEntryInfo {
  return {
    id: row.id,
    operatorId: row.operatorId,
    type: row.type,
    costAmount: row.costAmount,
    creditAmount: row.creditAmount,
    note: row.note,
    userId: row.userId,
    createdAt: row.createdAt,
  }
}

// شحن الرصيد وتسويته. كل كتابة داخل transaction مع التدقيق (RULES 7.5/9).
// الرصيد الناتج ليس حقلًا هنا؛ يُحسب في sales (RULES 4.3).
export function createStockService(deps: StockDeps) {
  const { db, audit, operators } = deps

  function assertActiveOperator(id: number): void {
    const op = operators.getById(id)
    if (!op) throw new AppError(STOCK_ERRORS.OPERATOR_NOT_FOUND, { id })
  }

  return {
    getCreditTotal(exec: DbOrTx, operatorId: number): number {
      return creditTotal(exec, operatorId)
    },

    addPurchase(input: PurchaseInput, user: SessionUser): StockEntryInfo {
      assertActiveOperator(input.operatorId)
      return db.transaction((tx) => {
        const row = tx
          .insert(stockEntries)
          .values({
            operatorId: input.operatorId,
            type: 'purchase',
            costAmount: input.costAmount,
            creditAmount: input.creditAmount,
            note: input.note ?? null,
            userId: user.id,
          })
          .returning()
          .get()
        audit.log(tx, {
          userId: user.id,
          action: 'stock.purchase',
          details: { id: row.id, operatorId: row.operatorId, creditAmount: row.creditAmount },
        })
        return toEntryInfo(row)
      })
    },

    addSettlement(input: SettlementInput, user: SessionUser): StockEntryInfo {
      assertActiveOperator(input.operatorId)
      // السالب مسموح هنا فقط (تصحيح الفرق عن رصيد المتعامل الحقيقي).
      return db.transaction((tx) => {
        const row = tx
          .insert(stockEntries)
          .values({
            operatorId: input.operatorId,
            type: 'adjustment',
            costAmount: 0,
            creditAmount: input.delta,
            note: input.reason,
            userId: user.id,
          })
          .returning()
          .get()
        audit.log(tx, {
          userId: user.id,
          action: 'stock.settlement',
          details: { id: row.id, operatorId: row.operatorId, delta: input.delta, reason: input.reason },
        })
        return toEntryInfo(row)
      })
    },

    listEntries(input: StockEntriesInput): StockEntryInfo[] {
      const where = input.operatorId ? eq(stockEntries.operatorId, input.operatorId) : undefined
      return db
        .select()
        .from(stockEntries)
        .where(where)
        .orderBy(desc(stockEntries.id))
        .limit(input.limit)
        .all()
        .map(toEntryInfo)
    },
  }
}

export type StockApi = ReturnType<typeof createStockService>
