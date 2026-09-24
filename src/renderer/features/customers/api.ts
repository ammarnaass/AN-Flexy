import { invoke } from '@renderer/shared/api'
import { customersChannels } from '@shared/contracts/customers'
import type { CustomerInfo, CreateCustomerInput, UpdateCustomerInput, SearchCustomersInput } from '@shared/contracts/customers'

export function listCustomers(limit = 50): Promise<CustomerInfo[]> {
  return invoke<CustomerInfo[]>(customersChannels.list, { limit })
}

export function searchCustomers(input: SearchCustomersInput): Promise<CustomerInfo[]> {
  return invoke<CustomerInfo[]>(customersChannels.search, input)
}

export function getCustomerById(id: number): Promise<CustomerInfo | null> {
  return invoke<CustomerInfo | null>(customersChannels.getById, { id })
}

export function createCustomer(input: CreateCustomerInput): Promise<CustomerInfo> {
  return invoke<CustomerInfo>(customersChannels.create, input)
}

export function updateCustomer(input: UpdateCustomerInput): Promise<CustomerInfo> {
  return invoke<CustomerInfo>(customersChannels.update, input)
}
