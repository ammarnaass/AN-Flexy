import { createAuthService } from './auth.service'
import { registerAuthIpc } from './auth.ipc'
import type { AuthApi, AuthDeps } from './auth.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function createAuthFeature(deps: AuthDeps) {
  const api = createAuthService(deps)
  return { api, registerIpc: (ipc: IpcRegistry) => registerAuthIpc(ipc, api) }
}

export type { AuthApi }

// جدول المستخدمين للتصريح فقط (لا كتابة خارجية — RULES 4.1-4).
export { users } from './auth.schema'
