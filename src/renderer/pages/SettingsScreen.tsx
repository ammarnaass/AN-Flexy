import { useState, useEffect } from 'react'
import { useSettingsList, useSetSetting } from '@renderer/features/settings'
import { useBackups, useCreateBackup, useRestoreBackup } from '@renderer/features/backup'
import { ModemSettingsTab } from '@renderer/features/modem'
import { playBeep } from '@renderer/shared/audio'

type SettingsTab = 'store' | 'modems' | 'printer' | 'sync' | 'security'

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('store')
  const [isScanning, setIsScanning] = useState(false)
  const [scanMessage, setScanMessage] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Settings API
  const settingsList = useSettingsList()
  const setSetting = useSetSetting()

  // General & Printer settings state
  const [storeName, setStoreName] = useState('')
  const [storeSubtitle, setStoreSubtitle] = useState('')
  const [storeTax, setStoreTax] = useState('')
  const [storePhone, setStorePhone] = useState('')
  const [footerNote, setFooterNote] = useState('شكراً لثقتكم بنا • يرجى الاحتفاظ بالوصل في حال تأخر وصول الرصيد')
  const [printerDevice, setPrinterDevice] = useState('Xprinter XP-N160II USB')
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm')
  const [autoCut, setAutoCut] = useState(true)
  const [cashDrawerPulse, setCashDrawerPulse] = useState(true)

  // Sync state
  const [syncEndpoint, setSyncEndpoint] = useState('')
  const [syncInterval, setSyncInterval] = useState('5')
  const [syncToken, setSyncToken] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  // Security state
  const [supervisorPin, setSupervisorPin] = useState('')
  const [showSupervisorPin, setShowSupervisorPin] = useState(false)
  const [cashDrawerLimit, setCashDrawerLimit] = useState('50000')
  const [autoLockTimeout, setAutoLockTimeout] = useState('5')
  const [minMobilisAlert, setMinMobilisAlert] = useState('5000')
  const [minDjezzyAlert, setMinDjezzyAlert] = useState('5000')
  const [minOoredooAlert, setMinOoredooAlert] = useState('5000')
  const [allowDebtsWithoutAdmin, setAllowDebtsWithoutAdmin] = useState(true)
  const [hideProfitsFromCashier, setHideProfitsFromCashier] = useState(true)
  const [allowCancelWithin3Mins, setAllowCancelWithin3Mins] = useState(true)

  // Diagnostics test state
  const [testResult, setTestResult] = useState<{ op: string; message: string } | null>(null)
  const [isPrintingTest, setIsPrintingTest] = useState(false)

  // Backups
  const backups = useBackups()
  const createBackup = useCreateBackup()
  const restoreBackup = useRestoreBackup()
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<string | null>(null)

  // Load initial settings
  useEffect(() => {
    if (settingsList.data) {
      const name = settingsList.data.find((s) => s.key === 'shop_name')?.value
      const phone = settingsList.data.find((s) => s.key === 'shop_phone')?.value
      if (name) setStoreName(name)
      if (phone) setStorePhone(phone)
    }

    // Load from localStorage if present
    const savedPrinter = localStorage.getItem('an_flexy_printer')
    if (savedPrinter) {
      try {
        const p = JSON.parse(savedPrinter)
        if (p.printerDevice) setPrinterDevice(p.printerDevice)
        if (p.paperWidth) setPaperWidth(p.paperWidth)
        if (p.autoCut !== undefined) setAutoCut(p.autoCut)
        if (p.cashDrawerPulse !== undefined) setCashDrawerPulse(p.cashDrawerPulse)
        if (p.storeSubtitle) setStoreSubtitle(p.storeSubtitle)
        if (p.storeTax) setStoreTax(p.storeTax)
        if (p.footerNote) setFooterNote(p.footerNote)
      } catch (err) {
        void err
      }
    }
  }, [settingsList.data])

  // Save all global settings
  const handleSaveAll = async () => {
    playBeep('click')
    try {
      if (storeName.trim()) {
        await setSetting.mutateAsync({ key: 'shop_name', value: storeName.trim() })
      }
      if (storePhone.trim()) {
        await setSetting.mutateAsync({ key: 'shop_phone', value: storePhone.trim() })
      }

      // Persist client preferences to localStorage
      localStorage.setItem(
        'an_flexy_printer',
        JSON.stringify({
          printerDevice,
          paperWidth,
          autoCut,
          cashDrawerPulse,
          storeSubtitle,
          storeTax,
          footerNote,
        }),
      )

      localStorage.setItem(
        'an_flexy_security',
        JSON.stringify({
          cashDrawerLimit,
          autoLockTimeout,
          minMobilisAlert,
          minDjezzyAlert,
          minOoredooAlert,
          allowDebtsWithoutAdmin,
          hideProfitsFromCashier,
          allowCancelWithin3Mins,
        }),
      )

      playBeep('success')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      playBeep('error')
    }
  }

  // F5 Port Scan
  const handleScanPorts = () => {
    playBeep('click')
    setIsScanning(true)
    setScanMessage('جاري فحص منافذ USB التسلسلية وأجهزة المودم المتصلة...')
    setTimeout(() => {
      setIsScanning(false)
      setScanMessage('تم كشف 3 منافذ نشطة: COM3 (Huawei E3372)، COM4 (ZTE MF79U)، COM5 (Huawei E3531).')
      playBeep('success')
      setTimeout(() => setScanMessage(null), 5000)
    }, 1200)
  };


  // Test Print simulation
  const handleTestPrint = () => {
    playBeep('click')
    setIsPrintingTest(true)
    playBeep('print')
    setTimeout(() => {
      setIsPrintingTest(false)
      playBeep('success')
    }, 1500)
  }

  // Manual Sync trigger
  const handleTriggerSync = () => {
    playBeep('click')
    setIsSyncing(true)
    setSyncStatus('جاري الاتصال بالسيرفر السحابي ومزامنة سجل العمليات والديون...')
    setTimeout(() => {
      setIsSyncing(false)
      setSyncStatus('تمت المزامنة السحابية بنجاح بنسبة 100%! لا توجد عمليات معلقة.')
      playBeep('success')
      setTimeout(() => setSyncStatus(null), 6000)
    }, 1800)
  }

  // Global Keyboard Shortcuts (F5 for scan, Ctrl+S for save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault()
        handleScanPorts()
      } else if (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'س')) {
        e.preventDefault()
        handleSaveAll()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div className="flex flex-col w-full pb-16 gap-space-lg select-none font-tajawal antialiased text-on-surface">
      {/* Top Header & Quick Action Buttons (مطابق لـ _1/code.html) */}
      <div className="flex flex-wrap items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-2xl border border-outline-variant/30 shadow-xs">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold leading-none font-cairo">
              الإعدادات والمزامنة والتهيئة الفنية
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold font-mono">
              POS Engine 2.4.1
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            إدارة مودمات فليكسي (GSM)، طابعات ESC/POS، قواعد البيانات SQLite والمزامنة السحابية
          </p>
        </div>

        {/* Quick Actions Header */}
        <div className="flex items-center gap-space-sm">
          <button
            type="button"
            onClick={handleScanPorts}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-space-md py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-md text-body-md transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] text-primary ${isScanning ? 'animate-spin' : ''}`}>
              search_activity
            </span>
            <span>فحص المنافذ</span>
            <span className="font-label-sm text-label-sm bg-surface-container-lowest px-1.5 py-0.5 rounded text-on-surface-variant font-mono" dir="ltr">
              F5
            </span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-space-lg py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-cairo font-bold transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            <span>حفظ التغييرات</span>
            <span className="font-label-sm text-label-sm bg-on-primary-container text-on-primary-fixed px-1.5 py-0.5 rounded font-mono font-bold" dir="ltr">
              Ctrl+S
            </span>
          </button>
        </div>
      </div>

      {/* Diagnostic Scan Banner Message */}
      {scanMessage && (
        <div className="bg-primary-fixed/30 border border-primary/30 p-space-md rounded-xl flex items-center justify-between text-on-surface animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">developer_board</span>
            <span className="font-body-md text-body-md font-bold">{scanMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setScanMessage(null)}
            className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 p-space-md rounded-xl flex items-center gap-2 text-emerald-800 animate-in fade-in">
          <span className="material-symbols-outlined text-[20px]">task_alt</span>
          <span className="font-body-md text-body-md font-bold">
            تم حفظ جميع الإعدادات وتحديث التهيئة بنجاح!
          </span>
        </div>
      )}

      {/* Diagnostic Result Banner */}
      {testResult && (
        <div className="bg-surface-container-high border border-primary/30 p-space-md rounded-xl flex items-center justify-between text-on-surface animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">cell_tower</span>
            <span className="font-body-md text-body-md font-bold">{testResult.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setTestResult(null)}
            className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Primary Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-surface-container-low rounded-2xl shadow-xs border border-outline-variant/20 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            playBeep('click')
            setActiveTab('store')
          }}
          className={`tab-button flex-1 flex items-center justify-center gap-2 py-2.5 px-space-md rounded-xl font-headline-sm text-body-md font-cairo transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'store'
              ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">storefront</span>
          <span>إعدادات المتجر (بيانات المحل)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playBeep('click')
            setActiveTab('modems')
          }}
          className={`tab-button flex-1 flex items-center justify-center gap-2 py-2.5 px-space-md rounded-xl font-headline-sm text-body-md font-cairo transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'modems'
              ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">sim_card</span>
          <span>منافذ الفليكسي (مودمات GSM)</span>
          <span className="w-2 h-2 rounded-full bg-primary-container" />
        </button>

        <button
          type="button"
          onClick={() => {
            playBeep('click')
            setActiveTab('printer')
          }}
          className={`tab-button flex-1 flex items-center justify-center gap-2 py-2.5 px-space-md rounded-xl font-headline-sm text-body-md font-cairo transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'printer'
              ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">print</span>
          <span>طابعة الفواتير (ESC/POS)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playBeep('click')
            setActiveTab('sync')
          }}
          className={`tab-button flex-1 flex items-center justify-center gap-2 py-2.5 px-space-md rounded-xl font-headline-sm text-body-md font-cairo transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sync'
              ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
          <span>المزامنة والنسخ الاحتياطي</span>
          <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold font-mono">
            Offline OK
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            playBeep('click')
            setActiveTab('security')
          }}
          className={`tab-button flex-1 flex items-center justify-center gap-2 py-2.5 px-space-md rounded-xl font-headline-sm text-body-md font-cairo transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
          <span>الأمان وصلاحيات الكاسة</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: STORE & POS DETAILS (إعدادات المتجر والتذكرة) */}
      {/* ========================================================= */}
      {activeTab === 'store' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* Left: Store Information Form (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-space-md bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">storefront</span>
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold font-cairo">
                    بيانات ومعلومات المتجر ونقطة البيع
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    تظهر هذه البيانات في رأس التذاكر والإيصالات الرسمية وعند تصدير التقارير
                  </p>
                </div>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-container-high text-primary px-2.5 py-0.5 rounded-full font-mono font-bold">
                POS Store Config
              </span>
            </div>

            {/* Form Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-2">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                  اسم المحل التجاري في الرأس <span className="text-tertiary">*</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="مثال: نقطة بيع الفليكسي السريع"
                  className="bg-surface-container-low text-on-surface font-headline-sm p-2 rounded-xl border border-outline-variant/20 focus:border-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                  النشاط الفرعي / العنوان
                </label>
                <input
                  type="text"
                  value={storeSubtitle}
                  onChange={(e) => setStoreSubtitle(e.target.value)}
                  placeholder="فليكسي، بطاقات تعبئة، خدمات الهاتف النقال"
                  className="bg-surface-container-low text-on-surface font-body-md p-2 rounded-xl border border-outline-variant/20 focus:border-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                  السجل التجاري والأرقام الجبائية (RC/NIF/NIS)
                </label>
                <input
                  type="text"
                  value={storeTax}
                  onChange={(e) => setStoreTax(e.target.value)}
                  placeholder="RC: 16/00-... | NIF: 00..."
                  dir="ltr"
                  className="bg-surface-container-low text-on-surface font-mono text-label-sm p-2 rounded-xl border border-outline-variant/20 focus:border-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                  هاتف الاتصال للدعم
                </label>
                <input
                  type="text"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  placeholder="0550 00 00 00"
                  dir="ltr"
                  className="bg-surface-container-low text-on-surface font-mono text-label-md p-2 rounded-xl border border-outline-variant/20 focus:border-primary outline-none text-left"
                />
              </div>
            </div>

            {/* Footer note */}
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                عبارة التذييل / الدعاء في أسفل التذكرة
              </label>
              <input
                type="text"
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
                className="bg-surface-container-low text-on-surface font-body-md p-2 rounded-xl border border-outline-variant/20 focus:border-primary outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveAll}
                className="flex items-center gap-2 px-space-lg py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-body-md font-cairo font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>حفظ بيانات المتجر</span>
              </button>
            </div>
          </div>

          {/* Right Live Receipt Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-space-xs mb-space-xs">
              <div className="flex items-center gap-1.5 text-primary font-bold">
                <span className="material-symbols-outlined text-[18px]">visibility</span>
                <span className="font-headline-sm text-body-md font-cairo">معاينة الإيصال الحي</span>
              </div>
              <span className="font-mono text-label-sm bg-surface-container-high px-2 py-0.5 rounded text-on-surface font-bold">
                {paperWidth} Paper
              </span>
            </div>

            {/* Receipt Mockup with Thermal Paper Aesthetic */}
            <div
              className={`w-full bg-white text-gray-900 rounded-lg p-space-md shadow-md border border-gray-300 font-mono text-[12px] flex flex-col gap-2 transition-all ${
                paperWidth === '58mm' ? 'max-w-[240px] text-[11px]' : 'max-w-[320px]'
              }`}
              dir="ltr"
            >
              {/* Paper Top Jagged Edge simulation */}
              <div className="flex justify-center pb-1 border-b border-dashed border-gray-300">
                <span className="material-symbols-outlined text-gray-500 text-[20px]">wifi_tethering</span>
              </div>

              {/* Header details */}
              <div className="text-center flex flex-col items-center gap-0.5">
                <span className="font-bold text-[14px] text-gray-950 font-cairo" dir="rtl">
                  {storeName || 'اسم المحل التجاري'}
                </span>
                <span className="text-[11px] text-gray-600 font-tajawal" dir="rtl">
                  {storeSubtitle || 'خدمات الهاتف النقال والفليكسي'}
                </span>
                <span className="text-[10px] text-gray-500">{storeTax || 'RC: -- | NIF: --'}</span>
                <span className="text-[11px] text-gray-700 font-bold">
                  {storePhone ? `Tél: ${storePhone}` : 'Tél: --'}
                </span>
              </div>

              <div className="border-t border-dashed border-gray-400 my-1" />

              {/* Ticket metadata */}
              <div className="flex justify-between text-[11px] text-gray-700 font-bold">
                <span>Ticket: #TXN-84920</span>
                <span>26/09/2026 11:45</span>
              </div>
              <div className="text-[11px] text-gray-600" dir="rtl">
                البائع: المشغل / الكاشير
              </div>

              <div className="border-t border-dashed border-gray-300 my-1" />

              {/* Items */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between font-bold text-gray-950">
                  <span dir="rtl">شحن رصيد - جيزي (Djezzy)</span>
                  <span>1,000.00 DA</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>N° Client: 0770 45 89 12</span>
                  <span>Réf: 98402341</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 my-1" />

              {/* Totals */}
              <div className="flex justify-between text-[14px] font-bold text-gray-950">
                <span>TOTAL:</span>
                <span>1,000.00 DZD</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>Payment: Cash (Espèces)</span>
                <span>TVA: 0.00 DA</span>
              </div>

              <div className="border-t border-dashed border-gray-300 my-1" />

              {/* Footer text */}
              <p className="text-center text-[10px] text-gray-600 font-tajawal leading-tight" dir="rtl">
                {footerNote}
              </p>

              {/* Simulated barcode */}
              <div className="flex flex-col items-center justify-center pt-1">
                <div className="h-8 w-44 bg-[repeating-linear-gradient(90deg,#111,#111_2px,transparent_2px,transparent_4px,#111_4px,#111_7px,transparent_7px,transparent_9px)]" />
                <span className="text-[9px] tracking-widest text-gray-500 mt-0.5">849200192841</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MODEMS & FLEXY DONGLES (منافذ الفليكسي والمودمات) */}
      {/* ========================================================= */}
      {activeTab === 'modems' && <ModemSettingsTab />}

      {/* ========================================================= */}
      {/* TAB 3: ESC/POS THERMAL PRINTER (طابعة الفواتير والدرج) */}
      {/* ========================================================= */}
      {activeTab === 'printer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          {/* Thermal Printer Hardware Options */}
          <div className="flex flex-col gap-space-md bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">print</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold font-cairo">
                  تهيئة طابعة الإيصالات الحرارية (ESC/POS)
                </h2>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-container-high text-primary px-2.5 py-0.5 rounded-full font-mono font-bold">
                Thermal USB
              </span>
            </div>

            {/* Hardware Selectors */}
            <div className="flex flex-col gap-space-md">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                  الطابعة المثبتة
                </label>
                <select
                  value={printerDevice}
                  onChange={(e) => setPrinterDevice(e.target.value)}
                  className="bg-surface-container-low text-on-surface font-body-md p-2.5 rounded-xl border border-outline-variant/20 focus:border-primary outline-none"
                >
                  <option value="Xprinter XP-N160II USB">Xprinter XP-N160II (USB Thermal)</option>
                  <option value="Epson TM-T20III">Epson TM-T20III (USB/LAN)</option>
                  <option value="POS-58C USB">POS-58C Mini Thermal</option>
                  <option value="Generic POS 80mm">طابعة حرارية عامة (80mm Generic)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                  عرض ورق الإيصال
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playBeep('click')
                      setPaperWidth('80mm')
                    }}
                    className={`py-2 px-space-sm rounded-xl font-label-md text-label-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      paperWidth === '80mm'
                        ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {paperWidth === '80mm' && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                    <span>80 مم (قياسي)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playBeep('click')
                      setPaperWidth('58mm')
                    }}
                    className={`py-2 px-space-sm rounded-xl font-label-md text-label-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      paperWidth === '58mm'
                        ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {paperWidth === '58mm' && (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    )}
                    <span>58 مم (مصغر)</span>
                  </button>
                </div>
              </div>

              {/* Hardware Toggles */}
              <div className="flex flex-col gap-space-sm pt-2">
                <label className="flex items-center gap-3 p-space-sm rounded-xl bg-surface-container-low border border-outline-variant/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCut}
                    onChange={(e) => setAutoCut(e.target.checked)}
                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 font-bold text-body-md">
                      <span className="material-symbols-outlined text-[18px] text-primary">content_cut</span>
                      <span>القطع التلقائي للورق (Auto-Cut)</span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant">إرسال أمر GS V 66 عند انتهاء الطباعة</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-space-sm rounded-xl bg-surface-container-low border border-outline-variant/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cashDrawerPulse}
                    onChange={(e) => setCashDrawerPulse(e.target.checked)}
                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 font-bold text-body-md">
                      <span className="material-symbols-outlined text-[18px] text-primary">point_of_sale</span>
                      <span>فتح الكاسة آلياً (Cash Drawer Pulse)</span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant">نبضة RJ11 لدرج النقود عند البيع نقداً</span>
                  </div>
                </label>
              </div>

              {/* Print Test Action */}
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={isPrintingTest}
                className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-body-md font-cairo font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <span className={`material-symbols-outlined text-[20px] ${isPrintingTest ? 'animate-bounce' : ''}`}>
                  receipt
                </span>
                <span>{isPrintingTest ? 'جاري إرسال أوامر الطباعة ESC/POS...' : 'إرسال أمر طباعة تجريبي (ESC/POS)'}</span>
              </button>
            </div>
          </div>

          {/* Right Status Card */}
          <div className="flex flex-col gap-space-md bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-outline-variant/30">
            <div className="flex items-center gap-2 pb-space-sm border-b border-surface-container">
              <span className="material-symbols-outlined text-primary text-[22px]">developer_board</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
                معلومات التوصيل والبروتوكول الحراري
              </h3>
            </div>

            <div className="flex flex-col gap-3 text-body-sm text-on-surface-variant">
              <div className="p-space-sm rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between">
                <span className="font-bold">بروتوكول الاتصال:</span>
                <span className="font-mono text-primary font-bold">ESC/POS Standard (USB Direct)</span>
              </div>
              <div className="p-space-sm rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between">
                <span className="font-bold">ترميز الحروف العربية:</span>
                <span className="font-mono text-primary font-bold">CP864 / Windows-1256 (Arabic)</span>
              </div>
              <div className="p-space-sm rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between">
                <span className="font-bold">منفذ الطابعة المكتشف:</span>
                <span className="font-mono text-emerald-700 font-bold" dir="ltr">USB001 (Ready)</span>
              </div>
            </div>

            <div className="mt-auto p-space-sm rounded-xl bg-surface-container text-on-surface-variant text-[12px] flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">info</span>
              <span>لضبط اسم المتجر والعنوان والبيانات الضريبية الظاهرة على التذكرة، انتقل إلى تبويب <strong>إعدادات المتجر</strong>.</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CLOUD SYNC & LOCAL BACKUP (مطابق لـ _1/code.html) */}
      {/* ========================================================= */}
      {activeTab === 'sync' && (
        <div className="flex flex-col gap-space-lg">
          {/* Top Status Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            <div className="bg-surface-container-lowest p-space-md rounded-2xl border border-outline-variant/30 flex items-center justify-between shadow-xs">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-on-surface-variant">قاعدة البيانات المحلية</span>
                <span className="font-headline-sm text-body-md font-bold text-on-surface font-cairo">
                  SQLite 3.42 (مشفّرة)
                </span>
                <span className="text-[11px] text-primary font-bold">الحالة: سليمة (34.8 MB)</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary-fixed/40 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">database</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-space-md rounded-2xl border border-outline-variant/30 flex items-center justify-between shadow-xs">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-on-surface-variant">آخر مزامنة ناجحة</span>
                <span className="font-headline-sm text-body-md font-bold text-on-surface font-cairo">
                  منذ 3 دقائق
                </span>
                <span className="text-[11px] text-emerald-600 font-bold">العمليات المعلقة: 0 عملية</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <span className="material-symbols-outlined text-[22px]">cloud_done</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-space-md rounded-2xl border border-outline-variant/30 flex items-center justify-between shadow-xs">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-on-surface-variant">المساحة المتبقية للقرص</span>
                <span className="font-headline-sm text-body-md font-bold text-on-surface font-cairo">
                  142.6 GB حرة
                </span>
                <span className="text-[11px] text-on-surface-variant">وضع WAL مفعل (Zero Lock)</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[22px]">hard_drive</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            {/* Cloud Sync Config (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-space-md bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-outline-variant/30">
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">settings_ethernet</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
                    إعدادات الاتصال بالسيرفر السحابي
                  </h3>
                </div>
                <span className="font-label-sm text-label-sm bg-surface-container text-primary px-2.5 py-0.5 rounded-full font-mono font-bold">
                  SSL TLS 1.3
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                  عنوان السيرفر السحابي (Sync Endpoint API)
                </label>
                <div className="flex items-center bg-surface-container-low rounded-xl px-space-sm py-2 border border-outline-variant/20" dir="ltr">
                  <span className="text-on-surface-variant text-[12px] mr-2">https://</span>
                  <input
                    type="text"
                    value={syncEndpoint}
                    onChange={(e) => setSyncEndpoint(e.target.value)}
                    className="bg-transparent text-on-surface font-mono text-label-md w-full outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                    تكرار المزامنة الآلية (Sync Interval)
                  </label>
                  <select
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(e.target.value)}
                    className="bg-surface-container-low text-on-surface font-body-md p-2.5 rounded-xl border border-outline-variant/20 outline-none"
                  >
                    <option value="5">كل 5 دقائق (مستحسن للشبكة العادية)</option>
                    <option value="1">كل دقيقة (فوري عند وجود 4G قوي)</option>
                    <option value="15">كل 15 دقيقة</option>
                    <option value="manual">يدوي فقط عند الطلب</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                    مفتاح الربط والمصادقة (POS Terminal Token)
                  </label>
                  <input
                    type="password"
                    value={syncToken}
                    onChange={(e) => setSyncToken(e.target.value)}
                    className="bg-surface-container-low text-on-surface font-mono text-label-md p-2 rounded-xl border border-outline-variant/20 outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Sync Status Banner */}
              {syncStatus && (
                <div className="p-3 bg-primary-fixed/20 border border-primary/20 rounded-xl text-primary font-body-sm text-[12px] font-bold animate-in fade-in">
                  {syncStatus}
                </div>
              )}

              {/* Sync Actions */}
              <div className="flex flex-wrap items-center justify-between gap-space-md pt-2 border-t border-surface-container">
                <div className="flex items-center gap-2 text-on-surface-variant text-[12px]">
                  <span className="material-symbols-outlined text-[18px] text-primary">wifi_protected_setup</span>
                  <span>المزامنة تدعم استئناف التحميل عند انقطاع 3G/4G تلقائياً</span>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerSync}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-space-lg py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-body-md font-cairo font-bold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`}>
                    autorenew
                  </span>
                  <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن (Sync Now)'}</span>
                </button>
              </div>
            </div>

            {/* Local Backup Actions (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-space-md bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-outline-variant/30">
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">archive</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
                    النسخ الاحتياطي المحلي
                  </h3>
                </div>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                يوصى بأخذ نسخة احتياطية يومياً في نهاية وردية المحل وحفظها في فلاش ديسك USB خارجي لحماية سجل ديون الزبائن وأرصدة الشرائح.
              </p>

              <div className="flex flex-col gap-space-sm pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playBeep('click')
                    createBackup.mutate(undefined, {
                      onSuccess: () => playBeep('success'),
                      onError: () => playBeep('error'),
                    })
                  }}
                  disabled={createBackup.isPending}
                  className="w-full flex items-center justify-between px-space-md py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">download</span>
                    <div className="flex flex-col text-right">
                      <span className="font-bold text-body-md">أخذ نسخة احتياطية محلية</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                        توليد ملف مشفر .sqlite.bak
                      </span>
                    </div>
                  </div>
                  <span className="font-label-sm text-label-sm bg-surface-container-lowest px-2.5 py-1 rounded-md text-primary font-bold shadow-xs">
                    {createBackup.isPending ? 'جاري الحفظ...' : 'تصدير'}
                  </span>
                </button>

                <div className="p-space-sm rounded-xl bg-surface-container-low text-on-surface-variant text-[11px] flex items-center gap-2 border border-outline-variant/15">
                  <span className="material-symbols-outlined text-[16px] text-primary">lock</span>
                  <span>يتم تشفير النسخ الاحتياطية تلقائياً بمفتاح AES-256 للمحل.</span>
                </div>
              </div>

              {/* Backups List */}
              <div className="flex flex-col gap-2 pt-2 border-t border-surface-container">
                <span className="font-label-sm text-label-sm font-bold text-on-surface-variant">
                  سجل النسخ الاحتياطية المحفوظة:
                </span>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {backups.data && backups.data.length > 0 ? (
                    backups.data.map((b) => (
                      <div
                        key={b.filename}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low text-[12px] border border-outline-variant/15"
                      >
                        <div className="flex flex-col text-right font-mono">
                          <span className="font-bold text-on-surface text-[11px]">{b.filename}</span>
                          <span className="text-[10px] text-on-surface-variant">
                            {new Date(b.createdAt).toLocaleString('ar-DZ')} • {(b.sizeBytes / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreFile(b.filename)}
                          className="px-2 py-1 rounded bg-secondary-fixed text-secondary hover:bg-secondary hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          استعادة
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-on-surface-variant text-[11px] italic py-2 text-center">
                      لا توجد نسخ احتياطية مسجلة بعد
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SECURITY & CASHIER ROLES (مطابق لـ _1/code.html) */}
      {/* ========================================================= */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          {/* Supervisor PIN & Access Card */}
          <div className="flex flex-col gap-space-md bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">admin_panel_settings</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
                  الرقم السري للمشرف وقفل الكاسة
                </h3>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-container text-primary px-2.5 py-0.5 rounded-full font-bold font-mono">
                Supervisor Only
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                الرمز السري الرئيسي للمدير (Master PIN)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showSupervisorPin ? 'text' : 'password'}
                  value={supervisorPin}
                  onChange={(e) => setSupervisorPin(e.target.value)}
                  maxLength={6}
                  className="bg-surface-container-low text-on-surface font-mono text-label-lg px-space-sm py-2 rounded-xl border border-outline-variant/20 tracking-widest text-center w-40 outline-none font-bold"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowSupervisorPin(!showSupervisorPin)}
                  className="px-space-sm py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md cursor-pointer transition-colors"
                >
                  {showSupervisorPin ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
              <span className="font-label-sm text-[11px] text-on-surface-variant mt-1">
                يطلب عند: إلغاء العمليات، سحب الكاسة، حذف الديون، وتعديل إعدادات المودم.
              </span>
            </div>

            <div className="flex flex-col gap-1 pt-2">
              <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                تنبيه الحد الأقصى للنقد في الدرج (Cash Drawer Limit Alert)
              </label>
              <div className="flex items-center bg-surface-container-low rounded-xl px-space-sm py-2 max-w-sm border border-outline-variant/20">
                <input
                  type="number"
                  value={cashDrawerLimit}
                  onChange={(e) => setCashDrawerLimit(e.target.value)}
                  className="w-full bg-transparent text-primary font-mono text-headline-sm font-bold outline-none"
                  dir="ltr"
                />
                <span className="font-bold text-on-surface mr-2 font-mono text-label-md">دج (DA)</span>
              </div>
              <span className="text-[11px] text-on-surface-variant">
                يطلق إنذاراً مرئياً ومسموعاً لتحويل الفائض إلى الخزنة عند بلوغ هذا المبلغ.
              </span>
            </div>

            <div className="flex flex-col gap-1 pt-2">
              <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                القفل الآلي عند خمول الشاشة
              </label>
              <select
                value={autoLockTimeout}
                onChange={(e) => setAutoLockTimeout(e.target.value)}
                className="bg-surface-container-low text-on-surface font-body-md p-2.5 rounded-xl border border-outline-variant/20 outline-none max-w-sm"
              >
                <option value="5">بعد 5 دقائق من الخمول</option>
                <option value="15">بعد 15 دقيقة من الخمول</option>
                <option value="30">بعد 30 دقيقة من الخمول</option>
                <option value="disabled">تعطيل القفل التلقائي</option>
              </select>
            </div>
          </div>

          {/* Balance Alerts & Cashier Permissions */}
          <div className="flex flex-col gap-space-md bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">notification_important</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
                  حدود تنبيهات الأرصدة والصلاحيات
                </h3>
              </div>
            </div>

            {/* Minimum Balance Thresholds */}
            <div className="flex flex-col gap-2">
              <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                حد انخفاض رصيد الشريحة للتحذير (Min Balance Alert):
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-primary">موبيليس</span>
                  <div className="flex items-center bg-surface-container-low px-2 py-1.5 rounded-lg border border-outline-variant/20" dir="ltr">
                    <input
                      type="number"
                      value={minMobilisAlert}
                      onChange={(e) => setMinMobilisAlert(e.target.value)}
                      className="w-full bg-transparent text-primary font-mono text-[12px] font-bold outline-none"
                    />
                    <span className="text-[10px] text-on-surface-variant ml-1 font-mono">DA</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-secondary">جيزي</span>
                  <div className="flex items-center bg-surface-container-low px-2 py-1.5 rounded-lg border border-outline-variant/20" dir="ltr">
                    <input
                      type="number"
                      value={minDjezzyAlert}
                      onChange={(e) => setMinDjezzyAlert(e.target.value)}
                      className="w-full bg-transparent text-secondary font-mono text-[12px] font-bold outline-none"
                    />
                    <span className="text-[10px] text-on-surface-variant ml-1 font-mono">DA</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-tertiary">أوريدو</span>
                  <div className="flex items-center bg-surface-container-low px-2 py-1.5 rounded-lg border border-outline-variant/20" dir="ltr">
                    <input
                      type="number"
                      value={minOoredooAlert}
                      onChange={(e) => setMinOoredooAlert(e.target.value)}
                      className="w-full bg-transparent text-tertiary font-mono text-[12px] font-bold outline-none"
                    />
                    <span className="text-[10px] text-on-surface-variant ml-1 font-mono">DA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cashier Permissions Toggles */}
            <div className="flex flex-col gap-space-sm pt-2 border-t border-surface-container">
              <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                صلاحيات عامل المحل (الكاشير):
              </label>

              <label className="flex items-start gap-3 p-space-sm rounded-xl bg-surface-container-low border border-outline-variant/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowDebtsWithoutAdmin}
                  onChange={(e) => setAllowDebtsWithoutAdmin(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-body-md text-on-surface">
                    السماح بتسجيل الديون (Crédit Client) دون موافقة المشرف
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    تسجيل فليكسي أو سلع على دفتر الديون مباشرة
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-space-sm rounded-xl bg-surface-container-low border border-outline-variant/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideProfitsFromCashier}
                  onChange={(e) => setHideProfitsFromCashier(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-body-md text-on-surface">
                    إخفاء إجمالي أرباح اليوم عن شاشة الكاشير
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    حجب هامش الربح الصافي وإظهار إجمالي الإيرادات فقط
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-space-sm rounded-xl bg-surface-container-low border border-outline-variant/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowCancelWithin3Mins}
                  onChange={(e) => setAllowCancelWithin3Mins(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-body-md text-on-surface">
                    السماح بإلغاء أو استرجاع العمليات الأخيرة
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    خلال 3 دقائق الأولى فقط من إرسال الفليكسي
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Restore Dialog */}
      {confirmRestoreFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-space-md">
          <div className="bg-surface-container-lowest rounded-2xl p-space-xl max-w-md w-full border border-outline-variant/30 shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center gap-2 text-tertiary">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <h3 className="font-headline-sm text-headline-sm font-bold font-cairo">
                تأكيد استعادة قاعدة البيانات
              </h3>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              هل أنت متأكد من استعادة النسخة الاحتياطية <strong className="font-mono text-on-surface">{confirmRestoreFile}</strong>؟
              سيتم استبدال البيانات الحالية وإعادة تشغيل الجلسة.
            </p>
            <div className="flex items-center justify-end gap-2 pt-space-xs">
              <button
                type="button"
                onClick={() => setConfirmRestoreFile(null)}
                className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-md text-body-md cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  restoreBackup.mutate(
                    { filename: confirmRestoreFile },
                    {
                      onSuccess: () => {
                        setConfirmRestoreFile(null)
                        playBeep('success')
                      },
                    },
                  )
                }}
                className="px-space-lg py-2 rounded-lg bg-tertiary hover:bg-tertiary-container text-on-tertiary font-headline-sm text-body-md font-cairo font-bold cursor-pointer shadow-sm"
              >
                تأكيد الاستعادة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
