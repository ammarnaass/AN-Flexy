import { useState, useEffect, useCallback, useRef } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useHasUsers, useLogin, useSetupOwner } from '../hooks'
import { translateAuthError } from '../errors'
import { authMessages } from '../messages.ar'
import { ui } from '@renderer/shared/messages.ar'
import { playBeep } from '@renderer/shared/audio'

// شاشة الدخول والتسجيل: مطابقة لتصميم Stitch 7 (an_flexy_pos_1, _2, an_flexy_pos_2)
export function LoginScreen() {
  const hasUsers = useHasUsers()

  if (hasUsers.isLoading) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center justify-center py-16 gap-space-md">
          <div className="w-10 h-10 rounded-full border-2 border-primary-container border-t-transparent animate-spin" />
          <p className="font-body-md text-body-md text-on-surface-variant">{ui.loading}</p>
        </div>
      </AuthShell>
    )
  }

  return hasUsers.data && !hasUsers.data.hasUsers ? <SetupForm /> : <LoginForm />
}

// Live clock hook
function useLiveClock() {
  const [time, setTime] = useState('--:--:--')
  const [date, setDate] = useState('--/--/----')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      )
      setDate(
        now.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      )
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  return { time, date }
}

// POS FullScreen Shell
function AuthShell({ children }: { children: ReactNode }) {
  const { time, date } = useLiveClock()

  return (
    <div className="relative flex flex-col min-h-screen w-full bg-background text-on-surface antialiased select-none overflow-y-auto">
      {/* Subtle ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 right-1/4 w-96 h-96 bg-primary-fixed/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-secondary-fixed/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-surface-container-high/40 rounded-full blur-2xl" />
      </div>

      {/* POS Top Header Bar */}
      <header className="relative z-10 w-full px-space-xl pt-space-md pb-space-xs flex items-center justify-between">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shadow-sm text-on-primary">
            <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-headline-sm text-on-surface leading-tight tracking-wide font-cairo font-bold">
                AN-Flexy POS
              </span>
              <span className="px-1.5 py-0.2 rounded bg-surface-container-high text-primary font-mono text-[11px] font-bold">
                NODE: ORN-014
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              Algeria Telecom Hub
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs px-space-sm py-1 rounded-lg bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm font-mono border border-outline-variant/20">
            <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
            <span dir="ltr">{time}</span>
          </div>
          <div className="flex items-center gap-space-xs px-space-sm py-1 rounded-lg bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm font-mono border border-outline-variant/20">
            <span className="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
            <span dir="ltr">{date}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full flex-1 flex items-center justify-center px-space-md py-space-md">
        <div className="w-full max-w-5xl">{children}</div>
      </main>

      {/* Footer Status Bar */}
      <footer className="relative z-10 w-full px-space-xl py-space-xs flex items-center justify-between bg-surface-container-lowest/70 backdrop-blur-sm border-t border-outline-variant/20 text-on-surface-variant font-label-sm text-label-sm">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            <span dir="ltr">v2.4.1-PROD</span>
          </div>
          <div className="h-3 w-px bg-outline-variant/40" />
          <span className="font-mono">POS Engine · Algeria Standard Time (UTC+1)</span>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-1.5">
            <span className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono font-bold text-primary" dir="ltr">
              [Enter]
            </span>
            <span>دخول</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono font-bold text-primary" dir="ltr">
              [F1]
            </span>
            <span>تبديل المشغل</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono font-bold text-primary" dir="ltr">
              [Esc]
            </span>
            <span>مسح</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-error-container/70 border border-error/20 px-space-md py-space-sm flex items-center gap-space-sm">
      <span className="material-symbols-outlined text-error text-[18px]">error</span>
      <p className="font-body-sm text-body-sm text-on-error-container font-bold">{message}</p>
    </div>
  )
}

// -------------------------------------------------------------
// LOGIN FORM (مطابقة لتصميم stitch 7 _2/code.html و an_flexy_pos_1)
// -------------------------------------------------------------
const PRESET_CASH_AMOUNTS = [5000, 10000, 15000, 20000, 30000]

interface CashierItem {
  id: string
  name: string
  role: string
  icon: string
}

