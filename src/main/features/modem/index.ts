import { createModemService } from './modem.service'
import { registerModemIpc } from './modem.ipc'
import type { ModemApi, ModemDeps } from './modem.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function createModemFeature(deps: ModemDeps) {
  const api = createModemService(deps)
  return {
    api,
    registerIpc: (ipc: IpcRegistry) => registerModemIpc(ipc, api),
  }
}

export type { ModemApi, ModemDeps }
