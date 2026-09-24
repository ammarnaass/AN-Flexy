import { createBackupService } from './backup.service'
import { registerBackupIpc } from './backup.ipc'
import type { BackupApi, BackupDeps } from './backup.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function createBackupFeature(deps: BackupDeps) {
  const api = createBackupService(deps)
  return { api, registerIpc: (ipc: IpcRegistry) => registerBackupIpc(ipc, api) }
}

export type { BackupApi, BackupDeps }
