import { useState, type FormEvent } from 'react'
import { useActiveOperators } from '@renderer/features/operators'
import { useSalesBalances } from '@renderer/features/sales'
import {
  useAddPurchase,
  useAddSettlement,
  useStockEntries,
  stockMessages,
  translateStockError,
} from '@renderer/features/stock'
import { parseDaToCentimes, formatDa } from '@shared/money'
import { ui } from '@renderer/shared/messages.ar'
import {
  IconStock,
  IconPlus,
  IconAlert,
  IconCheck,
  IconClock,
  IconSignal,
  IconRefresh,
} from '@renderer/shared/ui/icons'

type TabKey = 'purchase' | 'settlement' | 'entries'

// ألوان المتعاملين
const operatorThemes: Record<string, { ring: string; border: string; bg: string; text: string; dot: string }> = {
  mobilis: {
    ring: 'focus:ring-emerald-500/30',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-950/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
  },
  djezzy: {
    ring: 'focus:ring-red-500/30',
    border: 'border-red-500/30',
    bg: 'bg-red-950/20',
    text: 'text-red-400',
    dot: 'bg-red-500',
  },
  ooredoo: {
    ring: 'focus:ring-amber-500/30',
    border: 'border-amber-500/30',
    bg: 'bg-amber-950/20',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
  },
}

