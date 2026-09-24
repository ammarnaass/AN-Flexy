import { operatorsChannels } from '@shared/contracts/operators'
import type { CreateOperatorInput, OperatorInfo, UpdateOperatorMarginInput } from '@shared/contracts/operators'
import { invoke } from '@renderer/shared/api'

// طبقة الوصول إلى IPC للمتعاملين.
export const operatorsApi = {
  list: (): Promise<OperatorInfo[]> => invoke<OperatorInfo[]>(operatorsChannels.list),
  create: (input: CreateOperatorInput): Promise<OperatorInfo> =>
    invoke<OperatorInfo>(operatorsChannels.create, input),
  updateMargin: (input: UpdateOperatorMarginInput): Promise<OperatorInfo> =>
    invoke<OperatorInfo>(operatorsChannels.updateMargin, input),
  disable: (id: number): Promise<OperatorInfo> =>
    invoke<OperatorInfo>(operatorsChannels.disable, { id }),
}
