// نصوص خاصية الدخول بالعربية (RULES 10.2).
export const authMessages = {
  loginTitle: 'تسجيل الدخول',
  loginSubtitle: 'اختر اسم المستخدم وأدخل الرمز السري للمتابعة.',
  setupTitle: 'الترحيب — أنشئ حساب المالك',
  setupHint: 'هذا أول تشغيل. أنشئ حساب المالك ثم أضف بقية المستخدمين من الإعدادات.',
  tagline: 'نظام إدارة محل تعبئة الرصيد',
  name: 'اسم المستخدم',
  namePlaceholder: 'مثال: صاحب المحل',
  pin: 'الرمز السري (PIN)',
  pinPlaceholder: '••••',
  pinHint: 'من 4 إلى 6 أرقام',
  loginAction: 'دخول',
  setupAction: 'إنشاء ومتابعة',
  logout: 'خروج',
  signingIn: 'جارٍ التحقق…',
  errors: {
    INVALID_CREDENTIALS: 'اسم المستخدم أو الرمز غير صحيح.',
    AUTH_LOCKED: 'تم القفل مؤقتًا بعد محاولات خاطئة متكررة. انتظر قليلًا ثم أعد المحاولة.',
    SETUP_ALREADY_DONE: 'تم إنشاء حساب المالك مسبقًا.',
    USERNAME_TAKEN: 'اسم المستخدم مسجل مسبقًا، يرجى اختيار اسم آخر.',
  } as Record<string, string>,
} as const
