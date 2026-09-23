import { createAudit } from '@main/core/audit'
import { createIpcRegistry } from '@main/core/ipc/handle'
import { createAuthFeature } from '@main/features/auth'
import { createSettingsFeature } from '@main/features/settings'
import { createOperatorsFeature } from '@main/features/operators'
import { createStockFeature } from '@main/features/stock'
import { createSalesFeature } from '@main/features/sales'
import type { DB } from '@main/core/db/client'
import type { Session } from '@main/core/session'
import type { Logger } from '@main/core/logger'
import type { IpcRegistry } from '@main/core/ipc/handle'

export type AppDeps = {
  db: DB
  session: Session
  logger: Logger
}

// جذر التركيب: المكان الوحيد الذي تعرف فيه الخصائص بعضها (RULES 3.4). حقن يدوي بلا إطار.
// ترتيب التسجيل لا يهم؛ المهم أن session يُمرَّر لـ auth ولـ ipc معًا.
export function compose(deps: AppDeps): { ipc: IpcRegistry } {
  const { db, session, logger } = deps

  const audit = createAudit()
  const ipc = createIpcRegistry({ session, logger })

  const operators = createOperatorsFeature({ db, audit })
  const settings = createSettingsFeature({ db, audit })
  // stock يعتمد operators للتحقق من وجود المتعامل.
  const stock = createStockFeature({ db, audit, operators: operators.api })
  // sales هو مصدر الحقيقة للرصيد: يحتاج stock (credit) وoperators (الهامش).
  const sales = createSalesFeature({ db, audit, operators: operators.api, stock: stock.api })
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
  stock.registerIpc(ipc)
  sales.registerIpc(ipc)

  return { ipc }
}
