import { z } from 'zod'

// قنوات خاصية المخزون — تُعرَّف مرة واحدة هنا (RULES 6.2-1).
// الرصيد المحسوب ليس هنا: ملكه sales (RULES 4.3)، وشاشة المخزون تجمعهما في pages/.
export const stockChannels = {
  entries: 'stock:entries',
  addPurchase: 'stock:addPurchase',
  addSettlement: 'stock:addSettlement',
} as const

export const STOCK_ERRORS = {
  OPERATOR_NOT_FOUND: 'OPERATOR_NOT_FOUND',
  SETTLEMENT_REASON_REQUIRED: 'SETTLEMENT_REASON_REQUIRED',
} as const

// المبالغ كلها سنتيم أعداد صحيحة (RULES 7.6).
const centimes = z.number().int().nonnegative()
const operatorRef = z.object({ operatorId: z.number().int().positive() })

export const purchaseInput = z.object({
  ...operatorRef.shape,
  costAmount: centimes, // المدفوع للمتعامل
  creditAmount: centimes, // الرصيد المستلم
  note: z.string().trim().max(200).optional(),
})
export type PurchaseInput = z.infer<typeof purchaseInput>

// التسوية: فرق الرصيد (موجب أو سالب) وسبب إلزامي (FR-03).
export const settlementInput = z.object({
  ...operatorRef.shape,
  delta: z.number().int(),
  reason: z.string().trim().min(3).max(200),
})
export type SettlementInput = z.infer<typeof settlementInput>

export const stockEntriesInput = z.object({
  operatorId: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(200).default(50),
})
export type StockEntriesInput = z.infer<typeof stockEntriesInput>

export const stockEntryInfo = z.object({
  id: z.number().int().positive(),
  operatorId: z.number().int().positive(),
  type: z.enum(['purchase', 'adjustment']),
  costAmount: z.number().int(),
  creditAmount: z.number().int(),
  note: z.string().nullable(),
  userId: z.number().int().nullable(),
  createdAt: z.string(),
})
export type StockEntryInfo = z.infer<typeof stockEntryInfo>