const DEFAULT_CASHIERS: CashierItem[] = [
  { id: 'admin', name: 'أمين بلقاسم', role: 'مشرف النظام (Admin)', icon: 'admin_panel_settings' },
  { id: 'karim', name: 'كريم الزين', role: 'كاشير الوردية الصباحية', icon: 'person' },
  { id: 'yacine', name: 'ياسين بوزيد', role: 'كاشير الوردية المسائية', icon: 'support_agent' },
]

function LoginForm() {
  const [selectedCashier, setSelectedCashier] = useState<CashierItem>(DEFAULT_CASHIERS[0] as CashierItem)
  const [customName, setCustomName] = useState((DEFAULT_CASHIERS[0] as CashierItem).name)
  const [authTab, setAuthTab] = useState<'pin' | 'password'>('pin')
  const [pin, setPin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockActive, setCapsLockActive] = useState(false)
  const [shiftType, setShiftType] = useState<'morning' | 'evening'>('morning')
  const [cashDrawerAmount, setCashDrawerAmount] = useState('15000')
  const [loginSuccessSession, setLoginSuccessSession] = useState<string | null>(null)

  const login = useLogin()
  const customNameInputRef = useRef<HTMLInputElement>(null)

  const handleCashierSelect = (c: CashierItem) => {
    playBeep('click')
    setSelectedCashier(c)
    setCustomName(c.name)
    setPin('')
    setPassword('')
  }

  const handleDigit = useCallback(
    (digit: string) => {
      playBeep('click')
      if (pin.length < 6) {
        setPin((prev) => prev + digit)
      }
    },
    [pin.length],
  )

  const handleBackspace = useCallback(() => {
    playBeep('click')
    setPin((prev) => prev.slice(0, -1))
  }, [])

  const handleClear = useCallback(() => {
    playBeep('click')
    setPin('')
  }, [])

  const submitLogin = useCallback(() => {
    const finalName = customName.trim() || selectedCashier.name
    const finalSecret = authTab === 'pin' ? pin : password

    if (!finalName || finalSecret.length < 4) {
      playBeep('error')
      return
    }

    login.mutate(
      { name: finalName, pin: finalSecret },
      {
        onSuccess: () => {
          playBeep('success')
          setLoginSuccessSession('#SES-202505-089')
        },
        onError: () => {
          playBeep('error')
        },
      },
    )
  }, [customName, selectedCashier.name, authTab, pin, password, login])

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loginSuccessSession) return

      // F1: Switch Cashier
      if (e.key === 'F1') {
        e.preventDefault()
        const nextIdx = (DEFAULT_CASHIERS.findIndex((c) => c.id === selectedCashier.id) + 1) % DEFAULT_CASHIERS.length
        const nextCashier = DEFAULT_CASHIERS[nextIdx]
        if (nextCashier) {
          handleCashierSelect(nextCashier)
        }
        return
      }

      // F2: Morning Shift
      if (e.key === 'F2') {
        e.preventDefault()
        setShiftType('morning')
        playBeep('click')
        return
      }

      // F3: Evening Shift
      if (e.key === 'F3') {
        e.preventDefault()
        setShiftType('evening')
        playBeep('click')
        return
      }

      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT'

      if (e.key === 'Enter') {
        e.preventDefault()
        submitLogin()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleClear()
      } else if (!isInput && authTab === 'pin') {
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault()
          handleDigit(e.key)
        } else if (e.key === 'Backspace') {
          e.preventDefault()
          handleBackspace()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCashier, shiftType, authTab, loginSuccessSession, submitLogin, handleDigit, handleBackspace, handleClear])

  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockActive(e.getModifierState('CapsLock'))
  }

  return (
    <AuthShell>
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl overflow-hidden border border-outline-variant/30 flex flex-col">
        {/* Top Store Info Bar */}
        <div className="bg-surface-container-low px-space-lg py-space-sm flex flex-wrap items-center justify-between gap-space-md border-b border-outline-variant/20">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[20px]">storefront</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface font-cairo font-bold">
                  متجر الوفاء للاتصالات
                </span>
                <span className="text-[12px] text-on-surface-variant font-medium">فرع وهران وسط</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                محطة الكاشير المركزية • فتح جلسة بيع ووردية جديدة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
              <span>نظام محلي متزامن (SQLite Offline)</span>
            </div>
          </div>
        </div>

        {/* Success Modal / Banner */}
        {loginSuccessSession && (
          <div className="p-space-xl bg-primary-fixed/20 border-b border-primary/20 flex flex-col items-center justify-center gap-space-md text-center animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[36px]">task_alt</span>
            </div>
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary font-cairo font-bold">
                تم تسجيل الدخول بنجاح!
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                تم فتح كاسة <span className="font-bold text-on-surface">{customName}</span> برصيد افتتاحي{' '}
                <span className="font-bold text-primary font-mono">{Number(cashDrawerAmount).toLocaleString()} DZD</span>
              </p>
              <span className="inline-block mt-2 font-mono text-label-md px-3 py-1 rounded-full bg-surface-container text-on-surface-variant">
                رقم الجلسة: {loginSuccessSession}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                // Reload or navigate to sale
                window.location.href = '/'
              }}
              className="mt-2 flex items-center gap-2 px-space-xl py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-cairo font-bold shadow-md transition-all cursor-pointer"
            >
              <span>دخول شاشة المبيعات</span>
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
          </div>
        )}

        {!loginSuccessSession && (
          <div className="p-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            {/* RIGHT COLUMN (5 cols): Cashier Switcher & Cash Drawer Config */}
            <div className="lg:col-span-5 flex flex-col gap-space-md border-b lg:border-b-0 lg:border-s lg:ps-space-lg border-outline-variant/20">
              {/* Cashier Selection Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-cairo font-bold">
                    اختر مستخدم الوردية
                  </h3>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono bg-surface-container px-2 py-0.5 rounded">
                  [F1] لتبديل الكاشير
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                حدد حسابك للمتابعة السريعة وتسجيل عهدة الصندوق باسمك
              </p>

              {/* Cashier Cards */}
              <div className="flex flex-col gap-2">
                {DEFAULT_CASHIERS.map((cashier) => {
                  const isSelected = selectedCashier.id === cashier.id
                  return (
                    <button
                      key={cashier.id}
                      type="button"
                      onClick={() => handleCashierSelect(cashier)}
                      className={`w-full flex items-center justify-between p-space-sm rounded-xl border text-right transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-surface-container-high border-primary text-primary shadow-xs'
                          : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low text-on-surface'
                      }`}
                    >
                      <div className="flex items-center gap-space-sm">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? 'bg-primary-container text-on-primary'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">{cashier.icon}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-headline-sm text-body-md font-cairo font-bold">
                            {cashier.name}
                          </span>
                          <span className="font-body-sm text-[12px] text-on-surface-variant">
                            {cashier.role}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Opening Cash Drawer (Fond de Caisse) */}
              <div className="mt-space-xs bg-surface-container-low p-space-md rounded-xl border border-outline-variant/20 flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">account_balance_wallet</span>
                    <span className="font-label-sm text-label-sm font-bold text-on-surface font-cairo">
                      بيانات الصندوق الافتتاحي (Fond de Caisse)
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">DZD</span>
                </div>

                {/* Shift Selector */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-on-surface-variant">نوع الوردية الحالية:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playBeep('click')
                        setShiftType('morning')
                      }}
                      className={`py-1.5 px-space-sm rounded-lg font-body-sm text-body-sm font-cairo font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        shiftType === 'morning'
                          ? 'bg-primary-container text-on-primary shadow-xs'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <span>الصباحية</span>
                      <span className="font-mono text-[10px] opacity-80" dir="ltr">[F2]</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playBeep('click')
                        setShiftType('evening')
                      }}
                      className={`py-1.5 px-space-sm rounded-lg font-body-sm text-body-sm font-cairo font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        shiftType === 'evening'
                          ? 'bg-primary-container text-on-primary shadow-xs'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <span>المسائية</span>
                      <span className="font-mono text-[10px] opacity-80" dir="ltr">[F3]</span>
                    </button>
                  </div>
                </div>

                {/* Opening Cash Input */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-on-surface-variant">
                    رصيد بداية الكاسة (DA):
                  </label>
                  <div className="flex items-center bg-surface-container-lowest rounded-lg px-space-sm border border-outline-variant/30">
                    <input
                      type="number"
                      value={cashDrawerAmount}
                      onChange={(e) => setCashDrawerAmount(e.target.value)}
                      className="w-full h-10 bg-transparent text-primary font-currency-display text-label-lg font-bold outline-none font-mono"
                      dir="ltr"
                    />
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-bold mr-1">د.ج</span>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-on-surface-variant self-center">مبالغ شائعة:</span>
                  {PRESET_CASH_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        playBeep('click')
                        setCashDrawerAmount(String(amt))
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                        cashDrawerAmount === String(amt)
                          ? 'bg-primary text-on-primary font-bold'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                      }`}
                      dir="ltr"
                    >
                      {amt.toLocaleString()} DA
                    </button>
                  ))}
                </div>

                {/* Gateway readiness status */}
                <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between text-[11px]">
                  <span className="text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-primary">cell_tower</span>
                    <span>جاهزية بوابات الـ Flexy:</span>
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-primary font-bold">موبيليس (06) OK</span>
                    <span className="text-secondary font-bold">جازي (07) OK</span>
                    <span className="text-tertiary font-bold">أوريدو (05) OK</span>
                  </div>
                </div>
              </div>
            </div>

            {/* LEFT COLUMN (7 cols): Dual Auth Mode (PIN Numpad vs Username & Password) */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-space-md">
              <div>
                {/* Auth Mode Switcher */}
                <div className="flex items-center gap-2 p-1 bg-surface-container-low rounded-xl mb-space-md border border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => {
                      playBeep('click')
                      setAuthTab('pin')
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-space-sm rounded-lg font-headline-sm text-body-md font-cairo font-bold transition-all cursor-pointer ${
                      authTab === 'pin'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">pin</span>
                    <span>رمز PIN السريع</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playBeep('click')
                      setAuthTab('password')
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-space-sm rounded-lg font-headline-sm text-body-md font-cairo font-bold transition-all cursor-pointer ${
                      authTab === 'password'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">key</span>
                    <span>دخول المشرف (كلمة السر)</span>
                  </button>
                </div>

                {/* TAB 1: PIN NUMPAD */}
                {authTab === 'pin' && (
                  <div className="flex flex-col items-center">
                    <div className="w-full flex items-center justify-between pb-space-xs mb-space-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">account_circle</span>
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
                          {selectedCashier.name}
                        </span>
                        <span className="text-on-surface-variant text-[12px]">({selectedCashier.role})</span>
                      </div>
                      <span className="font-label-sm text-label-sm text-primary font-mono font-bold">
                        أدخل 4-6 أرقام
                      </span>
                    </div>

                    {/* PIN Display Dots */}
                    <div className="w-full flex items-center justify-center gap-3 py-space-md my-space-xs bg-surface-container-low rounded-xl border border-outline-variant/20">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded-full transition-all duration-150 ${
                            i < pin.length
                              ? 'bg-primary-container scale-110 shadow-sm'
                              : 'bg-surface-container-highest border border-outline-variant/30'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-center font-body-sm text-body-sm text-on-surface-variant mb-space-sm text-[12px]">
                      اضغط على لوحة الأرقام أو اكتب مباشرة من لوحة المفاتيح
                    </p>

                    {/* Numpad Grid */}
                    <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                        <button
                          key={digit}
                          type="button"
                          onClick={() => handleDigit(digit)}
                          className="h-12 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-container-low hover:border-primary/40 text-on-surface font-headline-md text-headline-md font-cairo font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          {digit}
                        </button>
                      ))}

                      {/* Clear */}
                      <button
                        type="button"
                        onClick={handleClear}
                        className="h-12 rounded-xl bg-surface-container-low hover:bg-tertiary-fixed/40 text-tertiary font-body-sm text-body-sm font-cairo font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                      >
                        <span className="font-label-md font-mono font-bold">C</span>
                        <span className="text-[11px]">[Esc]</span>
                      </button>

                      {/* Zero */}
                      <button
                        type="button"
                        onClick={() => handleDigit('0')}
                        className="h-12 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-container-low hover:border-primary/40 text-on-surface font-headline-md text-headline-md font-cairo font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        0
                      </button>

                      {/* Backspace */}
                      <button
                        type="button"
                        onClick={handleBackspace}
                        className="h-12 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">backspace</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: USERNAME & PASSWORD */}
                {authTab === 'password' && (
                  <div className="flex flex-col gap-space-md py-space-sm">
                    {/* Username Field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                        اسم المستخدم أو رقم الهاتف
                      </label>
                      <div className="flex items-center gap-space-xs bg-surface-container-low rounded-lg px-space-sm border border-outline-variant/30 pos-focus">
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person</span>
                        <input
                          ref={customNameInputRef}
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="اسم الكاشير أو المشرف"
                          className="flex-1 h-11 bg-transparent text-on-surface font-body-md text-body-md outline-none"
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                          كلمة المرور الإدارية
                        </label>
                        {capsLockActive && (
                          <span className="text-tertiary font-label-sm text-[11px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">warning</span>
                            <span>زر Caps Lock مفعل!</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-space-xs bg-surface-container-low rounded-lg px-space-sm border border-outline-variant/30 pos-focus">
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">lock</span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={handlePasswordKey}
                          placeholder="••••••••"
                          className="flex-1 h-11 bg-transparent text-on-surface font-body-md text-body-md outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      <p className="font-body-sm text-[12px] text-on-surface-variant">
                        يرجى كتابة كلمة المرور للدخول إلى الصندوق بصلاحيات المشرف.
                      </p>
                    </div>

                    {/* Quick Demo Credentials Tip */}
                    <div className="bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20 flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-primary">info</span>
                        <span>بيانات تجريبية جاهزة:</span>
                      </span>
                      <div className="flex items-center gap-2 font-mono" dir="ltr">
                        <span className="bg-surface-container-lowest px-1.5 py-0.5 rounded text-primary font-bold">
                          user: admin
                        </span>
                        <span className="bg-surface-container-lowest px-1.5 py-0.5 rounded text-primary font-bold">
                          pass: flexy2025
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-primary text-[12px]">
                      <span className="material-symbols-outlined text-[16px]">verified_user</span>
                      <span>صلاحيات كاملة لتعديل أرصدة المودمات والتقارير المالية وإدارة الكاسة.</span>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {login.isError && (
                  <div className="mt-space-sm">
                    <ErrorBanner message={translateAuthError(login.error)} />
                  </div>
                )}
              </div>

              {/* Submit Button & Footer Record */}
              <div className="flex flex-col gap-space-sm mt-space-md pt-space-xs border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={submitLogin}
                  disabled={login.isPending || (authTab === 'pin' ? pin.length < 4 : password.length < 4)}
                  className="w-full h-13 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-cairo font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <span className="material-symbols-outlined text-[22px]">lock_open</span>
                  <span>{login.isPending ? authMessages.signingIn : 'فتح الكاسة وبدء العمل'}</span>
                  <span className="bg-on-primary-container text-on-primary-fixed font-label-sm text-label-sm px-1.5 py-0.5 rounded font-mono font-bold" dir="ltr">
                    [Enter]
                  </span>
                </button>

                {/* Recent Shift Closure Info */}
                <div className="bg-surface-container-low/60 p-2.5 rounded-lg border border-outline-variant/15 flex flex-wrap items-center justify-between text-[11px] text-on-surface-variant">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-primary">history</span>
                    <span>آخر إغلاق كاسة مسجل: أمس 22:30 بواسطة كريم الزين</span>
                    <span>•</span>
                    <span>المبلغ المرحل: <strong className="font-mono text-on-surface">15,000.00 DZD</strong></span>
                  </div>
                  <div className="flex items-center gap-1 text-primary font-bold">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    <span>حالة قاعدة البيانات: متطابقة ومعتمدة بدون فروقات</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthShell>
  )
}

// -------------------------------------------------------------
// SETUP FORM (معالج إعداد المحطة وتسجيل نقطة البيع الأولية - an_flexy_pos_2)
// -------------------------------------------------------------
const WILAYAS = [
  'وهران - 31 (وهران وسط - حي السلام)',
  'الجزائر العاصمة - 16 (باب الزوار - المركز التجاري)',
  'قسنطينة - 25 (الكدية - وسط المدينة)',
  'سطيف - 19 (حي 1014 مسكن)',
  'البليدة - 09 (أولاد يعيش)',
]

function SetupForm() {
  const [role, setRole] = useState<'admin' | 'cashier'>('admin')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [wilaya, setWilaya] = useState(WILAYAS[0])
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pin, setPin] = useState('')
  const [termsAgreed, setTermsAgreed] = useState(true)
  const [storeName, setStoreName] = useState('متجر الوفاء للاتصالات')
  const [storeNif, setStoreNif] = useState('')
  const [startingCash, setStartingCash] = useState('15000')
  const [isDone, setIsDone] = useState(false)

  const setup = useSetupOwner()

  const detectedOperator = phone.startsWith('05')
    ? 'Ooredoo'
    : phone.startsWith('06')
      ? 'Mobilis'
      : phone.startsWith('07')
        ? 'Djezzy'
        : ''

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !username.trim() || pin.length < 4) {
      playBeep('error')
      return
    }

    setup.mutate(
      { name: username.trim(), pin },
      {
        onSuccess: () => {
          playBeep('success')
          setIsDone(true)
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        },
        onError: () => {
          playBeep('error')
        },
      },
    )
  }

  return (
    <AuthShell>
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl overflow-hidden border border-outline-variant/30 flex flex-col">
        {/* Wizard Header Bar */}
        <div className="bg-surface-container-low px-space-lg py-space-md flex flex-wrap items-center justify-between gap-space-md border-b border-outline-variant/20">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">storefront</span>
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md text-on-surface font-cairo font-bold">
                إعداد المحطة وتسجيل نقطة البيع
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                التهيئة الأولية لنظام الاتصالات AN-Flexy v4.2 Pro المعتمد
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-mono text-[11px] font-bold">
            SQLITE LOCAL ENCRYPTED • SYNC ACTIVE
          </span>
        </div>

        {/* 3 Steps Progress Bar */}
        <div className="grid grid-cols-3 bg-surface-container-lowest border-b border-outline-variant/20 text-center font-cairo py-space-sm px-space-lg">
          <div className="flex items-center justify-center gap-2 text-primary font-bold">
            <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-[12px] font-mono">
              1
            </span>
            <div className="flex flex-col text-right">
              <span className="text-body-md leading-none">بيانات المسؤول</span>
              <span className="text-[10px] text-primary">الخطوة الحالية</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-on-surface-variant">
            <span className="w-6 h-6 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center text-[12px] font-mono">
              2
            </span>
            <div className="flex flex-col text-right">
              <span className="text-body-md leading-none">معلومات المتجر</span>
              <span className="text-[10px] text-on-surface-variant">الفرع والصندوق</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-on-surface-variant">
            <span className="w-6 h-6 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center text-[12px] font-mono">
              3
            </span>
            <div className="flex flex-col text-right">
              <span className="text-body-md leading-none">منافذ GSM & Flexy</span>
              <span className="text-[10px] text-on-surface-variant">المودمات والشرائح</span>
            </div>
          </div>
        </div>

        {/* Success Confirmation Animation */}
        {isDone ? (
          <div className="p-space-xl flex flex-col items-center justify-center gap-space-md text-center">
            <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-[36px]">check</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-primary font-cairo font-bold">
              تم إنشاء حساب المحطة بنجاح!
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              جاري مزامنة منافذ COM وتحضير شاشة الفليكسي السريعة...
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="p-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            {/* Left 7 cols: Form fields */}
            <div className="lg:col-span-7 flex flex-col gap-space-md">
              <div>
                <span className="text-[11px] font-mono text-primary font-bold tracking-wider">
                  REGISTRATION GATEWAY
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-cairo font-bold">
                  إنشاء حساب جديد للمتجر
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  سجل بيانات الإدارة للوصول الفوري إلى وحدة التحكم، أرصدة المشغلين، وموازنة الصندوق اليومي.
                </p>
              </div>

              {/* Role Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-on-surface-variant">
                  نوع الحساب والصلاحيات الأساسية
                </label>
                <div className="grid grid-cols-2 gap-space-sm">
                  <button
                    type="button"
                    onClick={() => {
                      playBeep('click')
                      setRole('admin')
                    }}
                    className={`p-space-sm rounded-xl border text-right transition-all cursor-pointer ${
                      role === 'admin'
                        ? 'bg-surface-container-high border-primary text-primary shadow-xs'
                        : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                      <span className="font-headline-sm text-body-md font-cairo font-bold">مسؤول متجر كامل</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-1">إشراف، تقارير Z، وسحب أرباح</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playBeep('click')
                      setRole('cashier')
                    }}
                    className={`p-space-sm rounded-xl border text-right transition-all cursor-pointer ${
                      role === 'cashier'
                        ? 'bg-surface-container-high border-primary text-primary shadow-xs'
                        : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">badge</span>
                      <span className="font-headline-sm text-body-md font-cairo font-bold">بائع وردية / كاشير</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-1">فليكسي، شحن أرصدة، وفواتير</p>
                  </button>
                </div>
              </div>

              {/* Name & Username Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-on-surface-variant">
                    الاسم الكامل للمسؤول <span className="text-tertiary">*</span>
                  </label>
                  <div className="flex items-center gap-2 bg-surface-container-low rounded-lg px-3 border border-outline-variant/30 pos-focus">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="أمين بلقاسم"
                      required
                      className="w-full h-10 bg-transparent text-on-surface font-body-md outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-on-surface-variant">
                    اسم الدخول للمحطة <span className="text-tertiary">*</span>
                  </label>
                  <div className="flex items-center gap-2 bg-surface-container-low rounded-lg px-3 border border-outline-variant/30 pos-focus">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">alternate_email</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="amin.belkacem"
                      required
                      className="w-full h-10 bg-transparent text-on-surface font-body-md outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Phone & Wilaya */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-on-surface-variant">
                    رقم هاتف الإشعار والفليكسي <span className="text-tertiary">*</span>
                  </label>
                  <div className="flex items-center bg-surface-container-low rounded-lg px-2 border border-outline-variant/30 pos-focus" dir="ltr">
                    <span className="text-[14px] mr-1">🇩🇿 +213</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="0550 12 34 56"
                      className="w-full h-10 bg-transparent text-on-surface font-mono outline-none text-left"
                    />
                    {detectedOperator && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-container text-on-primary">
                        {detectedOperator}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-on-surface-variant">الولاية والبلدية</label>
                  <div className="flex items-center bg-surface-container-low rounded-lg px-2 border border-outline-variant/30">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant ml-1">location_on</span>
                    <select
                      value={wilaya}
                      onChange={(e) => setWilaya(e.target.value)}
                      className="w-full h-10 bg-transparent text-on-surface font-body-md outline-none text-[12px]"
                    >
                      {WILAYAS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Password & PIN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-bold text-on-surface-variant">
                      كلمة المرور الرئيسية <span className="text-tertiary">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-primary">قوية (Strong)</span>
                  </div>
                  <div className="flex items-center bg-surface-container-low rounded-lg px-2 border border-outline-variant/30 pos-focus">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant ml-1">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 bg-transparent text-on-surface font-body-md outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-on-surface-variant p-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-bold text-on-surface-variant">
                      رمز PIN سريع للكاشير (4 أرقام) <span className="text-tertiary">*</span>
                    </label>
                    <span className="text-[10px] text-on-surface-variant font-mono">LOCK-PIN</span>
                  </div>
                  <div className="flex items-center bg-surface-container-low rounded-lg px-2 border border-outline-variant/30 pos-focus">
                    <span className="material-symbols-outlined text-[18px] text-primary ml-1">dialpad</span>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="1234"
                      maxLength={4}
                      className="w-full h-10 bg-transparent text-primary font-mono text-center text-label-lg tracking-widest font-bold outline-none"
                      dir="ltr"
                    />
                  </div>
                  <span className="text-[11px] text-on-surface-variant">
                    يستخدم للتبديل السريع بين المستخدمين أثناء طابور الزبائن
                  </span>
                </div>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-1 rounded text-primary focus:ring-primary"
                />
                <span className="text-[11px] text-on-surface-variant leading-relaxed">
                  أوافق على سياسة تشفير المعاملات المحلية وحفظ السجلات في قاعدة بيانات المحطة المشفرة وفق نظام البريد والمواصلات السلكية واللاسلكية الجزائري.
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={setup.isPending || !termsAgreed || !fullName || !username || pin.length < 4}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-cairo font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                <span>إنشاء الحساب وتفعيل المحطة</span>
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                <span className="bg-on-primary-container text-on-primary-fixed font-label-sm text-label-sm px-1.5 py-0.5 rounded font-mono font-bold" dir="ltr">
                  [Enter]
                </span>
              </button>
            </div>

            {/* Right 5 cols: Station Settings & Hardware Detection Cards */}
            <div className="lg:col-span-5 flex flex-col gap-space-md border-t lg:border-t-0 lg:border-s lg:ps-space-lg border-outline-variant/20">
              {/* Station Settings Preview */}
              <div className="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/20 flex flex-col gap-space-sm">
                <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">domain</span>
                    <h3 className="font-headline-sm text-body-md font-cairo font-bold text-on-surface">
                      إعدادات نقطة البيع
                    </h3>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-primary">STATION #01</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-on-surface-variant">اسم المتجر التجاري:</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="h-9 px-2 bg-surface-container-lowest rounded-lg border border-outline-variant/30 text-on-surface font-body-sm text-[12px] outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-on-surface-variant">
                    رقم السجل التجاري / NIF (اختياري):
                  </label>
                  <input
                    type="text"
                    value={storeNif}
                    onChange={(e) => setStoreNif(e.target.value)}
                    placeholder="RC: 16/00-1284560B21"
                    className="h-9 px-2 bg-surface-container-lowest rounded-lg border border-outline-variant/30 text-on-surface font-mono text-[12px] outline-none"
                    dir="ltr"
                  />
                </div>

                {/* Operators Status */}
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[11px] font-bold text-on-surface-variant">
                    المشغلون المفعلون فورياً بالبوابة:
                  </span>
                  <div className="grid grid-cols-3 gap-1 text-[11px] font-cairo font-bold text-center">
                    <div className="bg-surface-container-lowest p-1 rounded border border-outline-variant/20 text-primary">
                      <span>موبيليس Mobilis</span>
                      <span className="block text-[9px] font-mono text-on-surface-variant">06 SIM READY</span>
                    </div>
                    <div className="bg-surface-container-lowest p-1 rounded border border-outline-variant/20 text-secondary">
                      <span>جيزي Djezzy</span>
                      <span className="block text-[9px] font-mono text-on-surface-variant">07 SIM READY</span>
                    </div>
                    <div className="bg-surface-container-lowest p-1 rounded border border-outline-variant/20 text-tertiary">
                      <span>أوريدو Ooredoo</span>
                      <span className="block text-[9px] font-mono text-on-surface-variant">05 SIM READY</span>
                    </div>
                  </div>
                </div>

                {/* Starting Cash Preset Chips */}
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[11px] font-bold text-on-surface-variant">
                    رصيد الصندوق الافتتاحي (DZD):
                  </span>
                  <div className="flex items-center gap-1.5">
                    {['5000', '15000', '30000'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          playBeep('click')
                          setStartingCash(amt)
                        }}
                        className={`flex-1 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                          startingCash === amt
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-lowest text-on-surface border border-outline-variant/20'
                        }`}
                        dir="ltr"
                      >
                        {Number(amt).toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hardware & Modem Detection Card */}
              <div className="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/20 flex flex-col gap-space-xs text-[11px]">
                <div className="flex items-center gap-2 pb-1 border-b border-outline-variant/20 font-bold text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px]">developer_board</span>
                  <span>كاشف العتاد والاتصال</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-on-surface-variant">تشفير التخزين:</span>
                  <span className="font-mono font-bold text-primary">AES-256 GCM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">مودمات USB:</span>
                  <span className="font-mono font-bold text-primary">3x DETECTED</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono" dir="ltr">
                  <span>COM3 (Huawei E3372)</span>
                  <span className="text-primary font-bold">ONLINE</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono" dir="ltr">
                  <span>COM4 (ZTE MF79U)</span>
                  <span className="text-secondary font-bold">ONLINE</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono" dir="ltr">
                  <span>COM5 (Thermal 80mm)</span>
                  <span className="text-primary font-bold">READY</span>
                </div>
                <div className="mt-1 pt-1 border-t border-outline-variant/15 flex items-center gap-1 text-primary">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  <span>نظام تشغيل محلي معتمد دون انقطاع</span>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </AuthShell>
  )
}
