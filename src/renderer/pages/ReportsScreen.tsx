import { useState } from 'react'
import { useReport, reportsMessages } from '@renderer/features/reports'
import { useSession } from '@renderer/features/auth'
import { formatDa } from '@shared/money'
import { ui } from '@renderer/shared/messages.ar'
import type { GetReportInput } from '@shared/contracts/reports'
import { IconFileCsv } from '@renderer/shared/ui/icons'

type PeriodOption = GetReportInput['period']

export function ReportsScreen() {
  const session = useSession()
  const isAdmin = session.data?.user.role === 'admin'

  const [period, setPeriod] = useState<PeriodOption>('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const reportQuery = useReport({
    period,
    startDate: period === 'custom' && customStart ? customStart : undefined,
    endDate: period === 'custom' && customEnd ? customEnd : undefined,
  })

  const report = reportQuery.data
  const summary = report?.summary

  // تصدير كملف CSV
  const handleExportCsv = () => {
    if (!report) return
    const rows: string[][] = [
      ['AN Flexy Report', report.period, report.startDate, report.endDate],
      [],
      ['Summary'],
      ['Total Sales (DA)', formatDa(report.summary.totalSales)],
      ...(isAdmin && report.summary.totalProfit !== null
        ? [['Total Profit (DA)', formatDa(report.summary.totalProfit)]]
        : []),
      ['Sales Count', String(report.summary.salesCount)],
      ['Debt Created (DA)', formatDa(report.summary.totalDebtCreated)],
      ['Debt Paid (DA)', formatDa(report.summary.totalDebtPaid)],
      [],
      ['By Operator', 'Sales (DA)', ...(isAdmin ? ['Profit (DA)'] : []), 'Count'],
      ...report.byOperator.map((o) => [
        o.operatorName,
        formatDa(o.totalSales),
        ...(isAdmin && o.totalProfit !== null ? [formatDa(o.totalProfit)] : []),
        String(o.count),
      ]),
      [],
      ['By User', 'Sales (DA)', 'Count'],
      ...report.byUser.map((u) => [u.userName, formatDa(u.totalSales), String(u.count)]),
      [],
      ['By Day', 'Sales (DA)', ...(isAdmin ? ['Profit (DA)'] : []), 'Count'],
      ...report.byDay.map((d) => [
        d.date,
        formatDa(d.totalSales),
        ...(isAdmin && d.totalProfit !== null ? [formatDa(d.totalProfit)] : []),
        String(d.count),
      ]),
    ]

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `AN-Flexy-Report-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const periodButtons: { id: PeriodOption; label: string }[] = [
    { id: 'today', label: reportsMessages.periods.today },
    { id: 'yesterday', label: reportsMessages.periods.yesterday },
    { id: 'this_week', label: reportsMessages.periods.this_week },
    { id: 'this_month', label: reportsMessages.periods.this_month },
    { id: 'all', label: reportsMessages.periods.all },
    { id: 'custom', label: reportsMessages.periods.custom },
  ]

  return (
    <div className="space-y-6">
      {/* Header and Period Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">{reportsMessages.title}</h1>
          <p className="text-sm text-neutral-400">{reportsMessages.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {report && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:border-emerald-500 hover:text-emerald-300"
            >
              <IconFileCsv size={16} />
              <span>{reportsMessages.export.csv}</span>
            </button>
          )}
        </div>
      </div>

      {/* شريط اختيار الفترة الزمنية */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-2 backdrop-blur-sm">
        {periodButtons.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => setPeriod(btn.id)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              period === btn.id
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
            }`}
          >
            {btn.label}
          </button>
        ))}

        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 ps-2 border-s border-neutral-800">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-200 outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-neutral-500">—</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-200 outline-none focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      {reportQuery.isLoading && <p className="text-neutral-400">{ui.loading}</p>}

      {report && summary && (
        <>
          {/* بطاقات المؤشرات الرئيسية */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* إجمالي المبيعات */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg">
              <span className="text-xs font-medium text-neutral-400">{reportsMessages.metrics.totalSales}</span>
              <div className="mt-2 text-2xl font-bold font-mono text-neutral-100">{formatDa(summary.totalSales)}</div>
              <div className="mt-1 text-xs text-neutral-500">
                {summary.salesCount} {reportsMessages.metrics.salesCount}
              </div>
            </div>

            {/* إجمالي الأرباح — للمالك فقط */}
            {isAdmin && summary.totalProfit !== null && (
              <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-5 shadow-lg">
                <span className="text-xs font-medium text-emerald-400">{reportsMessages.metrics.totalProfit}</span>
                <div className="mt-2 text-2xl font-bold font-mono text-emerald-300">
                  {formatDa(summary.totalProfit)}
                </div>
                <div className="mt-1 text-xs text-emerald-600">
                  هامش الربح:{' '}
                  {summary.totalSales > 0
                    ? `${((summary.totalProfit / summary.totalSales) * 100).toFixed(2)}%`
                    : '0%'}
                </div>
              </div>
            )}

            {/* ديون جديدة */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg">
              <span className="text-xs font-medium text-neutral-400">{reportsMessages.metrics.debtCreated}</span>
              <div className="mt-2 text-2xl font-bold font-mono text-amber-400">
                {formatDa(summary.totalDebtCreated)}
              </div>
              <div className="mt-1 text-xs text-neutral-500">فارق المبيعات غير المدفوعة</div>
            </div>

            {/* ديون محصلة */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg">
              <span className="text-xs font-medium text-neutral-400">{reportsMessages.metrics.debtPaid}</span>
              <div className="mt-2 text-2xl font-bold font-mono text-teal-400">
                {formatDa(summary.totalDebtPaid)}
              </div>
              <div className="mt-1 text-xs text-neutral-500">دفعات تم تحصيلها خلال الفترة</div>
            </div>
          </div>

          {/* تفاصيل المبيعات */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* حسب المتعامل */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-lg space-y-4">
              <h2 className="text-base font-bold text-neutral-200">{reportsMessages.sections.byOperator}</h2>
              {report.byOperator.length === 0 ? (
                <p className="text-xs text-neutral-500">{reportsMessages.empty}</p>
              ) : (
                <div className="space-y-3">
                  {report.byOperator.map((op) => {
                    const percent =
                      summary.totalSales > 0 ? (op.totalSales / summary.totalSales) * 100 : 0
                    return (
                      <div key={op.operatorId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-neutral-200">{op.operatorName}</span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-neutral-100">{formatDa(op.totalSales)}</span>
                            {isAdmin && op.totalProfit !== null && (
                              <span className="text-emerald-400">({formatDa(op.totalProfit)})</span>
                            )}
                            <span className="text-neutral-500">{percent.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* حسب البائع / المستخدم */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-lg space-y-4">
              <h2 className="text-base font-bold text-neutral-200">{reportsMessages.sections.byUser}</h2>
              {report.byUser.length === 0 ? (
                <p className="text-xs text-neutral-500">{reportsMessages.empty}</p>
              ) : (
                <div className="divide-y divide-neutral-800">
                  {report.byUser.map((u) => (
                    <div key={u.userId} className="flex items-center justify-between py-2.5 text-xs">
                      <div>
                        <span className="font-semibold text-neutral-200">{u.userName}</span>
                        <div className="text-[10px] text-neutral-500">{u.count} عملية</div>
                      </div>
                      <span className="font-mono font-bold text-neutral-100">{formatDa(u.totalSales)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* حركة المبيعات اليومية */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-neutral-200">{reportsMessages.sections.byDay}</h2>
            {report.byDay.length === 0 ? (
              <p className="text-xs text-neutral-500">{reportsMessages.empty}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="border-b border-neutral-800 text-neutral-400">
                    <tr>
                      <th className="pb-2">{reportsMessages.table.date}</th>
                      <th className="pb-2">{reportsMessages.table.sales}</th>
                      {isAdmin && <th className="pb-2">{reportsMessages.table.profit}</th>}
                      <th className="pb-2">{reportsMessages.table.count}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 font-mono">
                    {report.byDay.map((d) => (
                      <tr key={d.date} className="hover:bg-neutral-800/40">
                        <td className="py-2.5 text-neutral-300 font-sans">{d.date}</td>
                        <td className="py-2.5 font-bold text-neutral-100">{formatDa(d.totalSales)}</td>
                        {isAdmin && (
                          <td className="py-2.5 text-emerald-400">
                            {d.totalProfit !== null ? formatDa(d.totalProfit) : '—'}
                          </td>
                        )}
                        <td className="py-2.5 text-neutral-400 font-sans">{d.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
