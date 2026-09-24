import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBackupFeature } from '@main/features/backup'
import { openTestDb } from '@main/core/db/testDb'
import { BACKUP_ERRORS } from '@shared/contracts/backup'
import { auditLog } from '@main/core/audit/audit.schema'
import type { SessionUser } from '@shared/contracts/auth'
import type { AppError } from '@main/core/errors'

const admin: SessionUser = { id: 1, name: 'ammar', role: 'admin' }

describe('backup.service — النسخ الاحتياطي والاسترجاع (FR-10)', () => {
  let t: ReturnType<typeof openTestDb>
  let tempDir: string
  let backupApi: ReturnType<typeof createBackupFeature>['api']

  beforeEach(() => {
    t = openTestDb()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anflexy-backup-test-'))
    backupApi = createBackupFeature({
      db: t.db,
      sqlite: t.sqlite,
      backupDir: tempDir,
      audit: t.audit,
    }).api
  })

  afterEach(() => {
    t.close()
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('إنشاء نسخة احتياطية محلية وتسجيلها في سجل التدقيق', async () => {
    const backup = await backupApi.createBackup(admin)
    expect(backup.filename).toMatch(/^anflexy-backup-.*\.db$/)
    expect(backup.sizeBytes).toBeGreaterThan(0)
    expect(fs.existsSync(path.join(tempDir, backup.filename))).toBe(true)

    // التحقق من التدقيق
    const logs = t.db.select().from(auditLog).all()
    const backupLog = logs.find((l) => l.action === 'backup.create')
    expect(backupLog).toBeDefined()
  })

  it('قائمة النسخ الاحتياطية مرتبة بالأحدث', async () => {
    const b1 = await backupApi.createBackup(admin)
    // الانتظار لحظة صغيرة لضمان اختلاف التوقيت
    await new Promise((r) => setTimeout(r, 20))
    const b2 = await backupApi.createBackup(admin)

    const list = backupApi.listBackups()
    expect(list.length).toBe(2)
    expect(list[0]?.filename).toBe(b2.filename)
    expect(list[1]?.filename).toBe(b1.filename)
  })

  it('استرجاع نسخة صالحة يمر بنجاح', async () => {
    const backup = await backupApi.createBackup(admin)
    const result = await backupApi.restoreBackup({ filename: backup.filename }, admin)
    expect(result.success).toBe(true)

    const logs = t.db.select().from(auditLog).all()
    const restoreLog = logs.find((l) => l.action === 'backup.restore')
    expect(restoreLog).toBeDefined()
  })

  it('استرجاع نسخة غير موجودة يعيد BACKUP_NOT_FOUND', async () => {
    let thrownError: AppError | null = null
    try {
      await backupApi.restoreBackup({ filename: 'non-existent.db' }, admin)
    } catch (e) {
      thrownError = e as AppError
    }
    expect(thrownError).not.toBeNull()
    expect(thrownError?.code).toBe(BACKUP_ERRORS.BACKUP_NOT_FOUND)
  })

  it('فحص سلامة النسخة: ملف تالف يعيد CORRUPTED_BACKUP', async () => {
    const corruptedFile = path.join(tempDir, 'corrupted.db')
    fs.writeFileSync(corruptedFile, 'THIS IS NOT A SQLITE DATABASE FILE')

    let thrownError: AppError | null = null
    try {
      await backupApi.restoreBackup({ filename: 'corrupted.db' }, admin)
    } catch (e) {
      thrownError = e as AppError
    }
    expect(thrownError).not.toBeNull()
    expect(thrownError?.code).toBe(BACKUP_ERRORS.CORRUPTED_BACKUP)
  })
})
