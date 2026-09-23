import { z } from 'zod'

// قنوات خاصية البيع — تُعرَّف مرة واحدة هنا (RULES 6.2-1).
export const salesChannels = {
  create: 'sales:create',
  void: 'sales:void',
  list: 'sales:list',
  balances: 'sales:balances',
} as const

export const SALES_ERRORS = {
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  DEBT_REQUIRES_CUSTOMER: 'DEBT_REQUIRES_CUSTOMER',
  SALE_NOT_FOUND: 'SALE_NOT_FOUND',
  SALE_ALREADY_VOIDED: 'SALE_ALREADY_VOIDED',
  OPERATOR_NOT_FOUND: 'OPERATOR_NOT_FOUND',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
} as const

// رقم الهاتف الجزائري للشريحة: 10 أرقام يبدأ بـ 05/06/07 (FR-04).
export const targetPhoneSchema = z.string().regex(/^0[567]\d{8}$/)

export const createSaleInput = z
  .object({
    operatorId: z.number().int().positive(),
    targetPhone: targetPhoneSchema,
    amount: z.number().int().positive(), // بالسنتيم
    paidAmount: z.number().int().nonnegative(),
    customerId: z.number().int().positive().optional(),
  })
  // لا دفع يزيد عن المبلغ (مِلك نموذج، لا رمز خطأ_needed).
  .refine((v) => v.paidAmount <= v.amount, { message: 'paid_exceeds_amount' })
export type CreateSaleInput = z.infer<typeof createSaleInput>

export const voidSaleInput = z.object({
  id: z.number().int().positive(),
  reason: z.string().trim().min(3).max(200),
})
export type VoidSaleInput = z.infer<typeof voidSaleInput>

export const saleInfo = z.object({
  id: z.number().int().positive(),
  operatorId: z.number().int().positive(),
  customerId: z.number().int().positive().nullable(),
  targetPhone: z.string(),
  amount: z.number().int(),
  paidAmount: z.number().int(),
  profit: z.number().int(),
  userId: z.number().int(),
  voidedAt: z.string().nullable(),
  voidReason: z.string().nullable(),
  createdAt: z.string(),
})
export type SaleInfo = z.infer<typeof saleInfo>

export const listSalesInput = z.object({
  limit: z.number().int().positive().max(200).default(20),
})

// الرصيد محسوب من السجلات لا مخزَّن (PRD §8): Σ credit − Σ sold (غير الملغاة).
export const operatorBalanceInfo = z.object({
  operatorId: z.number().int().positive(),
  name: z.string(),
  lowBalanceAt: z.number().int(),
  creditTotal: z.number().int(),
  soldTotal: z.number().int(),
  balance: z.number().int(),
})
export type OperatorBalanceInfo = z.infer<typeof operatorBalanceInfo>

export const balancesInput = z.object({ includeInactive: z.boolean().default(false) })
