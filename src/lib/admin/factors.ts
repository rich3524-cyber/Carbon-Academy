import 'server-only'
import { createSessionClient } from '@/lib/supabase/server'

export type Factor = { id: string; name: string; createdAt: string; verified: boolean }

/** The signed-in admin's own TOTP factors. Only IDs, names and dates leave this module. */
export async function getMyFactors(): Promise<Factor[]> {
  const supabase = await createSessionClient()
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw new Error('Could not list MFA factors')
  return data.all
    .filter((factor) => factor.factor_type === 'totp')
    .map((factor) => ({
      id: factor.id,
      name: factor.friendly_name || 'Authenticator',
      createdAt: factor.created_at,
      verified: factor.status === 'verified',
    }))
}

/** The first free name, since Supabase needs a unique name per factor. */
export function nextFactorName(taken: string[]): string {
  for (const name of ['Authenticator', 'Backup authenticator']) {
    if (!taken.includes(name)) return name
  }
  let n = 3
  while (taken.includes(`Authenticator ${n}`)) n++
  return `Authenticator ${n}`
}
