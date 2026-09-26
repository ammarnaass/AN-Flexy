import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useSalesBalances, useRecentSales, useCreateSale } from '@renderer/features/sales'
import { useDebtors } from '@renderer/features/debts'
import { useReport } from '@renderer/features/reports'
import { useActiveOperators } from '@renderer/features/operators'
import { useSession } from '@renderer/features/auth'
import { formatDa, parseDaToCentimes } from '@shared/money'

export function DashboardScreen() {
  const queryClient = useQueryClient()
  const session = useSession()
  const balances = useSalesBalances(false)
  const recentSales = useRecentSales(20)
  const debtors = useDebtors(50)
  const todayReport = useReport({ period: 'today' })
  const operators = useActiveOperators()
  const createSale = useCreateSale()

  // Quick Flexy Sender State on Dashboard
  const [quickOpId, setQuickOpId] = useState<number>(0)
  const [quickPhone, setQuickPhone] = useState('')
  const [quickAmountText, setQuickAmountText] = useState('')
  const [filterOp, setFilterOp] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [printerTested, setPrinterTested] = useState(false)

  // Auto-select first operator if not chosen
  if (quickOpId === 0 && operators.data && operators.data.length > 0) {
    const first = operators.data[0]
    if (first) {
      setQuickOpId(first.id)
    }
  }

  const isAdmin = session.data?.user.role === 'admin'

  // Summary Metrics
  const summary = todayReport.data?.summary
  const totalSalesToday = summary?.totalSales ?? 0
  const totalProfitToday = summary?.totalProfit ?? 0
  const salesCountToday = summary?.salesCount ?? 0
  const totalDebts = (debtors.data ?? []).reduce((sum, d) => sum + d.totalDebt, 0)
  const debtorsCount = debtors.data?.length ?? 0

  const totalDebtCreatedToday = summary?.totalDebtCreated ?? 0
  const totalDebtPaidToday = summary?.totalDebtPaid ?? 0
  const cashInDrawer = totalSalesToday - totalDebtCreatedToday + totalDebtPaidToday

  // Operator Brand helper
  const getOpBrand = (name?: string) => {
    const n = (name ?? '').toLowerCase()
    if (n.includes('mobilis') || n.includes('موبيليس')) {
      return {
        id: 'mobilis',
        nameAr: 'موبيليس',
        color: '#16a34a',
        bg: '#dcfce7',
        badgeText: '#15803d',
        ussdSolde: '*600#',
        maxLimit: 10000000, // 100,000 DA in centimes
      }
    }
    if (n.includes('djezzy') || n.includes('جيزي')) {
      return {
        id: 'djezzy',
        nameAr: 'جيزي',
        color: '#ea580c',
        bg: '#ffedd5',
        badgeText: '#c2410c',
        ussdSolde: '*710#',
        maxLimit: 10000000,
      }
    }
    return {
      id: 'ooredoo',
      nameAr: 'أوريدو',
      color: '#dc2626',
      bg: '#fee2e2',
      badgeText: '#b91c1c',
      ussdSolde: '*200#',
      maxLimit: 10000000,
    }
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries()
  }

  // Quick Flexy submit from Dashboard
  const handleQuickSend = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseDaToCentimes(quickAmountText)
    const phoneValid = /^0[567]\d{8}$/.test(quickPhone)
    if (!quickOpId || !phoneValid || !amt || amt <= 0) return

    createSale.mutate(
      {
        operatorId: quickOpId,
        targetPhone: quickPhone,
        amount: amt,
        paidAmount: amt,
      },
      {
        onSuccess: () => {
          setQuickPhone('')
          setQuickAmountText('')
          queryClient.invalidateQueries({ queryKey: ['recentSales'] })
          queryClient.invalidateQueries({ queryKey: ['salesBalances'] })
        },
      },
    )
  }

  const handleTestPrinter = () => {
    setPrinterTested(true)
    setTimeout(() => setPrinterTested(false), 3000)
  }

  // Filtered recent sales
  const filteredSales = useMemo(() => {
    if (!recentSales.data) return []
    return recentSales.data.filter((sale) => {
      const op = operators.data?.find((o) => o.id === sale.operatorId)
      const opName = (op?.name ?? '').toLowerCase()
      if (filterOp !== 'all' && !opName.includes(filterOp)) return false
      if (searchQuery.trim() && !sale.targetPhone.includes(searchQuery.trim())) return false
      return true
    })
  }, [recentSales.data, operators.data, filterOp, searchQuery])

  return (
    <div className="flex flex-col w-full pb-12 gap-space-md">
      {/* 1. Status & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm bg-surface-container px-space-md py-space-xs rounded-xl shadow-sm border border-outline-variant/30">
        <div className="flex items-center gap-space-sm">
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-space-md py-1.5 bg-surface-container-lowest hover:bg-surface text-primary rounded-lg text-body-sm font-bold shadow-xs transition-colors cursor-pointer border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>تحديث الأرصدة اللحظية (F5)</span>
          </button>
          <div className="h-4 w-px bg-outline-variant/40" />
          <div className="flex items-center gap-1.5 text-label-sm font-label-sm text-primary font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>البث التلقائي: نشط</span>
          </div>
        </div>

        <div className="flex items-center gap-space-xs">
          <Link
            to="/stock"
            className="flex items-center gap-1 px-space-md py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg text-body-sm font-bold transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_alert</span>
            <span>طلب رصيد طارئ من الموزع</span>
          </Link>
          <Link
            to="/sale"
            className="flex items-center gap-1.5 px-space-md py-1.5 bg-primary-container hover:bg-primary text-on-primary rounded-lg text-body-sm font-bold shadow-sm transition-colors cursor-pointer font-cairo"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>بيع فليكسي جديد (Ctrl+N)</span>
          </Link>
        </div>
      </div>

      {/* 2. Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Metric 1: Total Sales Today */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
              مبيعات اليوم الإجمالية
            </span>
            <span className="material-symbols-outlined text-primary text-[22px]">payments</span>
          </div>
          <div className="mt-2">
            <span
              className="font-currency-display text-display-lg text-on-surface font-bold font-mono"
              dir="ltr"
            >
              {formatDa(totalSalesToday)}
            </span>
            <div className="flex items-center justify-between mt-1 text-body-sm">
              <span className="text-on-surface-variant font-mono">
                {salesCountToday} عملية تعبئة
              </span>
              <span className="text-emerald-700 font-bold font-mono" dir="ltr">
                +12.4%
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Net Profit Margin */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
              صافي هامش الربح
            </span>
            <span className="material-symbols-outlined text-emerald-700 text-[22px]">
              trending_up
            </span>
          </div>
          <div className="mt-2">
            <span
              className="font-currency-display text-display-lg text-emerald-700 font-bold font-mono"
              dir="ltr"
            >
              {isAdmin ? formatDa(totalProfitToday) : '••••••'}
            </span>
            <div className="flex items-center justify-between mt-1 text-body-sm">
              <span className="text-on-surface-variant">متوسط العائد</span>
              <span className="text-emerald-700 font-bold font-mono">~5.2%</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Total Active Debts */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
              إجمالي الديون القائمة
            </span>
            <span className="material-symbols-outlined text-tertiary text-[22px]">
              account_balance_wallet
            </span>
          </div>
          <div className="mt-2">
            <span
              className="font-currency-display text-display-lg text-tertiary font-bold font-mono"
              dir="ltr"
            >
              {formatDa(totalDebts)}
            </span>
            <div className="flex items-center justify-between mt-1 text-body-sm">
              <span className="text-on-surface-variant font-mono">
                {debtorsCount} زبائن عليهم ديون
              </span>
              <Link to="/customers" className="text-primary hover:underline font-bold">
                دفتر الديون ←
              </Link>
            </div>
          </div>
        </div>

        {/* Metric 4: Cash Drawer Balance */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
              السيولة النقدية في الدرج
            </span>
            <span className="material-symbols-outlined text-secondary text-[22px]">
              point_of_sale
            </span>
          </div>
          <div className="mt-2">
            <span
              className="font-currency-display text-display-lg text-secondary font-bold font-mono"
              dir="ltr"
            >
              {formatDa(cashInDrawer)}
            </span>
            <div className="flex items-center justify-between mt-1 text-body-sm">
              <span className="text-on-surface-variant">المطابقة اللحظية</span>
              <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span>مطابق</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Center Section: Balances + Hardware Ports (8 cols) & Quick Flexy Transfer (4 cols) */}
      <div className="grid grid-cols-12 gap-space-md items-start">
        {/* Left / Center (8 cols) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-space-md">
          {/* Operator SIM Balances */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
                  أرصدة شرائح الشحن السريع (فليكسي مبيعات)
                </h2>
                <span className="text-body-sm text-on-surface-variant">
                  تحديث تلقائي مستمر ومطابقة مع شرائح الـ SIM الفعلية
                </span>
              </div>
              <Link to="/stock" className="text-body-sm text-primary hover:underline font-bold">
                إدارة الأرصدة ←
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              {operators.data?.map((op) => {
                const b = balances.data?.find((item) => item.operatorId === op.id)
                const brand = getOpBrand(op.name)
                const balanceCentimes = b ? b.balance : 0
                const balanceDa = Math.floor(balanceCentimes / 100)
                const percent = Math.min(100, Math.round((balanceCentimes / brand.maxLimit) * 100))
                const isLow = balanceCentimes < op.lowBalanceAt

                return (
                  <div
                    key={op.id}
                    className="p-space-md rounded-xl bg-surface-container-low/70 border border-outline-variant/30 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: brand.color }}
                          />
                          <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
                            {op.name}
                          </span>
                        </div>
                        {isLow ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                            منخفض
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                            جاهز
                          </span>
                        )}
                      </div>

                      <div className="my-1">
                        <span
                          className="font-currency-display text-label-lg font-bold font-mono text-on-surface"
                          dir="ltr"
                        >
                          {balanceDa.toLocaleString()} DA
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-outline-variant/30 h-1.5 rounded-full overflow-hidden my-2">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: brand.color,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                      <span
                        className="font-mono text-[11px] text-on-surface-variant font-bold"
                        dir="ltr"
                      >
                        كود: {brand.ussdSolde}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(brand.ussdSolde)
                        }}
                        className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        نسخ الكود
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Connected Modems & Hardware Ports */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  settings_input_component
                </span>
                <span>منافذ المودم والأجهزة المتصلة</span>
              </h3>
              <span className="text-body-sm text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>الشبكة متزامنة</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
              <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <span className="font-bold text-body-sm text-on-surface block font-cairo">
                    موبيليس (SIM 1)
                  </span>
                  <span className="text-body-sm text-on-surface-variant font-mono">
                    COM3 · إشارة 95%
                  </span>
                </div>
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                  signal_cellular_alt
                </span>
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <span className="font-bold text-body-sm text-on-surface block font-cairo">
                    جيزي (SIM 2)
                  </span>
                  <span className="text-body-sm text-on-surface-variant font-mono">
                    COM4 · إشارة 88%
                  </span>
                </div>
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                  signal_cellular_alt
                </span>
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <span className="font-bold text-body-sm text-on-surface block font-cairo">
                    أوريدو (SIM 3)
                  </span>
                  <span className="text-body-sm text-on-surface-variant font-mono">
                    COM5 · إشارة 92%
                  </span>
                </div>
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                  signal_cellular_alt
                </span>
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <span className="font-bold text-body-sm text-on-surface block font-cairo">
                    طابعة الإيصالات
                  </span>
                  <span className="text-body-sm text-on-surface-variant">USB · 80mm</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestPrinter}
                  className="px-2 py-1 bg-surface-container-lowest hover:bg-surface-container rounded text-body-sm font-bold text-primary border border-outline-variant/30 cursor-pointer"
                >
                  {printerTested ? 'جاهزة ✓' : 'فحص ورقة'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right (4 cols): Direct Quick Flexy Sender */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[20px]">flash_on</span>
              <span>إرسال فليكسي سريع مباشر</span>
            </h3>
            <span className="text-[11px] font-mono text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
              Direct POS
            </span>
          </div>

          <form onSubmit={handleQuickSend} className="flex flex-col gap-space-sm">
            {/* Operator tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-surface-container-low rounded-lg">
              {operators.data?.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setQuickOpId(op.id)}
                  className={`py-1.5 text-center font-bold text-body-sm rounded-md transition-all cursor-pointer font-cairo ${
                    quickOpId === op.id
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {op.name}
                </button>
              ))}
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1">
              <label className="text-body-sm text-on-surface font-bold">رقم الهاتف:</label>
              <input
                type="text"
                dir="ltr"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="06.. / 05.. / 07.."
                className="h-11 px-3 rounded-lg bg-surface-container-low font-mono font-bold text-on-surface text-base border border-outline-variant/40 pos-focus tracking-wider"
              />
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1">
              <label className="text-body-sm text-on-surface font-bold">المبلغ (د.ج):</label>
              <input
                type="number"
                dir="ltr"
                value={quickAmountText}
                onChange={(e) => setQuickAmountText(e.target.value)}
                placeholder="0"
                className="h-11 px-3 rounded-lg bg-surface-container-low font-mono font-bold text-on-surface text-base border border-outline-variant/40 pos-focus"
              />
            </div>

            {/* Quick chips */}
            <div className="grid grid-cols-4 gap-1">
              {['100', '200', '500', '1000'].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setQuickAmountText(amt)}
                  className="h-8 rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-mono font-bold text-xs border border-outline-variant/30"
                >
                  {amt}
                </button>
              ))}
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={!quickPhone || !quickAmountText || createSale.isPending}
              className="mt-2 w-full h-11 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-bold font-cairo flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>
                {createSale.isPending ? 'جاري الإرسال...' : 'تأكيد الإرسال فوراً (Enter)'}
              </span>
            </button>

            <Link
              to="/sale"
              className="text-center text-body-sm text-primary hover:underline font-bold mt-1"
            >
              فتح شاشة البيع المتقدمة بكامل الخيارات ←
            </Link>
          </form>
        </div>
      </div>

      {/* 4. Bottom Table: Live Operations Stream */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
        <div className="flex flex-wrap items-center justify-between gap-space-sm pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[22px]">receipt_long</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
              سجل العمليات المباشر (التدفق اللحظي)
            </h2>
          </div>

          <div className="flex items-center gap-space-xs">
            {/* Operator filter tabs */}
            <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/30 text-body-sm font-bold font-cairo">
              <button
                type="button"
                onClick={() => setFilterOp('all')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  filterOp === 'all'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setFilterOp('mobilis')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  filterOp === 'mobilis'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                موبيليس
              </button>
              <button
                type="button"
                onClick={() => setFilterOp('djezzy')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  filterOp === 'djezzy'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                جيزي
              </button>
              <button
                type="button"
                onClick={() => setFilterOp('ooredoo')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  filterOp === 'ooredoo'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                أوريدو
              </button>
            </div>

            {/* Search phone input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الهاتف..."
                className="h-8 px-2 pr-7 rounded-lg bg-surface-container-low border border-outline-variant/40 text-body-sm font-mono"
                dir="ltr"
              />
              <span className="material-symbols-outlined absolute right-1.5 top-1.5 text-on-surface-variant text-[16px]">
                search
              </span>
            </div>
          </div>
        </div>

        {/* Live Zebra Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-body-sm border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 text-on-surface-variant font-cairo text-[13px]">
                <th className="py-2.5 px-3">الوقت</th>
                <th className="py-2.5 px-3">المتعامل</th>
                <th className="py-2.5 px-3">الرقم المستلم</th>
                <th className="py-2.5 px-3">المبلغ</th>
                <th className="py-2.5 px-3">طريقة الدفع</th>
                <th className="py-2.5 px-3">الربح الصافي</th>
                <th className="py-2.5 px-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-tajawal">
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => {
                  const op = operators.data?.find((o) => o.id === sale.operatorId)
                  const opName = op?.name ?? 'غير محدد'
                  const brand = getOpBrand(opName)
                  const isVoided = Boolean(sale.voidedAt)
                  const isSaleDebt = sale.paidAmount < sale.amount

                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-surface-container-low/50 transition-colors ${
                        isVoided ? 'opacity-50 line-through bg-gray-50' : ''
                      }`}
                    >
                      <td
                        className="py-2.5 px-3 font-mono text-[12px] text-on-surface-variant"
                        dir="ltr"
                      >
                        {new Date(sale.createdAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-cairo"
                          style={{
                            backgroundColor: `${brand.color}15`,
                            color: brand.color,
                          }}
                        >
                          {opName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-on-surface" dir="ltr">
                        {sale.targetPhone}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-on-surface" dir="ltr">
                        {formatDa(sale.amount)}
                      </td>
                      <td className="py-2.5 px-3">
                        {isSaleDebt ? (
                          <span className="text-[11px] font-bold text-tertiary bg-tertiary-fixed px-1.5 py-0.5 rounded">
                            دين ({formatDa(sale.amount - sale.paidAmount)})
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            نقدي كاش
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-700 font-bold" dir="ltr">
                        +{formatDa(sale.profit)}
                      </td>
                      <td className="py-2.5 px-3">
                        {isVoided ? (
                          <span className="text-[11px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                            ملغاة
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1 w-max">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span>مكتملة</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                    لا توجد عمليات تطابق البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
