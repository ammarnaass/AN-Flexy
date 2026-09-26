import { emptyInput } from '@shared/contracts/auth'
import {
  checkBalanceInput,
  connectSlotInput,
  disconnectSlotInput,
  modemChannels,
  saveModemConfigInput,
  sendUssdInput,
} from '@shared/contracts/modem'
import type { ModemApi } from './modem.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function registerModemIpc(ipc: IpcRegistry, modem: ModemApi): void {
  ipc.handle(modemChannels.listPorts, {
    input: emptyInput,
    permission: 'settings.manage',
    run: async () => modem.listPorts(),
  })

  ipc.handle(modemChannels.getConfig, {
    input: emptyInput,
    permission: 'settings.manage',
    run: () => modem.getConfig(),
  })

  ipc.handle(modemChannels.saveConfig, {
    input: saveModemConfigInput,
    permission: 'settings.manage',
    run: (input, ctx) => {
      modem.saveConfig(input, ctx.user)
      return null
    },
  })

  ipc.handle(modemChannels.autoDetect, {
    input: emptyInput,
    permission: 'settings.manage',
    run: async (_input, ctx) => modem.autoDetect(ctx.user),
  })

  ipc.handle(modemChannels.connectSlot, {
    input: connectSlotInput,
    permission: 'settings.manage',
    run: async (input, ctx) => modem.connectSlot(input, ctx.user),
  })

  ipc.handle(modemChannels.disconnectSlot, {
    input: disconnectSlotInput,
    permission: 'settings.manage',
    run: async (input, ctx) => modem.disconnectSlot(input, ctx.user),
  })

  ipc.handle(modemChannels.sendUssd, {
    input: sendUssdInput,
    permission: 'sales.create',
    run: async (input, ctx) => modem.sendUssd(input, ctx.user),
  })

  ipc.handle(modemChannels.checkBalance, {
    input: checkBalanceInput,
    permission: 'balances.view',
    run: async (input, ctx) => modem.checkBalance(input.operator, input.slotIndex ?? 1, ctx.user),
  })
}
