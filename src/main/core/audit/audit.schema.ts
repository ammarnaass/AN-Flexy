import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// لا يوجد references إلى users.id هنا: core لا يجوز أن يستورد من features (RULES 4.2).
// user_id عمود منطقي فقط، وسجلات التدقيق لا تُحذف أصلًا.
export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id'),
  action: text('action').notNull(),
  details: text('details'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
})
