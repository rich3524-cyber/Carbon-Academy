import 'server-only'
import { cacheLife } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { VerifyCode } from './format'

export type Verification = {
  firstName: string
  lastInitial: string
  storeName: string
  status: 'active' | 'expired' | 'revoked'
  issuedAt: string
  expiresAt: string
}

/** Per request, never cached: status changes with time (decision 6). */
export async function verifyCertificate(code: string): Promise<Verification | null> {
  const parsed = VerifyCode.safeParse(code)
  if (!parsed.success) return null
  const { data } = await createPublicClient()
    .rpc('verify_certificate', { p_code: parsed.data })
    .maybeSingle()
  if (!data) return null
  return {
    firstName: data.first_name,
    lastInitial: data.last_initial,
    storeName: data.store_name,
    status: data.status as Verification['status'],
    issuedAt: data.issued_at,
    expiresAt: data.expires_at,
  }
}

export type CertifiedStore = {
  name: string
  suburb: string | null
  state: string | null
  country: string
}

/** Public business data, safe in the shared cache for an hour (control 14, decision 12). */
export async function getCertifiedStores(): Promise<CertifiedStore[]> {
  'use cache'
  cacheLife('hours')
  const { data, error } = await createPublicClient().rpc('certified_stores')
  if (error) throw new Error('Could not load certified stores')
  return (data ?? []).map((s) => ({
    name: s.name,
    suburb: s.suburb,
    state: s.state,
    country: s.country,
  }))
}
