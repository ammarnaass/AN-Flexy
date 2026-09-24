import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { operatorsApi } from './api'
import type { CreateOperatorInput, UpdateOperatorMarginInput } from '@shared/contracts/operators'

export const operatorsKeys = { list: ['operators', 'list'] } as const

export function useOperators() {
  return useQuery({
    queryKey: operatorsKeys.list,
    queryFn: () => operatorsApi.list(),
    staleTime: 30_000,
  })
}

// المتعاملون النشطون فقط — للاستهلاك في نماذج البيع والمخزون.
export function useActiveOperators() {
  const query = useOperators()
  return { ...query, data: query.data?.filter((o) => o.active) }
}

export function useCreateOperator() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOperatorInput) => operatorsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: operatorsKeys.list }),
  })
}

export function useUpdateOperatorMargin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateOperatorMarginInput) => operatorsApi.updateMargin(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: operatorsKeys.list }),
  })
}

export function useDisableOperator() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => operatorsApi.disable(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: operatorsKeys.list }),
  })
}
