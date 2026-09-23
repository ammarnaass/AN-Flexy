/// <reference types="vite/client" />
import type { RendererApi } from '@shared/ipc'

// نوع الجسر الذي يعرضه preload على window.api (RULES 4.2/6.2).
declare global {
  interface Window {
    api: RendererApi
  }
}

export {}
