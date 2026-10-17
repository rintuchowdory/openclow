import { defineConfig, globalIgnores } from 'eslint/config'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextTs,
  { files: ['tailwind.config.js'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  globalIgnores(['.next/**', 'node_modules/**', 'next-env.d.ts']),
])
