import { createSettingsService } from './settings.service'
import { registerSettingsIpc } from './settings.ipc'
import type { SettingsApi, SettingsDeps } from './settings.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function createSettingsFeature(deps: SettingsDeps) {
  const api = createSettingsService(deps)
  return { api, registerIpc: (ipc: IpcRegistry) => registerSettingsIpc(ipc, api) }
}

export type { SettingsApi }

export { settings } from './settings.schema'
