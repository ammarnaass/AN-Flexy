import { eq, like, or, desc } from 'drizzle-orm'
import { customers } from './customers.schema'
import type { DB } from '@main/core/db/client'
import type { Audit } from '@main/core/audit'
import { AppError } from '@main/core/errors'
import { CUSTOMERS_ERRORS } from '@shared/contracts/customers'
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  SearchCustomersInput,
  CustomerInfo,
} from '@shared/contracts/customers'
import type { SessionUser } from '@shared/contracts/auth'

export type CustomersDeps = {
  db: DB
  audit: Audit
}

function toInfo(row: typeof customers.$inferSelect): CustomerInfo {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    note: row.note,
    createdAt: row.createdAt,
  }
}

// CRUD زبائن + بحث سريع (FR-06). البيانات الأساسية فقط — الدين يُحسب في خاصية debts.
export function createCustomersService(deps: CustomersDeps) {
  const { db, audit } = deps

  return {
    list(limit: number): CustomerInfo[] {
      return db
        .select()
        .from(customers)
        .orderBy(desc(customers.id))
        .limit(limit)
        .all()
        .map(toInfo)
    },

    search(input: SearchCustomersInput): CustomerInfo[] {
      const pattern = `%${input.query}%`
      return db
        .select()
        .from(customers)
        .where(or(like(customers.name, pattern), like(customers.phone, pattern)))
        .limit(input.limit)
        .all()
        .map(toInfo)
    },

    getById(id: number): CustomerInfo | null {
      const row = db.select().from(customers).where(eq(customers.id, id)).get()
      return row ? toInfo(row) : null
    },

    create(input: CreateCustomerInput, user: SessionUser): CustomerInfo {
      return db.transaction((tx) => {
        const row = tx
          .insert(customers)
          .values({
            name: input.name,
            phone: input.phone ?? null,
            note: input.note ?? null,
          })
          .returning()
          .get()

        audit.log(tx, {
          userId: user.id,
          action: 'customers.create',
          details: { id: row.id, name: row.name },
        })
        return toInfo(row)
      })
    },

    update(input: UpdateCustomerInput, user: SessionUser): CustomerInfo {
      return db.transaction((tx) => {
        const existing = tx.select().from(customers).where(eq(customers.id, input.id)).get()
        if (!existing) throw new AppError(CUSTOMERS_ERRORS.CUSTOMER_NOT_FOUND, { id: input.id })

        const row = tx
          .update(customers)
          .set({
            name: input.name,
            phone: input.phone ?? null,
            note: input.note ?? null,
          })
          .where(eq(customers.id, input.id))
          .returning()
          .get()

        audit.log(tx, {
          userId: user.id,
          action: 'customers.update',
          details: { id: row.id, name: row.name },
        })
        return toInfo(row)
      })
    },
  }
}

export type CustomersApi = ReturnType<typeof createCustomersService>
