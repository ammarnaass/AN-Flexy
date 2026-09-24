import { invoke } from '@renderer/shared/api'
import { backupChannels } from '@shared/contracts/backup'
import type { BackupItem, RestoreBackupInput } from '@shared/contracts/backup'

export const backupApi = {
  create(): Promise<BackupItem> {
    return invoke<BackupItem>(backupChannels.create)
  },

  list(): Promise<BackupItem[]> {
    return invoke<BackupItem[]>(backupChannels.list)
  },

  restore(input: RestoreBackupInput): Promise<{ success: boolean }> {
    return invoke<{ success: boolean }>(backupChannels.restore, input)
  },
}
