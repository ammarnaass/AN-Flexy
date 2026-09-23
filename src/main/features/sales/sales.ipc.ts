import {
  salesChannels,
  createSaleInput,
  voidSaleInput,
  listSalesInput,
  balancesInput,
} from '@shared/contracts/sales'
import { hasPermission } from '@main/core/permissions'
import type { SaleInfo } from '@shared/contracts/sales'
import type { SalesApi } from './sales.service'
import type { IpcRegistry } from '@main/core/ipc/handle'
import type { SessionUser } from '@shared/contracts/auth'

// الربح حساس: يُحجب عن من لا يملك reports.viewProfit (RULES 8.4 — الإخفاء في Main لا Renderer).
function mask(sale: SaleInfo, user: SessionUser): SaleInfo {
  return hasPermission(user.role, 'reports.viewProfit') ? sale : { ...sale, profit: 0 }
}

export function registerSalesIpc(ipc: IpcRegistry, salesApi: SalesApi): void {
  ipc.handle(salesChannels.create, {
    input: createSaleInput,
    permission: 'sales.create',
    run: (input, ctx) => mask(salesApi.createSale(input, ctx.user), ctx.user),
  })

  ipc.handle(salesChannels.void, {
    input: voidSaleInput,
    permission: 'sales.void',
    run: (input, ctx) => mask(salesApi.voidSale(input, ctx.user), ctx.user),
  })

  ipc.handle(salesChannels.list, {
    input: listSalesInput,
    permission: 'balances.view',
    run: (input, ctx) => salesApi.listRecent(input.limit).map((s) => mask(s, ctx.user)),
  })

  ipc.handle(salesChannels.balances, {
    input: balancesInput,
    permission: 'balances.view',
    run: (input) => salesApi.listBalances(input.includeInactive),
  })
}
