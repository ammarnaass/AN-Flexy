import { eq } from 'drizzle-orm'
import { operators } from './operators.schema'
import type { DB } from '@main/core/db/client'
import type { Audit } from '@main/core/audit'
import { AppError } from '@main/core/errors'
import { OPERATORS_ERRORS } from '@shared/contracts/operators'
import type { CreateOperatorInput, OperatorInfo, UpdateOperatorMarginInput } from '@shared/contracts/operators'
import type { SessionUser } from '@shared/contracts/auth'

// المتعاملون الافتراضيون عند أول تشغيل (PRD §2-4).
export const DEFAULT_OPERATORS = ['Mobilis', 'Djezzy', 'Ooredoo'] as const

export type OperatorsApi = {
  list(): OperatorInfo[]
  listActive(): OperatorInfo[]
  getById(id: number): OperatorInfo | null
  create(input: CreateOperatorInput, user: SessionUser): OperatorInfo
  updateMargin(input: UpdateOperatorMarginInput, user: SessionUser): OperatorInfo
  /** تعطيل منطقي (active=false)؛ لا حذف لمتعامل له عمليات (FR-02). */
  disable(id: number, user: SessionUser): OperatorInfo
  /** يذرّع الثلاثة الافتراضيين إذا لم يكن هناك أي متعامل (يُنادى من جذر التركيب). */
  seedDefaults(): void
}

export type OperatorsDeps = {
  db: DB
  audit: Audit
}

function toInfo(row: typeof operators.$inferSelect): OperatorInfo {
  return { id: row.id, name: row.name, marginBp: row.marginBp, lowBalanceAt: row.lowBalanceAt, active: row.active }
}

// الاسم الفريد مضمون بقاعدة البيانات؛ التصادم يترجم لرمز خطأ (RULES 9).
function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && err.message.includes('UNIQUE constraint failed: operators.name')
}

// تعديل الهامش لا يمس المبيعات السابقة: الربح لقطة وقت البيع (FR-02).
export function createOperatorsService(deps: OperatorsDeps): OperatorsApi {
  const { db, audit } = deps

  const insertOperator = (input: CreateOperatorInput): OperatorInfo => {
    try {
      const row = db
        .insert(operators)
        .values({ name: input.name, marginBp: input.marginBp, lowBalanceAt: input.lowBalanceAt })
        .returning()
        .get()
      return toInfo(row)
    } catch (err) {
      if (isUniqueViolation(err)) throw new AppError(OPERATORS_ERRORS.OPERATOR_NAME_TAKEN)
      throw err
    }
  }

  const api: OperatorsApi = {
    list() {
      return db.select().from(operators).all().map(toInfo)
    },

    listActive() {
      return db.select().from(operators).all().filter((o) => o.active).map(toInfo)
    },

    getById(id) {
      const row = db.select().from(operators).where(eq(operators.id, id)).get()
      return row ? toInfo(row) : null
    },

    create(input, user) {
      const info = insertOperator(input)
      audit.log(db, { userId: user.id, action: 'operators.create', details: { id: info.id, name: info.name } })
      return info
    },

    updateMargin(input, user) {
      const existing = db.select().from(operators).where(eq(operators.id, input.id)).get()
      if (!existing) throw new AppError(OPERATORS_ERRORS.OPERATOR_NOT_FOUND, { id: input.id })
      const row = db
        .update(operators)
        .set({ marginBp: input.marginBp })
        .where(eq(operators.id, input.id))
        .returning()
        .get()
      const info = toInfo(row)
      audit.log(db, {
        userId: user.id,
        action: 'operators.update_margin',
        details: { id: info.id, from: existing.marginBp, to: input.marginBp },
      })
      return info
    },

    disable(id, user) {
      const existing = db.select().from(operators).where(eq(operators.id, id)).get()
      if (!existing) throw new AppError(OPERATORS_ERRORS.OPERATOR_NOT_FOUND, { id })
      const row = db.update(operators).set({ active: false }).where(eq(operators.id, id)).returning().get()
      const info = toInfo(row)
      audit.log(db, { userId: user.id, action: 'operators.disable', details: { id, name: info.name } })
      return info
    },

    seedDefaults() {
      if (db.select({ id: operators.id }).from(operators).all().length > 0) return
      db.transaction((tx) => {
        for (const name of DEFAULT_OPERATORS) {
          tx.insert(operators).values({ name }).run()
        }
        audit.log(tx, { userId: null, action: 'operators.seed_defaults', details: { names: [...DEFAULT_OPERATORS] } })
      })
    },
  }
  return api
}
