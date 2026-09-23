import {
  authChannels,
  emptyInput,
  loginInput,
  loginResult,
  setupOwnerInput,
} from '@shared/contracts/auth'
import { COMMON_ERRORS } from '@shared/errors'
import { AppError } from '@main/core/errors'
import type { AuthApi } from './auth.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

// المعالجون رقيقة: zod + صلاحية + استدعاء الخدمة فقط (RULES 3.1، 6.2).
export function registerAuthIpc(ipc: IpcRegistry, auth: AuthApi): void {
  // public: مطلوب قبل أي دخول (شاشة أول تشغيل / شاشة الدخول).
  ipc.handle(authChannels.hasUsers, {
    input: emptyInput,
    permission: 'public',
    run: () => ({ hasUsers: auth.hasUsers() }),
  })

  ipc.handle(authChannels.setupOwner, {
    input: setupOwnerInput,
    permission: 'public',
    run: async (input) => loginResult.parse(await auth.setupOwner(input)),
  })

  ipc.handle(authChannels.login, {
    input: loginInput,
    permission: 'public',
    run: async (input) => loginResult.parse(await auth.login(input)),
  })

  // الجلسة تُقرأ من Main؛ غير المسجَّل يحصل على null دون خطأ (تحميل الواجهة الأول).
  ipc.handle(authChannels.session, {
    input: emptyInput,
    permission: 'public',
    run: (_input, ctx) => {
      const current = auth.sessionFor(ctx.user)
      return current ? loginResult.parse({ user: current, mustChangePin: false }) : null
    },
  })

  // الخروج يتطلب جلسة فعلية رغم أنه public القناة (حتى لا يُستخدم لطرد مستخدم حالي).
  ipc.handle(authChannels.logout, {
    input: emptyInput,
    permission: 'public',
    run: (_input, ctx) => {
      if (!auth.sessionFor(ctx.user)) throw new AppError(COMMON_ERRORS.NOT_AUTHENTICATED)
      auth.logout()
      return null
    },
  })

  ipc.handle(authChannels.listUsers, {
    input: emptyInput,
    permission: 'users.manage',
    run: () => auth.listUsers(),
  })
}
