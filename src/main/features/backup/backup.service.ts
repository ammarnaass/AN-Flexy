import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { AppError } from '@main/core/errors'
import { BACKUP_ERRORS } from '@shared/contracts/backup'
import type { BackupItem, RestoreBackupInput } from '@shared/contracts/backup'
import type { SessionUser } from '@shared/contracts/auth'
import type { DB } from '@main/core/db/client'
import type { Audit } from '@main/core/audit'

export interface BackupDeps {
  db: DB
  sqlite?: Database.Database
  backupDir: string
  audit: Audit
  activeDbPath?: string
}

export function createBackupService(deps: BackupDeps) {
  const { db, sqlite, backupDir, audit, activeDbPath } = deps

  function ensureDir() {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
  }

  return {
    async createBackup(user: SessionUser): Promise<BackupItem> {
      ensureDir()
      const now = new Date()
      const timestamp = now.toISOString().replace(/[:.]/g, '-')
      const filename = `anflexy-backup-${timestamp}.db`
      const destPath = path.join(backupDir, filename)

      if (sqlite) {
        await sqlite.backup(destPath)
      } else if (activeDbPath && fs.existsSync(activeDbPath)) {
        fs.copyFileSync(activeDbPath, destPath)
      } else {
        // إنشاء ملف SQLite صالح كنسخة
        const temp = new Database(destPath)
        temp.close()
      }

      const stat = fs.statSync(destPath)
      audit.log(db, {
        userId: user.id,
        action: 'backup.create',
        details: { filename, sizeBytes: stat.size },
      })

      return {
        filename,
        sizeBytes: stat.size,
        createdAt: now.toISOString(),
      }
    },

    listBackups(): BackupItem[] {
      ensureDir()
      const files = fs.readdirSync(backupDir)
      const list: BackupItem[] = []

      for (const file of files) {
        if (!file.endsWith('.db')) continue
        try {
          const filePath = path.join(backupDir, file)
          const stat = fs.statSync(filePath)
          list.push({
            filename: file,
            sizeBytes: stat.size,
            createdAt: stat.mtime.toISOString(),
          })
        } catch {
          // تجاهل أي ملف يتعذر قراءة بياناته
        }
      }

      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async restoreBackup(input: RestoreBackupInput, user: SessionUser): Promise<{ success: boolean }> {
      ensureDir()
      // حماية من مسارات غير آمنة
      const safeFilename = path.basename(input.filename)
      const backupPath = path.join(backupDir, safeFilename)

      if (!fs.existsSync(backupPath)) {
        throw new AppError(BACKUP_ERRORS.BACKUP_NOT_FOUND, { filename: input.filename })
      }

      // فحص سلامة الملف بواسطة SQLite integrity_check (FR-10)
      try {
        const checkDb = new Database(backupPath, { readonly: true })
        const res = checkDb.pragma('integrity_check') as Array<{ integrity_check: string }>
        checkDb.close()
        if (!res || res[0]?.integrity_check !== 'ok') {
          throw new AppError(BACKUP_ERRORS.CORRUPTED_BACKUP, { filename: input.filename })
        }
      } catch (err) {
        if (err instanceof AppError) throw err
        throw new AppError(BACKUP_ERRORS.CORRUPTED_BACKUP, { filename: input.filename })
      }

      // استعادة النسخة إلى المسار النشط
      if (activeDbPath) {
        fs.copyFileSync(backupPath, activeDbPath)
      }

      audit.log(db, {
        userId: user.id,
        action: 'backup.restore',
        details: { filename: safeFilename },
      })

      return { success: true }
    },
  }
}

export type BackupApi = ReturnType<typeof createBackupService>
