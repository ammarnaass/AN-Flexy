import { IpcError } from '@renderer/shared/api'
import { translateCommonError } from '@renderer/shared/messages.ar'
import { formatDa } from '@shared/money'
import { salesMessages } from './messages.ar'

// يحوّل رمز خطأ البيع إلى نص عربي، مع تنسيق المبالغ من params عند الحاجة (RULES 9).
export function translateSaleError(error: unknown): string {
  if (error instanceof IpcError) {
    if (error.code === 'INSUFFICIENT_BALANCE') {
      const balance = Number(error.params?.balance ?? 0)
      return `رصيد المتعامل غير كافٍ. المتاح: ${formatDa(balance)}.`
    }
    return salesMessages.errors[error.code] ?? translateCommonError(error.code) ?? error.code
  }
  return translateCommonError('INTERNAL_ERROR') ?? 'INTERNAL_ERROR'
}
