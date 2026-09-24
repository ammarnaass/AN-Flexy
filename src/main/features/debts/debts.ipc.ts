import {
  debtsChannels,
  addPaymentInput,
  listPaymentsInput,
  customerDebtInput,
  listDebtorsInput,
} from '@shared/contracts/debts'
import type { DebtsApi } from './debts.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

// handlers رقيقة: zod + صلاحية + استدعاء الخدمة (RULES 5, 6.2-3).
export function registerDebtsIpc(ipc: IpcRegistry, api: DebtsApi): void {
  ipc.handle(debtsChannels.listDebtors, {
    input: listDebtorsInput,
    permission: 'sales.create', // أي مستخدم يمكنه رؤية قائمة الديون.
    run: (input) => api.listDebtors(input.limit),
  })

  ipc.handle(debtsChannels.getCustomerDebt, {
    input: customerDebtInput,
    permission: 'sales.create',
    run: (input) => api.getCustomerDebt(input.customerId),
  })

  ipc.handle(debtsChannels.addPayment, {
    input: addPaymentInput,
    permission: 'debts.pay',
    run: (input, ctx) => api.addPayment(input, ctx.user),
  })

  ipc.handle(debtsChannels.listPayments, {
    input: listPaymentsInput,
    permission: 'sales.create',
    run: (input) => api.listPayments(input),
  })
}
