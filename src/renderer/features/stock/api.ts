import { stockChannels } from '@shared/contracts/stock'
import type {
  PurchaseInput,
  SettlementInput,
  StockEntryInfo,
  StockEntriesInput,
} from '@shared/contracts/stock'
import { invoke } from '@renderer/shared/api'

// طبقة الوصول إلى IPC للمخزون: الشحن والتسوية وحركتهما. الرصيد ليس هنا (ملك sales).
export const stockApi = {
  entries: (input: StockEntriesInput): Promise<StockEntryInfo[]> =>
    invoke<StockEntryInfo[]>(stockChannels.entries, input),
  addPurchase: (input: PurchaseInput): Promise<StockEntryInfo> =>
    invoke<StockEntryInfo>(stockChannels.addPurchase, input),
  addSettlement: (input: SettlementInput): Promise<StockEntryInfo> =>
    invoke<StockEntryInfo>(stockChannels.addSettlement, input),
}
