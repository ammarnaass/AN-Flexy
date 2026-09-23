// نصوص الواجهة العامة بالعربية (RULES 10.2: لا نص داخل JSX).
export const ui = {
  appName: 'AN Flexy',
  loading: 'جارٍ التحميل…',
  comingSoon: 'هذه الشاشة قيد الإنشاء في المرحلة التالية.',
  logout: 'خروج',
  nav: {
    dashboard: 'لوحة التحكم',
    sale: 'بيع جديد',
    stock: 'المخزون',
    customers: 'الزبائن',
    debts: 'الديون',
    reports: 'التقارير',
    settings: 'الإعدادات',
  },
} as const

// رسائل الأخطاء العامة المشتركة (الرموز من Main — RULES 9).
export const commonErrorMessages: Record<string, string> = {
  NOT_AUTHENTICATED: 'الجلسة غير متاحة، سجّل الدخول أولًا.',
  PERMISSION_DENIED: 'لا تملك صلاحية لهذا الإجراء.',
  VALIDATION_ERROR: 'تحقّق من المدخلات.',
  INTERNAL_ERROR: 'حدث خطأ غير متوقع.',
}

export function translateCommonError(code: string): string | null {
  return commonErrorMessages[code] ?? null
}
