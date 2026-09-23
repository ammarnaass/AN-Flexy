// رموز الأخطاء العامة المشتركة بين كل الخصائص.
// الرموز الخاصة بخاصية تُعرَّف في عقدها shared/contracts/<feature>.ts (RULES 9).
export const COMMON_ERRORS = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNKNOWN_CHANNEL: 'UNKNOWN_CHANNEL',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const
