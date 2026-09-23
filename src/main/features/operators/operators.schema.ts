import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// جدول المتعاملين — من PRD §8. الهامش بالنقاط الأساسية (350 = 3.5%).
// لا حذف فعلي: التعطيل فقط (active=false) إن كانت له عمليات (FR-02).
export const operators = sqliteTable('operators', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(), // Mobilis, Djezzy, Ooredoo
  marginBp: integer('margin_bp').notNull().default(0),
  lowBalanceAt: integer('low_balance_at').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
})
