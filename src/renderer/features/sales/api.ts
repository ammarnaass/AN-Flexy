import { salesChannels } from '@shared/contracts/sales'
import type { CreateSaleInput, SaleInfo, OperatorBalanceInfo, VoidSaleInput } from '@shared/contracts/sales'
import { invoke } from '@renderer/shared/api'

// طبقة الوصول إلى IPC للبيع. الرصيد يُقرأ من هنا (ملك sales — RULES 4.3).
export const salesApi = {
  create: (input: CreateSaleInput): Promise<SaleInfo> => invoke<SaleInfo>(salesChannels.create, input),
  void: (input: VoidSaleInput): Promise<SaleInfo> => invoke<SaleInfo>(salesChannels.void, input),
  list: (limit: number): Promise<SaleInfo[]> => invoke<SaleInfo[]>(salesChannels.list, { limit }),
  balances: (includeInactive: boolean): Promise<OperatorBalanceInfo[]> =>
    invoke<OperatorBalanceInfo[]>(salesChannels.balances, { includeInactive }),
}
