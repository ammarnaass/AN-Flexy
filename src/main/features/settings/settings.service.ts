import { eq } from 'drizzle-orm'
import { settings as settingsTable } from './settings.schema'
import type { DB } from '@main/core/db/client'
import type { Audit } from '@main/core/audit'
import type { SessionUser } from '@shared/contracts/auth'
import type { SettingKey } from '@shared/contracts/settings'

export type SettingsApi = {
  get(key: SettingKey): string | null
  set(key: SettingKey, value: string, user: SessionUser): void
  list(): Array<{ key: SettingKey; value: string }>
}

export type SettingsDeps = {
  db: DB
  audit: Audit
}

// تخزين key/value بسيط. القيم الحساسة تُشفَّر قبل الوصول هنا (RULES 8.6).
// الكتابة عبر ctxuserId القادم من الـ handler فقط (RULES 3.1).
export function createSettingsService(deps: SettingsDeps): SettingsApi {
  const { db, audit } = deps
  return {
    get(key) {
      const row = db.select().from(settingsTable).where(eq(settingsTable.key, key)).get()
      return row ? row.value : null
    },

    set(key, value, user) {
      db.transaction((tx) => {
        tx.insert(settingsTable)
          .values({ key, value })
          .onConflictDoUpdate({ target: settingsTable.key, set: { value } })
          .run()
        audit.log(tx, { userId: user.id, action: 'settings.set', details: { key, value } })
      })
    },

    list() {
      return db
        .select({ key: settingsTable.key, value: settingsTable.value })
        .from(settingsTable)
        .all() as Array<{ key: SettingKey; value: string }>
    },
  }
}
