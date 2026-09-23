import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// جدول الزبائن — من PRD §8.
export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  note: text('note'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})
