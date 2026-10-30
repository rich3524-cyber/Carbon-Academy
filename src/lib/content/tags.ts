/**
 * Cache tags for the shared 'use cache' reads. Admin Server Actions call updateTag() with these
 * after a change, so edits show straight away instead of after cacheLife (Phase 6 decision 8).
 */
export const CACHE_TAGS = {
  content: 'content',
  settings: 'settings',
  certifiedStores: 'certified-stores',
} as const
