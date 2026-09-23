import { createSalesService } from './sales.service'
import { registerSalesIpc } from './sales.ipc'
import type { SalesApi, SalesDeps } from './sales.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function createSalesFeature(deps: SalesDeps) {
  const api = createSalesService(deps)
  return { api, registerIpc: (ipc: IpcRegistry) => registerSalesIpc(ipc, api) }
}

export type { SalesApi }

// جدول المبيعات للتصريح والقراءة فقط (RULES 4.1-4).
export { sales } from './sales.schema'
