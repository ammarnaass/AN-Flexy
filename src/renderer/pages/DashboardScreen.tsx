import { Link } from 'react-router-dom'
import { useSalesBalances, useRecentSales } from '@renderer/features/sales'
import { useDebtors } from '@renderer/features/debts'
import { useReport } from '@renderer/features/reports'
import { useSession } from '@renderer/features/auth'
import { ui } from '@renderer/shared/messages.ar'
import { formatDa } from '@shared/money'
import {
  IconSale,
  IconCheck,
  IconClock,
  IconClose,
  IconAlert,
  IconRefresh,
} from '@renderer/shared/ui/icons'
import { useQueryClient } from '@tanstack/react-query'

const dash = {
  title: 'لوحة التحكم',
  subtitle: 'نظرة عامة على الأرصدة الحالية والمبيعات اليومية',
  todaySales: 'مبيعات اليوم',
  todayProfit: 'ربح اليوم',
  todayCount: 'عدد العمليات اليوم',
  totalDebts: 'ديون مستحقة',
  recentOps: 'آخر العمليات',
  noOps: 'لا توجد مبيعات سابقة اليوم.',
  voided: 'ملغاة',
  debt: 'دين',
  completed: 'مكتملة',
  newSale: 'بيع جديد',
  refresh: 'تحديث',
  lowBalance: 'رصيد منخفض',
  zeroBalance: 'رصيد منتهٍ',
} as const

