import type { AppErrorParams } from '@shared/result'

// AppError هو النوع الوحيد المسموح رميه لأخطاء العمل المتوقعة (RULES 9).
// لا يحمل نصوصًا عربية — الرمز فقط، والترجمة في الواجهة.
export class AppError extends Error {
  readonly code: string
  readonly params?: AppErrorParams

  constructor(code: string, params?: AppErrorParams) {
    super(code)
    this.name = 'AppError'
    this.code = code
    this.params = params
  }
}
