import { createDebtsService } from './debts.service'
import { registerDebtsIpc } from './debts.ipc'
import type { DebtsApi, DebtsDeps } from './debts.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function createDebtsFeature(deps: DebtsDeps) {
  const api = createDebtsService(deps)
  return { api, registerIpc: (ipc: IpcRegistry) => registerDebtsIpc(ipc, api) }
}

export type { DebtsApi }

// جدول الدفعات للتصريح والقراءة فقط (RULES 4.1-4).
export { payments } from './debts.schema'
