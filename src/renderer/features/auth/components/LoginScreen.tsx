import { useState, useEffect, useCallback, useRef } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useHasUsers, useLogin, useRegister } from '../hooks'
import { translateAuthError } from '../errors'
import { ui } from '@renderer/shared/messages.ar'
import { playBeep } from '@renderer/shared/audio'

// شاشة الدخول والتسجيل: مطابقة لتصميم Stitch 7 (مركزة ونظيفة، خالية من إعدادات الوديعة والصندوق)
export function LoginScreen() {
  const hasUsers = useHasUsers()
  const [view, setView] = useState<'login' | 'register' | null>(null)

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

  const isFirstTime = Boolean(hasUsers.data && !hasUsers.data.hasUsers)
  const currentView = view ?? (isFirstTime ? 'register' : 'login')

  return currentView === 'register' ? (
    <SetupForm onNavigateToLogin={!isFirstTime ? () => setView('login') : undefined} />
  ) : (
    <LoginForm onNavigateToRegister={() => setView('register')} />
  )
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
                v2.4.1
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              محطة البيع وإدارة نقاط الفليكسي
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
            <span dir="ltr">PROD-ONLINE</span>
          </div>
          <div className="h-3 w-px bg-outline-variant/40" />
          <span className="font-mono">SQLite Local DB · Algeria Time (UTC+1)</span>
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
              [Esc]
            </span>
            <span>مسح الرمز</span>
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
// LOGIN FORM (مركزة ونظيفة، خالية من إعدادات الوديعة والصندوق)
// -------------------------------------------------------------
function LoginForm({ onNavigateToRegister }: { onNavigateToRegister: () => void }) {
  const [username, setUsername] = useState('')
  const [authTab, setAuthTab] = useState<'pin' | 'password'>('pin')
  const [pin, setPin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockActive, setCapsLockActive] = useState(false)

  const login = useLogin()
  const usernameInputRef = useRef<HTMLInputElement>(null)

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
    const finalName = username.trim()
    const finalSecret = authTab === 'pin' ? pin : password

    if (!finalName) {
      playBeep('error')
      usernameInputRef.current?.focus()
      return
    }

    if (finalSecret.length < 4) {
      playBeep('error')
      return
    }

    login.mutate(
      { name: finalName, pin: finalSecret },
      {
        onSuccess: () => {
          playBeep('success')
        },
        onError: () => {
          playBeep('error')
        },
      },
    )
  }, [username, authTab, pin, password, login])

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [authTab, submitLogin, handleDigit, handleBackspace, handleClear])

  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockActive(e.getModifierState('CapsLock'))
  }

  return (
    <AuthShell>
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl overflow-hidden border border-outline-variant/30 flex flex-col max-w-lg w-full mx-auto">
        {/* Top Store Info Bar */}
        <div className="bg-surface-container-low px-space-lg py-space-md flex items-center justify-between border-b border-outline-variant/20">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
            </div>
            <div>
              <span className="font-headline-sm text-headline-sm text-on-surface font-cairo font-bold">
                تسجيل الدخول
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                محطة نقاط البيع وإدارة الفليكسي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-bold">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            <span>نظام محلي متزامن (SQLite Offline)</span>
          </div>
        </div>

        <div className="p-space-lg flex flex-col gap-space-md">
          {/* Username Input Field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
              اسم المستخدم (Username)
            </label>
            <div className="flex items-center gap-space-xs bg-surface-container-low rounded-xl px-space-sm border border-outline-variant/30 focus-within:border-primary transition-colors">
              <span className="material-symbols-outlined text-[20px] text-primary">person</span>
              <input
                ref={usernameInputRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم..."
                autoFocus
                className="flex-1 h-11 bg-transparent text-on-surface font-body-md text-body-md outline-none"
              />
              {username && (
                <button
                  type="button"
                  onClick={() => setUsername('')}
                  className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Auth Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-surface-container-low rounded-xl border border-outline-variant/20">
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
              <span>كلمة المرور</span>
            </button>
          </div>

          {/* TAB 1: PIN NUMPAD */}
          {authTab === 'pin' && (
            <div className="flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-space-xs mb-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                  أدخل رمز الدخول (4-6 أرقام)
                </span>
                {pin.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[11px] text-primary font-bold hover:underline cursor-pointer"
                  >
                    مسح [Esc]
                  </button>
                )}
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
                    className="h-12 rounded-xl bg-surface-container-low hover:bg-surface-container active:scale-95 text-on-surface font-currency-display text-headline-sm font-bold shadow-2xs flex items-center justify-center transition-all cursor-pointer border border-outline-variant/20"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-12 rounded-xl bg-error-container/40 hover:bg-error-container text-on-error-container font-label-md text-label-sm font-bold shadow-2xs flex items-center justify-center transition-all cursor-pointer border border-error/20"
                >
                  <span>C [Esc]</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('0')}
                  className="h-12 rounded-xl bg-surface-container-low hover:bg-surface-container active:scale-95 text-on-surface font-currency-display text-headline-sm font-bold shadow-2xs flex items-center justify-center transition-all cursor-pointer border border-outline-variant/20"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-12 rounded-xl bg-surface-container-high hover:bg-surface-variant active:scale-95 text-on-surface font-label-md shadow-2xs flex items-center justify-center transition-all cursor-pointer border border-outline-variant/20"
                  title="حذف آخر رقم"
                >
                  <span className="material-symbols-outlined text-[20px]">backspace</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: USERNAME & PASSWORD */}
          {authTab === 'password' && (
            <div className="flex flex-col gap-space-md py-space-sm">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                    كلمة المرور
                  </label>
                  {capsLockActive && (
                    <span className="text-tertiary font-label-sm text-[11px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      <span>زر Caps Lock مفعل!</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-space-xs bg-surface-container-low rounded-xl px-space-sm border border-outline-variant/30 focus-within:border-primary transition-colors">
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
                  يرجى كتابة رمز الدخول أو كلمة المرور للمتابعة.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {login.isError && (
            <ErrorBanner message={translateAuthError(login.error)} />
          )}

          {/* Primary Submit Action */}
          <button
            type="button"
            onClick={submitLogin}
            disabled={login.isPending || !username.trim() || (authTab === 'pin' ? pin.length < 4 : password.length < 4)}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-cairo font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-space-sm active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {login.isPending ? (
              <span className="material-symbols-outlined text-[22px] animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[22px]">login</span>
            )}
            <span>تسجيل الدخول</span>
            <span className="bg-on-primary-container text-on-primary-fixed font-label-sm text-label-sm px-2 py-0.5 rounded-full font-mono font-bold" dir="ltr">
              [Enter]
            </span>
          </button>

          {/* Create Account Action */}
          <div className="pt-space-sm border-t border-outline-variant/20 flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                playBeep('click')
                onNavigateToRegister()
              }}
              className="w-full py-2.5 px-space-md rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-headline-sm text-body-md font-cairo font-bold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              <span>إنشاء حساب جديد</span>
            </button>
          </div>
        </div>
      </div>
    </AuthShell>
  )
}

