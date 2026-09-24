import { createReportsService } from './reports.service'
import { registerReportsIpc } from './reports.ipc'
import type { ReportsApi, ReportsDeps } from './reports.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function createReportsFeature(deps: ReportsDeps) {
  const api = createReportsService(deps)
  return { api, registerIpc: (ipc: IpcRegistry) => registerReportsIpc(ipc, api) }
}

export type { ReportsApi }
