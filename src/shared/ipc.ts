import type { Result } from './result'

// الواجهة التي يعرضها preload على window.api — نوع نقي بلا Electron (RULES 4.2).
export type RendererApi = {
  invoke<T = unknown>(channel: string, payload?: unknown): Promise<Result<T>>
}
