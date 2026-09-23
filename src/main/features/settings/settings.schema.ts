import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

// جدول الإعدادات key/value — من PRD §8. القيم الحساسة (توكن تليغرام) تُشفَّر بـ safeStorage قبل الحفظ (RULES 8.6).
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
