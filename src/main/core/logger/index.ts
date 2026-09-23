// لا تُسجَّل أرقام هواتف كاملة ولا PINs ولا توكنات هنا (RULES 8.7).
export type Logger = {
  info(message: string, meta?: unknown): void
  warn(message: string, meta?: unknown): void
  error(message: string, meta?: unknown): void
}

export function createLogger(): Logger {
  const stamp = () => new Date().toISOString()
  return {
    info: (message, meta) => console.log(`[${stamp()}] [info] ${message}`, meta ?? ''),
    warn: (message, meta) => console.warn(`[${stamp()}] [warn] ${message}`, meta ?? ''),
    error: (message, meta) => console.error(`[${stamp()}] [error] ${message}`, meta ?? ''),
  }
}
