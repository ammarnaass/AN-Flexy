import { contextBridge, ipcRenderer } from 'electron'
import { authChannels } from '@shared/contracts/auth'
import { backupChannels } from '@shared/contracts/backup'
import { customersChannels } from '@shared/contracts/customers'
import { debtsChannels } from '@shared/contracts/debts'
import { operatorsChannels } from '@shared/contracts/operators'
import { reportsChannels } from '@shared/contracts/reports'
import { salesChannels } from '@shared/contracts/sales'
import { settingsChannels } from '@shared/contracts/settings'
import { stockChannels } from '@shared/contracts/stock'
import type { RendererApi } from '@shared/ipc'
import type { Result } from '@shared/result'

// جسر ضيق: يمرّر القنوات المعرّفة في العقود فقط (allowlist)، بلا أي منطق (RULES 6.2-2).
const ALLOWED_CHANNELS: ReadonlySet<string> = new Set([
  ...Object.values(authChannels),
  ...Object.values(backupChannels),
  ...Object.values(customersChannels),
  ...Object.values(debtsChannels),
  ...Object.values(operatorsChannels),
  ...Object.values(reportsChannels),
  ...Object.values(salesChannels),
  ...Object.values(settingsChannels),
  ...Object.values(stockChannels),
])

const api: RendererApi = {
  invoke: <T>(channel: string, payload?: unknown): Promise<Result<T>> => {
    if (!ALLOWED_CHANNELS.has(channel)) {
      return Promise.reject(new Error(`channel_not_allowed:${channel}`))
    }
    return ipcRenderer.invoke(channel, payload) as Promise<Result<T>>
  },
}

contextBridge.exposeInMainWorld('api', api)

