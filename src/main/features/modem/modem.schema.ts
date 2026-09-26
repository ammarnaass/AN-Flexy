import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

// جدول حفظ إعدادات المنافذ والفلاشات في قاعدة البيانات
export const modemSettings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
