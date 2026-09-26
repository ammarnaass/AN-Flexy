import { z } from 'zod'

// قنوات خاصية الدخول — تُعرَّف مرة واحدة هنا (RULES 6.2-1).
export const authChannels = {
  hasUsers: 'auth:hasUsers',
  setupOwner: 'auth:setupOwner',
  register: 'auth:register',
  login: 'auth:login',
  logout: 'auth:logout',
  session: 'auth:session',
  listUsers: 'auth:listUsers',
} as const

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  AUTH_LOCKED: 'AUTH_LOCKED',
  SETUP_ALREADY_DONE: 'SETUP_ALREADY_DONE',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
} as const

export const pinSchema = z.string().regex(/^\d{4,6}$/)
export const userNameSchema = z.string().trim().min(1).max(50)

// للقنوات بلا مدخل (session/logout): تُقبل قيمة فارغة فقط (RULES 6.2-3).
export const emptyInput = z.undefined()

export const loginInput = z.object({
  name: userNameSchema,
  pin: pinSchema,
})
export type LoginInput = z.infer<typeof loginInput>

export const setupOwnerInput = z.object({
  name: userNameSchema,
  pin: pinSchema,
})
export type SetupOwnerInput = z.infer<typeof setupOwnerInput>

export const registerInput = z.object({
  name: userNameSchema,
  pin: pinSchema,
  role: z.enum(['admin', 'cashier']).optional(),
})
export type RegisterInput = z.infer<typeof registerInput>

export type SessionUser = {
  id: number
  name: string
  role: 'admin' | 'cashier'
}

// النتائج القابلة للتسلسل عبر IPC — لا كائنات Drizzle ولا أسرار (RULES 6.2-6): بدون pinHash أبدًا.
export const sessionUserResult = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  role: z.enum(['admin', 'cashier']),
})
export type SessionUserResult = z.infer<typeof sessionUserResult>

export const loginResult = z.object({
  user: sessionUserResult,
  mustChangePin: z.boolean(),
})
export type LoginResult = z.infer<typeof loginResult>

export const userInfo = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  role: z.enum(['admin', 'cashier']),
  active: z.boolean(),
})
export type UserInfo = z.infer<typeof userInfo>
