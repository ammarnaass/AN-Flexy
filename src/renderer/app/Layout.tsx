import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLogout, useSession, LockScreen } from '@renderer/features/auth'
import { useSettingsList } from '@renderer/features/settings'

const NAV_ITEMS = [
  { to: '/', label: 'لوحة التحكم', end: true, icon: 'dashboard', shortcut: 'F1' },
  { to: '/sale', label: 'بيع سريع (فليكسي)', end: false, icon: 'flash_on', shortcut: 'Space' },
  { to: '/stock', label: 'المخزون والأرصدة', end: false, icon: 'sim_card', shortcut: 'F3' },
  { to: '/customers', label: 'الزبائن والديون', end: false, icon: 'receipt_long', shortcut: 'F2' },
  { to: '/reports', label: 'التقارير والمبيعات', end: false, icon: 'analytics', shortcut: 'F4' },
  { to: '/settings', label: 'الإعدادات والمزامنة', end: false, icon: 'settings', shortcut: 'F9' },
] as const

export function Layout() {
  const session = useSession()
  const logout = useLogout()
  const location = useLocation()
  const navigate = useNavigate()
  const settingsList = useSettingsList()

  const [currentTime, setCurrentTime] = useState<string>('')
  const [isLocked, setIsLocked] = useState<boolean>(false)

  // Live ticking clock in POS format
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Global POS Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't override if typing in an input unless it is Ctrl+N or F12
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      if (e.key === 'F12') {
        e.preventDefault()
        setIsLocked(true)
        return
      }

      if (e.ctrlKey && (e.key === 'n' || e.key === 'N' || e.key === 'ى')) {
        e.preventDefault()
        navigate('/sale')
        return
      }

      if (!isInput) {
        if (e.key === 'F1') {
          e.preventDefault()
          navigate('/')
        } else if (e.key === 'F2') {
          e.preventDefault()
          navigate('/customers')
        } else if (e.key === 'F3') {
          e.preventDefault()
          navigate('/stock')
        } else if (e.key === 'F4') {
          e.preventDefault()
          navigate('/reports')
        } else if (e.key === 'F9') {
          e.preventDefault()
          navigate('/settings')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  const user = session.data?.user
  const userName = user?.name ?? 'أمين بلقاسم'
  const userRole = user?.role === 'admin' ? 'مالك' : 'كاشير'

  const shopName =
    settingsList.data?.find((s) => s.key === 'shop_name')?.value || 'متجر الوفاء للاتصالات'

  const isSalePage = location.pathname === '/sale'

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface text-on-surface font-tajawal antialiased select-none">
      {isLocked && (
        <LockScreen
          cashierName={userName}
          cashierRole={userRole === 'مالك' ? 'مشرف الوردية الأولى • رتبة مدير' : 'كاشير نقطة البيع'}
          shopName={shopName}
          onUnlock={() => setIsLocked(false)}
          onLogout={() => {
            setIsLocked(false)
            logout.mutate()
          }}
        />
      )}
      {/* الشريط الجانبي الأيمن (Fixed POS Sidebar) */}
      <aside className="w-72 shrink-0 h-full bg-surface-container-low shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-s border-outline-variant/30 flex flex-col justify-between p-space-md z-40">
        <div className="flex flex-col gap-space-md">
          {/* Logo & POS Brand */}
          <div className="flex items-center gap-space-sm px-space-xs py-space-xs">
            <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-none font-bold font-cairo">
                AN-Flexy POS
              </span>
              <span
                className="font-label-sm text-label-sm text-on-surface-variant font-mono mt-0.5"
                dir="ltr"
              >
                نظام الاتصالات v2.4
              </span>
            </div>
          </div>

          {/* Quick Sale CTA Button */}
          <div className="p-space-xs">
            <button
              type="button"
              onClick={() => navigate('/sale')}
              className="w-full flex items-center justify-between px-space-md py-space-sm bg-primary-container text-on-primary rounded-lg font-headline-sm text-headline-sm shadow-sm hover:bg-primary transition-all cursor-pointer font-cairo"
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                <span>بيع جديد</span>
              </div>
              <span
                className="bg-on-primary-container text-on-primary-fixed font-label-sm text-label-sm px-space-xs py-0.5 rounded font-mono font-bold"
                dir="ltr"
              >
                Ctrl+N
              </span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-md py-space-sm rounded-lg transition-colors ${
                    isActive
                      ? 'bg-surface-container-high text-primary font-bold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
                  }`
                }
              >
                <div className="flex items-center gap-space-md">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="font-body-md text-body-md">{item.label}</span>
                </div>
                <span
                  className="font-label-sm text-label-sm text-on-surface-variant font-mono"
                  dir="ltr"
                >
                  {item.shortcut}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Quick Shortcut Keys Hint Card */}
        <div className="bg-surface-container rounded-lg p-space-sm flex flex-col gap-space-xs">
          <div className="text-label-sm font-label-sm text-on-surface-variant font-bold">
            مفاتيح الوصول السريع:
          </div>
          <div className="grid grid-cols-2 gap-space-xs text-label-sm font-label-sm">
            <div className="flex items-center justify-between bg-surface-container-lowest px-1.5 py-0.5 rounded">
              <span className="text-on-surface-variant">فليكسي</span>
              <span className="text-primary font-bold font-mono" dir="ltr">
                F1
              </span>
            </div>
            <div className="flex items-center justify-between bg-surface-container-lowest px-1.5 py-0.5 rounded">
              <span className="text-on-surface-variant">ديون</span>
              <span className="text-primary font-bold font-mono" dir="ltr">
                F2
              </span>
            </div>
            <div className="flex items-center justify-between bg-surface-container-lowest px-1.5 py-0.5 rounded">
              <span className="text-on-surface-variant">مخزون</span>
              <span className="text-primary font-bold font-mono" dir="ltr">
                F3
              </span>
            </div>
            <div className="flex items-center justify-between bg-surface-container-lowest px-1.5 py-0.5 rounded">
              <span className="text-tertiary font-bold">إلغاء</span>
              <span className="text-tertiary font-bold font-mono" dir="ltr">
                ESC
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* المحتوى الرئيسي وشريط الرأس العلوي */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* شريط الرأس العلوي (Header) */}
        <header className="h-14 shrink-0 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-30 flex items-center justify-between px-space-lg">
          {/* متجر + كاشير + حالة الاتصال */}
          <div className="flex items-center gap-space-lg">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">storefront</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
                {shopName}
              </span>
            </div>
            <div className="h-4 w-px bg-outline-variant/40" />
            <div className="flex items-center gap-space-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">badge</span>
              <span className="font-body-md text-body-md">
                البائع:{' '}
                <span className="text-on-surface font-bold">
                  {userName} ({userRole})
                </span>
              </span>
            </div>
            <div className="h-4 w-px bg-outline-variant/40" />
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
              <span>متصل محلياً (Offline-Ready)</span>
            </div>
          </div>

          {/* التوقيت + قفل الكاسة + الأيقونة */}
          <div className="flex items-center gap-space-md">
            <div
              className="flex items-center gap-space-xs bg-surface-container-low px-space-sm py-1 rounded font-currency-display text-label-lg text-primary tracking-wider font-mono"
              dir="ltr"
            >
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>{currentTime || '00:00:00'}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsLocked(true)}
              className="flex items-center gap-1 px-space-sm py-1 bg-surface-container-highest hover:bg-surface-container text-on-surface rounded text-label-md font-label-md transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">lock_person</span>
              <span>قفل الكاسة</span>
            </button>

            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </header>

        {/* مساحة الصفحات */}
        <main
          className={`flex-1 overflow-y-auto bg-surface ${
            isSalePage ? 'p-space-lg' : 'p-space-lg pb-12'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
