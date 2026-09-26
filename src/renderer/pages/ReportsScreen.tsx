import { useState, useMemo } from 'react'
import { useReport } from '@renderer/features/reports'
import { useSession } from '@renderer/features/auth'
import { formatDa } from '@shared/money'
import type { GetReportInput } from '@shared/contracts/reports'

type PeriodOption = GetReportInput['period']
type ActiveTab = 'operators' | 'cashiers' | 'cash_flow'

export function ReportsScreen() {
  const session = useSession()
  const isAdmin = session.data?.user.role === 'admin'

  const [period, setPeriod] = useState<PeriodOption>('today')
  const [activeTab, setActiveTab] = useState<ActiveTab>('operators')
  const [showZReportModal, setShowZReportModal] = useState(false)

  const reportQuery = useReport({
    period,
  })

  const report = reportQuery.data
  const summary = report?.summary

  // Export CSV
  const handleExportCsv = () => {
    if (!report) return
    const rows: string[][] = [
      ['AN Flexy - تقرير المبيعات والنشاط', report.period, report.startDate, report.endDate],
      [],
      ['الملخص العام'],
      ['إجمالي المبيعات (د.ج)', formatDa(report.summary.totalSales)],
      ...(isAdmin && report.summary.totalProfit !== null
        ? [['صافي الأرباح (د.ج)', formatDa(report.summary.totalProfit)]]
        : []),
      ['عدد العمليات', String(report.summary.salesCount)],
      ['الديون الصادرة (د.ج)', formatDa(report.summary.totalDebtCreated)],
      ['الديون المحصلة (د.ج)', formatDa(report.summary.totalDebtPaid)],
      [],
      ['حسب المتعامل', 'المبيعات (د.ج)', ...(isAdmin ? ['الربح (د.ج)'] : []), 'عدد العمليات'],
      ...report.byOperator.map((o) => [
        o.operatorName,
        formatDa(o.totalSales),
        ...(isAdmin && o.totalProfit !== null ? [formatDa(o.totalProfit)] : []),
        String(o.count),
      ]),
      [],
      ['حسب البائع', 'المبيعات (د.ج)', 'عدد العمليات'],
      ...report.byUser.map((u) => [u.userName, formatDa(u.totalSales), String(u.count)]),
    ]

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `AN-Flexy-Report-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Calculated Metrics
  const totalSales = summary?.totalSales ?? 0
  const totalProfit = summary?.totalProfit ?? 0
  const salesCount = summary?.salesCount ?? 0
  const debtCreated = summary?.totalDebtCreated ?? 0
  const debtPaid = summary?.totalDebtPaid ?? 0
  const cashInDrawer = totalSales - debtCreated + debtPaid

  // Peak hours dummy hourly distribution (visual curve matching _3/code.html)
  const hourlyData = useMemo(() => {
    const hours = [
      { hour: '08:00', percent: 15, count: 4 },
      { hour: '09:00', percent: 30, count: 8 },
      { hour: '10:00', percent: 65, count: 18 },
      { hour: '11:00', percent: 85, count: 24, peak: true },
      { hour: '12:00', percent: 50, count: 14 },
      { hour: '13:00', percent: 35, count: 9 },
      { hour: '14:00', percent: 45, count: 12 },
      { hour: '15:00', percent: 70, count: 20 },
      { hour: '16:00', percent: 90, count: 26, peak: true },
      { hour: '17:00', percent: 100, count: 32, peak: true },
      { hour: '18:00', percent: 75, count: 22 },
      { hour: '19:00', percent: 60, count: 16 },
      { hour: '20:00', percent: 40, count: 11 },
      { hour: '21:00', percent: 20, count: 5 },
    ]
    return hours
  }, [])

  const getOpColor = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('mobilis') || n.includes('موبيليس')) return '#16a34a'
    if (n.includes('djezzy') || n.includes('جيزي')) return '#ea580c'
    return '#dc2626'
  }

  return (
    <div className="flex flex-col w-full pb-12 gap-space-md">
      {/* 1. Header & Period Filter Bar */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-wrap items-center justify-between gap-space-md">
        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30 font-cairo font-bold text-body-sm">
          <button
            type="button"
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              period === 'today'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <span>اليوم (F5)</span>
          </button>
          <button
            type="button"
            onClick={() => setPeriod('yesterday')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              period === 'yesterday'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            أمس
          </button>
          <button
            type="button"
            onClick={() => setPeriod('this_week')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              period === 'this_week'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            آخر 7 أيام
          </button>
          <button
            type="button"
            onClick={() => setPeriod('this_month')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              period === 'this_month'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            الشهر الحالي
          </button>
        </div>

        {/* Action Buttons: Z-Report, CSV, Print */}
        <div className="flex items-center gap-space-xs">
          <button
            type="button"
            onClick={() => setShowZReportModal(true)}
            className="flex items-center gap-1.5 px-space-md py-2 bg-primary-container hover:bg-primary text-on-primary rounded-lg text-body-md font-bold shadow-sm transition-colors cursor-pointer font-cairo"
          >
            <span className="material-symbols-outlined text-[18px]">receipt</span>
            <span>طباعة إغلاق الصندوق (Z-Report)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg text-body-md font-bold transition-colors cursor-pointer border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[18px]">table_view</span>
            <span>Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg border border-outline-variant/30 cursor-pointer"
            title="طباعة التقرير"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
          </button>
        </div>
      </div>

      {/* 2. 5 KPI Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-sm">
        {/* Metric 1: Total Sales */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
              إجمالي المبيعات
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
          </div>
          <div className="mt-2">
            <span
              className="font-currency-display text-label-lg font-bold font-mono text-on-surface"
              dir="ltr"
            >
              {formatDa(totalSales)}
            </span>
            <span className="text-[11px] text-on-surface-variant block mt-0.5">
              كل شبكات الفليكسي
            </span>
          </div>
        </div>

        {/* Metric 2: Net Profit */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
              الربح الإجمالي
            </span>
            <span className="material-symbols-outlined text-emerald-700 text-[20px]">
              trending_up
            </span>
          </div>
          <div className="mt-2">
            <span
              className="font-currency-display text-label-lg font-bold font-mono text-emerald-700"
              dir="ltr"
            >
              {isAdmin && totalProfit !== null ? formatDa(totalProfit) : '••••••'}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
              هامش العائد الصافي
            </span>
          </div>
        </div>

        {/* Metric 3: Operations Count */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
              عدد العمليات
            </span>
            <span className="material-symbols-outlined text-secondary text-[20px]">flash_on</span>
          </div>
          <div className="mt-2">
            <span
              className="font-currency-display text-label-lg font-bold font-mono text-on-surface"
              dir="ltr"
            >
              {salesCount} عملية
            </span>
            <span className="text-[11px] text-on-surface-variant block mt-0.5">
              معاملات شحن ناجحة
            </span>
          </div>
        </div>

        {/* Metric 4: Debt Volume */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
              حجم الديون
            </span>
            <span className="material-symbols-outlined text-tertiary text-[20px]">
              account_balance_wallet
            </span>
          </div>
          <div className="mt-2">
            <span
              className="font-currency-display text-label-lg font-bold font-mono text-tertiary"
              dir="ltr"
            >
              {formatDa(debtCreated)}
            </span>
            <span className="text-[11px] text-tertiary font-bold block mt-0.5">
              مبيعات مؤجلة الدفع
            </span>
          </div>
        </div>

        {/* Metric 5: Cash In Drawer */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
              النقد المقبوض
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">
              point_of_sale
            </span>
          </div>
          <div className="mt-2">
            <span
              className="font-currency-display text-label-lg font-bold font-mono text-primary"
              dir="ltr"
            >
              {formatDa(cashInDrawer)}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
              السيولة في الدرج الآن
            </span>
          </div>
        </div>
      </div>

      {/* 3. Peak Hours Distribution Curve Bar Chart */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px]">insights</span>
            <span>منحنى توزيع المبيعات الساعي وساعات الذروة (Peak Hours)</span>
          </h2>
          <span className="text-body-sm text-on-surface-variant">
            ذروة النشاط: 11:00 - 12:00 و 16:00 - 18:00
          </span>
        </div>

        {/* Hourly Bar Columns */}
        <div className="pt-6 pb-2 px-2 flex items-end justify-between gap-2 h-44 border-b border-outline-variant/30">
          {hourlyData.map((slot) => (
            <div
              key={slot.hour}
              className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
            >
              <span className="text-[10px] font-mono text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                {slot.count} op
              </span>
              <div
                className={`w-full max-w-[28px] rounded-t-md transition-all ${
                  slot.peak
                    ? 'bg-primary shadow-xs'
                    : 'bg-surface-container-high hover:bg-surface-container-highest'
                }`}
                style={{ height: `${slot.percent}%` }}
              />
              <span className="font-mono text-[11px] text-on-surface-variant mt-1" dir="ltr">
                {slot.hour.slice(0, 2)}h
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Tabbed Breakdowns: By Operator, By Cashier, Cash Flow */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-outline-variant/30 bg-surface-container-low px-space-md pt-2 gap-space-sm font-cairo font-bold text-body-sm">
          <button
            type="button"
            onClick={() => setActiveTab('operators')}
            className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'operators'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">cell_tower</span>
            <span>المبيعات حسب المتعامل (Operators)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cashiers')}
            className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'cashiers'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">badge</span>
            <span>أداء الكاشيرات والبائعين (Cashiers)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cash_flow')}
            className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'cash_flow'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span>مطابقة الصندوق والسيولة (Cash Flow)</span>
          </button>
        </div>

        {/* Tab 1: By Operator Table */}
        {activeTab === 'operators' && (
          <div className="p-space-md overflow-x-auto">
            <table className="w-full text-right text-body-sm border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant font-cairo text-[13px]">
                  <th className="py-2.5 px-3">المتعامل وشبكة التعبئة</th>
                  <th className="py-2.5 px-3">عدد العمليات</th>
                  <th className="py-2.5 px-3">إجمالي المبيعات (DZD)</th>
                  {isAdmin && <th className="py-2.5 px-3">هامش الربح (DZD)</th>}
                  <th className="py-2.5 px-3">نسبة الحصة في المبيعات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-tajawal">
                {report?.byOperator && report.byOperator.length > 0 ? (
                  report.byOperator.map((op) => {
                    const color = getOpColor(op.operatorName)
                    const share =
                      totalSales > 0 ? Math.round((op.totalSales / totalSales) * 100) : 0

                    return (
                      <tr
                        key={op.operatorId}
                        className="hover:bg-surface-container-low/50 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-bold text-on-surface text-body-md font-cairo">
                              {op.operatorName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-on-surface" dir="ltr">
                          {op.count}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-on-surface" dir="ltr">
                          {formatDa(op.totalSales)}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-3 font-mono font-bold text-emerald-700" dir="ltr">
                            {op.totalProfit !== null ? `+${formatDa(op.totalProfit)}` : '—'}
                          </td>
                        )}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-outline-variant/30 h-2 rounded-full overflow-hidden max-w-[140px]">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${share}%`, backgroundColor: color }}
                              />
                            </div>
                            <span
                              className="font-mono text-label-sm font-bold text-on-surface-variant"
                              dir="ltr"
                            >
                              {share}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                      لا توجد بيانات مبيعات مسجلة في هذه الفترة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: By Cashier / User Cards */}
        {activeTab === 'cashiers' && (
          <div className="p-space-md grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {report?.byUser && report.byUser.length > 0 ? (
              report.byUser.map((u) => (
                <div
                  key={u.userId}
                  className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[24px]">badge</span>
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
                        {u.userName}
                      </h3>
                      <span className="text-body-sm text-on-surface-variant font-mono">
                        {u.count} عملية بيع منفذة
                      </span>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-[11px] text-on-surface-variant block">المجموع:</span>
                    <span
                      className="font-currency-display text-label-lg font-bold text-on-surface"
                      dir="ltr"
                    >
                      {formatDa(u.totalSales)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-8 text-center text-on-surface-variant">
                لا توجد بيانات بائعين لهذه الفترة
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Cash Flow & Drawer Summary */}
        {activeTab === 'cash_flow' && (
          <div className="p-space-md flex flex-col gap-space-md">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
              <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1">
                <span className="text-body-sm text-on-surface-variant">
                  إجمالي المقبوض نقداً (كاش):
                </span>
                <span
                  className="font-currency-display text-headline-sm font-bold text-emerald-700 font-mono"
                  dir="ltr"
                >
                  +{formatDa(totalSales - debtCreated)}
                </span>
              </div>
              <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1">
                <span className="text-body-sm text-on-surface-variant">ديون سابقة تم تحصيلها:</span>
                <span
                  className="font-currency-display text-headline-sm font-bold text-emerald-700 font-mono"
                  dir="ltr"
                >
                  +{formatDa(debtPaid)}
                </span>
              </div>
              <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1">
                <span className="text-body-sm text-on-surface-variant">
                  الصافي المحسوب في الدرج:
                </span>
                <span
                  className="font-currency-display text-headline-sm font-bold text-primary font-mono"
                  dir="ltr"
                >
                  {formatDa(cashInDrawer)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Modal: Z-Report Thermal Print Preview (80mm) */}
      {showZReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/40 w-full max-w-sm p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-xs">
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
                معاينة تقرير الإغلاق (Z-Report)
              </span>
              <button
                type="button"
                onClick={() => setShowZReportModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Thermal Receipt Paper Style Box */}
            <div className="bg-white p-4 rounded-xl border border-dashed border-gray-400 font-mono text-xs text-gray-900 leading-relaxed shadow-inner">
              <div className="text-center font-bold text-sm mb-2">
                ========================
                <br />
                AN-FLEXY POS
                <br />
                تقرير إغلاق الصندوق (Z-REPORT)
                <br />
                ========================
              </div>
              <div className="flex justify-between">
                <span>التاريخ:</span>
                <span dir="ltr">{new Date().toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between">
                <span>التوقيت:</span>
                <span dir="ltr">{new Date().toLocaleTimeString('en-GB')}</span>
              </div>
              <div className="flex justify-between">
                <span>الكاشير:</span>
                <span>{session.data?.user.name ?? 'أمين'}</span>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="flex justify-between font-bold">
                <span>إجمالي المبيعات:</span>
                <span dir="ltr">{formatDa(totalSales)}</span>
              </div>
              <div className="flex justify-between">
                <span>عدد العمليات:</span>
                <span dir="ltr">{salesCount}</span>
              </div>
              <div className="flex justify-between">
                <span>ديون مسجلة:</span>
                <span dir="ltr">-{formatDa(debtCreated)}</span>
              </div>
              <div className="flex justify-between">
                <span>ديون محصلة:</span>
                <span dir="ltr">+{formatDa(debtPaid)}</span>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="flex justify-between font-bold text-sm">
                <span>النقد الصافي في الدرج:</span>
                <span dir="ltr">{formatDa(cashInDrawer)}</span>
              </div>
              <div className="text-center mt-3 text-[10px] text-gray-500">
                نهاية اليومية - شكراً لاستخدامكم النظام
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-2">
              <button
                type="button"
                onClick={() => setShowZReportModal(false)}
                className="px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-body-md cursor-pointer"
              >
                إغلاق (Esc)
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print()
                  setShowZReportModal(false)
                }}
                className="flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-primary text-on-primary font-bold text-body-md hover:bg-primary-container cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>طباعة حرارية (80mm)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
