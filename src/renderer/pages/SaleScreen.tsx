import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useActiveOperators } from '@renderer/features/operators'
import {
  useCreateSale,
  useSalesBalances,
  useRecentSales,
  useVoidSale,
  salesMessages,
  translateSaleError,
} from '@renderer/features/sales'
import { useCustomerSearch, useCreateCustomer } from '@renderer/features/customers'
import { useSession } from '@renderer/features/auth'
import { parseDaToCentimes, formatDa } from '@shared/money'
import { ui } from '@renderer/shared/messages.ar'
import {
  IconCheck,
  IconClose,
  IconAlert,
  IconPlus,
  IconSearch,
  IconUser,
} from '@renderer/shared/ui/icons'
import type { CustomerInfo } from '@shared/contracts/customers'

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000, 5000]

export function SaleScreen() {
  const operators = useActiveOperators()
  const balances = useSalesBalances()
  const create = useCreateSale()
  const voidSale = useVoidSale()
  const session = useSession()
  const recentSales = useRecentSales(1)

  const phoneInputRef = useRef<HTMLInputElement>(null)

  const [operatorId, setOperatorId] = useState<number>(0)
  const [phone, setPhone] = useState('')
  const [amountText, setAmountText] = useState('')
  const [isDebt, setIsDebt] = useState(false)
  const [paidText, setPaidText] = useState('')

  // الزبون للبيع الآجل
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const createCustomerMutation = useCreateCustomer()

  // حالة الإلغاء
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [voidReason, setVoidReason] = useState<string>(salesMessages.voidDefaultReason)

  // البحث عن الزبائن
  const customerSearchResults = useCustomerSearch({ query: customerSearchQuery.trim(), limit: 5 })

  // اختيار أول متعامل تلقائيًا عند التحميل
  useEffect(() => {
    if (operators.data && operators.data.length > 0 && operatorId === 0) {
      const first = operators.data[0]
      if (first) {
        setOperatorId(first.id)
      }
    }
  }, [operators.data, operatorId])

  // اختصارات لوحة المفاتيح للمتعاملين (1, 2, 3)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // فقط إن لم نكن نكتب في حقل نصي
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (['1', '2', '3', '4', '5'].includes(e.key) && operators.data) {
        const idx = Number(e.key) - 1
        const op = operators.data[idx]
        if (op) {
          setOperatorId(op.id)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [operators.data])

  const selectedBalance = useMemo(
    () => balances.data?.find((b) => b.operatorId === operatorId),
    [balances.data, operatorId],
  )

  const amount = parseDaToCentimes(amountText)
  const paid = isDebt ? (paidText.trim() === '' ? 0 : parseDaToCentimes(paidText)) : amount
  const phoneOk = /^0[567]\d{8}$/.test(phone)

  // كشف المتعامل حسب بادئة الرقم تلقائيًا إن لم يحدده المستخدم يدويًا
  useEffect(() => {
    if (!operators.data) return
    const findOp = (kw: string) =>
      operators.data?.find((o) => o.name.toLowerCase().includes(kw))
    if (phone.startsWith('06')) {
      const mob = findOp('mobilis') ?? findOp('موبيليس')
      if (mob) setOperatorId(mob.id)
    } else if (phone.startsWith('07')) {
      const dj = findOp('djezzy') ?? findOp('جيزي')
      if (dj) setOperatorId(dj.id)
    } else if (phone.startsWith('05')) {
      const oor = findOp('ooredoo') ?? findOp('أوريدو') ?? findOp('اوريدو')
      if (oor) setOperatorId(oor.id)
    }
  }, [phone, operators.data])

  // التحقق الفوري من الرصيد
  const isExceedingBalance =
    amount !== null && amount > 0 && selectedBalance !== undefined && amount > selectedBalance.balance

  const isZeroBalance = selectedBalance !== undefined && selectedBalance.balance <= 0

  // صلاحية الإرسال
  const canSubmit =
    operatorId > 0 &&
    phoneOk &&
    amount !== null &&
    amount > 0 &&
    !isExceedingBalance &&
    paid !== null &&
    paid >= 0 &&
    paid <= amount &&
    (!isDebt || selectedCustomer !== null)

  const remainingDebt = amount !== null && paid !== null ? amount - paid : 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    create.mutate(
      {
        operatorId,
        targetPhone: phone,
        amount: amount as number,
        paidAmount: paid as number,
        customerId: isDebt && selectedCustomer ? selectedCustomer.id : undefined,
      },
      {
        onSuccess: () => {
          setPhone('')
          setAmountText('')
          setPaidText('')
          setIsDebt(false)
          setSelectedCustomer(null)
          setCustomerSearchQuery('')
          phoneInputRef.current?.focus()
        },
      },
    )
  }

  const handleCreateCustomer = (e: FormEvent) => {
    e.preventDefault()
    if (!newCustName.trim()) return
    createCustomerMutation.mutate(
      { name: newCustName.trim(), phone: newCustPhone.trim() || undefined },
      {
        onSuccess: (cust) => {
          setSelectedCustomer(cust)
          setShowNewCustomerForm(false)
          setNewCustName('')
          setNewCustPhone('')
          setCustomerSearchQuery('')
        },
      },
    )
  }

  const lastSale = recentSales.data?.[0]
  const canVoid = session.data?.user.role === 'admin' && lastSale && !lastSale.voidedAt

  const handleVoidSale = () => {
    if (!lastSale) return
    voidSale.mutate(
      { id: lastSale.id, reason: voidReason.trim() || salesMessages.voidDefaultReason },
      {
        onSuccess: () => {
          setShowVoidModal(false)
          setVoidReason(salesMessages.voidDefaultReason)
        },
      },
    )
  }

  if (operators.isLoading) return <p className="text-slate-400">{ui.loading}</p>

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{salesMessages.title}</h1>
          <p className="text-xs text-slate-400">تعبئة رصيد فورية مع التحقق الذري المباشر</p>
        </div>

        {/* كارت آخر عملية مع زر الإلغاء للمالك */}
        {session.data?.user.role === 'admin' && lastSale && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs shadow-sm">
            <span className="text-slate-400">{salesMessages.lastSale}</span>
            <span className="font-semibold text-slate-200" dir="ltr">{lastSale.targetPhone}</span>
            <span className="font-mono font-bold text-emerald-400">{formatDa(lastSale.amount)}</span>
            {lastSale.voidedAt ? (
              <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                <IconClose size={10} />
                <span>ملغاة</span>
              </span>
            ) : (
              canVoid && (
                <button
                  type="button"
                  onClick={() => setShowVoidModal(true)}
                  className="rounded-lg bg-red-950/80 px-2.5 py-1 text-[11px] font-semibold text-red-300 transition-colors hover:bg-red-900"
                >
                  {salesMessages.voidLastSale}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {operators.data && operators.data.length === 0 ? (
        <p className="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-5 text-sm text-amber-300">
          {salesMessages.noOperator}
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/50 p-7 shadow-2xl backdrop-blur-xl">
          {/* اختيار المتعامل — أزرار عريضة ملهمة بـ PRD-UX 4.3 */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {salesMessages.operator}
              </span>
              <span className="text-[11px] text-slate-400">اختصار: الأرقام 1 · 2 · 3</span>
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              {operators.data?.map((op, idx) => {
                const b = balances.data?.find((item) => item.operatorId === op.id)
                const isSelected = op.id === operatorId
                const isExhausted = b !== undefined && b.balance <= 0
                const isLow = b !== undefined && b.balance > 0 && b.balance < op.lowBalanceAt

                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setOperatorId(op.id)}
                    className={`group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-4 text-center transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-200 ring-2 ring-emerald-500/40 glow-emerald'
                        : 'border-slate-800/90 bg-slate-950/60 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-slate-400">
                      {idx + 1}
                    </span>
                    <span className="text-base font-bold text-white">{op.name}</span>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-slate-400">{salesMessages.balanceLabel}:</span>
                      <span
                        className={`font-mono font-bold ${
                          isExhausted
                            ? 'text-red-400'
                            : isLow
                              ? 'text-amber-400'
                              : 'text-emerald-300'
                        }`}
                      >
                        {b ? formatDa(b.balance) : '—'}
                      </span>
                    </div>
                    {isLow && !isExhausted && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        <IconAlert size={10} />
                        <span>{salesMessages.lowBalance}</span>
                      </span>
                    )}
                    {isExhausted && (
                      <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                        <IconAlert size={10} />
                        <span>{salesMessages.zeroBalance}</span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* رقم الهاتف */}
            <div className="space-y-2">
              <label htmlFor="sale-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                {salesMessages.phone}
              </label>
              <div className="relative">
                <input
                  id="sale-phone"
                  ref={phoneInputRef}
                  inputMode="numeric"
                  dir="ltr"
                  autoFocus
                  placeholder="06xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={`w-full rounded-2xl border bg-slate-950 px-4 py-3.5 text-xl font-mono tracking-widest text-white outline-none transition-all ${
                    phone.length === 10
                      ? phoneOk
                        ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
                        : 'border-red-500 focus:ring-2 focus:ring-red-500/30'
                      : 'border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
                  }`}
                />
                {phone.length === 10 && phoneOk && (
                  <span className="absolute left-3.5 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    <IconCheck size={14} />
                  </span>
                )}
              </div>
            </div>

            {/* المبلغ */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="sale-amount" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  {salesMessages.amount}
                </label>
                {selectedBalance && (
                  <span className="text-xs text-slate-400">
                    الحد الأقصى: <strong className="text-slate-200">{formatDa(selectedBalance.balance)}</strong>
                  </span>
                )}
              </div>
              <input
                id="sale-amount"
                inputMode="decimal"
                dir="ltr"
                placeholder="0"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                className={`w-full rounded-2xl border bg-slate-950 px-4 py-3.5 text-xl font-mono font-bold text-white outline-none transition-all ${
                  isExceedingBalance
                    ? 'border-red-500 bg-red-950/20 text-red-200 focus:ring-2 focus:ring-red-500/30'
                    : 'border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
                }`}
              />
              {isExceedingBalance && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                  <IconAlert size={14} />
                  <span>{salesMessages.exceedsBalance}</span>
                </p>
              )}
            </div>
          </div>

          {/* أزرار المبالغ السريعة */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">{salesMessages.quickAmounts}:</span>
            {QUICK_AMOUNTS.map((v) => {
              const disabled = selectedBalance !== undefined && v * 100 > selectedBalance.balance
              return (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  onClick={() => setAmountText(String(v))}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-1.5 font-mono text-xs font-semibold text-slate-200 transition-colors hover:border-emerald-500 hover:text-emerald-300 disabled:opacity-30 disabled:hover:border-slate-800"
                >
                  {v} دج
                </button>
              )
            })}
          </div>

          {/* طريقة الدفع: كامل أو دين */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5 space-y-4">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              {salesMessages.paymentType}
            </span>
            <div className="flex items-center gap-6">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-200">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={!isDebt}
                  onChange={() => {
                    setIsDebt(false)
                    setSelectedCustomer(null)
                  }}
                  className="h-4 w-4 accent-emerald-500"
                />
                <span>{salesMessages.paymentFull}</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-200">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={isDebt}
                  onChange={() => setIsDebt(true)}
                  className="h-4 w-4 accent-emerald-500"
                />
                <span className="text-amber-400 font-semibold">{salesMessages.paymentDebt}</span>
              </label>
            </div>

            {/* تفاصيل البيع بالدين */}
            {isDebt && (
              <div className="space-y-4 border-t border-slate-800/80 pt-4">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {/* اختيار الزبون */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300">
                      {salesMessages.customer} <span className="text-red-400">*</span>
                    </label>

                    {selectedCustomer ? (
                      <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-900/40 text-emerald-300">
                            <IconUser size={16} />
                          </div>
                          <div>
                            <div className="font-bold text-emerald-200 text-xs">{selectedCustomer.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                              {selectedCustomer.phone ?? '—'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(null)}
                          className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
                        >
                          تغيير
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              placeholder={salesMessages.searchCustomer}
                              value={customerSearchQuery}
                              onChange={(e) => setCustomerSearchQuery(e.target.value)}
                              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                            />
                            <span className="absolute left-3 top-3 text-slate-500">
                              <IconSearch size={14} />
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowNewCustomerForm(true)}
                            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500"
                          >
                            <IconPlus size={14} />
                            <span>{salesMessages.newCustomer}</span>
                          </button>
                        </div>

                        {/* نتائج البحث */}
                        {customerSearchQuery.trim().length > 0 && customerSearchResults.data && (
                          <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-1.5 shadow-xl">
                            {customerSearchResults.data.length === 0 ? (
                              <div className="p-3 text-center text-xs text-slate-400">
                                لم يُعثر على زبون بهذا الاسم.{' '}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewCustName(customerSearchQuery)
                                    setShowNewCustomerForm(true)
                                  }}
                                  className="text-emerald-400 underline font-semibold"
                                >
                                  إضافة كزبون جديد
                                </button>
                              </div>
                            ) : (
                              customerSearchResults.data.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomer(c)
                                    setCustomerSearchQuery('')
                                  }}
                                  className="flex w-full items-center justify-between rounded-lg p-2 text-right text-xs hover:bg-slate-800/60"
                                >
                                  <span className="font-semibold text-slate-200">{c.name}</span>
                                  <span className="font-mono text-slate-400" dir="ltr">{c.phone}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                        {!selectedCustomer && (
                          <p className="text-[11px] text-amber-400 font-medium">{salesMessages.customerRequired}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* المبلغ المدفوع الآن والمتبقي */}
                  <div className="space-y-2">
                    <label htmlFor="sale-paid-debt" className="block text-xs font-bold text-slate-300">
                      {salesMessages.paidNow}
                    </label>
                    <input
                      id="sale-paid-debt"
                      inputMode="decimal"
                      dir="ltr"
                      placeholder="0"
                      value={paidText}
                      onChange={(e) => setPaidText(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-emerald-500"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{salesMessages.remainingDebt}</span>
                      <span className="font-mono font-bold text-red-400 text-sm">{formatDa(remainingDebt)}</span>
                    </div>
                  </div>
                </div>

                {/* نموذج سريع لإضافة زبون */}
                {showNewCustomerForm && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 space-y-3">
                    <div className="text-xs font-bold text-slate-200">إضافة زبون جديد فوريًا</div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <input
                        type="text"
                        placeholder="اسم الزبون *"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="رقم الهاتف (اختياري)"
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowNewCustomerForm(false)}
                        className="rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        disabled={!newCustName.trim() || createCustomerMutation.isPending}
                        onClick={handleCreateCustomer}
                        className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                      >
                        حفظ واختيار
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* التنبيهات والأخطاء */}
          {create.isError && (
            <p className="flex items-center gap-2 rounded-2xl border border-red-900/60 bg-red-950/30 p-3.5 text-xs text-red-300">
              <IconAlert size={16} />
              <span>{translateSaleError(create.error)}</span>
            </p>
          )}
          {create.isSuccess && (
            <p className="flex items-center gap-2 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-3.5 text-xs text-emerald-300">
              <IconCheck size={16} />
              <span>{salesMessages.success}</span>
            </p>
          )}

          {/* زر التأكيد */}
          <button
            type="submit"
            disabled={!canSubmit || create.isPending || isZeroBalance}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 text-base font-bold text-white shadow-xl shadow-emerald-950/40 transition-all hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {create.isPending ? salesMessages.submitting : salesMessages.submit}
          </button>
        </form>
      )}

      {/* نافذة تأكيد إلغاء آخر عملية */}
      {showVoidModal && lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-red-400">{salesMessages.voidLastSale}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{salesMessages.voidConfirm}</p>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">الهاتف:</span>
                <span className="text-white" dir="ltr">{lastSale.targetPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">المبلغ:</span>
                <span className="font-bold text-emerald-400">{formatDa(lastSale.amount)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="void-reason" className="block text-[11px] text-slate-400">
                {salesMessages.voidReason}
              </label>
              <input
                id="void-reason"
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVoidModal(false)}
                className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={voidSale.isPending}
                onClick={handleVoidSale}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {voidSale.isPending ? salesMessages.voiding : 'تأكيد الإلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
