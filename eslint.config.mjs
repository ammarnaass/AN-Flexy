import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['out', 'dist', 'release', 'node_modules', 'coverage', 'src/main/core/db/migrations', 'skills'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.cjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'error',
    },
  },
  {
    // logger هو المكان الوحيد المسموح فيه بـ console.
    files: ['src/main/core/logger/**'],
    rules: { 'no-console': 'off' },
  },
  {
    // أدوات Node (CommonJS): require وconsole مقصودان فيها.
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off', 'no-console': 'off' },
  },
)
