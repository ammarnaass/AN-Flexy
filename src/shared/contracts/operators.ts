import { z } from 'zod'

// قنوات خاصية المتعاملين — تُعرَّف مرة واحدة هنا (RULES 6.2-1).
export const operatorsChannels = {
  list: 'operators:list',
  create: 'operators:create',
  updateMargin: 'operators:updateMargin',
  disable: 'operators:disable',
} as const

export const OPERATORS_ERRORS = {
  OPERATOR_NAME_TAKEN: 'OPERATOR_NAME_TAKEN',
  OPERATOR_NOT_FOUND: 'OPERATOR_NOT_FOUND',
} as const

export const operatorIdInput = z.object({ id: z.number().int().positive() })

export const createOperatorInput = z.object({
  name: z.string().trim().min(1).max(50),
  marginBp: z.number().int().min(0).max(10_000).default(0),
  lowBalanceAt: z.number().int().nonnegative().default(0),
})
export type CreateOperatorInput = z.infer<typeof createOperatorInput>

export const updateOperatorMarginInput = z.object({
  id: z.number().int().positive(),
  marginBp: z.number().int().min(0).max(10_000),
})
export type UpdateOperatorMarginInput = z.infer<typeof updateOperatorMarginInput>

// نتيجة قابلة للتسلسل — لا كائنات Drizzle (RULES 6.2-6).
export const operatorInfo = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  marginBp: z.number().int(),
  lowBalanceAt: z.number().int(),
  active: z.boolean(),
})
export type OperatorInfo = z.infer<typeof operatorInfo>
