import {
  stockChannels,
  purchaseInput,
  settlementInput,
  stockEntriesInput,
} from '@shared/contracts/stock'
import type { StockApi } from './stock.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

export function registerStockIpc(ipc: IpcRegistry, stockApi: StockApi): void {
  ipc.handle(stockChannels.entries, {
    input: stockEntriesInput,
    permission: 'stock.manage',
    run: (input) => stockApi.listEntries(input),
  })

  ipc.handle(stockChannels.addPurchase, {
    input: purchaseInput,
    permission: 'stock.manage',
    run: (input, ctx) => stockApi.addPurchase(input, ctx.user),
  })

  ipc.handle(stockChannels.addSettlement, {
    input: settlementInput,
    permission: 'stock.manage',
    run: (input, ctx) => stockApi.addSettlement(input, ctx.user),
  })
}
