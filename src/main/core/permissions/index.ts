import type { SessionUser } from '@shared/contracts/auth'

export type Role = SessionUser['role']

// مصفوفة الصلاحيات على نمط PRD §3. الصلاحية تُفحص في Main لكل handler (RULES 8.4).
export const PERMISSIONS = [
  'sales.create',
  'sales.void',
  'debts.pay',
  'balances.view',
  'stock.manage',
  'operators.manage',
  'reports.viewProfit',
  'backup.manage',
  'settings.manage',
  'users.manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

// صلاحيات البائع (Cashier) فقط؛ المالك يملك كل شيء.
const CASHIER_PERMISSIONS: readonly Permission[] = ['sales.create', 'debts.pay', 'balances.view']

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === 'admin') return true
  return CASHIER_PERMISSIONS.includes(permission)
}
