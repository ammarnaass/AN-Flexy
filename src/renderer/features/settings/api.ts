import { invoke } from '@renderer/shared/api'
import { settingsChannels } from '@shared/contracts/settings'
import type { SettingItem, SettingKey } from '@shared/contracts/settings'

export const settingsApi = {
  get(key: SettingKey): Promise<string | null> {
    return invoke<string | null>(settingsChannels.get, { key })
  },

  set(key: SettingKey, value: string): Promise<null> {
    return invoke<null>(settingsChannels.set, { key, value })
  },

  list(): Promise<SettingItem[]> {
    return invoke<SettingItem[]>(settingsChannels.list)
  },
}
