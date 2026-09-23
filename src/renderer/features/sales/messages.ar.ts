// نصوص خاصية البيع بالعربية (RULES 10.2).
export const salesMessages = {
  title: 'بيع جديد',
  operator: 'المتعامل',
  phone: 'رقم الهاتف',
  amount: 'المبلغ (دج)',
  paid: 'المدفوع (دج)',
  submit: 'تأكيد البيع',
  submitting: 'جارٍ الحفظ…',
  success: 'تم البيع بنجاح ✓',
  quickAmounts: 'مبالغ سريعة',
  balanceLabel: 'الرصيد المتاح',
  lowBalance: 'رصيد منخفض',
  selectOperator: 'اختر المتعامل',
  noOperator: 'لا يوجد متعاملون نشطون. أضفهم من المخزون أولًا.',
  errors: {
    OPERATOR_NOT_FOUND: 'المتعامل غير موجود أو معطَّل.',
    DEBT_REQUIRES_CUSTOMER: 'البيع بالدين يتطلب اختيار عميل (يتوفّر في المرحلة التالية).',
    SALE_NOT_FOUND: 'العملية غير موجودة.',
    SALE_ALREADY_VOIDED: 'هذه العملية ملغاة مسبقًا.',
  } as Record<string, string>,
} as const
