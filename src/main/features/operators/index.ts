import { createOperatorsService } from './operators.service'
import { registerOperatorsIpc } from './operators.ipc'
import type { OperatorsApi, OperatorsDeps } from './operators.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function createOperatorsFeature(deps: OperatorsDeps) {
  const api = createOperatorsService(deps)
  return { api, registerIpc: (ipc: IpcRegistry) => registerOperatorsIpc(ipc, api) }
}

export type { OperatorsApi }

// جدول المتعاملين للتصريح والقراءة فقط (RULES 4.1-4).
export { operators } from './operators.schema'
