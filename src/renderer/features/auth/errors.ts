import { IpcError } from '@renderer/shared/api'
import { translateCommonError } from '@renderer/shared/messages.ar'
import { authMessages } from './messages.ar'

// يحوّل رمز خطأ الـ IPC إلى نص عربي: رسائل الدخول أولًا ثم العامة ثم الرمز نفسه.
export function translateAuthError(error: unknown): string {
  if (error instanceof IpcError) {
    return authMessages.errors[error.code] ?? translateCommonError(error.code) ?? error.code
  }
  return translateCommonError('INTERNAL_ERROR') ?? 'INTERNAL_ERROR'
}
