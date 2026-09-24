// نصوص خاصية التقارير بالعربية (RULES 10.2).
export const reportsMessages = {
  title: 'التقارير والإحصائيات',
  subtitle: 'ملخص الأداء والمبيعات وتحليل العمليات',
  period: 'الفترة الزمنية',
  periods: {
    today: 'اليوم',
    yesterday: 'أمس',
    this_week: 'هذا الأسبوع',
    this_month: 'هذا الشهر',
    last_month: 'الشهر الماضي',
    all: 'الكل',
    custom: 'فترة مخصصة',
  },
  customRange: {
    from: 'من تاريخ',
    to: 'إلى تاريخ',
    apply: 'تطبيق',
  },
  metrics: {
    totalSales: 'إجمالي المبيعات',
    totalProfit: 'إجمالي الأرباح',
    salesCount: 'عدد العمليات',
    debtCreated: 'ديون جديدة مسجلة',
    debtPaid: 'ديون محصلة',
  },
  sections: {
    byOperator: 'المبيعات حسب المتعامل',
    byUser: 'المبيعات حسب البائع',
    byDay: 'حركة المبيعات اليومية',
  },
  table: {
    operator: 'المتعامل',
    user: 'المستخدم / البائع',
    date: 'التاريخ',
    sales: 'المبيعات',
    profit: 'الربح',
    count: 'العمليات',
    percentage: 'النسبة',
  },
  export: {
    csv: 'تصدير كملف CSV',
    success: 'تم تصدير التقرير بنجاح',
  },
  empty: 'لا توجد بيانات مسجلة في هذه الفترة',
} as const
