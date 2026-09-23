import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { customers } from '@main/features/customers'
import { users } from '@main/features/auth'

// جدول الدفعات — من PRD §8. الدين يُحسب بالاستعلام ولا يُخزَّن (RULES 7.8).
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  amount: integer('amount').notNull(),
  userId: integer('user_id').references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})
