import { useState } from 'react'
import type { FormEvent } from 'react'
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

// شاشة المخزون: أرصدة (من sales) + شحن/تسوية/حركة (من stock). تركيب في pages (RULES 4.3).
export function StockScreen() {
  const balances = useSalesBalances(true)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="text-2xl font-semibold">{stockMessages.title}</h1>

      <section>
        <h2 className="mb-2 text-lg font-medium">{stockMessages.balances}</h2>
        {balances.isLoading ? (
          <p className="text-neutral-400">{ui.loading}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-neutral-400">
              <tr>
                <th className="p-2 text-start">{stockMessages.operator}</th>
                <th className="p-2 text-end">{stockMessages.credit}</th>
                <th className="p-2 text-end">{stockMessages.sold}</th>
                <th className="p-2 text-end">{stockMessages.balance}</th>
              </tr>
            </thead>
            <tbody>
              {balances.data?.map((b) => (
                <tr key={b.operatorId} className="border-t border-neutral-800">
                  <td className="p-2">{b.name}</td>
                  <td className="p-2 text-end text-neutral-300">{formatDa(b.creditTotal)}</td>
                  <td className="p-2 text-end text-neutral-300">{formatDa(b.soldTotal)}</td>
                  <td
                    className={
                      'p-2 text-end font-medium ' +
                      (b.balance < b.lowBalanceAt ? 'text-amber-400' : 'text-emerald-400')
                    }
                  >
                    {formatDa(b.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <PurchaseForm />
      <SettlementForm />
      <EntriesList />
    </div>
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
    <label htmlFor="stock-op" className="flex flex-col gap-1">
      <span className="text-sm text-neutral-300">{stockMessages.operator}</span>
      <select
        id="stock-op"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-emerald-500"
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
      { onSuccess: () => { setCostText(''); setCreditText(''); setNote('') } },
    )
  }

  return (
    <section className="rounded-lg border border-neutral-800 p-4">
      <h2 className="mb-3 text-lg font-medium">{stockMessages.purchaseTab}</h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <OperatorSelect value={operatorId} onChange={setOperatorId} />
        <div className="grid grid-cols-2 gap-3">
          <Field id="pur-cost" label={stockMessages.cost} value={costText} onChange={setCostText} />
          <Field id="pur-credit" label={stockMessages.creditAmount} value={creditText} onChange={setCreditText} />
        </div>
        <Field id="pur-note" label={stockMessages.note} value={note} onChange={setNote} />
        {add.isError && <p className="text-sm text-red-400">{translateStockError(add.error)}</p>}
        {add.isSuccess && <p className="text-sm text-emerald-400">{stockMessages.success}</p>}
        <SubmitButton pending={add.isPending} disabled={!canSubmit} />
      </form>
    </section>
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
      { onSuccess: () => { setDeltaText(''); setReason(''); setDecrease(false) } },
    )
  }

  return (
    <section className="rounded-lg border border-neutral-800 p-4">
      <h2 className="mb-3 text-lg font-medium">{stockMessages.settlementTab}</h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <OperatorSelect value={operatorId} onChange={setOperatorId} />
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Field id="set-delta" label={stockMessages.delta} value={deltaText} onChange={setDeltaText} />
          </div>
          <div className="flex gap-1">
            <Toggle active={!decrease} onClick={() => setDecrease(false)} label={stockMessages.increase} />
            <Toggle active={decrease} onClick={() => setDecrease(true)} label={stockMessages.decrease} />
          </div>
        </div>
        <p className="text-xs text-neutral-500">{stockMessages.deltaHint}</p>
        <Field id="set-reason" label={stockMessages.reason} value={reason} onChange={setReason} />
        {add.isError && <p className="text-sm text-red-400">{translateStockError(add.error)}</p>}
        {add.isSuccess && <p className="text-sm text-emerald-400">{stockMessages.success}</p>}
        <SubmitButton pending={add.isPending} disabled={!canSubmit} />
      </form>
    </section>
  )
}

function EntriesList() {
  const entries = useStockEntries()
  return (
    <section>
      <h2 className="mb-2 text-lg font-medium">{stockMessages.entriesTab}</h2>
      {entries.isLoading ? (
        <p className="text-neutral-400">{ui.loading}</p>
      ) : !entries.data || entries.data.length === 0 ? (
        <p className="text-neutral-500">{stockMessages.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {entries.data.map((en) => (
            <li key={en.id} className="flex justify-between border-t border-neutral-800 py-1">
              <span className="text-neutral-400">
                {en.type === 'purchase' ? stockMessages.typePurchase : stockMessages.typeAdjustment}
                {en.note ? ` — ${en.note}` : ''}
              </span>
              <span className={en.creditAmount < 0 ? 'text-red-400' : 'text-emerald-400'}>
                {formatDa(en.creditAmount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-sm text-neutral-300">{label}</span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-emerald-500"
      />
    </label>
  )
}

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-md border px-3 py-2 text-sm ' +
        (active
          ? 'border-emerald-500 bg-emerald-600/20 text-emerald-300'
          : 'border-neutral-700 bg-neutral-900 text-neutral-300')
      }
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
      className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-50"
    >
      {pending ? stockMessages.submitting : stockMessages.submit}
    </button>
  )
}
