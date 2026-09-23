import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { stockApi } from './api'
import type { PurchaseInput, SettlementInput } from '@shared/contracts/stock'

export const stockKeys = { entries: ['stock', 'entries'] } as const

export function useStockEntries(operatorId?: number) {
  return useQuery({
    queryKey: [...stockKeys.entries, operatorId ?? 'all'],
    queryFn: () => stockApi.entries({ operatorId, limit: 50 }),
  })
}

// الشحن/التسوية يغيّر الرصيد المحسوب (عبر sales)، لذا تُعاد قراءة كل الاستعلامات.
function useInvalidateAfterStock() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries()
}

export function useAddPurchase() {
  const invalidate = useInvalidateAfterStock()
  return useMutation({
    mutationFn: (input: PurchaseInput) => stockApi.addPurchase(input),
    onSuccess: invalidate,
  })
}

export function useAddSettlement() {
  const invalidate = useInvalidateAfterStock()
  return useMutation({
    mutationFn: (input: SettlementInput) => stockApi.addSettlement(input),
    onSuccess: invalidate,
  })
}
