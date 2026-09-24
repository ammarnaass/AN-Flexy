import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { createAudit } from '../audit'
import { createLogger } from '../logger'
import type { Audit } from '../audit'
import type { Logger } from '../logger'
import type { DB } from './client'

// مِبرك اختبار: قاعدة :memory: مع تشغيل الترحيلات الحقيقية (RULES 11.1).
const MIGRATIONS_FOLDER = fileURLToPath(new URL('./migrations', import.meta.url))

export type TestDb = {
  db: DB
  sqlite: Database.Database
  audit: Audit
  logger: Logger
  close(): void
}

export function openTestDb(): TestDb {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite)
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  return {
    db,
    sqlite,
    audit: createAudit(),
    logger: createLogger(),
    close: () => sqlite.close(),
  }
}
