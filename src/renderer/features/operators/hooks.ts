import { useQuery } from '@tanstack/react-query'
import { operatorsApi } from './api'

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
