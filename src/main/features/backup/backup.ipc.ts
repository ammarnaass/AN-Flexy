import { backupChannels, restoreBackupInputSchema } from '@shared/contracts/backup'
import { emptyInput } from '@shared/contracts/auth'
import type { BackupApi } from './backup.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function registerBackupIpc(ipc: IpcRegistry, api: BackupApi): void {
  ipc.handle(backupChannels.create, {
    input: emptyInput,
    permission: 'backup.manage',
    run: (_input, ctx) => api.createBackup(ctx.user),
  })

  ipc.handle(backupChannels.list, {
    input: emptyInput,
    permission: 'backup.manage',
    run: () => api.listBackups(),
  })

  ipc.handle(backupChannels.restore, {
    input: restoreBackupInputSchema,
    permission: 'backup.manage',
    run: (input, ctx) => api.restoreBackup(input, ctx.user),
  })
}
