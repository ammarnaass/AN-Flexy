import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { modemApi } from './api'
import type {
  ConnectSlotInput,
  DisconnectSlotInput,
  ModemConfig,
  OperatorKey,
  SendUssdInput,
  SlotIndex,
} from '@shared/contracts/modem'

export const modemKeys = {
  all: ['modem'] as const,
  ports: ['modem', 'ports'] as const,
  config: ['modem', 'config'] as const,
}

export function useModemPorts() {
  return useQuery({
    queryKey: modemKeys.ports,
    queryFn: () => modemApi.listPorts(),
    refetchInterval: 10000,
  })
}

export function useModemConfig() {
  return useQuery({
    queryKey: modemKeys.config,
    queryFn: () => modemApi.getConfig(),
  })
}

export function useSaveModemConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (config: ModemConfig) => modemApi.saveConfig(config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: modemKeys.all })
    },
  })
}

export function useAutoDetectModem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => modemApi.autoDetect(),
    onSuccess: (data) => {
      qc.setQueryData(modemKeys.config, data)
      qc.invalidateQueries({ queryKey: modemKeys.ports })
    },
  })
}

export function useConnectModemSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ConnectSlotInput) => modemApi.connectSlot(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: modemKeys.config })
    },
  })
}

export function useDisconnectModemSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: DisconnectSlotInput) => modemApi.disconnectSlot(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: modemKeys.config })
    },
  })
}

export function useSendUssd() {
  return useMutation({
    mutationFn: (input: SendUssdInput) => modemApi.sendUssd(input),
  })
}

export function useCheckBalance() {
  return useMutation({
    mutationFn: ({ operator, slotIndex }: { operator: OperatorKey; slotIndex?: SlotIndex }) =>
      modemApi.checkBalance(operator, slotIndex),
  })
}
