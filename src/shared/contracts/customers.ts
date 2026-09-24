import { z } from 'zod'

// قنوات خاصية الزبائن — تُعرَّف مرة واحدة هنا (RULES 6.2-1).
export const customersChannels = {
  list: 'customers:list',
  search: 'customers:search',
  getById: 'customers:getById',
  create: 'customers:create',
  update: 'customers:update',
} as const

export const CUSTOMERS_ERRORS = {
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
} as const

export const createCustomerInput = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(20).optional(),
  note: z.string().trim().max(200).optional(),
})
export type CreateCustomerInput = z.infer<typeof createCustomerInput>

export const updateCustomerInput = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(20).optional(),
  note: z.string().trim().max(200).optional(),
})
export type UpdateCustomerInput = z.infer<typeof updateCustomerInput>

export const searchCustomersInput = z.object({
  query: z.string().trim().max(100),
  limit: z.number().int().positive().max(50).default(20),
})
export type SearchCustomersInput = z.infer<typeof searchCustomersInput>

export const listCustomersInput = z.object({
  limit: z.number().int().positive().max(200).default(50),
})

export const customerIdInput = z.object({
  id: z.number().int().positive(),
})

// نتيجة قابلة للتسلسل — لا كائنات Drizzle (RULES 6.2-6).
export const customerInfo = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  phone: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
})
export type CustomerInfo = z.infer<typeof customerInfo>

// ملف الزبون: معلوماته + ملخص الدين (يُستخدم في صفحة الملف).
export const customerProfile = customerInfo.extend({
  totalDebt: z.number().int(),
})
export type CustomerProfile = z.infer<typeof customerProfile>