// -------------------------------------------------------------
// SETUP FORM (معالج إعداد المحطة وتسجيل نقطة البيع الأولية)
// -------------------------------------------------------------
const WILAYAS = [
  '01 - أدرار', '02 - الشلف', '03 - الأغواط', '04 - أم البواقي', '05 - باتنة',
  '06 - بجاية', '07 - بسكرة', '08 - بشار', '09 - البليدة', '10 - البويرة',
  '11 - تمنراست', '12 - تبسة', '13 - تلمسان', '14 - تيارت', '15 - تيزي وزو',
  '16 - الجزائر العاصمة', '17 - الجلفة', '18 - جيجل', '19 - سطيف', '20 - سعيدة',
  '21 - سكيكدة', '22 - سيدي بلعباس', '23 - عنابة', '24 - قالمة', '25 - قسنطينة',
  '26 - المدية', '27 - مستغانم', '28 - المسيلة', '29 - معسكر', '30 - ورقلة',
  '31 - وهران', '32 - البيض', '33 - إليزي', '34 - برج بوعريريج', '35 - بومرداس',
  '36 - الطارف', '37 - تندوف', '38 - تسمسيلت', '39 - الوادي', '40 - خنشلة',
  '41 - سوق أهراس', '42 - تيبازة', '43 - ميلة', '44 - عين الدفلى', '45 - النعامة',
  '46 - عين تموشنت', '47 - غرداية', '48 - غليزان'
]

