import { and, eq, isNull, gte, lte, sql } from 'drizzle-orm'
import { sales } from '@main/features/sales'
import { payments } from '@main/features/debts'
import { operators } from '@main/features/operators'
import { users } from '@main/features/auth'
import type { DB } from '@main/core/db/client'
import type { SessionUser } from '@shared/contracts/auth'
import type { FullReportResult, GetReportInput, ReportSummary, OperatorReportItem, UserReportItem, DailyReportItem } from '@shared/contracts/reports'

export interface ReportsDeps {
  db: DB
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function resolvePeriodDates(input: GetReportInput): { startDate: string; endDate: string } {
  const now = new Date()
  const todayStr = formatDateOnly(now)

  switch (input.period) {
    case 'today':
      return {
        startDate: `${todayStr} 00:00:00`,
        endDate: `${todayStr} 23:59:59`,
      }
    case 'yesterday': {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      const yStr = formatDateOnly(y)
      return {
        startDate: `${yStr} 00:00:00`,
        endDate: `${yStr} 23:59:59`,
      }
    }
    case 'this_week': {
      const w = new Date(now)
      w.setDate(w.getDate() - 6)
      return {
        startDate: `${formatDateOnly(w)} 00:00:00`,
        endDate: `${todayStr} 23:59:59`,
      }
    }
    case 'this_month': {
      const mStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01 00:00:00`
      return {
        startDate: mStart,
        endDate: `${todayStr} 23:59:59`,
      }
    }
    case 'last_month': {
      const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthEnd = new Date(firstThisMonth.getTime() - 1)
      const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1)
      return {
        startDate: `${formatDateOnly(lastMonthStart)} 00:00:00`,
        endDate: `${formatDateOnly(lastMonthEnd)} 23:59:59`,
      }
    }
    case 'all':
      return {
        startDate: '1970-01-01 00:00:00',
        endDate: '2099-12-31 23:59:59',
      }
    case 'custom': {
      const s = input.startDate ? `${input.startDate} 00:00:00` : `${todayStr} 00:00:00`
      const e = input.endDate ? `${input.endDate} 23:59:59` : `${todayStr} 23:59:59`
      return { startDate: s, endDate: e }
    }
  }
}

export function createReportsService(deps: ReportsDeps) {
  const { db } = deps

  return {
    getReport(input: GetReportInput, user: SessionUser): FullReportResult {
      const canViewProfit = user.role === 'admin'
      const { startDate, endDate } = resolvePeriodDates(input)

      // 1. إحصائيات المبيعات
      const salesFilter = and(
        isNull(sales.voidedAt),
        gte(sales.createdAt, startDate),
        lte(sales.createdAt, endDate),
      )

      const salesSummaryRow = db
        .select({
          totalSales: sql<number>`coalesce(sum(${sales.amount}), 0)`,
          totalProfit: sql<number>`coalesce(sum(${sales.profit}), 0)`,
          salesCount: sql<number>`count(*)`,
          totalDebtCreated: sql<number>`coalesce(sum(${sales.amount} - ${sales.paidAmount}), 0)`,
        })
        .from(sales)
        .where(salesFilter)
        .get()

      // 2. إحصائيات الدفعات المستلمة للديون خلال نفس الفترة
      const paymentsFilter = and(
        gte(payments.createdAt, startDate),
        lte(payments.createdAt, endDate),
      )

      const paymentsRow = db
        .select({
          totalPaid: sql<number>`coalesce(sum(${payments.amount}), 0)`,
        })
        .from(payments)
        .where(paymentsFilter)
        .get()

      const summary: ReportSummary = {
        totalSales: Number(salesSummaryRow?.totalSales ?? 0),
        totalProfit: canViewProfit ? Number(salesSummaryRow?.totalProfit ?? 0) : null,
        salesCount: Number(salesSummaryRow?.salesCount ?? 0),
        totalDebtCreated: Number(salesSummaryRow?.totalDebtCreated ?? 0),
        totalDebtPaid: Number(paymentsRow?.totalPaid ?? 0),
      }

      // 3. حسب المتعامل
      const byOpRows = db
        .select({
          operatorId: sales.operatorId,
          operatorName: operators.name,
          totalSales: sql<number>`coalesce(sum(${sales.amount}), 0)`,
          totalProfit: sql<number>`coalesce(sum(${sales.profit}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(sales)
        .innerJoin(operators, eq(sales.operatorId, operators.id))
        .where(salesFilter)
        .groupBy(sales.operatorId, operators.name)
        .all()

      const byOperator: OperatorReportItem[] = byOpRows.map((r) => ({
        operatorId: r.operatorId,
        operatorName: r.operatorName,
        totalSales: Number(r.totalSales),
        totalProfit: canViewProfit ? Number(r.totalProfit) : null,
        count: Number(r.count),
      }))

      // 4. حسب البائع / المستخدم
      const byUserRows = db
        .select({
          userId: sales.userId,
          userName: users.name,
          totalSales: sql<number>`coalesce(sum(${sales.amount}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(sales)
        .innerJoin(users, eq(sales.userId, users.id))
        .where(salesFilter)
        .groupBy(sales.userId, users.name)
        .all()

      const byUser: UserReportItem[] = byUserRows.map((r) => ({
        userId: r.userId,
        userName: r.userName,
        totalSales: Number(r.totalSales),
        count: Number(r.count),
      }))

      // 5. حسب اليوم
      const byDayRows = db
        .select({
          date: sql<string>`substr(${sales.createdAt}, 1, 10)`,
          totalSales: sql<number>`coalesce(sum(${sales.amount}), 0)`,
          totalProfit: sql<number>`coalesce(sum(${sales.profit}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(sales)
        .where(salesFilter)
        .groupBy(sql`substr(${sales.createdAt}, 1, 10)`)
        .orderBy(sql`substr(${sales.createdAt}, 1, 10) asc`)
        .all()

      const byDay: DailyReportItem[] = byDayRows.map((r) => ({
        date: r.date,
        totalSales: Number(r.totalSales),
        totalProfit: canViewProfit ? Number(r.totalProfit) : null,
        count: Number(r.count),
      }))

      return {
        period: input.period,
        startDate,
        endDate,
        summary,
        byOperator,
        byUser,
        byDay,
      }
    },
  }
}

export type ReportsApi = ReturnType<typeof createReportsService>
