import { authChannels } from '@shared/contracts/auth'
import type { LoginInput, LoginResult, SetupOwnerInput } from '@shared/contracts/auth'
import { invoke } from '@renderer/shared/api'

// طبقة الوصول إلى IPC للدخول — أنواعها من العقود المشتركة (RULES 3.2).
export type HasUsersResult = { hasUsers: boolean }
export type SessionResult = LoginResult | null

export const authApi = {
  hasUsers: (): Promise<HasUsersResult> => invoke<HasUsersResult>(authChannels.hasUsers),
  login: (input: LoginInput): Promise<LoginResult> => invoke<LoginResult>(authChannels.login, input),
  setupOwner: (input: SetupOwnerInput): Promise<LoginResult> =>
    invoke<LoginResult>(authChannels.setupOwner, input),
  session: (): Promise<SessionResult> => invoke<SessionResult>(authChannels.session),
  logout: (): Promise<null> => invoke<null>(authChannels.logout),
}
