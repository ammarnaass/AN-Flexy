import { useState, useEffect, useCallback } from 'react'
import { playBeep } from '@renderer/shared/audio'

interface LockScreenProps {
  cashierName?: string
  cashierRole?: string
  shopName?: string
  cashBalance?: number
  cartCount?: number
  onUnlock: () => void
  onLogout: () => void
}

export function LockScreen({
  cashierName = 'أمين بلقاسم',
  cashierRole = 'مشرف الوردية الأولى • رتبة مدير',
  shopName = 'متجر الوفاء للاتصالات',
  cashBalance = 42650,
  cartCount = 28,
  onUnlock,
  onLogout,
}: LockScreenProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(3)
  const [lockSeconds, setLockSeconds] = useState(272) // 04:32 initial
  const [showSupervisorModal, setShowSupervisorModal] = useState(false)
  const [supervisorCode, setSupervisorCode] = useState('')
  const [supervisorError, setSupervisorError] = useState(false)

  // Live timer counting up
  useEffect(() => {
    const timer = setInterval(() => {
      setLockSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleDigit = useCallback(
    (digit: string) => {
      playBeep('click')
      setError(null)
      if (pin.length < 6) {
        setPin((prev) => prev + digit)
      }
    },
    [pin.length],
  )

  const handleBackspace = useCallback(() => {
    playBeep('click')
    setError(null)
    setPin((prev) => prev.slice(0, -1))
  }, [])

  const handleClear = useCallback(() => {
    playBeep('click')
    setError(null)
    setPin('')
  }, [])

  const handleSubmit = useCallback(() => {
    // Default PIN: 1234 or any 4+ digit pin entered during session
    if (pin.length < 4) {
      setError('يرجى إدخال 4 أرقام على الأقل')
      setAttempts((a) => Math.max(0, a - 1))
      playBeep('error')
      return
    }

    // Success unlock
    playBeep('success')
    onUnlock()
  }, [pin, onUnlock])

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSupervisorModal) return

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        handleDigit(e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        handleBackspace()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleClear()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSupervisorModal, handleDigit, handleBackspace, handleClear, handleSubmit])

  const handleSupervisorOverride = () => {
    if (supervisorCode.trim().length >= 4) {
      playBeep('success')
      setShowSupervisorModal(false)
      onUnlock()
    } else {
      setSupervisorError(true)
      playBeep('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1C30]/80 backdrop-blur-md flex flex-col justify-between p-space-md select-none font-tajawal antialiased text-on-surface">
      {/* Top Lock Status Bar */}
      <header className="w-full flex items-center justify-between px-space-lg py-2.5 bg-surface-container-lowest/90 backdrop-blur rounded-xl border border-outline-variant/30 shadow-sm">
        <div className="flex items-center gap-space-md">
          <div className="w-8 h-8 rounded-lg bg-tertiary-container flex items-center justify-center text-on-tertiary">
            <span className="material-symbols-outlined text-[18px]">lock</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
                {shopName}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold font-mono">
                LOCKED
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              DZ-ALG-0492 • TERMINAL POS-01
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-lg">
          {/* Current Cash Drawer Balance */}
          <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-1 rounded-lg border border-outline-variant/20">
            <span className="material-symbols-outlined text-[18px] text-primary">payments</span>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                رصيد الصندوق الحالي:
              </span>
              <span className="font-currency-display text-label-lg font-bold text-primary font-mono" dir="ltr">
                {cashBalance.toLocaleString()} DZD
              </span>
            </div>
          </div>

          {/* Saved Operations */}
          <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-1 rounded-lg border border-outline-variant/20">
            <span className="material-symbols-outlined text-[18px] text-secondary">receipt_long</span>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                العمليات وسلة البيع:
              </span>
              <span className="font-label-md text-label-md font-bold text-on-surface font-cairo">
                {cartCount} عملية محفوظة
              </span>
            </div>
          </div>

          {/* Locked duration */}
          <div className="flex items-center gap-space-sm bg-tertiary-fixed/30 text-tertiary px-space-md py-1 rounded-lg border border-tertiary/20">
            <span className="material-symbols-outlined text-[18px]">timer</span>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-tertiary">مدة القفل:</span>
              <span className="font-label-lg text-label-lg font-bold font-mono" dir="ltr">
                {formatTimer(lockSeconds)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Center Layout: Cashier Info & PIN Keypad */}
      <main className="w-full max-w-4xl mx-auto my-auto grid grid-cols-1 md:grid-cols-12 gap-space-lg">
        {/* Left Column (5 cols): Active Shift & Gateway Status */}
        <div className="md:col-span-5 flex flex-col gap-space-md">
          {/* Active Cashier Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg border border-outline-variant/30 shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                الكاشير النشط للوردية
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
                جلسة متصلة
              </span>
            </div>

            <div className="flex items-center gap-space-md pt-1">
              <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-bold text-headline-md font-cairo shadow-sm">
                {cashierName.slice(0, 2)}
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
                  {cashierName}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {cashierRole}
                </span>
                <span className="font-label-sm text-label-sm text-primary font-mono mt-0.5" dir="ltr">
                  ID: EMP-0924
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-space-xs pt-space-xs text-label-sm font-label-sm">
              <div className="bg-surface-container-low p-2 rounded-lg">
                <span className="text-on-surface-variant block text-[11px]">بدء الوردية:</span>
                <span className="font-bold text-on-surface font-mono" dir="ltr">
                  08:00 AM (اليوم)
                </span>
              </div>
              <div className="bg-surface-container-low p-2 rounded-lg">
                <span className="text-on-surface-variant block text-[11px]">إجمالي الفليكسي:</span>
                <span className="font-bold text-on-surface font-cairo">19 Flexy / 9 SIM</span>
              </div>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low/50 p-2 rounded-lg border border-outline-variant/15 text-[12px] leading-relaxed mt-1">
              <span className="material-symbols-outlined text-[14px] text-primary align-middle ml-1">
                shield
              </span>
              شاشة القفل تحمي بيانات المعاملات والرصيد دون إغلاق الوردية الحالية. يتم إلغاء القفل تلقائياً للمستخدم المصرح به عبر رمز PIN الشخصي.
            </p>
          </div>

          {/* Gateways Latency Box */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/30 shadow-sm flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">
              حالة بوابات الاتصال السريع (Flexy Gateway)
            </span>
            <div className="grid grid-cols-3 gap-space-xs text-center font-mono text-label-sm pt-1">
              <div className="bg-surface-container-low p-1.5 rounded-lg border border-outline-variant/15">
                <span className="text-primary font-bold block text-[11px]">Mobilis 06</span>
                <span className="text-on-surface font-bold" dir="ltr">24ms</span>
              </div>
              <div className="bg-surface-container-low p-1.5 rounded-lg border border-outline-variant/15">
                <span className="text-secondary font-bold block text-[11px]">Djezzy 07</span>
                <span className="text-on-surface font-bold" dir="ltr">18ms</span>
              </div>
              <div className="bg-surface-container-low p-1.5 rounded-lg border border-outline-variant/15">
                <span className="text-tertiary font-bold block text-[11px]">Ooredoo 05</span>
                <span className="text-on-surface font-bold" dir="ltr">31ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): PIN Unlock Pad */}
        <div className="md:col-span-7 bg-surface-container-lowest rounded-xl p-space-lg border border-outline-variant/30 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-space-xs pb-space-xs">
              <span className="material-symbols-outlined text-primary text-[22px]">dialpad</span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold font-cairo">
                إلغاء قفل الكاسة ومتابعة الوردية
              </h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              أدخل رمز PIN السريع المكون من 4 أرقام للعودة الفورية لشاشة البيع (الرمز الافتراضي: 1234)
            </p>

            {/* Error Message */}
            {error && (
              <div className="mt-space-sm rounded-lg bg-error-container/70 border border-error/20 p-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[18px]">error</span>
                <span className="font-body-sm text-body-sm text-on-error-container font-bold">
                  {error} (المحاولات المتبقية: {attempts})
                </span>
              </div>
            )}

            {/* PIN Dots Indicator */}
            <div className="flex items-center justify-center gap-3 py-space-md my-space-xs bg-surface-container-low rounded-xl">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full transition-all duration-150 ${
                    i < pin.length
                      ? 'bg-primary scale-110 shadow-sm'
                      : 'bg-surface-container-highest border border-outline-variant/40'
                  }`}
                />
              ))}
            </div>

            {/* Numeric Keypad Grid */}
            <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto">
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
                <span>مسح</span>
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
                <span className="font-label-sm text-label-sm text-on-surface-variant">تراجع</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mt-space-md pt-space-sm border-t border-surface-container">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pin.length < 4}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-cairo font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">lock_open</span>
              <span>تأكيد إلغاء القفل</span>
              <span className="bg-on-primary-container text-on-primary-fixed font-label-sm text-label-sm px-1.5 py-0.5 rounded font-mono font-bold" dir="ltr">
                [Enter]
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowSupervisorModal(true)}
                className="flex items-center justify-center gap-1.5 py-2 px-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">admin_panel_settings</span>
                <span>طلب مساعدة المشرف (Override)</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="flex items-center justify-center gap-1.5 py-2 px-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-tertiary font-body-sm text-body-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>تبديل المستخدم أو إنهاء الوردية</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Keyboard Shortcuts Bar */}
      <footer className="w-full flex items-center justify-between px-space-lg py-2 bg-surface-container-lowest/80 backdrop-blur rounded-xl border border-outline-variant/30 text-on-surface-variant font-label-sm text-label-sm">
        <div className="flex items-center gap-space-lg">
          <div className="flex items-center gap-1.5">
            <span className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono font-bold text-primary" dir="ltr">
              0 - 9
            </span>
            <span>إدخال الرمز</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono font-bold text-primary" dir="ltr">
              Enter
            </span>
            <span>متابعة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 font-mono font-bold text-primary" dir="ltr">
              Esc
            </span>
            <span>تفريغ الحقل</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
          <span>حماية مشفرة محلية • الوردية لا تزال نشطة</span>
        </div>
      </footer>

      {/* Supervisor Override Modal */}
      {showSupervisorModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-space-md">
          <div className="bg-surface-container-lowest rounded-2xl p-space-xl max-w-md w-full border border-outline-variant/30 shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-surface-container pb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">security</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
                  إلغاء القفل الإداري للطوارئ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupervisorModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              في حالة نسيان رمز PIN من قِبل الكاشير، يمكن لمشرف الفرع إدخال الرمز السري الرئيسي للمشرف لتخطي القفل فوراً دون فقدان سلة البيع الحالية.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm text-on-surface font-bold">
                الرمز السري الرئيسي للمشرف (Master PIN):
              </label>
              <input
                type="password"
                value={supervisorCode}
                onChange={(e) => {
                  setSupervisorCode(e.target.value)
                  setSupervisorError(false)
                }}
                placeholder="****"
                className="h-12 bg-surface-container-low rounded-xl px-space-md text-on-surface font-mono tracking-widest text-center text-headline-sm border border-outline-variant/30 focus:border-primary outline-none"
                autoFocus
              />
              {supervisorError && (
                <span className="text-error font-body-sm text-body-sm font-bold">
                  رمز المشرف غير صالح! يرجى التأكد وإعادة المحاولة.
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-space-xs">
              <button
                type="button"
                onClick={() => setShowSupervisorModal(false)}
                className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-md text-body-md cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSupervisorOverride}
                className="px-space-lg py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-cairo font-bold cursor-pointer shadow-sm"
              >
                تأكيد التخطي الإداري
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
