import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '@main': r('./src/main'), '@shared': r('./src/shared') },
  },
  test: {
    environment: 'node',
    include: ['src/main/**/*.test.ts', 'src/shared/**/*.test.ts'],
  },
})
