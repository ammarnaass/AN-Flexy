import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { operators } from '@main/features/operators'
import { users } from '@main/features/auth'

// سجل المخزون (شحن/تسوية) — من PRD §8.
// creditAmount بالسنتيم المستلم؛ السالب مسموح للتسويات فقط (FR-03).
export const stockEntries = sqliteTable('stock_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  operatorId: integer('operator_id').notNull().references(() => operators.id),
  type: text('type', { enum: ['purchase', 'adjustment'] }).notNull().default('purchase'),
  costAmount: integer('cost_amount').notNull().default(0), // سنتيم مدفوعة
  creditAmount: integer('credit_amount').notNull(), // سنتيم رصيد (سالب مسموح للتسوية فقط)
  note: text('note'),
  userId: integer('user_id').references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})
