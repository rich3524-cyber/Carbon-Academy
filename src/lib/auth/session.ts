import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createSessionClient } from '@/lib/supabase/server'

/** The minimal signed-in user DTO. Pages and actions get this, never the raw session. */
export type CurrentUser = { id: string; firstName: string; email: string; storeName: string | null }

/**
 * Data access layer (security framework section 4). getUser() asks Supabase Auth, so a
 * revoked session is refused straight away (control 09). Deactivated learners count as
 * signed out. Per-request memoised with React cache; never 'use cache' (control 14).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSessionClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, active, stores(name)')
    .eq('id', data.user.id)
    .maybeSingle()
  if (!profile?.active) return null
  return {
    id: data.user.id,
    firstName: profile.first_name,
    email: data.user.email ?? '',
    storeName: profile.stores?.name ?? null,
  }
})

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')
  return user
}
