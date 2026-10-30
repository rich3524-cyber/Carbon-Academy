import 'server-only'
import { cacheLife } from 'next/cache'
import { requireUser } from '@/lib/auth/session'
import { createPublicClient } from '@/lib/supabase/public'
import { createSessionClient } from '@/lib/supabase/server'
import { VerifyCode } from './format'
import { type CertificationView, certificationView } from './view'

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

/**
 * The signed-in learner's latest certificate and their store's status, for the dashboard.
 * Own rows only (RLS) and never cached (control 14).
 */
export async function getMyCertification(): Promise<CertificationView> {
  await requireUser()
  const supabase = await createSessionClient()
  const [latest, store, setting] = await Promise.all([
    supabase
      .from('certificates')
      .select('certificate_number, check_code, issued_at, expires_at, revoked_at')
      .order('issued_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc('my_store_status').maybeSingle(),
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'certificate_renewal_window_days')
      .maybeSingle(),
  ])
  if (latest.error || store.error) throw new Error('Could not load certification')
  const c = latest.data
  const s = store.data
  const windowDays = typeof setting.data?.value === 'number' ? setting.data.value : 30
  return certificationView({
    certificate: c
      ? {
          number: c.certificate_number,
          checkCode: c.check_code,
          issuedAt: c.issued_at,
          expiresAt: c.expires_at,
          revokedAt: c.revoked_at,
        }
      : null,
    store: s
      ? {
          name: s.store_name,
          certifiedStaff: s.active_certified_staff,
          threshold: s.threshold,
          isCertified: s.is_certified,
        }
      : null,
    renewalWindowDays: windowDays,
  })
}
