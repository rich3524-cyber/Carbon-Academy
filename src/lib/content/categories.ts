import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { type CategorySummary, toCategorySummaries } from './category-summary'
import { CACHE_TAGS } from '@/lib/content/tags'

/**
 * Categories in display order, with counts of published lessons only (RLS).
 * Public content only, so it's safe in the shared 'use cache' scope (control 14).
 */
export async function getCategorySummaries(): Promise<CategorySummary[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag(CACHE_TAGS.content)
  const { data, error } = await createPublicClient()
    .from('categories')
    .select('slug, name, lessons(count)')
    .order('sort_order')
  if (error) throw new Error(`Could not load categories: ${error.message}`)
  return toCategorySummaries(data)
}
