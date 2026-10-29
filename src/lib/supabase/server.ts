import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { required } from '@/lib/env'
import { siteUrl } from '@/lib/site'
import type { Database } from '@/types/database'
import { authCookieOptions } from './cookies'

/**
 * Supabase client acting as the signed-in user, from the session cookies. RLS applies.
 * Server Components can't set cookies, so writes are ignored there. proxy.ts has already
 * refreshed the session for per-request pages, and Server Actions can write.
 */
export async function createSessionClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    required(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ),
    {
      cookieOptions: authCookieOptions(siteUrl()),
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Called from a Server Component: proxy.ts refreshes the session instead.
          }
        },
      },
    },
  )
}
