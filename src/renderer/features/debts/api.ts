import { invoke } from '@renderer/shared/api'
import { debtsChannels } from '@shared/contracts/debts'
import type { AddPaymentInput, DebtorInfo, PaymentInfo, ListPaymentsInput } from '@shared/contracts/debts'

export function listDebtors(limit = 50): Promise<DebtorInfo[]> {
  return invoke<DebtorInfo[]>(debtsChannels.listDebtors, { limit })
}

export function getCustomerDebt(customerId: number): Promise<number> {
  return invoke<number>(debtsChannels.getCustomerDebt, { customerId })
}

export function addPayment(input: AddPaymentInput): Promise<PaymentInfo> {
  return invoke<PaymentInfo>(debtsChannels.addPayment, input)
}

export function listPayments(input: ListPaymentsInput): Promise<PaymentInfo[]> {
  return invoke<PaymentInfo[]>(debtsChannels.listPayments, input)
}