function SetupForm({ onNavigateToLogin }: { onNavigateToLogin?: () => void }) {
  const [role, setRole] = useState<'admin' | 'cashier'>('admin')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [wilaya, setWilaya] = useState('31 - وهران')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pin, setPin] = useState('')
  const [termsAgreed, setTermsAgreed] = useState(true)
  const [storeName, setStoreName] = useState('')
  const [storeNif, setStoreNif] = useState('')
  const [isDone, setIsDone] = useState(false)

  const register = useRegister()

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

    register.mutate(
      { name: username.trim(), pin, role },
      {
        onSuccess: () => {
          playBeep('success')
          setIsDone(true)
          setTimeout(() => {
            window.location.reload()
          }, 1500)
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
                التهيئة الأولية لنظام AN-Flexy POS المعتمد
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-mono text-[11px] font-bold">
            SQLITE LOCAL ENCRYPTED
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
              جاري فتح شاشة الفليكسي السريعة...
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="p-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            {/* Left 7 cols: Form fields */}
            <div className="lg:col-span-7 flex flex-col gap-space-md">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-cairo font-bold">
                  إنشاء حساب المسؤول الرئيسي
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  سجل بيانات الإدارة للوصول إلى لوحة التحكم وأرصدة المشغلين والصندوق.
                </p>
              </div>

              {/* Role Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-on-surface-variant">
                  نوع الحساب والصلاحيات
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
                    <p className="text-[11px] text-on-surface-variant mt-1">إشراف، تقارير، وإدارة عامة</p>
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
                      placeholder="الاسم واللقب"
                      required
                      className="w-full h-10 bg-transparent text-on-surface font-body-md outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-on-surface-variant">
                    اسم المستخدم (Username) <span className="text-tertiary">*</span>
                  </label>
                  <div className="flex items-center gap-2 bg-surface-container-low rounded-lg px-3 border border-outline-variant/30 pos-focus">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">alternate_email</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="أدخل اسم الدخول"
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
                    رقم هاتف الإشعار والفليكسي
                  </label>
                  <div className="flex items-center bg-surface-container-low rounded-lg px-2 border border-outline-variant/30 pos-focus" dir="ltr">
                    <span className="text-[14px] mr-1">🇩🇿 +213</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="05 / 06 / 07..."
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
                  <label className="text-[12px] font-bold text-on-surface-variant">الولاية</label>
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
                    يستخدم للتبديل والدخول السريع من شاشة اللمس
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
                  أوافق على سياسة تشفير المعاملات المحلية وحفظ السجلات في قاعدة بيانات المحطة المشفرة.
                </span>
              </label>

              {/* Error Banner */}
              {register.isError && (
                <div className="pt-2">
                  <ErrorBanner message={translateAuthError(register.error)} />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={register.isPending || !termsAgreed || !fullName || !username || pin.length < 4}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-cairo font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                <span>إنشاء الحساب وتفعيل المحطة</span>
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                <span className="bg-on-primary-container text-on-primary-fixed font-label-sm text-label-sm px-1.5 py-0.5 rounded font-mono font-bold" dir="ltr">
                  [Enter]
                </span>
              </button>

              {onNavigateToLogin && (
                <button
                  type="button"
                  onClick={() => {
                    playBeep('click')
                    onNavigateToLogin()
                  }}
                  className="w-full py-2.5 text-center text-primary hover:text-primary-container font-headline-sm text-body-md font-cairo font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-outline-variant/30 rounded-xl bg-surface-container-low hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>لديك حساب بالفعل؟ تسجيل الدخول</span>
                </button>
              )}
            </div>

            {/* Right 5 cols: Station Settings */}
            <div className="lg:col-span-5 flex flex-col gap-space-md border-t lg:border-t-0 lg:border-s lg:ps-space-lg border-outline-variant/20">
              <div className="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/20 flex flex-col gap-space-sm">
                <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">domain</span>
                    <h3 className="font-headline-sm text-body-md font-cairo font-bold text-on-surface">
                      إعدادات نقطة البيع
                    </h3>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-on-surface-variant">اسم المتجر التجاري:</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="اسم المحل أو نقطة البيع"
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
                    placeholder="رقم السجل أو التعريف الجبائي"
                    className="h-9 px-2 bg-surface-container-lowest rounded-lg border border-outline-variant/30 text-on-surface font-mono text-[12px] outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Hardware & System Summary Card */}
              <div className="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/20 flex flex-col gap-space-xs text-[11px]">
                <div className="flex items-center gap-2 pb-1 border-b border-outline-variant/20 font-bold text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px]">developer_board</span>
                  <span>حالة النظام والعتاد</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-on-surface-variant">قاعدة البيانات:</span>
                  <span className="font-mono font-bold text-primary">SQLite Local WAL</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">منافذ الفلاشة:</span>
                  <span className="font-mono font-bold text-primary">3G / GSM Ready</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">الطابعات المدعومة:</span>
                  <span className="font-mono font-bold text-primary">ESC/POS 80mm / 58mm</span>
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
