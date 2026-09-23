import { IpcError } from '@renderer/shared/api'
import { translateCommonError } from '@renderer/shared/messages.ar'
import { stockMessages } from './messages.ar'

export function translateStockError(error: unknown): string {
  if (error instanceof IpcError) {
    return stockMessages.errors[error.code] ?? translateCommonError(error.code) ?? error.code
  }
  return translateCommonError('INTERNAL_ERROR') ?? 'INTERNAL_ERROR'
}
