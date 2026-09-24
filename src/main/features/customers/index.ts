import { createCustomersService } from './customers.service'
import { registerCustomersIpc } from './customers.ipc'
import type { CustomersApi, CustomersDeps } from './customers.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function createCustomersFeature(deps: CustomersDeps) {
  const api = createCustomersService(deps)
  return { api, registerIpc: (ipc: IpcRegistry) => registerCustomersIpc(ipc, api) }
}

export type { CustomersApi }

// جدول الزبائن للتصريح والقراءة فقط (RULES 4.1-4).
export { customers } from './customers.schema'
