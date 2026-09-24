import type { SessionUser } from '@shared/contracts/auth'

export type Role = SessionUser['role']

export const PERMISSIONS = [
  'sales.create',
  'sales.void',
  'debts.pay',
  'balances.view',
  'stock.manage',
  'operators.manage',
  'customers.manage',
  'reports.view',
  'reports.viewProfit',
  'backup.manage',
  'settings.manage',
  'users.manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

// صلاحيات البائع (Cashier) فقط؛ المالك يملك كل شيء.
const CASHIER_PERMISSIONS: readonly Permission[] = ['sales.create', 'debts.pay', 'balances.view', 'reports.view']

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === 'admin') return true
  return CASHIER_PERMISSIONS.includes(permission)
}

