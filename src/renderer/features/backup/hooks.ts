import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { backupApi } from './api'
import type { RestoreBackupInput } from '@shared/contracts/backup'

export const backupKeys = {
  all: ['backup'] as const,
  list: ['backup', 'list'] as const,
}

export function useBackups() {
  return useQuery({
    queryKey: backupKeys.list,
    queryFn: () => backupApi.list(),
  })
}

export function useCreateBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => backupApi.create(),
    onSuccess: () => qc.invalidateQueries({ queryKey: backupKeys.all }),
  })
}

export function useRestoreBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RestoreBackupInput) => backupApi.restore(input),
    onSuccess: () => qc.invalidateQueries(),
  })
}
