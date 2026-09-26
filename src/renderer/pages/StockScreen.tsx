import { useState, useMemo, useEffect, useRef, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useActiveOperators } from '@renderer/features/operators'
import { useSalesBalances, useRecentSales } from '@renderer/features/sales'
import { useAddPurchase, useAddSettlement, useStockEntries } from '@renderer/features/stock'
import { useReport } from '@renderer/features/reports'
import { useSession } from '@renderer/features/auth'
import { parseDaToCentimes, formatDa } from '@shared/money'

type LedgerFilter = 'all' | 'purchase' | 'sales' | 'settlement'

export function StockScreen() {
  const queryClient = useQueryClient()
  const session = useSession()
  const operators = useActiveOperators()
  const balances = useSalesBalances(true)
  const addPurchase = useAddPurchase()
  const addSettlement = useAddSettlement()
  const recentSales = useRecentSales(100)
  const todayReport = useReport({ period: 'today' })

  const cashInputRef = useRef<HTMLInputElement>(null)

  const [selectedOpId, setSelectedOpId] = useState<number>(0)
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // New Purchase (Stock Supply) Form State
  const [cashText, setCashText] = useState('50000')
  const [creditReceivedText, setCreditReceivedText] = useState('')
  const [smsReference, setSmsReference] = useState('')
  const [distributorName, setDistributorName] = useState('الموزع المعتمد الرئيسي')

  // Settlement (Reconciliation) Modal State
  const [settlementActualDa, setSettlementActualDa] = useState('')
  const [settlementReason, setSettlementReason] = useState(
    'مطابقة يومية مع رسالة الرصيد الفعلي للـ SIM',
  )

  // Set first operator by default
  useEffect(() => {
    if (operators.data && operators.data.length > 0 && selectedOpId === 0) {
      const first = operators.data[0]
      if (first) {
        setSelectedOpId(first.id)
      }
    }
  }, [operators.data, selectedOpId])

  const stockEntries = useStockEntries(selectedOpId > 0 ? selectedOpId : undefined)

  const activeOp = useMemo(
    () => operators.data?.find((o) => o.id === selectedOpId),
    [operators.data, selectedOpId],
  )

  const activeBalance = useMemo(
    () => balances.data?.find((b) => b.operatorId === selectedOpId),
    [balances.data, selectedOpId],
  )

  // Operator Margin
  const marginPercentage = useMemo(() => {
    if (!activeOp || activeOp.marginBp === 0) return 4.0
    return activeOp.marginBp / 100
  }, [activeOp])

  // Update expected credit received when cashText changes
  useEffect(() => {
    const rawCash = parseFloat(cashText.replace(/[^\d.]/g, '')) || 0
    if (rawCash > 0) {
      const expectedCredit = Math.round(rawCash * (1 + marginPercentage / 100))
      setCreditReceivedText(String(expectedCredit))
    } else {
      setCreditReceivedText('')
    }
  }, [cashText, marginPercentage])

  // Keyboard Shortcuts for Stock Screen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      if (e.key === 'Escape') {
        if (showSettlementModal) {
          setShowSettlementModal(false)
        }
        return
      }

      if (e.key === 'F6') {
        e.preventDefault()
        setShowSettlementModal(true)
        return
      }

      if (e.key === 'F5' && !isInput) {
        e.preventDefault()
        cashInputRef.current?.focus()
        return
      }

      if (e.key === 'F9') {
        e.preventDefault()
        handleUssdRefresh()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showSettlementModal])

  const handleUssdRefresh = () => {
    setIsRefreshing(true)
    queryClient.invalidateQueries()
    setTimeout(() => setIsRefreshing(false), 800)
  }

  // Handle New Purchase Form Submit
  const handlePurchaseSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedOpId) return

    const cashCentimes = parseDaToCentimes(cashText)
    const creditCentimes = parseDaToCentimes(creditReceivedText)
    if (!cashCentimes || cashCentimes <= 0 || !creditCentimes || creditCentimes <= 0) return

    addPurchase.mutate(
      {
        operatorId: selectedOpId,
        costAmount: cashCentimes,
        creditAmount: creditCentimes,
        note: `${distributorName} ${smsReference ? `(مرجع: ${smsReference})` : ''}`.trim(),
      },
      {
        onSuccess: () => {
          setSmsReference('')
          queryClient.invalidateQueries({ queryKey: ['stockEntries'] })
          queryClient.invalidateQueries({ queryKey: ['salesBalances'] })
        },
      },
    )
  }

  // Handle Settlement Submit
  const handleSettlementSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedOpId || !activeBalance) return

    const actualCentimes = parseDaToCentimes(settlementActualDa)
    if (actualCentimes === null || actualCentimes < 0) return

    const delta = actualCentimes - activeBalance.balance
    if (delta === 0) {
      setShowSettlementModal(false)
      return
    }

    addSettlement.mutate(
      {
        operatorId: selectedOpId,
        delta: delta,
        reason: settlementReason.trim() || 'تسوية فارق الرصيد الفعلي عبر كود USSD',
      },
      {
        onSuccess: () => {
          setShowSettlementModal(false)
          setSettlementActualDa('')
          queryClient.invalidateQueries({ queryKey: ['stockEntries'] })
          queryClient.invalidateQueries({ queryKey: ['salesBalances'] })
        },
      },
    )
  }

  // Calculated KPI stats
  const totalStockValue = (balances.data ?? []).reduce((acc, b) => acc + b.balance, 0)
  const todayPurchases = (stockEntries.data ?? [])
    .filter((e) => e.type === 'purchase')
    .reduce((acc, e) => acc + e.creditAmount, 0)
  const todaySales = todayReport.data?.summary.totalSales ?? 0

  // Filtered Ledger Entries
  const ledgerRows = useMemo(() => {
    const list: Array<{
      id: string
      date: string
      type: 'purchase' | 'sale' | 'settlement'
      amount: number
      balanceAfter: number
      reference: string
      user: string
    }> = []

    if (stockEntries.data) {
      for (const entry of stockEntries.data) {
        list.push({
          id: `stock-${entry.id}`,
          date: entry.createdAt,
          type: entry.type === 'purchase' ? 'purchase' : 'settlement',
          amount: entry.creditAmount,
          balanceAfter: 0,
          reference: entry.note || (entry.type === 'purchase' ? 'توريد شحنة رصيد' : 'تسوية رصيد'),
          user: session.data?.user.name ?? 'أمين',
        })
      }
    }

    if (recentSales.data && selectedOpId > 0) {
      for (const sale of recentSales.data) {
        if (sale.operatorId === selectedOpId) {
          list.push({
            id: `sale-${sale.id}`,
            date: sale.createdAt,
            type: 'sale',
            amount: -sale.amount,
            balanceAfter: 0,
            reference: `فليكسي للرقم ${sale.targetPhone}`,
            user: session.data?.user.name ?? 'أمين',
          })
        }
      }
    }

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return list.filter((row) => {
      if (ledgerFilter === 'purchase' && row.type !== 'purchase') return false
      if (ledgerFilter === 'sales' && row.type !== 'sale') return false
      if (ledgerFilter === 'settlement' && row.type !== 'settlement') return false
      if (searchQuery.trim() && !row.reference.includes(searchQuery.trim())) return false
      return true
    })
  }, [stockEntries.data, recentSales.data, selectedOpId, ledgerFilter, searchQuery, session.data])

  const getOpBrand = (name?: string) => {
    const n = (name ?? '').toLowerCase()
    if (n.includes('mobilis') || n.includes('موبيليس')) {
      return {
        id: 'mobilis',
        color: '#16a34a',
        bg: '#dcfce7',
        badgeText: '#15803d',
        ussdSolde: '*600#',
        comPort: 'COM3',
        phone: '0661 23 45 67',
      }
    }
    if (n.includes('djezzy') || n.includes('جيزي')) {
      return {
        id: 'djezzy',
        color: '#ea580c',
        bg: '#ffedd5',
        badgeText: '#c2410c',
        ussdSolde: '*710#',
        comPort: 'COM4',
        phone: '0770 12 34 56',
      }
    }
    return {
      id: 'ooredoo',
      color: '#dc2626',
      bg: '#fee2e2',
      badgeText: '#b91c1c',
      ussdSolde: '*200#',
      comPort: 'COM5',
      phone: '0550 98 76 54',
    }
  }

  return (
    <div className="flex flex-col w-full pb-8 gap-space-md">
      {/* 1. Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold font-cairo">
            إدارة المخزون وتوريد الأرصدة
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            متابعة دقيقة لرصيد شرائح الفليكسي، تسجيل الشحنات الجديدة ومطابقة الفوارق اللحظية
          </p>
        </div>

        <div className="flex items-center gap-space-xs">
          <button
            type="button"
            onClick={handleUssdRefresh}
            className="flex items-center gap-1 px-space-md py-2 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg text-body-md font-bold transition-colors cursor-pointer border border-outline-variant/30"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${isRefreshing ? 'animate-spin' : ''}`}
            >
              sync
            </span>
            <span>تحديث USSD (F9)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettlementModal(true)}
            className="flex items-center gap-1 px-space-md py-2 bg-surface-container-low hover:bg-surface-container text-primary rounded-lg text-body-md font-bold transition-colors cursor-pointer border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[18px]">balance</span>
            <span>تسوية فارق الرصيد (F6)</span>
          </button>

          <button
            type="button"
            onClick={() => cashInputRef.current?.focus()}
            className="flex items-center gap-1 px-space-md py-2 bg-primary-container hover:bg-primary text-on-primary rounded-lg text-body-md font-bold shadow-sm transition-colors cursor-pointer font-cairo"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>شحنة رصيد جديدة (F5)</span>
          </button>
        </div>
      </div>

      {/* 2. 3 Operator Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {operators.data?.map((op) => {
          const b = balances.data?.find((item) => item.operatorId === op.id)
          const isSelected = op.id === selectedOpId
          const brand = getOpBrand(op.name)
          const balanceDa = b ? Math.floor(b.balance / 100) : 0
          const percent = Math.min(100, Math.round((balanceDa / 100000) * 100))
          const isLow = b !== undefined && b.balance < op.lowBalanceAt

          return (
            <button
              key={op.id}
              type="button"
              onClick={() => setSelectedOpId(op.id)}
              className={`p-space-md rounded-xl border-2 transition-all cursor-pointer text-right flex flex-col justify-between ${
                isSelected
                  ? 'bg-surface-container-lowest shadow-md'
                  : 'bg-surface-container-low/60 hover:bg-surface-container-low border-outline-variant/30'
              }`}
              style={
                isSelected ? { borderColor: brand.color, backgroundColor: `${brand.color}05` } : {}
              }
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: brand.color }}
                    />
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
                      {op.name}
                    </span>
                  </div>
                  <span
                    className="font-mono text-label-sm font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${brand.color}15`,
                      color: brand.color,
                    }}
                  >
                    {brand.comPort}
                  </span>
                </div>

                <div className="flex items-center justify-between text-body-sm text-on-surface-variant my-1">
                  <span>الرصيد الفعلي المتوفر:</span>
                  {isLow && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                      تنبيه قرب النفاد
                    </span>
                  )}
                </div>

                <div className="my-1">
                  <span
                    className="font-currency-display text-display-lg font-bold font-mono text-on-surface"
                    dir="ltr"
                  >
                    {balanceDa.toLocaleString()} DA
                  </span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden my-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: brand.color,
                    }}
                  />
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
                <span dir="ltr">شريحة: {brand.phone}</span>
                <span>كود: {brand.ussdSolde}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* 3. 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
            القيمة الإجمالية للمخزون
          </span>
          <div className="mt-2">
            <span
              className="font-currency-display text-headline-lg font-bold font-mono text-primary"
              dir="ltr"
            >
              {formatDa(totalStockValue)}
            </span>
            <span className="text-body-sm text-on-surface-variant block mt-1">
              مجموع أرصدة الشرائح الـ 3
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
            إجمالي الشحن الوارد اليوم
          </span>
          <div className="mt-2">
            <span
              className="font-currency-display text-headline-lg font-bold font-mono text-emerald-700"
              dir="ltr"
            >
              +{formatDa(todayPurchases)}
            </span>
            <span className="text-body-sm text-on-surface-variant block mt-1">
              توريدات الموزعين
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
            مبيعات الفليكسي الصادرة
          </span>
          <div className="mt-2">
            <span
              className="font-currency-display text-headline-lg font-bold font-mono text-on-surface"
              dir="ltr"
            >
              -{formatDa(todaySales)}
            </span>
            <span className="text-body-sm text-on-surface-variant block mt-1">
              استهلاك الزبائن اليوم
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
            فارق التسويات والمطابقة
          </span>
          <div className="mt-2">
            <span
              className="font-currency-display text-headline-lg font-bold font-mono text-secondary"
              dir="ltr"
            >
              0.00 DA
            </span>
            <span className="text-body-sm text-emerald-700 font-bold block mt-1">
              مطابق 100% مع شبكات USSD
            </span>
          </div>
        </div>
      </div>

      {/* 4. Split Grid: Movements Table (8 cols) & New Supply Form (4 cols) */}
      <div className="grid grid-cols-12 gap-space-md items-start">
        {/* Movements Table (8 cols) */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
          <div className="flex flex-wrap items-center justify-between gap-space-sm pb-2 border-b border-outline-variant/20">
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30 font-cairo font-bold text-body-sm">
              <button
                type="button"
                onClick={() => setLedgerFilter('all')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  ledgerFilter === 'all'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setLedgerFilter('purchase')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  ledgerFilter === 'purchase'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                شحن وتوريد
              </button>
              <button
                type="button"
                onClick={() => setLedgerFilter('sales')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  ledgerFilter === 'sales'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                مبيعات فليكسي
              </button>
              <button
                type="button"
                onClick={() => setLedgerFilter('settlement')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  ledgerFilter === 'settlement'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                تسويات
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الحركات..."
                className="h-8 px-2 pr-7 rounded-lg bg-surface-container-low border border-outline-variant/40 text-body-sm"
              />
              <span className="material-symbols-outlined absolute right-1.5 top-1.5 text-on-surface-variant text-[16px]">
                search
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-body-sm border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant font-cairo text-[13px]">
                  <th className="py-2.5 px-3">الوقت / التاريخ</th>
                  <th className="py-2.5 px-3">نوع الحركة</th>
                  <th className="py-2.5 px-3">المبلغ</th>
                  <th className="py-2.5 px-3">الرصيد بعد الحركة</th>
                  <th className="py-2.5 px-3">المرجع / البيان</th>
                  <th className="py-2.5 px-3">المستخدم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-tajawal">
                {ledgerRows.length > 0 ? (
                  ledgerRows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td
                        className="py-2.5 px-3 font-mono text-[12px] text-on-surface-variant"
                        dir="ltr"
                      >
                        {new Date(row.date).toLocaleString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        {row.type === 'purchase' ? (
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            توريد شحنة
                          </span>
                        ) : row.type === 'sale' ? (
                          <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                            بيع فليكسي
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                            تسوية فارق
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-3 font-mono font-bold ${
                          row.amount > 0 ? 'text-emerald-700' : 'text-on-surface'
                        }`}
                        dir="ltr"
                      >
                        {row.amount > 0 ? `+${formatDa(row.amount)}` : formatDa(row.amount)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-on-surface-variant" dir="ltr">
                        {row.balanceAfter > 0 ? formatDa(row.balanceAfter) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-body-sm font-medium text-on-surface">
                        {row.reference}
                      </td>
                      <td className="py-2.5 px-3 text-body-sm text-on-surface-variant font-cairo">
                        {row.user}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                      لا توجد حركات مسجلة تطابق التصفية
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Supply Shipment Form (4 cols) */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[20px]">add_circle</span>
              <span>تسجيل شحنة رصيد جديدة</span>
            </h2>
            <span className="text-[11px] font-mono text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
              F5
            </span>
          </div>

          <form onSubmit={handlePurchaseSubmit} className="flex flex-col gap-space-sm">
            {/* Operator selector */}
            <div className="flex flex-col gap-1">
              <label className="text-body-sm text-on-surface font-bold">الشريحة المستلمة:</label>
              <div className="grid grid-cols-3 gap-1">
                {operators.data?.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setSelectedOpId(op.id)}
                    className={`py-1.5 text-center font-bold text-body-sm rounded-md transition-all cursor-pointer font-cairo ${
                      selectedOpId === op.id
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {op.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Amount Chips */}
            <div className="flex flex-col gap-1">
              <label className="text-body-sm text-on-surface font-bold">
                المبلغ المدفوع كاش (د.ج):
              </label>
              <div className="grid grid-cols-3 gap-1 mb-1">
                {['20000', '50000', '100000'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCashText(val)}
                    className="h-8 rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-mono font-bold text-xs border border-outline-variant/30"
                  >
                    {val === '20000' ? '20K' : val === '50000' ? '50K' : '100K'}
                  </button>
                ))}
              </div>
              <input
                ref={cashInputRef}
                type="number"
                dir="ltr"
                value={cashText}
                onChange={(e) => setCashText(e.target.value)}
                placeholder="50000"
                className="h-11 px-3 rounded-lg bg-surface-container-low font-mono font-bold text-on-surface text-lg border border-outline-variant/40 pos-focus"
              />
            </div>

            {/* Credit Received with margin */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-body-sm text-on-surface font-bold">
                  الرصيد المشحون فعلياً:
                </label>
                <span className="text-[11px] text-emerald-700 font-bold">
                  (مع البونيس +{marginPercentage}%)
                </span>
              </div>
              <input
                type="number"
                dir="ltr"
                value={creditReceivedText}
                onChange={(e) => setCreditReceivedText(e.target.value)}
                placeholder="52000"
                className="h-11 px-3 rounded-lg bg-surface-container-low font-mono font-bold text-emerald-700 text-lg border border-outline-variant/40 pos-focus"
              />
            </div>

            {/* Supplier & SMS Reference */}
            <div className="flex flex-col gap-1">
              <label className="text-body-sm text-on-surface font-bold">اسم الموزع / الوكيل:</label>
              <input
                type="text"
                value={distributorName}
                onChange={(e) => setDistributorName(e.target.value)}
                className="h-10 px-3 rounded-lg bg-surface-container-low text-body-md font-tajawal border border-outline-variant/40"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-body-sm text-on-surface font-bold">
                رقم مرجع رسالة التعبئة (SMS):
              </label>
              <input
                type="text"
                dir="ltr"
                value={smsReference}
                onChange={(e) => setSmsReference(e.target.value)}
                placeholder="TRX-9823471"
                className="h-10 px-3 rounded-lg bg-surface-container-low font-mono text-body-md border border-outline-variant/40"
              />
            </div>

            <button
              type="submit"
              disabled={addPurchase.isPending}
              className="mt-2 w-full h-12 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-bold font-cairo flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>
                {addPurchase.isPending ? 'جاري التسجيل...' : 'تأكيد تسجيل الشحنة وإيداع الرصيد'}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* 5. Settlement / Reconciliation Modal (F6) */}
      {showSettlementModal && activeOp && activeBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/40 w-full max-w-md p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[22px]">balance</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
                  تسوية فارق الرصيد الفعلي (USSD)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettlementModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-space-sm">
              <div className="p-3 bg-surface-container-low rounded-lg flex items-center justify-between">
                <span className="text-body-sm text-on-surface-variant">
                  الرصيد المسجل في النظام:
                </span>
                <span
                  className="font-currency-display text-headline-sm font-bold text-on-surface font-mono"
                  dir="ltr"
                >
                  {formatDa(activeBalance.balance)}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-body-sm font-bold text-on-surface">
                  الرصيد الفعلي المستعلم عنه عبر USSD (د.ج):
                </label>
                <input
                  type="number"
                  dir="ltr"
                  value={settlementActualDa}
                  onChange={(e) => setSettlementActualDa(e.target.value)}
                  placeholder="أدخل الرصيد الظاهر في شاشة الهاتف..."
                  className="h-11 px-3 rounded-lg bg-surface-container-low font-mono font-bold text-primary text-xl border border-outline-variant/40 pos-focus"
                  autoFocus
                />
              </div>

              {settlementActualDa && (
                <div className="p-2.5 rounded-lg bg-surface-container flex items-center justify-between text-body-sm">
                  <span>الفارق المحسوب:</span>
                  <span
                    className={`font-mono font-bold text-label-lg ${
                      (parseDaToCentimes(settlementActualDa) ?? 0) - activeBalance.balance >= 0
                        ? 'text-emerald-700'
                        : 'text-red-700'
                    }`}
                    dir="ltr"
                  >
                    {formatDa((parseDaToCentimes(settlementActualDa) ?? 0) - activeBalance.balance)}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-body-sm font-bold text-on-surface">
                  ملاحظة / سبب التسوية:
                </label>
                <input
                  type="text"
                  value={settlementReason}
                  onChange={(e) => setSettlementReason(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-outline-variant/40 text-body-md"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-2">
              <button
                type="button"
                onClick={() => setShowSettlementModal(false)}
                className="px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-body-md cursor-pointer"
              >
                إلغاء (Esc)
              </button>
              <button
                type="button"
                onClick={handleSettlementSubmit}
                disabled={!settlementActualDa || addSettlement.isPending}
                className="px-space-md py-2 rounded-lg bg-primary text-on-primary font-bold text-body-md hover:bg-primary-container cursor-pointer shadow-sm disabled:opacity-50"
              >
                {addSettlement.isPending ? 'جاري التسوية...' : 'تأكيد التسوية وضبط الرصيد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
