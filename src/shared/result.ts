// شكل الاستجابة الوحيد عبر IPC (RULES 6.2-4).
export type AppErrorParams = Record<string, string | number | boolean | null>

export type AppErrorPayload = {
  code: string
  params?: AppErrorParams
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppErrorPayload }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })

export const err = (code: string, params?: AppErrorParams): Result<never> => ({
  ok: false,
  error: params ? { code, params } : { code },
})
