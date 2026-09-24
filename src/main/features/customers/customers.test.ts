import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCustomersFeature } from '@main/features/customers'
import { openTestDb } from '@main/core/db/testDb'
import { CUSTOMERS_ERRORS } from '@shared/contracts/customers'
import { auditLog } from '@main/core/audit/audit.schema'
import type { SessionUser } from '@shared/contracts/auth'
import type { AppError } from '@main/core/errors'

function expectAppError(fn: () => unknown): AppError {
  try {
    fn()
  } catch (err) {
    expect((err as AppError).name).toBe('AppError')
    return err as AppError
  }
  throw new Error('expected AppError but nothing was thrown')
}

describe('customers.service — CRUD والبحث (FR-06)', () => {
  let t: ReturnType<typeof openTestDb>
  let customers: ReturnType<typeof createCustomersFeature>['api']
  let owner: SessionUser

  beforeEach(() => {
    t = openTestDb()
    customers = createCustomersFeature({ db: t.db, audit: t.audit }).api
    owner = { id: 1, name: 'ammar', role: 'admin' }
  })

  afterEach(() => t.close())

  it('إنشاء زبون ثم استرجاعه بالمعرّف', () => {
    const c = customers.create({ name: 'أحمد', phone: '0555123456' }, owner)
    expect(c.name).toBe('أحمد')
    expect(c.phone).toBe('0555123456')

    const found = customers.getById(c.id)
    expect(found).not.toBeNull()
    expect(found!.id).toBe(c.id)
  })

  it('قائمة الزبائن تعود بالأحدث أولًا', () => {
    customers.create({ name: 'أ', phone: '0555000001' }, owner)
    customers.create({ name: 'ب', phone: '0555000002' }, owner)
    const list = customers.list(10)
    expect(list.length).toBe(2)
    expect(list[0]!.name).toBe('ب')
  })

  it('البحث بالاسم والرقم', () => {
    customers.create({ name: 'سارة', phone: '0660123456' }, owner)
    customers.create({ name: 'أحمد', phone: '0550987654' }, owner)

    const byName = customers.search({ query: 'سارة', limit: 10 })
    expect(byName.length).toBe(1)
    expect(byName[0]!.name).toBe('سارة')

    const byPhone = customers.search({ query: '0550', limit: 10 })
    expect(byPhone.length).toBe(1)
    expect(byPhone[0]!.name).toBe('أحمد')
  })

  it('تعديل بيانات الزبون', () => {
    const c = customers.create({ name: 'محمد', phone: '0555111111' }, owner)
    const updated = customers.update({ id: c.id, name: 'محمد علي', phone: '0555222222' }, owner)
    expect(updated.name).toBe('محمد علي')
    expect(updated.phone).toBe('0555222222')
  })

  it('تعديل زبون غير موجود → CUSTOMER_NOT_FOUND', () => {
    const err = expectAppError(() =>
      customers.update({ id: 999, name: 'لا أحد' }, owner),
    )
    expect(err.code).toBe(CUSTOMERS_ERRORS.CUSTOMER_NOT_FOUND)
  })

  it('كل عملية إنشاء/تعديل تسجّل تدقيقًا (RULES 9)', () => {
    const c = customers.create({ name: 'فاطمة' }, owner)
    customers.update({ id: c.id, name: 'فاطمة الزهراء' }, owner)
    const actions = t.db.select({ action: auditLog.action }).from(auditLog).all().map((r) => r.action)
    expect(actions).toContain('customers.create')
    expect(actions).toContain('customers.update')
  })
})