// شاشة المخزون والأرصدة
export function StockScreen() {
  const balances = useSalesBalances(true)
  const [activeTab, setActiveTab] = useState<TabKey>('purchase')

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 pb-12">
      {/* رأس الصفحة الرئيسي */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <IconStock size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-100">{stockMessages.title}</h1>
            <p className="text-xs text-neutral-400">{stockMessages.balances} والعمليات اليومية</p>
          </div>
        </div>
      </div>

      {/* بطاقات أرصدة المتعاملين */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-100">{stockMessages.balances}</h2>
          {balances.isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <IconRefresh size={14} className="animate-spin text-emerald-400" />
              <span>{ui.loading}</span>
            </div>
          )}
        </div>

        {balances.isLoading ? (
          <div className="flex h-36 items-center justify-center rounded-2xl border border-neutral-800/80 bg-neutral-900/40 text-neutral-500 text-sm">
            {ui.loading}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {balances.data?.map((b) => {
              const theme = operatorThemes[b.name.toLowerCase()] ?? {
                ring: 'focus:ring-neutral-500/30',
                border: 'border-neutral-800',
                bg: 'bg-neutral-900/40',
                text: 'text-neutral-300',
                dot: 'bg-neutral-500',
              }
              const isLow = b.balance < b.lowBalanceAt

              return (
                <div
                  key={b.operatorId}
                  className={`flex flex-col justify-between rounded-2xl border ${theme.border} ${theme.bg} p-5 shadow-xl backdrop-blur-sm transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />
                      <span className="font-bold text-neutral-100">{b.name}</span>
                    </div>
                    {isLow && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/20">
                        <IconAlert size={12} />
                        <span>رصيد منخفض</span>
                      </span>
                    )}
                  </div>

                  <div className="my-4">
                    <span className="text-xs text-neutral-400">{stockMessages.balance}</span>
                    <div
                      className={`text-2xl font-bold font-mono tracking-tight ${
                        isLow ? 'text-amber-400' : theme.text
                      }`}
                    >
                      {formatDa(b.balance)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-800/80 pt-3 text-xs text-neutral-400">
                    <div>
                      <span className="text-neutral-500">{stockMessages.credit}: </span>
                      <span className="font-mono text-neutral-300">{formatDa(b.creditTotal)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">{stockMessages.sold}: </span>
                      <span className="font-mono text-neutral-300">{formatDa(b.soldTotal)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* التبويبات للعمليات والمخزون */}
      <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
        <div className="mb-6 flex gap-2 border-b border-neutral-800 pb-4">
          <TabButton
            active={activeTab === 'purchase'}
            onClick={() => setActiveTab('purchase')}
            label={stockMessages.purchaseTab}
            icon={<IconPlus size={16} />}
          />
          <TabButton
            active={activeTab === 'settlement'}
            onClick={() => setActiveTab('settlement')}
            label={stockMessages.settlementTab}
            icon={<IconStock size={16} />}
          />
          <TabButton
            active={activeTab === 'entries'}
            onClick={() => setActiveTab('entries')}
            label={stockMessages.entriesTab}
            icon={<IconClock size={16} />}
          />
        </div>

        {activeTab === 'purchase' && <PurchaseForm />}
        {activeTab === 'settlement' && <SettlementForm />}
        {activeTab === 'entries' && <EntriesList />}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
        active
          ? 'bg-neutral-800 text-emerald-400 shadow-md ring-1 ring-neutral-700'
          : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function OperatorSelect({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const operators = useActiveOperators()
  return (
    <label htmlFor="stock-op" className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-300">
        <IconSignal size={14} className="text-neutral-400" />
        <span>{stockMessages.operator}</span>
      </div>
      <select
        id="stock-op"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      >
        <option value={0}>{stockMessages.selectOperator}</option>
        {operators.data?.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function PurchaseForm() {
  const add = useAddPurchase()
  const [operatorId, setOperatorId] = useState(0)
  const [costText, setCostText] = useState('')
  const [creditText, setCreditText] = useState('')
  const [note, setNote] = useState('')

  const cost = parseDaToCentimes(costText)
  const credit = parseDaToCentimes(creditText)
  const canSubmit = operatorId > 0 && cost !== null && credit !== null && credit > 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    add.mutate(
      {
        operatorId,
        costAmount: cost as number,
        creditAmount: credit as number,
        note: note.trim() === '' ? undefined : note.trim(),
      },
      {
        onSuccess: () => {
          setCostText('')
          setCreditText('')
          setNote('')
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 max-w-xl">
      <OperatorSelect value={operatorId} onChange={setOperatorId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="pur-cost"
          label={stockMessages.cost}
          value={costText}
          onChange={setCostText}
          placeholder="0.00"
        />
        <Field
          id="pur-credit"
          label={stockMessages.creditAmount}
          value={creditText}
          onChange={setCreditText}
          placeholder="0.00"
        />
      </div>

      <Field
        id="pur-note"
        label={stockMessages.note}
        value={note}
        onChange={setNote}
        placeholder="رقم الوصل أو ملاحظة..."
      />

      {add.isError && (
        <p className="text-xs text-rose-400 font-medium">{translateStockError(add.error)}</p>
      )}
      {add.isSuccess && (
        <p className="text-xs text-emerald-400 font-medium">{stockMessages.success}</p>
      )}

      <div>
        <SubmitButton pending={add.isPending} disabled={!canSubmit} />
      </div>
    </form>
  )
}

function SettlementForm() {
  const add = useAddSettlement()
  const [operatorId, setOperatorId] = useState(0)
  const [deltaText, setDeltaText] = useState('')
  const [decrease, setDecrease] = useState(false)
  const [reason, setReason] = useState('')

  const magnitude = parseDaToCentimes(deltaText)
  const delta = magnitude === null ? null : decrease ? -magnitude : magnitude
  const canSubmit = operatorId > 0 && delta !== null && delta !== 0 && reason.trim().length >= 3

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    add.mutate(
      { operatorId, delta: delta as number, reason: reason.trim() },
      {
        onSuccess: () => {
          setDeltaText('')
          setReason('')
          setDecrease(false)
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 max-w-xl">
      <OperatorSelect value={operatorId} onChange={setOperatorId} />

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-neutral-300">{stockMessages.direction}</span>
        <div className="flex gap-2">
          <Toggle
            active={!decrease}
            onClick={() => setDecrease(false)}
            label={stockMessages.increase}
            variant="positive"
          />
          <Toggle
            active={decrease}
            onClick={() => setDecrease(true)}
            label={stockMessages.decrease}
            variant="negative"
          />
        </div>
      </div>

      <Field
        id="set-delta"
        label={stockMessages.delta}
        value={deltaText}
        onChange={setDeltaText}
        placeholder="0.00"
      />
      <p className="text-xs text-neutral-500">{stockMessages.deltaHint}</p>

      <Field
        id="set-reason"
        label={stockMessages.reason}
        value={reason}
        onChange={setReason}
        placeholder="سبب التصحيح أو الفارق..."
      />

      {add.isError && (
        <p className="text-xs text-rose-400 font-medium">{translateStockError(add.error)}</p>
      )}
      {add.isSuccess && (
        <p className="text-xs text-emerald-400 font-medium">{stockMessages.success}</p>
      )}

      <div>
        <SubmitButton pending={add.isPending} disabled={!canSubmit} />
      </div>
    </form>
  )
}

function EntriesList() {
  const entries = useStockEntries()
  return (
    <div>
      {entries.isLoading ? (
        <div className="flex h-32 items-center justify-center text-sm text-neutral-400">
          {ui.loading}
        </div>
      ) : !entries.data || entries.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-neutral-500">
          <IconClock size={24} className="text-neutral-600" />
          <p>{stockMessages.empty}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/60 text-xs font-semibold text-neutral-400">
                <th className="p-3 text-start">{stockMessages.type}</th>
                <th className="p-3 text-start">{stockMessages.note}</th>
                <th className="p-3 text-end">{stockMessages.creditAmount}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {entries.data.map((en) => (
                <tr key={en.id} className="transition-colors hover:bg-neutral-800/30">
                  <td className="p-3">
                    <span
                      className={`inline-block rounded-lg px-2 py-0.5 text-xs font-semibold ${
                        en.type === 'purchase'
                          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20'
                      }`}
                    >
                      {en.type === 'purchase' ? stockMessages.typePurchase : stockMessages.typeAdjustment}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-neutral-400">
                    {en.note || '—'}
                  </td>
                  <td className="p-3 text-end">
                    <span
                      className={`font-mono font-bold ${
                        en.creditAmount < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {en.creditAmount > 0 ? '+' : ''}
                      {formatDa(en.creditAmount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-neutral-300">{label}</span>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        {placeholder === '0.00' && (
          <span className="absolute inset-y-0 end-0 flex items-center pe-3 text-xs text-neutral-500">
            دج
          </span>
        )}
      </div>
    </label>
  )
}

function Toggle({
  active,
  onClick,
  label,
  variant,
}: {
  active: boolean
  onClick: () => void
  label: string
  variant: 'positive' | 'negative'
}) {
  const activeStyle =
    variant === 'positive'
      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
      : 'border-rose-500 bg-rose-500/20 text-rose-300'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
        active ? activeStyle : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
      }`}
    >
      {label}
    </button>
  )
}

function SubmitButton({ pending, disabled }: { pending: boolean; disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-500 disabled:opacity-50 active:scale-95"
    >
      <IconCheck size={16} />
      <span>{pending ? stockMessages.submitting : stockMessages.submit}</span>
    </button>
  )
}
