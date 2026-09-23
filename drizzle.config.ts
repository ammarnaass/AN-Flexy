import { defineConfig } from 'drizzle-kit'

// جداول الخصائص في features/*/*.schema.ts، وجداول البنية التحتية (audit) في core (RULES 7.1).
export default defineConfig({
  dialect: 'sqlite',
  schema: ['./src/main/features/*/*.schema.ts', './src/main/core/*/*.schema.ts'],
  out: './src/main/core/db/migrations',
  strict: true,
  verbose: true,
})
