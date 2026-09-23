import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { users } from './auth.schema'
import { auditLog } from '@main/core/audit/audit.schema'
import { createAuthService } from './auth.service'
import { createSession } from '@main/core/session'
import { openTestDb } from '@main/core/db/testDb'
import { AUTH_ERRORS } from '@shared/contracts/auth'
import type { SessionUser } from '@shared/contracts/auth'
import type { AppError } from '@main/core/errors'
import type { DB } from '@main/core/db/client'
import type { Audit } from '@main/core/audit'
import type { Session } from '@main/core/session'

function makeService(db: DB, audit: Audit) {
  const session = createSession()
  return { session, auth: createAuthService({ db, audit, session }) }
}

async function expectAppError(fn: () => unknown | Promise<unknown>): Promise<AppError> {
  try {
    await fn()
  } catch (err) {
    expect(err).toBeInstanceOf(Error)
    expect((err as AppError).name).toBe('AppError')
    return err as AppError
  }
  throw new Error('expected AppError but nothing was thrown')
}

describe('auth.service', () => {
  let t: ReturnType<typeof openTestDb>
  let session: Session
  let auth: ReturnType<typeof makeService>['auth']

  beforeEach(() => {
    t = openTestDb()
    ;({ session, auth } = makeService(t.db, t.audit))
  })

  afterEach(() => t.close())

  it('hasUsers=false على قاعدة فارغة', () => {
    expect(auth.hasUsers()).toBe(false)
  })

  it('setupOwner ينشئ المالك ويضبط الجلسة ولا يخزن PIN نصًا', async () => {
    const outcome = await auth.setupOwner({ name: 'ammar', pin: '1234' })
    expect(outcome.user.role).toBe('admin')
    expect(auth.hasUsers()).toBe(true)
    expect(session.get()?.id).toBe(outcome.user.id)

    const row = t.db.select().from(users).where(eq(users.name, 'ammar')).get()!
    expect(row.pinHash).not.toContain('1234')
    expect(row.pinHash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{64}$/)

    const auditRows = t.db.select({ action: auditLog.action }).from(auditLog).all()
    expect(auditRows.some((r) => r.action === 'auth.owner_created')).toBe(true)
  })

  it('setupOwner مرة ثانية → SETUP_ALREADY_DONE', async () => {
    await auth.setupOwner({ name: 'ammar', pin: '1234' })
    const err = await expectAppError(() => auth.setupOwner({ name: 'other', pin: '9999' }))
    expect(err.code).toBe(AUTH_ERRORS.SETUP_ALREADY_DONE)
  })

  it('دخول صحيح ثم خطأ ثم صحيح', async () => {
    await auth.setupOwner({ name: 'ammar', pin: '1234' })
    auth.logout()
    expect(session.get()).toBeNull()

    const bad = await expectAppError(() => auth.login({ name: 'ammar', pin: '0000' }))
    expect(bad.code).toBe(AUTH_ERRORS.INVALID_CREDENTIALS)

    const good = await auth.login({ name: 'ammar', pin: '1234' })
    expect(good.user.name).toBe('ammar')
    expect(session.get()?.name).toBe('ammar')
  })

  it('5 محاولات خاطئة → قفل حتى مع PIN صحيح، يسجل تدقيقًا', async () => {
    await auth.setupOwner({ name: 'ammar', pin: '1234' })
    auth.logout()

    for (let i = 0; i < 5; i++) {
      const err = await expectAppError(() => auth.login({ name: 'ammar', pin: '0000' }))
      expect(err.code).toBe(AUTH_ERRORS.INVALID_CREDENTIALS)
    }

    const locked = await expectAppError(() => auth.login({ name: 'ammar', pin: '1234' }))
    expect(locked.code).toBe(AUTH_ERRORS.AUTH_LOCKED)

    const auditRows = t.db.select({ action: auditLog.action }).from(auditLog).all()
    expect(auditRows.filter((r) => r.action === 'auth.login_failed')).toHaveLength(5)
  })

  it('مستخدم غير نشط لا يدخل', async () => {
    await auth.setupOwner({ name: 'ammar', pin: '1234' })
    t.db.update(users).set({ active: false }).where(eq(users.name, 'ammar')).run()
    auth.logout()
    const err = await expectAppError(() => auth.login({ name: 'ammar', pin: '1234' }))
    expect(err.code).toBe(AUTH_ERRORS.INVALID_CREDENTIALS)
  })

  it('sessionFor يعيد المستخدم الحالي فقط', async () => {
    const outcome = await auth.setupOwner({ name: 'ammar', pin: '1234' })
    const other: SessionUser = { id: 99, name: 'other', role: 'cashier' }
    expect(auth.sessionFor(outcome.user)).toEqual(outcome.user)
    expect(auth.sessionFor(other)).toBeNull()
    expect(auth.sessionFor(null)).toBeNull()
  })
})
