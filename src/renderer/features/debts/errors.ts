import { IpcError } from '@renderer/shared/api'
import { DEBTS_ERRORS } from '@shared/contracts/debts'
import { debtsMessages } from './messages.ar'
import { translateCommonError } from '@renderer/shared/messages.ar'

export function translateDebtsError(error: unknown): string {
  if (error instanceof IpcError) {
    if (error.code === DEBTS_ERRORS.PAYMENT_EXCEEDS_DEBT) return debtsMessages.paymentExceedsDebt
    if (error.code === DEBTS_ERRORS.CUSTOMER_NOT_FOUND) return debtsMessages.customerNotFound
    return translateCommonError(error.code) ?? error.code
  }
  return String(error)
}
