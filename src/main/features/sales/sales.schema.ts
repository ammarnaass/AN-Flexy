import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { operators } from '@main/features/operators'
import { customers } from '@main/features/customers'
import { users } from '@main/features/auth'

// جدول المبيعات — من PRD §8.
// profit لقطة وقت البيع ولا يُحدَّث عند تغيير الهامش (RULES 7.8).
// الإلغاء منطقي فقط: voidedAt + voidReason، لا حذف فعلي (RULES 7.7).
export const sales = sqliteTable(
  'sales',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    operatorId: integer('operator_id').notNull().references(() => operators.id),
    customerId: integer('customer_id').references(() => customers.id),
    targetPhone: text('target_phone').notNull(),
    amount: integer('amount').notNull(),
    paidAmount: integer('paid_amount').notNull(),
    profit: integer('profit').notNull(),
    userId: integer('user_id').notNull().references(() => users.id),
    voidedAt: text('voided_at'),
    voidReason: text('void_reason'),
    createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [
    index('sales_created_idx').on(t.createdAt),
    index('sales_customer_idx').on(t.customerId),
    index('sales_operator_idx').on(t.operatorId),
  ],
)
