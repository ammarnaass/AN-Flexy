import { reportsChannels, getReportInputSchema } from '@shared/contracts/reports'
import type { ReportsApi } from './reports.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function registerReportsIpc(ipc: IpcRegistry, api: ReportsApi): void {
  ipc.handle(reportsChannels.getReport, {
    input: getReportInputSchema,
    permission: 'reports.view',
    run: (input, ctx) => api.getReport(input, ctx.user),
  })
}
