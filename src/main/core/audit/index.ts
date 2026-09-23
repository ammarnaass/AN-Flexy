import { auditLog } from './audit.schema'
import type { DbOrTx } from '../db/client'

export type AuditEntry = {
  userId: number | null
  action: string
  details?: unknown
}

// كل عملية كتابة تسجّل سطر تدقيق داخل نفس الـ transaction (RULES 9).
export type Audit = {
  log(exec: DbOrTx, entry: AuditEntry): void
}

export function createAudit(): Audit {
  return {
    log(exec, entry) {
      exec
        .insert(auditLog)
        .values({
          userId: entry.userId,
          action: entry.action,
          details: entry.details === undefined ? null : JSON.stringify(entry.details),
        })
        .run()
    },
  }
}
