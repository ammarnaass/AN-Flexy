import { z } from 'zod'

export const backupChannels = {
  create: 'backup:create',
  list: 'backup:list',
  restore: 'backup:restore',
} as const

export const BACKUP_ERRORS = {
  BACKUP_FAILED: 'BACKUP_FAILED',
  BACKUP_NOT_FOUND: 'BACKUP_NOT_FOUND',
  CORRUPTED_BACKUP: 'CORRUPTED_BACKUP',
} as const

export const backupItemSchema = z.object({
  filename: z.string(),
  sizeBytes: z.number(),
  createdAt: z.string(),
})

export type BackupItem = z.infer<typeof backupItemSchema>

export const restoreBackupInputSchema = z.object({
  filename: z.string().min(1),
})

export type RestoreBackupInput = z.infer<typeof restoreBackupInputSchema>
