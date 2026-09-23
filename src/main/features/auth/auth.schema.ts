import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// جدول المستخدمين — من PRD §8. PIN يُخزَّن مجزّأً (scrypt + salt)، لا نصًا (FR-01).
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  role: text('role', { enum: ['admin', 'cashier'] }).notNull(),
  pinHash: text('pin_hash').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})
