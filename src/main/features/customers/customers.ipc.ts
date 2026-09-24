import {
  customersChannels,
  createCustomerInput,
  updateCustomerInput,
  searchCustomersInput,
  listCustomersInput,
  customerIdInput,
} from '@shared/contracts/customers'
import type { CustomersApi } from './customers.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

// handlers رقيقة: zod + صلاحية + استدعاء الخدمة (RULES 5, 6.2-3).
export function registerCustomersIpc(ipc: IpcRegistry, api: CustomersApi): void {
  ipc.handle(customersChannels.list, {
    input: listCustomersInput,
    permission: 'sales.create', // أي مستخدم يمكنه رؤية الزبائن (مطلوب لاختيار الزبون وقت البيع).
    run: (input) => api.list(input.limit),
  })

  ipc.handle(customersChannels.search, {
    input: searchCustomersInput,
    permission: 'sales.create',
    run: (input) => api.search(input),
  })

  ipc.handle(customersChannels.getById, {
    input: customerIdInput,
    permission: 'sales.create',
    run: (input) => api.getById(input.id),
  })

  ipc.handle(customersChannels.create, {
    input: createCustomerInput,
    permission: 'sales.create',
    run: (input, ctx) => api.create(input, ctx.user),
  })

  ipc.handle(customersChannels.update, {
    input: updateCustomerInput,
    permission: 'settings.manage', // تعديل بيانات الزبون: المالك فقط.
    run: (input, ctx) => api.update(input, ctx.user),
  })
}
