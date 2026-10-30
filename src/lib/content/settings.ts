import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { type ProgramSettings, toProgramSettings } from './program-settings'
import { CACHE_TAGS } from '@/lib/content/tags'

/** Public programme settings. Never store secrets in `settings` (it's publicly readable). */
export async function getProgramSettings(): Promise<ProgramSettings> {
  'use cache'
  cacheLife('minutes')
  cacheTag(CACHE_TAGS.settings)
  const { data, error } = await createPublicClient()
    .from('settings')
    .select('key, value')
    .in('key', [
      'warranty_registration_url',
      'certificate_validity_months',
      'store_certification_threshold',
    ])
  if (error) throw new Error(`Could not load settings: ${error.message}`)
  return toProgramSettings(data)
}
