import { z } from 'zod'

// قنوات خاصية الديون والدفعات — تُعرَّف مرة واحدة هنا (RULES 6.2-1).
export const debtsChannels = {
  listDebtors: 'debts:listDebtors',
  getCustomerDebt: 'debts:getCustomerDebt',
  addPayment: 'debts:addPayment',
  listPayments: 'debts:listPayments',
} as const

export const DEBTS_ERRORS = {
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  PAYMENT_EXCEEDS_DEBT: 'PAYMENT_EXCEEDS_DEBT',
  INVALID_PAYMENT_AMOUNT: 'INVALID_PAYMENT_AMOUNT',
} as const

// الدفعة: مبلغ على حساب إجمالي دين الزبون (لا ربط بفاتورة في v1 — FR-07).
export const addPaymentInput = z.object({
  customerId: z.number().int().positive(),
  amount: z.number().int().positive(), // سنتيم
})
export type AddPaymentInput = z.infer<typeof addPaymentInput>

export const listPaymentsInput = z.object({
  customerId: z.number().int().positive(),
  limit: z.number().int().positive().max(200).default(50),
})
export type ListPaymentsInput = z.infer<typeof listPaymentsInput>

export const customerDebtInput = z.object({
  customerId: z.number().int().positive(),
})

export const listDebtorsInput = z.object({
  limit: z.number().int().positive().max(200).default(50),
})

// ملخص دين زبون واحد — مرتب بالأكبر في القائمة (FR-07).
export const debtorInfo = z.object({
  customerId: z.number().int().positive(),
  customerName: z.string(),
  customerPhone: z.string().nullable(),
  totalDebt: z.number().int(),
  oldestDebtDate: z.string().nullable(),
})
export type DebtorInfo = z.infer<typeof debtorInfo>

export const paymentInfo = z.object({
  id: z.number().int().positive(),
  customerId: z.number().int().positive(),
  amount: z.number().int(),
  userId: z.number().int().nullable(),
  createdAt: z.string(),
})
export type PaymentInfo = z.infer<typeof paymentInfo>
