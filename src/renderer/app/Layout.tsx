import { NavLink, Outlet } from 'react-router-dom'
import { useLogout, useSession } from '@renderer/features/auth'
import { ui } from '@renderer/shared/messages.ar'

const NAV_ITEMS = [
  { to: '/', label: ui.nav.dashboard, end: true },
  { to: '/sale', label: ui.nav.sale, end: false },
  { to: '/stock', label: ui.nav.stock, end: false },
  { to: '/customers', label: ui.nav.customers, end: false },
  { to: '/debts', label: ui.nav.debts, end: false },
  { to: '/reports', label: ui.nav.reports, end: false },
  { to: '/settings', label: ui.nav.settings, end: false },
] as const

// الهيكل العام: شريط جانبي (RTL) + منطقة المحتوى (RULES 10.1).
export function Layout() {
  const session = useSession()
  const logout = useLogout()
  const userName = session.data?.user.name ?? ''

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <aside className="flex w-56 shrink-0 flex-col gap-1 border-e border-neutral-800 p-3">
        <span className="mb-4 px-2 text-lg font-bold">{ui.appName}</span>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm ${
                isActive ? 'bg-emerald-600 font-medium text-white' : 'text-neutral-300 hover:bg-neutral-800'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-neutral-800 pt-3">
          <span className="truncate text-sm text-neutral-400">{userName}</span>
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            {ui.logout}
          </button>
        </div>
      </aside>
      <main className="h-full flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
