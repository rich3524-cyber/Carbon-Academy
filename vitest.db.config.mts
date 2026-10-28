import { defineConfig } from 'vitest/config'

try {
  process.loadEnvFile('.env.test.local')
} catch {
  throw new Error(
    'Create .env.test.local with the local Supabase keys (see README, Getting started).',
  )
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    testTimeout: 20_000,
    fileParallelism: false,
  },
})
