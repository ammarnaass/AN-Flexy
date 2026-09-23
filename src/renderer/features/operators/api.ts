import { operatorsChannels } from '@shared/contracts/operators'
import type { OperatorInfo } from '@shared/contracts/operators'
import { invoke } from '@renderer/shared/api'

// طبقة الوصول إلى IPC للمتعاملين.
export const operatorsApi = {
  list: (): Promise<OperatorInfo[]> => invoke<OperatorInfo[]>(operatorsChannels.list),
}
