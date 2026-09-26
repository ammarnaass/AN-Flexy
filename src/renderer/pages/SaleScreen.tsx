import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { generateUssdCode, parseUssdCode } from '@shared/ussd'
import type { CustomerInfo } from '@shared/contracts/customers'

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000]

export function SaleScreen() {
  const operators = useActiveOperators()
  const balances = useSalesBalances()
  const create = useCreateSale()
  const voidSale = useVoidSale()
  const session = useSession()
  const recentSales = useRecentSales(15)
  const queryClient = useQueryClient()

  const phoneInputRef = useRef<HTMLInputElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  const [operatorId, setOperatorId] = useState<number>(0)
  const [phone, setPhone] = useState('')
  const [amountText, setAmountText] = useState('')
  const [isDebt, setIsDebt] = useState(false)
  const [paidText, setPaidText] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [isManualCode, setIsManualCode] = useState(false)

  // Debt Customer State
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const createCustomerMutation = useCreateCustomer()

  // Modals state
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [voidReason, setVoidReason] = useState<string>(salesMessages.voidDefaultReason)
  const [showUssdModal, setShowUssdModal] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Customer live search
  const customerSearchResults = useCustomerSearch({ query: customerSearchQuery.trim(), limit: 5 })

  // Select first operator by default
  useEffect(() => {
    if (operators.data && operators.data.length > 0 && operatorId === 0) {
      const first = operators.data[0]
      if (first) {
        setOperatorId(first.id)
      }
    }
  }, [operators.data, operatorId])

  // Operator Brand helper
  const getOpBrand = (name?: string) => {
    const n = (name ?? '').toLowerCase()
    if (n.includes('mobilis') || n.includes('موبيليس')) {
      return {
        id: 'mobilis',
        nameAr: 'موبيليس',
        nameEn: 'Mobilis',
        color: '#16a34a',
        bg: '#dcfce7',
        border: 'border-[#16a34a]',
        badgeBg: 'bg-[#dcfce7]',
        badgeText: 'text-[#15803d]',
        prefix: '06XX',
        ussdTemplate: (p: string, a: string) => generateUssdCode('mobilis', p, a),
      }
    }
    if (n.includes('djezzy') || n.includes('جيزي')) {
      return {
        id: 'djezzy',
        nameAr: 'جيزي',
        nameEn: 'Djezzy',
        color: '#ea580c',
        bg: '#ffedd5',
        border: 'border-[#ea580c]',
        badgeBg: 'bg-[#ffedd5]',
        badgeText: 'text-[#c2410c]',
        prefix: '07XX',
        ussdTemplate: (p: string, a: string) => generateUssdCode('djezzy', p, a),
      }
    }
    return {
      id: 'ooredoo',
      nameAr: 'أوريدو',
      nameEn: 'Ooredoo',
      color: '#dc2626',
      bg: '#fee2e2',
      border: 'border-[#dc2626]',
      badgeBg: 'bg-[#fee2e2]',
      badgeText: 'text-[#b91c1c]',
      prefix: '05XX',
      ussdTemplate: (p: string, a: string) => generateUssdCode('ooredoo', p, a),
    }
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      if (e.key === 'F8') {
        e.preventDefault()
        codeRef.current?.focus()
        codeRef.current?.select()
        return
      }

      if (e.key === 'Escape') {
        if (showVoidModal) {
          setShowVoidModal(false)
          return
        }
        if (showUssdModal) {
          setShowUssdModal(false)
          return
        }
        if (showNewCustomerForm) {
          setShowNewCustomerForm(false)
          return
        }
        setPhone('')
        setAmountText('')
        setPaidText('')
        setIsDebt(false)
        setSelectedCustomer(null)
        setIsManualCode(false)
        setManualCode('')
        phoneInputRef.current?.focus()
        return
      }

      if (!isInput && ['1', '2', '3'].includes(e.key) && operators.data) {
        const idx = Number(e.key) - 1
        const op = operators.data[idx]
        if (op) {
          setOperatorId(op.id)
        }
        return
      }

      if (!isInput && (e.key === 'd' || e.key === 'D' || e.key === 'ي')) {
        setIsDebt((prev) => !prev)
        return
      }

      if (e.key === 'F7') {
        e.preventDefault()
        setShowNewCustomerForm(true)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [operators.data, showVoidModal, showUssdModal, showNewCustomerForm])

  // Auto-detect operator prefix from phone number
  useEffect(() => {
    if (!operators.data) return
    const findOp = (kw: string) => operators.data?.find((o) => o.name.toLowerCase().includes(kw))
    if (phone.startsWith('06')) {
      const mob = findOp('mobilis') ?? findOp('موبيليس')
      if (mob && mob.id !== operatorId) setOperatorId(mob.id)
    } else if (phone.startsWith('07')) {
      const dj = findOp('djezzy') ?? findOp('جيزي')
      if (dj && dj.id !== operatorId) setOperatorId(dj.id)
    } else if (phone.startsWith('05')) {
      const oor = findOp('ooredoo') ?? findOp('أوريدو') ?? findOp('اوريدو')
      if (oor && oor.id !== operatorId) setOperatorId(oor.id)
    }
  }, [phone, operators.data, operatorId])

  const selectedOperator = useMemo(
    () => operators.data?.find((o) => o.id === operatorId),
    [operators.data, operatorId],
  )

  const selectedBalance = useMemo(
    () => balances.data?.find((b) => b.operatorId === operatorId),
    [balances.data, operatorId],
  )

  const currentOpBrand = getOpBrand(selectedOperator?.name)
  const autoUssdCode = currentOpBrand.ussdTemplate(phone, amountText)

  // Keep manualCode in sync with auto-generated code unless manually overridden
  useEffect(() => {
    if (!isManualCode) {
      setManualCode(autoUssdCode)
    }
  }, [autoUssdCode, isManualCode])

  const parsedUssd = useMemo(() => parseUssdCode(manualCode), [manualCode])
  const canApplyParsed = Boolean(
    isManualCode &&
      parsedUssd.isValid &&
      (parsedUssd.phone !== phone || parsedUssd.amount !== amountText)
  )

  const handleManualCodeChange = (newVal: string) => {
    setManualCode(newVal)
    setIsManualCode(true)
  }

  const handleResetToAuto = () => {
    setIsManualCode(false)
    setManualCode(autoUssdCode)
  }

  const handleApplyParsed = () => {
    if (parsedUssd.phone) {
      setPhone(parsedUssd.phone)
    }
    if (parsedUssd.amount) {
      setAmountText(parsedUssd.amount)
    }
    if (parsedUssd.operatorKey && operators.data) {
      const targetOp = operators.data.find((o) =>
        o.name.toLowerCase().includes(parsedUssd.operatorKey!)
      )
      if (targetOp) {
        setOperatorId(targetOp.id)
      }
    }
  }

  const amount = parseDaToCentimes(amountText)
  const paid = isDebt ? (paidText.trim() === '' ? 0 : parseDaToCentimes(paidText)) : amount
  const phoneOk = /^0[567]\d{8}$/.test(phone)

  const isExceedingBalance =
    amount !== null &&
    amount > 0 &&
    selectedBalance !== undefined &&
    amount > selectedBalance.balance

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

  // Estimated profit margin (e.g. operator marginBp)
  const expectedProfitCentimes = useMemo(() => {
    if (!amount || !selectedOperator) return 0
    return Math.round((amount * (selectedOperator.marginBp || 500)) / 10000)
  }, [amount, selectedOperator])

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
          setIsManualCode(false)
          setManualCode('')
          queryClient.invalidateQueries({ queryKey: ['recentSales'] })
          queryClient.invalidateQueries({ queryKey: ['salesBalances'] })
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
          queryClient.invalidateQueries({ queryKey: ['recentSales'] })
          queryClient.invalidateQueries({ queryKey: ['salesBalances'] })
        },
      },
    )
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const setMaxAmount = () => {
    if (!selectedBalance || selectedBalance.balance <= 0) return
    setAmountText((selectedBalance.balance / 100).toString())
  }

  return (
    <div className="flex flex-col w-full pb-space-lg gap-space-md">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold font-cairo">
            بيع فليكسي سريع
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            محطة التعبئة السريعة وإرسال الرصيد اللحظي عبر شرائح المبيعات
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUssdModal(true)}
          className="flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container-low hover:bg-surface-container text-primary font-bold rounded-lg text-body-md transition-colors cursor-pointer border border-outline-variant/40"
        >
          <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
          <span>معاينة كود الفليكسي السريع</span>
        </button>
      </div>

      {/* 2. Main 12-Column Grid */}
      <div className="grid grid-cols-12 gap-space-md items-start">
        {/* LEFT / CENTER (8 Columns): Operator Selection + Form Inputs */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-space-md">
          {/* Card 1: 3-Carrier Quick Selector */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
                1. اختيار شبكة المتعامل
              </span>
              <span className="text-body-sm text-on-surface-variant font-mono">
                اختصار: [1] موبيليس · [2] جيزي · [3] أوريدو
              </span>
            </div>

            <div className="grid grid-cols-3 gap-space-md">
              {operators.data?.map((op, idx) => {
                const b = balances.data?.find((item) => item.operatorId === op.id)
                const isSelected = op.id === operatorId
                const brand = getOpBrand(op.name)
                const isLow = b !== undefined && b.balance < op.lowBalanceAt
                const balanceDa = b ? Math.floor(b.balance / 100) : 0

                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setOperatorId(op.id)}
                    className={`flex flex-col p-space-md rounded-xl border-2 transition-all cursor-pointer relative text-right ${
                      isSelected
                        ? 'bg-surface-container-lowest shadow-md'
                        : 'bg-surface-container-low/60 hover:bg-surface-container-low border-outline-variant/30'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: brand.color,
                            backgroundColor: `${brand.color}08`,
                          }
                        : {}
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-space-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: brand.color }}
                        />
                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
                          {op.name}
                        </span>
                      </div>
                      <span
                        className="font-mono text-label-sm font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${brand.color}15`,
                          color: brand.color,
                        }}
                        dir="ltr"
                      >
                        [ {idx + 1} ]
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 mt-1">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        الرصيد المتاح للبيع:
                      </span>
                      <div className="flex items-center justify-between">
                        <span
                          className="font-currency-display text-label-lg font-bold font-mono"
                          dir="ltr"
                        >
                          {balanceDa.toLocaleString()} DA
                        </span>
                        {isLow && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                            <span className="material-symbols-outlined text-[12px]">warning</span>
                            <span>منخفض</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-on-surface-variant" dir="ltr">
                        {brand.prefix}
                      </span>
                      {isSelected && (
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={{ color: brand.color }}
                        >
                          check_circle
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Card 2: Phone Input, Amount Chips, Payment Method */}
          <form
            onSubmit={submit}
            className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-md"
          >
            {/* Phone Number Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="pos-phone"
                  className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo"
                >
                  2. رقم هاتف الزبون (MSISDN)*
                </label>
                {phone.length >= 2 && (
                  <span
                    className="font-label-sm text-label-sm font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${currentOpBrand.color}15`,
                      color: currentOpBrand.color,
                    }}
                  >
                    شبكة: {currentOpBrand.nameAr}
                  </span>
                )}
              </div>

              <div className="relative flex items-center">
                <span className="absolute right-3.5 material-symbols-outlined text-outline text-[22px]">
                  phone_iphone
                </span>
                <input
                  id="pos-phone"
                  ref={phoneInputRef}
                  type="text"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="06.. / 05.. / 07.."
                  className="w-full h-13 pr-11 pl-12 rounded-lg bg-surface-container-low text-on-surface font-mono text-xl font-bold border border-outline-variant/40 focus:border-primary pos-focus tracking-wider"
                  autoFocus
                />
                {phone && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhone('')
                      phoneInputRef.current?.focus()
                    }}
                    className="absolute left-3 p-1 text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">backspace</span>
                  </button>
                )}
              </div>
              {phone && !phoneOk && (
                <span className="text-body-sm text-red-600 font-medium">
                  يجب أن يبدأ الرقم بـ 05 أو 06 أو 07 ويتكون من 10 أرقام
                </span>
              )}
            </div>

            {/* Flexy Amount Field & Quick Buttons */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="pos-amount"
                  className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo"
                >
                  3. مبلغ الفليكسي (بالدينار الجزائري)*
                </label>
                <button
                  type="button"
                  onClick={setMaxAmount}
                  className="text-body-sm text-primary hover:underline font-bold cursor-pointer"
                >
                  تحديد أقصى رصيد متاح
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  id="pos-amount"
                  ref={amountInputRef}
                  type="number"
                  dir="ltr"
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                  placeholder="0"
                  className="w-full h-14 px-4 pl-16 rounded-lg bg-surface-container-low text-on-surface font-mono text-2xl font-bold border border-outline-variant/40 focus:border-primary pos-focus"
                />
                <span className="absolute left-4 font-cairo font-bold text-on-surface-variant text-base">
                  د.ج / DA
                </span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-6 gap-space-xs mt-1">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setAmountText(amt.toString())
                      amountInputRef.current?.focus()
                    }}
                    className={`h-10 rounded-lg font-mono font-bold text-sm border transition-all cursor-pointer ${
                      amountText === amt.toString()
                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                        : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-outline-variant/30'
                    }`}
                  >
                    {amt} DA
                  </button>
                ))}
              </div>

              {isExceedingBalance && (
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-50 text-red-700 text-body-sm font-semibold border border-red-200">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>المبلغ المطلوب أكبر من الرصيد المتوفر في الشريحة!</span>
                </div>
              )}
            </div>

            {/* 4. Manual Code Input / USSD Field */}
            <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="pos-manual-code"
                    className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo"
                  >
                    4. كود الفليكسي / USSD
                  </label>
                  {isManualCode ? (
                    <span className="inline-flex items-center gap-1 font-label-sm text-label-sm font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      <span>إدخال يدوي مخصص</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-label-sm text-label-sm font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      <span>توليد تلقائي</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-mono text-on-surface-variant font-bold px-1.5 py-0.5 rounded bg-surface-container-low border border-outline-variant/40"
                    dir="ltr"
                    title="اختصار التركيز على الكود"
                  >
                    [F8]
                  </span>
                  {isManualCode && (
                    <button
                      type="button"
                      onClick={handleResetToAuto}
                      className="text-body-sm text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                      <span>استعادة التلقائي</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopyCode(manualCode)}
                    className="text-body-sm text-on-surface-variant hover:text-on-surface font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>{copiedCode === manualCode ? 'تم النسخ!' : 'نسخ'}</span>
                  </button>
                </div>
              </div>

              {/* Code Input Field */}
              <div className="relative flex items-center">
                <span className="absolute right-3.5 material-symbols-outlined text-outline text-[22px]">
                  terminal
                </span>
                <input
                  id="pos-manual-code"
                  ref={codeRef}
                  type="text"
                  dir="ltr"
                  spellCheck={false}
                  value={manualCode}
                  onChange={(e) => handleManualCodeChange(e.target.value)}
                  placeholder="*600*1*06XXXXXXXX*0*0000#"
                  className={`w-full h-12 pr-11 pl-12 rounded-lg font-mono text-lg font-bold border transition-colors pos-focus tracking-wider ${
                    isManualCode
                      ? 'bg-amber-50/50 text-amber-950 border-amber-300 focus:border-amber-500'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/40 focus:border-primary'
                  }`}
                />
                {manualCode && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isManualCode) {
                        setManualCode('')
                      } else {
                        handleResetToAuto()
                      }
                      codeRef.current?.focus()
                    }}
                    title={isManualCode ? 'مسح الكود' : 'إعادة ضبط'}
                    className="absolute left-3 p-1 text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isManualCode ? 'backspace' : 'refresh'}
                    </span>
                  </button>
                )}
              </div>

              {/* Smart Extracted Data Banner */}
              {canApplyParsed && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 animate-fadeIn">
                  <div className="flex items-center gap-2 text-body-sm">
                    <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                      magic_button
                    </span>
                    <span>
                      تم الكشف من الكود:{' '}
                      {parsedUssd.operatorKey && (
                        <strong className="font-cairo">
                          شبكة{' '}
                          {parsedUssd.operatorKey === 'mobilis'
                            ? 'موبيليس'
                            : parsedUssd.operatorKey === 'djezzy'
                            ? 'جيزي'
                            : 'أوريدو'}{' '}
                          ·{' '}
                        </strong>
                      )}
                      هاتف: <strong className="font-mono" dir="ltr">{parsedUssd.phone}</strong>
                      {parsedUssd.amount && (
                        <> · مبلغ: <strong className="font-mono">{parsedUssd.amount} DA</strong></>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyParsed}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-bold text-body-sm flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">done_all</span>
                    <span>تطبيق على النموذج</span>
                  </button>
                </div>
              )}
            </div>

            {/* Payment Method: Cash vs Debt */}
            <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold font-cairo">
                5. طريقة الدفع وتحديد الحساب
              </span>

              <div className="grid grid-cols-2 gap-space-md">
                <label
                  className={`flex items-center gap-space-sm p-space-md rounded-xl border-2 cursor-pointer transition-all ${
                    !isDebt
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <input
                    type="radio"
                    name="pay-mode"
                    checked={!isDebt}
                    onChange={() => setIsDebt(false)}
                    className="hidden"
                  />
                  <span className="material-symbols-outlined text-primary text-[24px]">
                    payments
                  </span>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
                      دفع نقدي كامل (كاش)
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      تسليم المبلغ فوراً في الصندوق
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-space-sm p-space-md rounded-xl border-2 cursor-pointer transition-all ${
                    isDebt
                      ? 'border-tertiary bg-tertiary/5 shadow-xs'
                      : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <input
                    type="radio"
                    name="pay-mode"
                    checked={isDebt}
                    onChange={() => setIsDebt(true)}
                    className="hidden"
                  />
                  <span className="material-symbols-outlined text-tertiary text-[24px]">
                    account_balance_wallet
                  </span>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
                      تسجيل دين / جزئي (Crédit)
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      إدراج في دفتر حساب الزبون
                    </span>
                  </div>
                </label>
              </div>

              {/* Debt Customer Selection & Inline Creation */}
              {isDebt && (
                <div className="mt-2 p-space-md rounded-xl bg-surface-container-low border border-outline-variant/40 flex flex-col gap-space-sm animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="font-body-md text-body-md font-bold text-on-surface">
                      البحث عن زبون مسجل أو اختيار سريع:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerForm((v) => !v)}
                      className="text-body-sm text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_add</span>
                      <span>إضافة زبون جديد (F7)</span>
                    </button>
                  </div>

                  {/* Customer search input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      placeholder="اكتب اسم الزبون أو رقم هاتفه..."
                      className="w-full h-10 px-3 pr-9 rounded-lg bg-surface-container-lowest border border-outline-variant/40 focus:border-primary text-body-md font-tajawal"
                    />
                    <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-on-surface-variant text-[18px]">
                      search
                    </span>

                    {/* Search dropdown results */}
                    {customerSearchResults.data &&
                      customerSearchResults.data.length > 0 &&
                      customerSearchQuery.trim() && (
                        <div className="absolute top-11 right-0 left-0 bg-surface-container-lowest border border-outline-variant/40 rounded-lg shadow-lg z-20 overflow-hidden">
                          {customerSearchResults.data.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(c)
                                setCustomerSearchQuery('')
                              }}
                              className="w-full px-3 py-2 text-right hover:bg-surface-container-low flex items-center justify-between border-b border-outline-variant/20 last:border-0"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-on-surface text-body-md">
                                  {c.name}
                                </span>
                                {c.phone && (
                                  <span className="text-body-sm text-on-surface-variant font-mono">
                                    {c.phone}
                                  </span>
                                )}
                              </div>
                              <span className="material-symbols-outlined text-primary text-[18px]">
                                check
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Selected Customer Card */}
                  {selectedCustomer && (
                    <div className="p-space-sm bg-surface-container-lowest rounded-lg border border-primary/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          person
                        </span>
                        <div>
                          <span className="font-bold text-on-surface text-body-md">
                            {selectedCustomer.name}
                          </span>
                          {selectedCustomer.phone && (
                            <span className="text-body-sm text-on-surface-variant font-mono mr-2">
                              ({selectedCustomer.phone})
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(null)}
                        className="text-on-surface-variant hover:text-red-600 p-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  )}

                  {/* Partial Paid Amount */}
                  <div className="flex items-center justify-between gap-space-md pt-2">
                    <div className="flex-1">
                      <label className="font-body-sm text-body-sm text-on-surface-variant block mb-1">
                        المبلغ المدفوع كاش الآن (اختياري):
                      </label>
                      <input
                        type="number"
                        dir="ltr"
                        value={paidText}
                        onChange={(e) => setPaidText(e.target.value)}
                        placeholder="0"
                        className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 font-mono text-body-md font-bold"
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-body-sm text-body-sm text-on-surface-variant block mb-1">
                        الباقي كدين:
                      </span>
                      <span
                        className="font-currency-display text-headline-sm font-bold text-tertiary font-mono"
                        dir="ltr"
                      >
                        {formatDa(remainingDebt)}
                      </span>
                    </div>
                  </div>

                  {/* Inline New Customer Form */}
                  {showNewCustomerForm && (
                    <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/30 flex flex-col gap-2 mt-1">
                      <span className="font-bold text-body-sm text-on-surface">
                        إضافة زبون جديد:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          placeholder="اسم الزبون *"
                          className="h-9 px-3 rounded border border-outline-variant/40 text-body-sm"
                        />
                        <input
                          type="text"
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          placeholder="رقم الهاتف"
                          className="h-9 px-3 rounded border border-outline-variant/40 text-body-sm font-mono"
                          dir="ltr"
                        />
                      </div>
                      <div className="flex justify-end gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setShowNewCustomerForm(false)}
                          className="px-3 py-1 text-body-sm text-on-surface-variant hover:bg-surface-container rounded"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateCustomer}
                          disabled={!newCustName.trim() || createCustomerMutation.isPending}
                          className="px-3 py-1 text-body-sm bg-primary text-on-primary rounded font-bold hover:bg-primary-container disabled:opacity-50"
                        >
                          حفظ واختيار
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* RIGHT (4 Columns): Transaction Summary & Execution Actions */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-space-md">
          {/* Card 1: Summary Receipt & Confirmation Button */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
                ملخص العملية وتأكيد الإرسال
              </span>
              <span className="material-symbols-outlined text-primary text-[20px]">
                receipt_long
              </span>
            </div>

            <div className="flex flex-col gap-space-sm text-body-md">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">الشبكة والمتعامل:</span>
                <span
                  className="font-bold px-2 py-0.5 rounded text-label-sm font-cairo"
                  style={{
                    backgroundColor: `${currentOpBrand.color}15`,
                    color: currentOpBrand.color,
                  }}
                >
                  {currentOpBrand.nameAr} ({currentOpBrand.nameEn})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">الرقم المستفيد:</span>
                <span className="font-mono font-bold text-on-surface text-label-lg" dir="ltr">
                  {phone || '----------'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">مبلغ الشحن:</span>
                <span className="font-mono font-bold text-on-surface text-label-lg" dir="ltr">
                  {amountText ? `${Number(amountText).toLocaleString()} DA` : '0 DA'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">حالة الدفع:</span>
                <span
                  className={`font-bold text-body-sm px-2 py-0.5 rounded ${
                    isDebt
                      ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isDebt
                    ? `دين آجل ${selectedCustomer ? `(${selectedCustomer.name})` : ''}`
                    : 'نقدي (كاش)'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 text-on-surface-variant text-body-sm">
                <span>هامش الربح المتوقع:</span>
                <span className="font-mono font-bold text-emerald-700" dir="ltr">
                  +{formatDa(expectedProfitCentimes)}
                </span>
              </div>

              <div className="mt-2 p-space-md rounded-xl bg-surface-container-low flex flex-col gap-0.5 border border-outline-variant/30">
                <span className="text-body-sm text-on-surface-variant">
                  المبلغ الإجمالي المطلوب من الزبون:
                </span>
                <span
                  className="font-currency-display text-display-lg text-primary font-bold font-mono"
                  dir="ltr"
                >
                  {amountText ? `${Number(amountText).toLocaleString()} DA` : '0 DA'}
                </span>
              </div>
            </div>

            {/* Error Message if any */}
            {create.isError && (
              <div className="p-space-sm rounded-lg bg-red-50 text-red-700 text-body-sm font-semibold border border-red-200">
                {translateSaleError(create.error)}
              </div>
            )}

            {/* Confirm & Send Button */}
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || create.isPending}
              className={`w-full h-13 rounded-xl flex items-center justify-center gap-space-sm font-headline-sm text-headline-sm text-on-primary font-bold font-cairo shadow-md transition-all cursor-pointer ${
                canSubmit && !create.isPending
                  ? 'bg-primary-container hover:bg-primary hover:shadow-lg'
                  : 'bg-outline-variant text-on-surface-variant/60 cursor-not-allowed shadow-none'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">send</span>
              <span>{create.isPending ? 'جاري الإرسال...' : 'تأكيد البيع وإرسال [Enter ↵]'}</span>
            </button>

            {/* Secondary Actions */}
            <div className="flex items-center gap-space-sm">
              <button
                type="button"
                onClick={() => {
                  setPhone('')
                  setAmountText('')
                  setPaidText('')
                  setIsDebt(false)
                  setSelectedCustomer(null)
                  phoneInputRef.current?.focus()
                }}
                className="flex-1 py-2 px-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-body-sm font-bold flex items-center justify-center gap-1 border border-outline-variant/30 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>مسح (Esc)</span>
              </button>

              {canVoid && (
                <button
                  type="button"
                  onClick={() => setShowVoidModal(true)}
                  className="py-2 px-space-sm rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-body-sm font-bold flex items-center justify-center gap-1 border border-red-200 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">undo</span>
                  <span>إلغاء آخر بيع</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Generated / Manual USSD Code Box */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-xs">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-body-sm text-on-surface font-cairo">
                  كود الـ USSD المعتمد:
                </span>
                {isManualCode ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                    يدوي
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                    تلقائي
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isManualCode && (
                  <button
                    type="button"
                    onClick={handleResetToAuto}
                    className="text-body-sm text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                    <span>تلقائي</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCopyCode(manualCode)}
                  className="text-body-sm text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>{copiedCode === manualCode ? 'تم النسخ!' : 'نسخ الكود'}</span>
                </button>
              </div>
            </div>
            <div
              className={`p-2.5 rounded-lg font-mono text-xs font-bold tracking-wider select-all border overflow-x-auto text-left ${
                isManualCode
                  ? 'bg-amber-50/50 text-amber-950 border-amber-200'
                  : 'bg-surface-container-low text-on-surface border-outline-variant/30'
              }`}
              dir="ltr"
            >
              {manualCode}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Table: Live Recent Sales Stream */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[20px]">
              history_toggle_off
            </span>
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
              آخر العمليات المنفذة في هذه الجلسة
            </span>
          </div>
          <span className="text-body-sm text-on-surface-variant font-mono">
            {recentSales.data?.length ?? 0} عملية مسجلة
          </span>
        </div>

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
                <th className="py-2.5 px-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-tajawal">
              {recentSales.data && recentSales.data.length > 0 ? (
                recentSales.data.map((sale) => {
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
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyCode(
                                brand.ussdTemplate(
                                  sale.targetPhone,
                                  (sale.amount / 100).toString(),
                                ),
                              )
                            }
                            title="نسخ كود USSD"
                            className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-surface-container"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              content_copy
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-on-surface-variant">
                    لا توجد عمليات بيع مسجلة بعد في هذه الجلسة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modals */}
      {/* Modal 1: USSD Preview Modal */}
      {showUssdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/40 w-full max-w-lg p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  qr_code_2
                </span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface font-cairo">
                  معاينة كود USSD للإرسال
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowUssdModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-on-surface-variant">
                  الكود المعتمد لشبكة {currentOpBrand.nameAr}:
                </span>
                {isManualCode ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    تعديل يدوي مخصص
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                    توليد تلقائي
                  </span>
                )}
              </div>
              <input
                type="text"
                dir="ltr"
                spellCheck={false}
                value={manualCode}
                onChange={(e) => handleManualCodeChange(e.target.value)}
                className={`w-full p-space-md rounded-xl font-mono text-lg font-bold tracking-wider border text-left pos-focus ${
                  isManualCode
                    ? 'bg-amber-50/50 text-amber-950 border-amber-300'
                    : 'bg-surface-container-low text-on-surface border-outline-variant/40'
                }`}
              />
              {isManualCode && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetToAuto}
                    className="text-body-sm text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                    <span>استعادة الكود التلقائي</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-2">
              <button
                type="button"
                onClick={() => setShowUssdModal(false)}
                className="px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-body-md cursor-pointer"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => handleCopyCode(manualCode)}
                className="flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-primary text-on-primary font-bold text-body-md hover:bg-primary-container cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                <span>{copiedCode === manualCode ? 'تم النسخ!' : 'نسخ الكود'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Void Transaction Modal */}
      {showVoidModal && lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-red-200 w-full max-w-md p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center gap-space-xs text-red-600">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <h3 className="font-headline-sm text-headline-sm font-bold font-cairo">
                تأكيد إلغاء وتراجع عن آخر عملية
              </h3>
            </div>

            <p className="text-body-md text-on-surface">
              هل أنت متأكد من إلغاء عملية الفليكسي بمبلغ{' '}
              <strong className="font-mono">{formatDa(lastSale.amount)}</strong> للرقم{' '}
              <strong className="font-mono" dir="ltr">
                {lastSale.targetPhone}
              </strong>
              ؟ سيتم إعادة الرصيد إلى الشريحة وإلغاء أي ديون مسجلة عليها.
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-body-sm font-bold text-on-surface">سبب الإلغاء:</label>
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="اكتب سبب الإلغاء..."
                className="h-10 px-3 rounded-lg border border-outline-variant/40 text-body-md font-tajawal focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-2">
              <button
                type="button"
                onClick={() => setShowVoidModal(false)}
                className="px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-body-md cursor-pointer"
              >
                تراجع (إبقاء العملية)
              </button>
              <button
                type="button"
                onClick={handleVoidSale}
                disabled={voidSale.isPending}
                className="flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-body-md cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                <span>{voidSale.isPending ? 'جاري الإلغاء...' : 'تأكيد الإلغاء فوراً'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
