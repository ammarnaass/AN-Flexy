import { emptyInput } from '@shared/contracts/auth'
import {
  getSettingInput,
  settingItem,
  settingsChannels,
  setSettingInput,
} from '@shared/contracts/settings'
import type { SettingsApi } from './settings.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

// كل قنوات الإعدادات إدارية (PRD §3: المستخدمون/الإعدادات للمالك فقط).
export function registerSettingsIpc(ipc: IpcRegistry, settings: SettingsApi): void {
  ipc.handle(settingsChannels.get, {
    input: getSettingInput,
    permission: 'settings.manage',
    run: (input) => {
      const value = settings.get(input.key)
      return value === null ? null : settingItem.parse({ key: input.key, value })
    },
  })

  ipc.handle(settingsChannels.set, {
    input: setSettingInput,
    permission: 'settings.manage',
    run: (input, ctx) => {
      settings.set(input.key, input.value, ctx.user)
      return null
    },
  })

  ipc.handle(settingsChannels.list, {
    input: emptyInput,
    permission: 'settings.manage',
    run: () => settings.list(),
  })
}
