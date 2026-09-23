import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

export type OpenDbOptions = {
  // مسار ملف القاعدة، أو ':memory:' للاختبارات.
  file: string
  migrationsFolder: string
}

// لا يستورد electron: المسارات تُمرَّر من app/ حتى تبقى الخدمات قابلة للاختبار بقاعدة :memory:.
// نستخدم query builder فقط (RULES 7.2)، فلا حاجة لتمرير schema وقت التشغيل.
export function openDatabase(options: OpenDbOptions) {
  const sqlite = new Database(options.file)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite)
  migrate(db, { migrationsFolder: options.migrationsFolder })
  return { db, sqlite }
}

export type DB = ReturnType<typeof openDatabase>['db']
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0]

// أي دالة api قد تُستدعى داخل transaction لخاصية أخرى تقبل DbOrTx (RULES 7.4).
export type DbOrTx = DB | Tx
