import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from './api'
import type { SetSettingInput, SettingKey } from '@shared/contracts/settings'

export const settingsKeys = {
  all: ['settings'] as const,
  list: ['settings', 'list'] as const,
  detail: (key: SettingKey) => ['settings', 'detail', key] as const,
}

export function useSettingsList() {
  return useQuery({
    queryKey: settingsKeys.list,
    queryFn: () => settingsApi.list(),
  })
}

export function useSetting(key: SettingKey) {
  return useQuery({
    queryKey: settingsKeys.detail(key),
    queryFn: () => settingsApi.get(key),
  })
}

export function useSetSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SetSettingInput) => settingsApi.set(input.key, input.value),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.all }),
  })
}
