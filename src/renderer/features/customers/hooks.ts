import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listCustomers, searchCustomers, getCustomerById, createCustomer, updateCustomer } from './api'
import type { CreateCustomerInput, UpdateCustomerInput, SearchCustomersInput } from '@shared/contracts/customers'

const CUSTOMERS_KEY = 'customers'

export function useCustomers(limit = 50) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, 'list', limit],
    queryFn: () => listCustomers(limit),
  })
}

export function useCustomerSearch(input: SearchCustomersInput) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, 'search', input.query],
    queryFn: () => searchCustomers(input),
    enabled: input.query.length > 0,
  })
}

export function useCustomerById(id: number | null) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, 'byId', id],
    queryFn: () => (id ? getCustomerById(id) : null),
    enabled: id !== null,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCustomerInput) => createCustomer(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] }),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCustomerInput) => updateCustomer(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] }),
  })
}
