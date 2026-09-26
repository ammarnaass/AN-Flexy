import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { salesApi } from './api'
import type { CreateSaleInput, VoidSaleInput } from '@shared/contracts/sales'

export const salesKeys = {
  balances: ['sales', 'balances'] as const,
  recent: ['sales', 'recent'] as const,
} as const

export function useSalesBalances(includeInactive = false) {
  return useQuery({
    queryKey: [...salesKeys.balances, includeInactive],
    queryFn: () => salesApi.balances(includeInactive),
  })
}

export function useRecentSales(limit = 20) {
  return useQuery({
    queryKey: [...salesKeys.recent, limit],
    queryFn: () => salesApi.list(limit),
  })
}

// بعد أي عملية بيع/إلغاء تُعاد قراءة الأرصدة والمبيعات (التوابع محسوبة — RULES 4.3).
function useInvalidateAfterSale() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries()
}

export function useCreateSale() {
  const invalidate = useInvalidateAfterSale()
  return useMutation({
    mutationFn: (input: CreateSaleInput) => salesApi.create(input),
    onSuccess: invalidate,
  })
}

export function useVoidSale() {
  const invalidate = useInvalidateAfterSale()
  return useMutation({
    mutationFn: (input: VoidSaleInput) => salesApi.void(input),
    onSuccess: invalidate,
  })
}
