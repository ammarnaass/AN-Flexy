import { invoke } from '@renderer/shared/api'
import { modemChannels } from '@shared/contracts/modem'
import type {
  ConnectSlotInput,
  DisconnectSlotInput,
  ModemConfig,
  ModemSlot,
  OperatorKey,
  PortInfo,
  SendUssdInput,
  SendUssdResult,
  SlotIndex,
} from '@shared/contracts/modem'

export const modemApi = {
  listPorts(): Promise<PortInfo[]> {
    return invoke<PortInfo[]>(modemChannels.listPorts)
  },

  getConfig(): Promise<ModemConfig> {
    return invoke<ModemConfig>(modemChannels.getConfig)
  },

  saveConfig(config: ModemConfig): Promise<null> {
    return invoke<null>(modemChannels.saveConfig, config)
  },

  autoDetect(): Promise<ModemConfig> {
    return invoke<ModemConfig>(modemChannels.autoDetect)
  },

  connectSlot(input: ConnectSlotInput): Promise<ModemSlot> {
    return invoke<ModemSlot>(modemChannels.connectSlot, input)
  },

  disconnectSlot(input: DisconnectSlotInput): Promise<ModemSlot> {
    return invoke<ModemSlot>(modemChannels.disconnectSlot, input)
  },

  sendUssd(input: SendUssdInput): Promise<SendUssdResult> {
    return invoke<SendUssdResult>(modemChannels.sendUssd, input)
  },

  checkBalance(operator: OperatorKey, slotIndex?: SlotIndex): Promise<SendUssdResult> {
    return invoke<SendUssdResult>(modemChannels.checkBalance, { operator, slotIndex })
  },
}
