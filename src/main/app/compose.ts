import { createAudit } from '@main/core/audit'
import { createIpcRegistry } from '@main/core/ipc/handle'
import { createAuthFeature } from '@main/features/auth'
import { createSettingsFeature } from '@main/features/settings'
import { createOperatorsFeature } from '@main/features/operators'
import { createCustomersFeature } from '@main/features/customers'
import { createStockFeature } from '@main/features/stock'
import { createSalesFeature } from '@main/features/sales'
import { createDebtsFeature } from '@main/features/debts'
import { createReportsFeature } from '@main/features/reports'
import { createBackupFeature } from '@main/features/backup'
import type { DB } from '@main/core/db/client'
import type { Session } from '@main/core/session'
import type { Logger } from '@main/core/logger'
import type { IpcRegistry } from '@main/core/ipc/handle'
import type Database from 'better-sqlite3'

export type AppDeps = {
  db: DB
  sqlite?: Database.Database
  session: Session
  logger: Logger
  backupDir?: string
  activeDbPath?: string
}

// جذر التركيب: المكان الوحيد الذي تعرف فيه الخصائص بعضها (RULES 3.4). حقن يدوي بلا إطار.
// ترتيب التسجيل لا يهم؛ المهم أن session يُمرَّر لـ auth ولـ ipc معًا.
export function compose(deps: AppDeps): { ipc: IpcRegistry } {
  const { db, session, logger } = deps

  const audit = createAudit()
  const ipc = createIpcRegistry({ session, logger })

  // المستوى 1: بلا اعتماديات.
  const operators = createOperatorsFeature({ db, audit })
  const settings = createSettingsFeature({ db, audit })
  const customers = createCustomersFeature({ db, audit })
  // المستوى 2: stock يعتمد operators للتحقق من وجود المتعامل.
  const stock = createStockFeature({ db, audit, operators: operators.api })
  // المستوى 3: sales هو مصدر الحقيقة للرصيد: يحتاج stock (credit) وoperators (الهامش).
  const sales = createSalesFeature({ db, audit, operators: operators.api, stock: stock.api })
  // المستوى 4: debts يعتمد customers وsales (الدين يُحسب من المبيعات والدفعات).
  const debts = createDebtsFeature({ db, audit, customers: customers.api })
  // المستوى 5: reports للتقارير والإحصائيات.
  const reports = createReportsFeature({ db })
  // المستوى 5: backup للنسخ الاحتياطي والاسترجاع.
  const backup = createBackupFeature({
    db,
    sqlite: deps.sqlite,
    backupDir: deps.backupDir ?? './backups',
    audit,
    activeDbPath: deps.activeDbPath,
  })

  // بعد إنشاء المالك أول مرة نُذرّع المتعاملين الافتراضيين (Mobilis/Djezzy/Ooredoo).
  const auth = createAuthFeature({
    db,
    audit,
    session,
    onFirstSetup: () => operators.api.seedDefaults(),
  })

  auth.registerIpc(ipc)
  operators.registerIpc(ipc)
  settings.registerIpc(ipc)
  customers.registerIpc(ipc)
  stock.registerIpc(ipc)
  sales.registerIpc(ipc)
  debts.registerIpc(ipc)
  reports.registerIpc(ipc)
  backup.registerIpc(ipc)

  return { ipc }
}
