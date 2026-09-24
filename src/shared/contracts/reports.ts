import { z } from 'zod'

export const reportsChannels = {
  getReport: 'reports:get',
} as const

export const getReportInputSchema = z.object({
  period: z.enum(['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'all', 'custom']).default('today'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export type GetReportInput = z.infer<typeof getReportInputSchema>

export interface ReportSummary {
  totalSales: number // بالسنتيم
  totalProfit: number | null // بالسنتيم (للمالك فقط، null للبائع)
  salesCount: number
  totalDebtCreated: number // الديون التي أُنشئت في هذه الفترة
  totalDebtPaid: number // الدفعات التي حُصّلت في هذه الفترة
}

export interface OperatorReportItem {
  operatorId: number
  operatorName: string
  totalSales: number
  totalProfit: number | null
  count: number
}

export interface UserReportItem {
  userId: number
  userName: string
  totalSales: number
  count: number
}

export interface DailyReportItem {
  date: string // YYYY-MM-DD
  totalSales: number
  totalProfit: number | null
  count: number
}

export interface FullReportResult {
  period: string
  startDate: string
  endDate: string
  summary: ReportSummary
  byOperator: OperatorReportItem[]
  byUser: UserReportItem[]
  byDay: DailyReportItem[]
}
