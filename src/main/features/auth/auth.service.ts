import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { users } from './auth.schema'
import type { DB } from '@main/core/db/client'
import type { Audit } from '@main/core/audit'
import type { Session } from '@main/core/session'
import { AppError } from '@main/core/errors'
import { AUTH_ERRORS } from '@shared/contracts/auth'
import type { LoginInput, RegisterInput, SessionUser, SetupOwnerInput } from '@shared/contracts/auth'

const SCRYPT_KEYLEN = 32
const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 30_000

// scrypt غير متزامنة (CPU-heavy عمداً)، ننتظرها داخل دوال async — أما better-sqlite3 فمتزامن.
function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16)
  return new Promise((resolve, reject) => {
    scryptCb(pin, salt, SCRYPT_KEYLEN, (err, key) => {
      if (err) reject(err)
      else resolve(`${salt.toString('hex')}:${key.toString('hex')}`)
    })
  })
}

async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(':')
  if (!saltHex || !keyHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(keyHex, 'hex')
  const actual = await new Promise<Buffer>((resolve, reject) => {
    scryptCb(pin, salt, expected.length, (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function toSessionUser(row: typeof users.$inferSelect): SessionUser {
  return { id: row.id, name: row.name, role: row.role }
}

export type LoginOutcome = {
  user: SessionUser
  mustChangePin: boolean
}

export type AuthApi = {
  hasUsers(): boolean
  /** ينشئ حساب المالك (أول تشغيل) ويشغّل onFirstSetup لذرع البيانات الأولية. */
  setupOwner(input: SetupOwnerInput): Promise<LoginOutcome>
  /** ينشئ حساب مستخدم جديد (سواء كان المالك الأول أو مستخدم/كاشير إضافي). */
  register(input: RegisterInput): Promise<LoginOutcome>
  login(input: LoginInput): Promise<LoginOutcome>
  logout(): void
  currentUser(): SessionUser | null
  /** لقطة الجلسة داخل معالج IPC: تنجح فقط إذا كان المستخدم لا يزال هو الحالي في Main. */
  sessionFor(user: SessionUser | null): SessionUser | null
  listUsers(): Array<{ id: number; name: string; role: 'admin' | 'cashier'; active: boolean }>
}

export type AuthDeps = {
  db: DB
  audit: Audit
  session: Session
  /** يُنادى مرة واحدة بعد إنشاء حساب المالك (ذرْع المتعاملين الافتراضيين في التكوين). */
  onFirstSetup?(): void
}

// القفل في ذاكرة Main: 5 محاولات خاطئة → 30 ثانية (PRD FR-01). لا يُنسيء إلى السجلات.
export function createAuthService(deps: AuthDeps): AuthApi {
  const { db, audit, session } = deps
  let failedAttempts = 0
  let lockedUntil = 0

  const recordFailure = (userId: number | null, name: string) => {
    failedAttempts += 1
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) lockedUntil = Date.now() + LOCK_DURATION_MS
    audit.log(db, {
      userId,
      action: 'auth.login_failed',
      details: { name, attempts: failedAttempts, locked: lockedUntil > Date.now() },
    })
  }

  const api: AuthApi = {
    hasUsers() {
      return db.select({ id: users.id }).from(users).all().length > 0
    },

    async setupOwner(input) {
      if (api.hasUsers()) throw new AppError(AUTH_ERRORS.SETUP_ALREADY_DONE)
      const pinHash = await hashPin(input.pin)
      const owner = db
        .insert(users)
        .values({ name: input.name, role: 'admin', pinHash })
        .returning()
        .get()
      audit.log(db, { userId: owner.id, action: 'auth.owner_created', details: { name: owner.name } })
      deps.onFirstSetup?.()
      const user = toSessionUser(owner)
      session.set(user)
      return { user, mustChangePin: false }
    },

    async register(input) {
      const existing = db.select({ id: users.id }).from(users).where(eq(users.name, input.name)).get()
      if (existing) throw new AppError(AUTH_ERRORS.USERNAME_TAKEN)

      const isFirst = !api.hasUsers()
      const role = isFirst ? 'admin' : (input.role ?? 'cashier')
      const pinHash = await hashPin(input.pin)
      const row = db
        .insert(users)
        .values({ name: input.name, role, pinHash })
        .returning()
        .get()

      if (isFirst) {
        audit.log(db, { userId: row.id, action: 'auth.owner_created', details: { name: row.name } })
        deps.onFirstSetup?.()
      } else {
        audit.log(db, { userId: row.id, action: 'auth.user_created', details: { name: row.name, role } })
      }

      const user = toSessionUser(row)
      session.set(user)
      return { user, mustChangePin: false }
    },

    async login(input) {
      if (lockedUntil > Date.now()) throw new AppError(AUTH_ERRORS.AUTH_LOCKED)
      const row = db.select().from(users).where(eq(users.name, input.name)).get()
      if (!row || !row.active) {
        // محاولات باسم غير موجود تُسجَّل بلا معرّف مستخدم (BR: فشل الدخول يسجَّل).
        recordFailure(null, input.name)
        throw new AppError(AUTH_ERRORS.INVALID_CREDENTIALS)
      }
      if (!(await verifyPin(input.pin, row.pinHash))) {
        recordFailure(row.id, row.name)
        throw new AppError(AUTH_ERRORS.INVALID_CREDENTIALS)
      }
      failedAttempts = 0
      lockedUntil = 0
      const user = toSessionUser(row)
      session.set(user)
      audit.log(db, { userId: user.id, action: 'auth.login', details: { name: user.name } })
      return { user, mustChangePin: false }
    },

    logout() {
      const user = session.get()
      if (user) audit.log(db, { userId: user.id, action: 'auth.logout', details: { name: user.name } })
      session.clear()
    },

    currentUser() {
      return session.get()
    },

    sessionFor(user) {
      return user && session.get()?.id === user.id ? user : null
    },

    listUsers() {
      return db
        .select({ id: users.id, name: users.name, role: users.role, active: users.active })
        .from(users)
        .all()
    },
  }
  return api
}
