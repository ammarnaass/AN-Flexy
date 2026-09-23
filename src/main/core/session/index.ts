import type { SessionUser } from '@shared/contracts/auth'

// جلسة المستخدم الحالي: تعيش في ذاكرة Main فقط، والواجهة لا ترسل الهوية أبدًا (RULES 6.2-5).
export type Session = {
  get(): SessionUser | null
  set(user: SessionUser): void
  clear(): void
}

export function createSession(): Session {
  let current: SessionUser | null = null
  return {
    get: () => current,
    set: (user) => {
      current = user
    },
    clear: () => {
      current = null
    },
  }
}
