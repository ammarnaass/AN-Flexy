import { useState, useMemo, useEffect, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCustomers, useCreateCustomer } from '@renderer/features/customers'
import {
  useDebtors,
  useCustomerDebt,
  useCustomerPayments,
  useAddPayment,
} from '@renderer/features/debts'
import { useReport } from '@renderer/features/reports'
import { formatDa, parseDaToCentimes } from '@shared/money'

type FilterMode = 'all' | 'indebted' | 'paid'

export function CustomersDebtsScreen() {
  const queryClient = useQueryClient()
  const customers = useCustomers(100)
  const debtors = useDebtors(100)
  const todayReport = useReport({ period: 'today' })
  const createCustomerMutation = useCreateCustomer()
  const addPayment = useAddPayment()

  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [paymentAmountText, setPaymentAmountText] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('تسديد نقدي في المحل')

  // Modal: Add Customer
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustNote, setNewCustNote] = useState('')

  // Map of debtor balance by customerId
  const debtorMap = useMemo(() => {
    const map = new Map<number, number>()
    if (debtors.data) {
      for (const d of debtors.data) {
        map.set(d.customerId, d.totalDebt)
      }
    }
    return map
  }, [debtors.data])

  // Select first customer by default if available
  useEffect(() => {
    if (customers.data && customers.data.length > 0 && selectedCustomerId === null) {
      const firstWithDebt = customers.data.find((c) => (debtorMap.get(c.id) ?? 0) > 0)
      const firstCust = customers.data[0]
      setSelectedCustomerId(firstWithDebt ? firstWithDebt.id : firstCust ? firstCust.id : null)
    }
  }, [customers.data, debtorMap, selectedCustomerId])

  // Selected customer details
  const selectedCustomer = useMemo(
    () => customers.data?.find((c) => c.id === selectedCustomerId) ?? null,
    [customers.data, selectedCustomerId],
  )

  const selectedDebt = useCustomerDebt(selectedCustomerId ?? 0)
  const selectedPayments = useCustomerPayments(selectedCustomerId ?? 0)

  // KPI Metrics
  const totalOutstanding = debtors.data?.reduce((acc, d) => acc + d.totalDebt, 0) ?? 0
  const indebtedCount = debtors.data?.length ?? 0
  const totalCustomersCount = customers.data?.length ?? 0
  const todayDebtPaid = todayReport.data?.summary.totalDebtPaid ?? 0

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    if (!customers.data) return []
    return customers.data.filter((c) => {
      const debt = debtorMap.get(c.id) ?? 0
      if (filterMode === 'indebted' && debt <= 0) return false
      if (filterMode === 'paid' && debt > 0) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchesName = c.name.toLowerCase().includes(q)
        const matchesPhone = c.phone?.includes(q)
        if (!matchesName && !matchesPhone) return false
      }
      return true
    })
  }, [customers.data, debtorMap, filterMode, searchQuery])

  // Handle Add Customer
  const handleAddCustomerSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!newCustName.trim()) return

    createCustomerMutation.mutate(
      {
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        note: newCustNote.trim() || undefined,
      },
      {
        onSuccess: (newCust) => {
          setShowAddCustomerModal(false)
          setNewCustName('')
          setNewCustPhone('')
          setNewCustNote('')
          setSelectedCustomerId(newCust.id)
          queryClient.invalidateQueries({ queryKey: ['customers'] })
        },
      },
    )
  }

  // Handle Debt Settlement
  const handlePaymentSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedCustomerId) return

    const amountCentimes = parseDaToCentimes(paymentAmountText)
    if (!amountCentimes || amountCentimes <= 0) return

    addPayment.mutate(
      {
        customerId: selectedCustomerId,
        amount: amountCentimes,
      },
      {
        onSuccess: () => {
          setPaymentAmountText('')
          queryClient.invalidateQueries({ queryKey: ['debtors'] })
          queryClient.invalidateQueries({ queryKey: ['customerDebt', selectedCustomerId] })
          queryClient.invalidateQueries({ queryKey: ['customerPayments', selectedCustomerId] })
        },
      },
    )
  }

  // Pay Full Debt helper
  const handlePayFull = () => {
    const debt = selectedDebt.data ?? 0
    if (debt <= 0) return
    setPaymentAmountText((debt / 100).toString())
  }

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      {/* 1. Top 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
          <div>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo block">
              إجمالي الديون القائمة
            </span>
            <span
              className="font-currency-display text-display-lg font-bold font-mono text-tertiary mt-1 block"
              dir="ltr"
            >
              {formatDa(totalOutstanding)}
            </span>
            <span className="text-body-sm text-on-surface-variant font-mono mt-0.5 block">
              {indebtedCount} زبائن مسجل عليهم ديون
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">account_balance_wallet</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
          <div>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo block">
              إجمالي الزبائن المسجلين
            </span>
            <span
              className="font-currency-display text-display-lg font-bold font-mono text-primary mt-1 block"
              dir="ltr"
            >
              {totalCustomersCount}
            </span>
            <span className="text-body-sm text-on-surface-variant mt-0.5 block">
              حسابات نشطة في قاعدة البيانات
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">group</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
          <div>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo block">
              مقبوضات الديون اليوم
            </span>
            <span
              className="font-currency-display text-display-lg font-bold font-mono text-emerald-700 mt-1 block"
              dir="ltr"
            >
              +{formatDa(todayDebtPaid)}
            </span>
            <span className="text-body-sm text-emerald-700 font-bold mt-0.5 block">
              تم تحصيلها وإيداعها في الصندوق
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">savings</span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Actions Bar */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-wrap items-center justify-between gap-space-md">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30 font-cairo font-bold text-body-sm">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            الكل ({totalCustomersCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('indebted')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              filterMode === 'indebted'
                ? 'bg-surface-container-lowest text-tertiary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            عليهم ديون ({indebtedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('paid')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              filterMode === 'paid'
                ? 'bg-surface-container-lowest text-emerald-700 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            مسددون بالكامل ({Math.max(0, totalCustomersCount - indebtedCount)})
          </button>
        </div>

        {/* Search & Add Button */}
        <div className="flex items-center gap-space-sm flex-1 sm:flex-initial justify-end">
          <div className="relative min-w-[220px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الزبون أو الهاتف..."
              className="w-full h-10 px-3 pr-9 rounded-lg bg-surface-container-low border border-outline-variant/40 text-body-md"
            />
            <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-on-surface-variant text-[18px]">
              search
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddCustomerModal(true)}
            className="flex items-center gap-1.5 px-space-md py-2 bg-primary-container hover:bg-primary text-on-primary rounded-lg text-body-md font-bold shadow-sm transition-colors cursor-pointer font-cairo shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>زبون جديد</span>
          </button>
        </div>
      </div>

      {/* 3. Split Layout: Customers Table (8 cols) & Customer Details / Debt Settlement (4 cols) */}
      <div className="grid grid-cols-12 gap-space-md items-start">
        {/* Customers Table (8 cols) */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-body-sm border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant font-cairo text-[13px]">
                  <th className="py-2.5 px-3">اسم الزبون</th>
                  <th className="py-2.5 px-3">رقم الهاتف</th>
                  <th className="py-2.5 px-3">الدين الحالي</th>
                  <th className="py-2.5 px-3">الحالة</th>
                  <th className="py-2.5 px-3 text-center">اختيار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-tajawal">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => {
                    const debt = debtorMap.get(c.id) ?? 0
                    const isSelected = c.id === selectedCustomerId

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`hover:bg-surface-container-low/60 transition-colors cursor-pointer ${
                          isSelected ? 'bg-surface-container-low/90 font-bold' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined text-[18px]">person</span>
                            </div>
                            <span className="font-bold text-on-surface text-body-md">{c.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-on-surface-variant" dir="ltr">
                          {c.phone || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-currency-display text-label-lg font-bold font-mono ${
                              debt > 0 ? 'text-tertiary' : 'text-emerald-700'
                            }`}
                            dir="ltr"
                          >
                            {debt > 0 ? formatDa(debt) : '0.00 DA'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {debt > 0 ? (
                            <span className="text-[11px] font-bold text-tertiary bg-tertiary-fixed px-2 py-0.5 rounded">
                              عليه دين
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              مسدد
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`material-symbols-outlined text-[20px] ${
                              isSelected ? 'text-primary' : 'text-outline-variant'
                            }`}
                          >
                            {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                      لا يوجد زبائن يطابقون خيارات البحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Customer Pane & Quick Settlement Form (4 cols) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-space-md">
          {selectedCustomer ? (
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
              {/* Customer Profile Header */}
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[22px]">person</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
                      {selectedCustomer.name}
                    </h3>
                    <span className="text-body-sm text-on-surface-variant font-mono" dir="ltr">
                      {selectedCustomer.phone || 'بدون رقم هاتف'}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    (selectedDebt.data ?? 0) > 0
                      ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {(selectedDebt.data ?? 0) > 0 ? 'مدين' : 'مسدد'}
                </span>
              </div>

              {/* Debt Outstanding Card */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1">
                <span className="text-body-sm text-on-surface-variant">
                  إجمالي الدين المستحق الآن:
                </span>
                <span
                  className="font-currency-display text-display-lg font-bold font-mono text-tertiary"
                  dir="ltr"
                >
                  {formatDa(selectedDebt.data ?? 0)}
                </span>
              </div>

              {/* Quick Debt Settlement Form */}
              {(selectedDebt.data ?? 0) > 0 ? (
                <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-space-sm pt-2">
                  <div className="flex items-center justify-between">
                    <label className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
                      تسديد دفعة من الدين
                    </label>
                    <button
                      type="button"
                      onClick={handlePayFull}
                      className="text-body-sm text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">done_all</span>
                      <span>تسديد الدين كاملاً</span>
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="grid grid-cols-4 gap-1">
                    {['500', '1000', '2000', '5000'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPaymentAmountText(val)}
                        className="h-8 rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-mono font-bold text-xs border border-outline-variant/30"
                      >
                        {val}
                      </button>
                    ))}
                  </div>

                  {/* Payment Amount Input */}
                  <div className="flex flex-col gap-1">
                    <input
                      type="number"
                      dir="ltr"
                      value={paymentAmountText}
                      onChange={(e) => setPaymentAmountText(e.target.value)}
                      placeholder="0"
                      className="h-12 px-3 rounded-lg bg-surface-container-low font-mono font-bold text-xl text-emerald-700 border border-outline-variant/40 pos-focus"
                    />
                  </div>

                  {/* Notes */}
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="ملاحظات التسديد..."
                    className="h-9 px-3 rounded-lg border border-outline-variant/40 text-body-sm font-tajawal"
                  />

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!paymentAmountText || addPayment.isPending}
                    className="mt-1 w-full h-12 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-bold font-cairo flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <span>
                      {addPayment.isPending ? 'جاري التسديد...' : 'تأكيد قبض المبلغ وإلغاء الدين'}
                    </span>
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-emerald-600 text-[28px]">
                    check_circle
                  </span>
                  <span className="font-bold text-emerald-800 text-body-md font-cairo">
                    هذا الزبون بريء الذمة ومسدد بالكامل
                  </span>
                </div>
              )}

              {/* Customer Recent Debt/Payment History */}
              <div className="pt-2 border-t border-outline-variant/20 flex flex-col gap-2">
                <span className="font-bold text-body-sm text-on-surface font-cairo">
                  سجل المعاملات والتسديدات الأخيرة:
                </span>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {selectedPayments.data && selectedPayments.data.length > 0 ? (
                    selectedPayments.data.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 rounded-lg bg-surface-container-low flex items-center justify-between text-body-sm"
                      >
                        <div>
                          <span className="font-bold text-emerald-700 block">تسديد نقدي</span>
                          <span className="text-[11px] text-on-surface-variant font-mono">
                            {new Date(p.createdAt).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-700" dir="ltr">
                          -{formatDa(p.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-body-sm text-on-surface-variant text-center py-2">
                      لا توجد تسديدات سابقة مسجلة
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/30 text-center text-on-surface-variant">
              اختر زبوناً من القائمة لعرض تفاصيله وتسديد ديونه
            </div>
          )}
        </div>
      </div>

      {/* 4. Modal: Add New Customer */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/40 w-full max-w-md p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  person_add
                </span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
                  إضافة زبون جديد إلى الدفتر
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="flex flex-col gap-space-sm">
              <div className="flex flex-col gap-1">
                <label className="text-body-sm font-bold text-on-surface">
                  اسم الزبون الكامل *:
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="مثال: كمال تيجاني"
                  className="h-10 px-3 rounded-lg border border-outline-variant/40 text-body-md"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-body-sm font-bold text-on-surface">
                  رقم الهاتف (اختياري):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="06.. / 05.. / 07.."
                  className="h-10 px-3 rounded-lg border border-outline-variant/40 text-body-md font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-body-sm font-bold text-on-surface">
                  ملاحظات / سقف الدين:
                </label>
                <input
                  type="text"
                  value={newCustNote}
                  onChange={(e) => setNewCustNote(e.target.value)}
                  placeholder="مثال: جار المحل، سقف 10,000 د.ج"
                  className="h-10 px-3 rounded-lg border border-outline-variant/40 text-body-md"
                />
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-body-md cursor-pointer"
                >
                  إلغاء (Esc)
                </button>
                <button
                  type="submit"
                  disabled={!newCustName.trim() || createCustomerMutation.isPending}
                  className="px-space-md py-2 rounded-lg bg-primary text-on-primary font-bold text-body-md hover:bg-primary-container cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {createCustomerMutation.isPending ? 'جاري الحفظ...' : 'حفظ وإضافة الزبون'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
