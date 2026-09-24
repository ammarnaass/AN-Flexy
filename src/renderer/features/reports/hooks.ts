import { useQuery } from '@tanstack/react-query'
import { reportsApi } from './api'
import type { GetReportInput } from '@shared/contracts/reports'

export const reportsKeys = {
  all: ['reports'] as const,
  report: (input: GetReportInput) => ['reports', input.period, input.startDate, input.endDate] as const,
}

export function useReport(input: GetReportInput) {
  return useQuery({
    queryKey: reportsKeys.report(input),
    queryFn: () => reportsApi.get(input),
  })
}
