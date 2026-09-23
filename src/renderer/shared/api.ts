import type { Result, AppErrorParams } from '@shared/result'

// غلاف رقيق حول جسر preload: يفكّ Result ويرمي IpcError برمز الخطأ (لا نصوص عربية من Main — RULES 9).
export class IpcError extends Error {
  readonly code: string
  readonly params?: AppErrorParams
  constructor(code: string, params?: AppErrorParams) {
    super(code)
    this.name = 'IpcError'
    this.code = code
    this.params = params
  }
}

export async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const result: Result<T> = await window.api.invoke<T>(channel, payload)
  if (result.ok) return result.data
  throw new IpcError(result.error.code, result.error.params)
}
