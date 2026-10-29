import 'server-only'
import { createPublicClient } from '@/lib/supabase/public'

export type StoreSummary = {
  storeName: string
  partnerName: string
  suburb: string | null
  state: string | null
}

/**
 * Active store for a join code (T-11). Never cached: codes are Confidential and cache
 * keys are stored in plain text (control 14).
 */
export async function lookupStore(code: string): Promise<StoreSummary | null> {
  const { data, error } = await createPublicClient().rpc('lookup_store', { p_code: code })
  if (error) throw new Error('Store lookup failed')
  const row = data?.[0]
  return row
    ? {
        storeName: row.store_name,
        partnerName: row.partner_name,
        suburb: row.suburb,
        state: row.state,
      }
    : null
}
