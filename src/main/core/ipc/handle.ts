import { ipcMain } from 'electron'
import { ZodError, type z } from 'zod'
import { COMMON_ERRORS } from '@shared/errors'
import type { Result } from '@shared/result'
import type { SessionUser } from '@shared/contracts/auth'
import { AppError } from '../errors'
import { hasPermission } from '../permissions'
import type { Permission } from '../permissions'
import type { Session } from '../session'
import type { Logger } from '../logger'

export type AuthedCtx = { user: SessionUser }
export type PublicCtx = { user: SessionUser | null }

// الصلاحية حقل إلزامي: handler بلا صلاحية لا يُترجَم (RULES 6.2-3).
export type AuthedHandler<S extends z.ZodTypeAny, R> = {
  input: S
  permission: Permission
  run: (input: z.infer<S>, ctx: AuthedCtx) => R
}

export type PublicHandler<S extends z.ZodTypeAny, R> = {
  input: S
  permission: 'public'
  run: (input: z.infer<S>, ctx: PublicCtx) => R
}

export type IpcRegistry = {
  handle<S extends z.ZodTypeAny, R>(
    channel: string,
    handler: AuthedHandler<S, R> | PublicHandler<S, R>,
  ): void
}

export type IpcRegistryDeps = {
  session: Session
  logger: Logger
}

export function createIpcRegistry(deps: IpcRegistryDeps): IpcRegistry {
  return {
    handle(channel, handler) {
      ipcMain.handle(channel, async (_event, raw): Promise<Result<unknown>> => {
        try {
          const input = handler.input.parse(raw)
          if (handler.permission === 'public') {
            return { ok: true, data: await handler.run(input, { user: deps.session.get() }) }
          }
          const user = deps.session.get()
          if (!user) throw new AppError(COMMON_ERRORS.NOT_AUTHENTICATED)
          if (!hasPermission(user.role, handler.permission)) {
            throw new AppError(COMMON_ERRORS.PERMISSION_DENIED)
          }
          return { ok: true, data: await handler.run(input, { user }) }
        } catch (error) {
          return toErrorResult(channel, error, deps.logger)
        }
      })
    },
  }
}

function toErrorResult(channel: string, error: unknown, logger: Logger): Result<never> {
  if (error instanceof AppError) {
    return { ok: false, error: error.params ? { code: error.code, params: error.params } : { code: error.code } }
  }
  if (error instanceof ZodError) {
    return { ok: false, error: { code: COMMON_ERRORS.VALIDATION_ERROR } }
  }
  // الأخطاء غير المتوقعة تُسجَّل وتُعاد كـ INTERNAL_ERROR دون تفاصيل (RULES 9).
  logger.error(`IPC ${channel} فشل بخطأ غير متوقع`, error)
  return { ok: false, error: { code: COMMON_ERRORS.INTERNAL_ERROR } }
}
