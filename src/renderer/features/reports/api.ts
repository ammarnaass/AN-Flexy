import { invoke } from '@renderer/shared/api'
import { reportsChannels } from '@shared/contracts/reports'
import type { FullReportResult, GetReportInput } from '@shared/contracts/reports'

export const reportsApi = {
  get(input: GetReportInput): Promise<FullReportResult> {
    return invoke<FullReportResult>(reportsChannels.getReport, input)
  },
}
