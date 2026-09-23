import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createOperatorsService } from './operators.service'
import { openTestDb } from '@main/core/db/testDb'
import { OPERATORS_ERRORS } from '@shared/contracts/operators'
import { auditLog } from '@main/core/audit/audit.schema'
import type { SessionUser } from '@shared/contracts/auth'
import type { AppError } from '@main/core/errors'

const owner: SessionUser = { id: 1, name: 'ammar', role: 'admin' }

// الخدمة متزامنة بالكامل (better-sqlite3)، لذا نتوقع الخطأ مباشرة.
function expectAppError(fn: () => unknown): AppError {
  try {
    fn()
  } catch (err) {
    expect(err).toBeInstanceOf(Error)
    expect((err as AppError).name).toBe('AppError')
    return err as AppError
  }
  throw new Error('expected AppError but nothing was thrown')
}

describe('operators.service', () => {
  let t: ReturnType<typeof openTestDb>
  let operatorsApi: ReturnType<typeof createOperatorsService>

  beforeEach(() => {
    t = openTestDb()
    operatorsApi = createOperatorsService({ db: t.db, audit: t.audit })
  })

  afterEach(() => t.close())

  it('seedDefaults يذرّع ثلاثة متعاملين مرة واحدة فقط', () => {
    operatorsApi.seedDefaults()
    expect(operatorsApi.list().map((o) => o.name)).toEqual(['Mobilis', 'Djezzy', 'Ooredoo'])
    operatorsApi.seedDefaults()
    expect(operatorsApi.list()).toHaveLength(3)
  })

  it('create ثم updateMargin يغيّر الهامش فقط', () => {
    const created = operatorsApi.create({ name: 'New', marginBp: 100, lowBalanceAt: 0 }, owner)
    expect(created.marginBp).toBe(100)
    const updated = operatorsApi.updateMargin({ id: created.id, marginBp: 250 }, owner)
    expect(updated.marginBp).toBe(250)
    expect(updated.name).toBe('New')
  })

  it('اسم مكرر → OPERATOR_NAME_TAKEN', () => {
    operatorsApi.create({ name: 'Dup', marginBp: 0, lowBalanceAt: 0 }, owner)
    const err = expectAppError(() =>
      operatorsApi.create({ name: 'Dup', marginBp: 0, lowBalanceAt: 0 }, owner),
    )
    expect(err.code).toBe(OPERATORS_ERRORS.OPERATOR_NAME_TAKEN)
  })

  it('updateMargin على معرّف غير موجود → OPERATOR_NOT_FOUND', () => {
    const err = expectAppError(() => operatorsApi.updateMargin({ id: 999, marginBp: 10 }, owner))
    expect(err.code).toBe(OPERATORS_ERRORS.OPERATOR_NOT_FOUND)
  })

  it('كل كتابة تسجّل سطر تدقيق (RULES 9)', () => {
    operatorsApi.create({ name: 'A', marginBp: 0, lowBalanceAt: 0 }, owner)
    operatorsApi.updateMargin({ id: 1, marginBp: 50 }, owner)
    const actions = t.db.select({ action: auditLog.action }).from(auditLog).all().map((r) => r.action)
    expect(actions).toContain('operators.create')
    expect(actions).toContain('operators.update_margin')
  })
})
