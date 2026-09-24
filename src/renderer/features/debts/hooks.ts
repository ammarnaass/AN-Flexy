import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listDebtors, getCustomerDebt, addPayment, listPayments } from './api'
import type { AddPaymentInput } from '@shared/contracts/debts'

const DEBTS_KEY = 'debts'

export function useDebtors(limit = 50) {
  return useQuery({
    queryKey: [DEBTS_KEY, 'debtors', limit],
    queryFn: () => listDebtors(limit),
  })
}

export function useCustomerDebt(customerId: number | null) {
  return useQuery({
    queryKey: [DEBTS_KEY, 'customerDebt', customerId],
    queryFn: () => (customerId ? getCustomerDebt(customerId) : 0),
    enabled: customerId !== null,
  })
}

export function useCustomerPayments(customerId: number | null, limit = 50) {
  return useQuery({
    queryKey: [DEBTS_KEY, 'payments', customerId, limit],
    queryFn: () => (customerId ? listPayments({ customerId, limit }) : []),
    enabled: customerId !== null,
  })
}

export function useAddPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AddPaymentInput) => addPayment(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [DEBTS_KEY] })
      void qc.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
