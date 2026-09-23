import { emptyInput } from '@shared/contracts/auth'
import {
  operatorsChannels,
  createOperatorInput,
  operatorIdInput,
  updateOperatorMarginInput,
} from '@shared/contracts/operators'
import type { OperatorsApi } from './operators.service'
import type { IpcRegistry } from '@main/core/ipc/handle'

// list مرئية للبائع أيضًا (يحتاجها في شاشة البيع) عبر صلاحية balances.view.
export function registerOperatorsIpc(ipc: IpcRegistry, operatorsApi: OperatorsApi): void {
  ipc.handle(operatorsChannels.list, {
    input: emptyInput,
    permission: 'balances.view',
    run: () => operatorsApi.list(),
  })

  ipc.handle(operatorsChannels.create, {
    input: createOperatorInput,
    permission: 'operators.manage',
    run: (input, ctx) => operatorsApi.create(input, ctx.user),
  })

  ipc.handle(operatorsChannels.updateMargin, {
    input: updateOperatorMarginInput,
    permission: 'operators.manage',
    run: (input, ctx) => operatorsApi.updateMargin(input, ctx.user),
  })

  ipc.handle(operatorsChannels.disable, {
    input: operatorIdInput,
    permission: 'operators.manage',
    run: (input, ctx) => operatorsApi.disable(input.id, ctx.user),
  })
}
