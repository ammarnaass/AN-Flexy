import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useActiveOperators } from '@renderer/features/operators'
import { useCreateSale, useSalesBalances, salesMessages, translateSaleError } from '@renderer/features/sales'
import { parseDaToCentimes, formatDa } from '@shared/money'
import { ui } from '@renderer/shared/messages.ar'

// شاشة البيع: تُركَّب هنا لأنها تجمع بيانات بيع (sales) ومتعاملين (operators).
// المنطق والأرصدة تُحسب في Main، والواجهة تعرض فقط (RULES 4.3).
const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000]

export function SaleScreen() {
  const operators = useActiveOperators()
  const balances = useSalesBalances()
  const create = useCreateSale()

  const [operatorId, setOperatorId] = useState<number>(0)
  const [phone, setPhone] = useState('')
  const [amountText, setAmountText] = useState('')
  const [paidText, setPaidText] = useState('')

  const amount = parseDaToCentimes(amountText)
  const paid = paidText.trim() === '' ? amount : parseDaToCentimes(paidText)
  const phoneOk = /^0[567]\d{8}$/.test(phone)

  const selectedBalance = useMemo(
    () => balances.data?.find((b) => b.operatorId === operatorId),
    [balances.data, operatorId],
  )

  const canSubmit =
    operatorId > 0 && phoneOk && amount !== null && amount > 0 && paid !== null && paid <= amount

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    create.mutate(
      { operatorId, targetPhone: phone, amount: amount as number, paidAmount: paid as number },
      { onSuccess: () => { setPhone(''); setAmountText(''); setPaidText('') } },
    )
  }

  if (operators.isLoading) return <p className="text-neutral-400">{ui.loading}</p>

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">{salesMessages.title}</h1>

      {operators.data && operators.data.length === 0 ? (
        <p className="rounded-md border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-300">
          {salesMessages.noOperator}
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label htmlFor="sale-op" className="flex flex-col gap-1">
            <span className="text-sm text-neutral-300">{salesMessages.operator}</span>
            <select
              id="sale-op"
              value={operatorId}
              onChange={(e) => setOperatorId(Number(e.target.value))}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-emerald-500"
            >
              <option value={0}>{salesMessages.selectOperator}</option>
              {operators.data?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="sale-phone" className="flex flex-col gap-1">
            <span className="text-sm text-neutral-300">{salesMessages.phone}</span>
            <input
              id="sale-phone"
              inputMode="numeric"
              dir="ltr"
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-neutral-100 outline-none focus:border-emerald-500"
            />
          </label>

          <label htmlFor="sale-amount" className="flex flex-col gap-1">
            <span className="text-sm text-neutral-300">{salesMessages.amount}</span>
            <input
              id="sale-amount"
              inputMode="decimal"
              dir="ltr"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-neutral-100 outline-none focus:border-emerald-500"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-400">{salesMessages.quickAmounts}:</span>
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmountText(String(v))}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 hover:border-emerald-500"
              >
                {v}
              </button>
            ))}
          </div>

          <label htmlFor="sale-paid" className="flex flex-col gap-1">
            <span className="text-sm text-neutral-300">{salesMessages.paid}</span>
            <input
              id="sale-paid"
              inputMode="decimal"
              dir="ltr"
              value={paidText}
              onChange={(e) => setPaidText(e.target.value)}
              placeholder={amountText}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-neutral-100 outline-none focus:border-emerald-500"
            />
          </label>

          {selectedBalance && (
            <p className="text-sm text-neutral-400">
              {salesMessages.balanceLabel}: {formatDa(selectedBalance.balance)}
              {selectedBalance.balance < selectedBalance.lowBalanceAt && (
                <span className="ms-2 text-amber-400">({salesMessages.lowBalance})</span>
              )}
            </p>
          )}

          {create.isError && <p className="text-sm text-red-400">{translateSaleError(create.error)}</p>}
          {create.isSuccess && <p className="text-sm text-emerald-400">{salesMessages.success}</p>}

          <button
            type="submit"
            disabled={!canSubmit || create.isPending}
            className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {create.isPending ? salesMessages.submitting : salesMessages.submit}
          </button>
        </form>
      )}
    </div>
  )
}
