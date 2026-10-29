import { createClient } from '@supabase/supabase-js'

// Security framework control 04: DB tests prove access rules against a real database.

function localEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is missing from .env.test.local`)
  return value
}

const url = localEnv('SUPABASE_TEST_URL')
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  throw new Error('DB tests only run against the local Supabase stack, never a hosted project')
}

const options = { auth: { persistSession: false } }
export const admin = createClient(url, localEnv('SUPABASE_TEST_SECRET_KEY'), options)
export const publicClient = createClient(url, localEnv('SUPABASE_TEST_PUBLISHABLE_KEY'), options)
