import { useState, type FormEvent } from 'react'
import {
  useCustomers,
  useCustomerSearch,
  useCreateCustomer,
  customersMessages,
} from '@renderer/features/customers'
import {
  useDebtors,
  useCustomerDebt,
  useCustomerPayments,
  useAddPayment,
  debtsMessages,
  translateDebtsError,
} from '@renderer/features/debts'
import { ui } from '@renderer/shared/messages.ar'
import { formatDa, parseDaToCentimes } from '@shared/money'
import {
  IconCustomers,
  IconSearch,
  IconPlus,
  IconClose,
  IconCheck,
  IconClock,
  IconUser,
  IconPhone,
  IconCredit,
  IconArrowBack,
  IconAlert,
} from '@renderer/shared/ui/icons'

// شاشة الزبائن والديون: تجمع خاصيتَي customers وdebts (RULES 3.2 — الصفحات في pages/).
export function CustomersDebtsScreen() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)

  if (selectedCustomerId !== null) {
    return (
      <CustomerProfile
        customerId={selectedCustomerId}
        onBack={() => setSelectedCustomerId(null)}
      />
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 pb-12">
      {/* رأس الصفحة الرئيسي */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
            <IconCustomers size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-100">{debtsMessages.title}</h1>
            <p className="text-xs text-neutral-400">{debtsMessages.debtors} و {customersMessages.title}</p>
          </div>
        </div>
      </div>

      <DebtorsSection onSelectCustomer={setSelectedCustomerId} />
      <AllCustomersSection onSelectCustomer={setSelectedCustomerId} />
    </div>
  )
}

// ——— قائمة المدينين (الأكبر أولًا) ———
function DebtorsSection({ onSelectCustomer }: { onSelectCustomer: (id: number) => void }) {
  const debtors = useDebtors(50)
  const totalOutstanding = debtors.data?.reduce((acc, d) => acc + d.totalDebt, 0) ?? 0

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-neutral-100">{debtsMessages.debtors}</h2>
          {debtors.data && debtors.data.length > 0 && (
            <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 ring-1 ring-rose-500/20">
              {debtors.data.length}
            </span>
          )}
        </div>
        {totalOutstanding > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-950/20 px-3.5 py-1.5 text-xs">
            <span className="text-neutral-400">{debtsMessages.totalDebt}:</span>
            <span className="font-mono font-bold text-rose-400">{formatDa(totalOutstanding)}</span>
          </div>
        )}
      </div>

      {debtors.isLoading ? (
        <div className="flex h-32 items-center justify-center rounded-2xl border border-neutral-800/80 bg-neutral-900/40 text-neutral-500 text-sm">
          {ui.loading}
        </div>
      ) : !debtors.data || debtors.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <IconCheck size={24} />
          </div>
          <p className="text-sm font-medium text-neutral-300">{debtsMessages.noDebtors}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/40 shadow-xl backdrop-blur-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/80 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                <th className="p-3.5 text-start">{debtsMessages.customer}</th>
                <th className="p-3.5 text-end">{debtsMessages.totalDebt}</th>
                <th className="p-3.5 text-end">{debtsMessages.oldestDebt}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {debtors.data.map((d) => (
                <tr
                  key={d.customerId}
                  onClick={() => onSelectCustomer(d.customerId)}
                  className="group cursor-pointer transition-colors hover:bg-neutral-800/40"
                >
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-800 text-neutral-300 ring-1 ring-neutral-700/50 group-hover:ring-neutral-600">
                        <IconUser size={18} />
                      </div>
                      <div>
                        <span className="font-semibold text-neutral-100 group-hover:text-emerald-400 transition-colors">
                          {d.customerName}
                        </span>
                        {d.customerPhone && (
                          <div className="flex items-center gap-1 text-xs text-neutral-400 mt-0.5">
                            <IconPhone size={12} className="text-neutral-500" />
                            <span dir="ltr">{d.customerPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 text-end">
                    <span className="inline-block rounded-lg bg-rose-500/10 px-2.5 py-1 font-mono font-bold text-rose-400 ring-1 ring-rose-500/20">
                      {formatDa(d.totalDebt)}
                    </span>
                  </td>
                  <td className="p-3.5 text-end">
                    <div className="flex items-center justify-end gap-1.5 text-xs text-neutral-400">
                      <IconClock size={14} className="text-neutral-500" />
                      <span>{d.oldestDebtDate ? new Date(d.oldestDebtDate).toLocaleDateString('ar-DZ') : '—'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ——— كل الزبائن (بحث + إنشاء) ———
function AllCustomersSection({ onSelectCustomer }: { onSelectCustomer: (id: number) => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const allCustomers = useCustomers(200)
  const searchResults = useCustomerSearch({ query: searchQuery, limit: 20 })
  const addMutation = useCreateCustomer()

  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  const data = searchQuery.trim().length > 0 ? searchResults.data : allCustomers.data

  const submitAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    addMutation.mutate(
      { name: newName.trim(), phone: newPhone.trim() || undefined },
      {
        onSuccess: () => {
          setNewName('')
          setNewPhone('')
          setShowAdd(false)
        },
      },
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-neutral-100">{customersMessages.title}</h2>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-500 active:scale-95"
        >
          <IconPlus size={16} />
          <span>{customersMessages.addNew}</span>
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={submitAdd}
          className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-xl backdrop-blur-sm"
        >
          <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-neutral-200">{customersMessages.addNew}</h3>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="text-neutral-400 hover:text-neutral-200"
            >
              <IconClose size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-neutral-300">{customersMessages.name}</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-neutral-300">{customersMessages.phone}</span>
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="06XXXXXXXX"
                dir="ltr"
                className="rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-start"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-800"
            >
              {ui.cancel}
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || addMutation.isPending}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
            >
              {addMutation.isPending ? customersMessages.saving : customersMessages.save}
            </button>
          </div>
          {addMutation.isSuccess && (
            <p className="mt-2 text-xs text-emerald-400">{customersMessages.success}</p>
          )}
        </form>
      )}

      {/* شريط البحث */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-neutral-500">
          <IconSearch size={18} />
        </div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={customersMessages.search}
          className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 py-3 pe-10 ps-10 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition-colors focus:border-emerald-500/80 focus:bg-neutral-900 focus:ring-1 focus:ring-emerald-500"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-neutral-400 hover:text-neutral-200"
          >
            <IconClose size={16} />
          </button>
        )}
      </div>

      {!data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-8 text-center">
          <p className="text-sm text-neutral-400">
            {searchQuery ? customersMessages.noResults : customersMessages.empty}
          </p>
          {searchQuery && !showAdd && (
            <button
              type="button"
              onClick={() => {
                setNewName(searchQuery)
                setShowAdd(true)
              }}
              className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
            >
              <IconPlus size={14} />
              <span>{customersMessages.addWithName}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/40 shadow-xl backdrop-blur-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/80 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                <th className="p-3.5 text-start">{customersMessages.name}</th>
                <th className="p-3.5 text-start">{customersMessages.phone}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {data.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onSelectCustomer(c.id)}
                  className="group cursor-pointer transition-colors hover:bg-neutral-800/40"
                >
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400 group-hover:text-emerald-400 transition-colors">
                        <IconUser size={16} />
                      </div>
                      <span className="font-semibold text-neutral-100 group-hover:text-emerald-400 transition-colors">
                        {c.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 text-neutral-400 text-xs font-mono" dir="ltr">
                    {c.phone ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ——— ملف الزبون: بياناته + دينه + دفعاته + زر تسجيل دفعة ———
function CustomerProfile({
  customerId,
  onBack,
}: {
  customerId: number
  onBack: () => void
}) {
  const customer = useCustomers(200)
  const debt = useCustomerDebt(customerId)
  const paymentsQuery = useCustomerPayments(customerId)
  const payMutation = useAddPayment()

  const [payAmountText, setPayAmountText] = useState('')

  const customerData = customer.data?.find((c) => c.id === customerId)
  const currentDebt = debt.data ?? 0
  const payAmount = parseDaToCentimes(payAmountText)
  const canPay = payAmount !== null && payAmount > 0 && payAmount <= currentDebt

  const submitPayment = (e: FormEvent) => {
    e.preventDefault()
    if (!canPay) return
    payMutation.mutate(
      { customerId, amount: payAmount as number },
      { onSuccess: () => setPayAmountText('') },
    )
  }

  const payFull = () => {
    if (currentDebt <= 0) return
    const da = Math.trunc(currentDebt / 100)
    const cents = currentDebt % 100
    setPayAmountText(cents > 0 ? `${da}.${String(cents).padStart(2, '0')}` : String(da))
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-12">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 self-start rounded-xl border border-neutral-800 bg-neutral-900/60 px-3.5 py-2 text-xs font-semibold text-neutral-300 transition-colors hover:border-neutral-700 hover:text-neutral-100 active:scale-95"
      >
        <IconArrowBack size={16} />
        <span>{debtsMessages.title}</span>
      </button>

      {!customerData ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-neutral-800 text-sm text-neutral-400">
          {ui.loading}
        </div>
      ) : (
        <>
          {/* بطاقة معلومات الزبون والرصيد */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2 flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl backdrop-blur-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
                <IconUser size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-neutral-100">{customerData.name}</h1>
                {customerData.phone ? (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-400 font-mono" dir="ltr">
                    <IconPhone size={14} className="text-neutral-500" />
                    <span>{customerData.phone}</span>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-neutral-500">لا يوجد رقم هاتف مسجل</p>
                )}
              </div>
            </div>

            <div
              className={`flex flex-col justify-center rounded-2xl p-6 shadow-xl backdrop-blur-sm ${
                currentDebt > 0
                  ? 'border border-rose-500/30 bg-rose-950/20'
                  : 'border border-emerald-500/30 bg-emerald-950/20'
              }`}
            >
              <div className="flex items-center gap-2">
                {currentDebt > 0 ? (
                  <IconAlert size={16} className="text-rose-400" />
                ) : (
                  <IconCheck size={16} className="text-emerald-400" />
                )}
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  {debtsMessages.totalDebt}
                </span>
              </div>
              <p
                className={`mt-2 text-2xl font-bold font-mono tracking-tight ${
                  currentDebt > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {formatDa(currentDebt)}
              </p>
            </div>
          </div>

          {/* نموذج تسديد دفعة */}
          {currentDebt > 0 && (
            <form
              onSubmit={submitPayment}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <IconCredit size={20} className="text-emerald-400" />
                <h2 className="text-base font-bold text-neutral-100">{debtsMessages.addPayment}</h2>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="text-xs font-medium text-neutral-300">{debtsMessages.paymentAmount}</span>
                  <div className="relative">
                    <input
                      value={payAmountText}
                      onChange={(e) => setPayAmountText(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-base font-mono font-bold text-neutral-100 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      autoFocus
                    />
                    <span className="absolute inset-y-0 end-0 flex items-center pe-3 text-xs text-neutral-500">
                      دج
                    </span>
                  </div>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={payFull}
                    className="rounded-xl border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors active:scale-95"
                  >
                    {debtsMessages.payFull}
                  </button>
                  <button
                    type="submit"
                    disabled={!canPay || payMutation.isPending}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-500 disabled:opacity-50 active:scale-95"
                  >
                    <IconCheck size={16} />
                    <span>{payMutation.isPending ? debtsMessages.confirming : debtsMessages.confirm}</span>
                  </button>
                </div>
              </div>
              {payMutation.isError && (
                <p className="mt-3 text-xs text-rose-400 font-medium">
                  {translateDebtsError(payMutation.error)}
                </p>
              )}
              {payMutation.isSuccess && (
                <p className="mt-3 text-xs text-emerald-400 font-medium">{debtsMessages.success}</p>
              )}
            </form>
          )}

          {/* سجل الدفعات */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="mb-4 text-base font-bold text-neutral-100">{debtsMessages.payments}</h2>
            {!paymentsQuery.data || paymentsQuery.data.length === 0 ? (
              <p className="text-xs text-neutral-500">{debtsMessages.noPayments}</p>
            ) : (
              <div className="divide-y divide-neutral-800">
                {paymentsQuery.data.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-3 transition-colors hover:bg-neutral-800/20 px-2 rounded-xl"
                  >
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <IconClock size={14} className="text-neutral-500" />
                      <span>{new Date(p.createdAt).toLocaleDateString('ar-DZ')}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      +{formatDa(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
