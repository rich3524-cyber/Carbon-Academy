import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { required } from '@/lib/env'
import type { Database } from '@/types/database'

/** Read-only, anonymous access to public content. RLS decides what is visible. */
export function createPublicClient() {
  return createClient<Database>(
    required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    required(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ),
    { auth: { persistSession: false } },
  )
}