export function DashboardScreen() {
  const queryClient = useQueryClient()
  const session = useSession()
  const balances = useSalesBalances(false)
  const recentSales = useRecentSales(15)
  const debtors = useDebtors(50)
  const todayReport = useReport({ period: 'today' })

  const isAdmin = session.data?.user.role === 'admin'

  const totalDebts = (debtors.data ?? []).reduce((sum, d) => sum + d.totalDebt, 0)
  const todaySalesTotal = todayReport.data?.summary.totalSales ?? 0
  const todayProfitTotal = todayReport.data?.summary.totalProfit ?? null
  const todaySalesCount = todayReport.data?.summary.salesCount ?? 0

  const handleRefresh = () => {
    queryClient.invalidateQueries()
  }

  return (
    <div className="space-y-8">
      {/* الرأس مع زر البيع السريع وزر التحديث */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{dash.title}</h1>
          <p className="text-xs text-slate-400">{dash.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            title={dash.refresh}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
          >
            <IconRefresh size={15} />
            <span>{dash.refresh}</span>
          </button>

          <Link
            to="/sale"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950 transition-all hover:from-emerald-500 hover:to-teal-500"
          >
            <IconSale size={16} />
            <span>{dash.newSale}</span>
          </Link>
        </div>
      </div>

      {/* بطاقات أرصدة المتعاملين الثلاثة */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">أرصدة المتعاملين الحالية</span>
          <Link to="/stock" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
            إدارة المخزون والشحن ←
          </Link>
        </div>

        {balances.isLoading ? (
          <p className="text-xs text-slate-400">{ui.loading}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(balances.data ?? []).map((b) => {
              const isLow = b.balance > 0 && b.balance <= b.lowBalanceAt
              const isZero = b.balance <= 0

              // تمييز ألوان حسب اسم المتعامل
              const isMobilis = b.name.toLowerCase().includes('mobilis') || b.name.includes('موبيليس')
              const isDjezzy = b.name.toLowerCase().includes('djezzy') || b.name.includes('جيزي')
              const isOoredoo = b.name.toLowerCase().includes('ooredoo') || b.name.includes('أوريدو')

              return (
                <Link
                  key={b.operatorId}
                  to="/stock"
                  className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition-all hover:-translate-y-0.5 ${
                    isZero
                      ? 'border-red-900/60 bg-red-950/20 text-red-200 glow-red'
                      : isLow
                        ? 'border-amber-900/60 bg-amber-950/20 text-amber-200 glow-amber'
                        : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isMobilis
                            ? 'bg-emerald-500'
                            : isDjezzy
                              ? 'bg-red-500'
                              : isOoredoo
                                ? 'bg-rose-500'
                                : 'bg-slate-400'
                        }`}
                      />
                      <span className="text-sm font-bold text-white">{b.name}</span>
                    </div>

                    {isZero ? (
                      <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                        <IconAlert size={12} />
                        <span>{dash.zeroBalance}</span>
                      </span>
                    ) : isLow ? (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        <IconAlert size={12} />
                        <span>{dash.lowBalance}</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        رصيد نشط
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <span className="text-xs text-slate-400">الرصيد المتاح:</span>
                    <div
                      className={`text-2xl font-black font-mono tracking-tight ${
                        isZero
                          ? 'text-red-400'
                          : isLow
                            ? 'text-amber-300'
                            : 'text-white'
                      }`}
                    >
                      {formatDa(b.balance)}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-3 text-[11px] text-slate-400">
                    <span>إجمالي المشحون: {formatDa(b.creditTotal)}</span>
                    <span className="text-emerald-400 group-hover:underline">تفاصيل ←</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* بطاقات مؤشرات اليوم */}
      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">مؤشرات الأداء اليوم</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* مبيعات اليوم */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-lg">
            <span className="text-xs font-medium text-slate-400">{dash.todaySales}</span>
            <div className="mt-2 text-2xl font-black font-mono text-white">{formatDa(todaySalesTotal)}</div>
            <div className="mt-1 text-[11px] text-slate-400">
              {todaySalesCount} {dash.todayCount}
            </div>
          </div>

          {/* ربح اليوم — للمالك فقط */}
          {isAdmin && todayProfitTotal !== null && (
            <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/20 p-5 shadow-lg glow-emerald">
              <span className="text-xs font-medium text-emerald-400">{dash.todayProfit}</span>
              <div className="mt-2 text-2xl font-black font-mono text-emerald-300">
                {formatDa(todayProfitTotal)}
              </div>
              <div className="mt-1 text-[11px] text-emerald-500">
                هامش صافي الربح للمبيعات
              </div>
            </div>
          )}

          {/* ديون مستحقة */}
          <div
            className={`rounded-2xl border p-5 shadow-lg ${
              totalDebts > 0
                ? 'border-amber-900/50 bg-amber-950/15'
                : 'border-slate-800/80 bg-slate-900/50'
            }`}
          >
            <span className="text-xs font-medium text-slate-400">{dash.totalDebts}</span>
            <div
              className={`mt-2 text-2xl font-black font-mono ${
                totalDebts > 0 ? 'text-amber-400' : 'text-slate-200'
              }`}
            >
              {formatDa(totalDebts)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {debtors.data?.length ?? 0} زبون مدين
            </div>
          </div>

          {/* متوسط العملية */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-lg">
            <span className="text-xs font-medium text-slate-400">متوسط قيمة البيع</span>
            <div className="mt-2 text-2xl font-black font-mono text-slate-200">
              {todaySalesCount > 0 ? formatDa(Math.round(todaySalesTotal / todaySalesCount)) : '0 دج'}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">معدل العمليات الناجحة</div>
          </div>
        </div>
      </div>

      {/* آخر العمليات */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200">{dash.recentOps}</h2>
          <Link to="/reports" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
            كل التقارير ←
          </Link>
        </div>

        {!recentSales.data || recentSales.data.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">{dash.noOps}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="pb-2.5 font-semibold">الوقت</th>
                  <th className="pb-2.5 font-semibold">المتعامل</th>
                  <th className="pb-2.5 font-semibold">رقم الهاتف</th>
                  <th className="pb-2.5 font-semibold">المبلغ</th>
                  <th className="pb-2.5 font-semibold text-left">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {recentSales.data.map((s) => {
                  const isVoid = !!s.voidedAt
                  const isPartial = !isVoid && s.paidAmount < s.amount

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/30">
                      <td className="py-3 text-slate-400 font-sans">
                        {new Date(s.createdAt).toLocaleTimeString('ar-DZ', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 font-semibold text-slate-200 font-sans">
                        {balances.data?.find((b) => b.operatorId === s.operatorId)?.name ?? `ID ${s.operatorId}`}
                      </td>
                      <td className="py-3 text-slate-300" dir="ltr">
                        {s.targetPhone}
                      </td>
                      <td className="py-3 font-bold text-white font-mono">{formatDa(s.amount)}</td>
                      <td className="py-3 text-left font-sans">
                        {isVoid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-red-400">
                            <IconClose size={10} />
                            <span>{dash.voided}</span>
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
                            <IconClock size={10} />
                            <span>{dash.debt}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                            <IconCheck size={10} />
                            <span>{dash.completed}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
