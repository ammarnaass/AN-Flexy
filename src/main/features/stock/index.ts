import { createStockService } from './stock.service'
import { registerStockIpc } from './stock.ipc'
import type { StockApi, StockDeps } from './stock.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function createStockFeature(deps: StockDeps) {
  const api = createStockService(deps)
  return { api, registerIpc: (ipc: IpcRegistry) => registerStockIpc(ipc, api) }
}

export type { StockApi }

// جدول حركة المخزون للتصريح والقراءة فقط (RULES 4.1-4).
export { stockEntries } from './stock.schema'
