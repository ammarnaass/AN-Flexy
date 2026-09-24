import { NavLink, Outlet } from 'react-router-dom'
import { useLogout, useSession } from '@renderer/features/auth'
import { ui } from '@renderer/shared/messages.ar'
import {
  IconDashboard,
  IconSale,
  IconStock,
  IconCustomers,
  IconReports,
  IconSettings,
  IconLogout,
  IconUser,
} from '@renderer/shared/ui/icons'

const NAV_ITEMS = [
  { to: '/', label: ui.nav.dashboard, end: true, icon: IconDashboard },
  { to: '/sale', label: ui.nav.sale, end: false, icon: IconSale },
  { to: '/stock', label: ui.nav.stock, end: false, icon: IconStock },
  { to: '/customers', label: ui.nav.customersDebts, end: false, icon: IconCustomers },
  { to: '/reports', label: ui.nav.reports, end: false, icon: IconReports },
  { to: '/settings', label: ui.nav.settings, end: false, icon: IconSettings },
] as const

export function Layout() {
  const session = useSession()
  const logout = useLogout()
  const user = session.data?.user
  const userName = user?.name ?? ''
  const isAdmin = user?.role === 'admin'

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 antialiased overflow-hidden">
      {/* الشريط الجانبي */}
      <aside className="flex w-64 shrink-0 flex-col border-e border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-xl">
        {/* رأس التطبيق والشعار */}
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md shadow-emerald-500/20">
            <span className="font-mono text-base font-black text-white">AN</span>
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white">{ui.appName}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              <span>نظام محلي آمن</span>
            </div>
          </div>
        </div>

        {/* عناصر التنقل الرئيسية */}
        <nav className="flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600/15 text-emerald-300 ring-1 ring-emerald-500/30 shadow-sm shadow-emerald-950'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      className={isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute end-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* معلومات المستخدم وقفل/تسجيل الخروج في الأسفل */}
        <div className="mt-auto border-t border-slate-800/80 pt-4">
          <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-2.5 ring-1 ring-slate-800/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                <IconUser size={16} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-slate-200">{userName}</div>
                <div className="flex items-center gap-1">
                  <span
                    className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                      isAdmin ? 'bg-amber-500/15 text-amber-300' : 'bg-blue-500/15 text-blue-300'
                    }`}
                  >
                    {isAdmin ? 'المالك' : 'بائع'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => logout.mutate()}
              title={ui.logout}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-colors hover:border-red-900/50 hover:bg-red-950/40 hover:text-red-300"
            >
              <IconLogout size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* منطقة المحتوى الرئيسي */}
      <main className="h-full flex-1 overflow-y-auto bg-slate-950 p-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
