import { required } from '@/lib/env'

/**
 * The site's own origin, from configuration. Email links and redirects are built from this,
 * never from the request's Host header, which an attacker controls (control 12).
 */
export function siteUrl(): string {
  const url = new URL(required(process.env.NEXT_PUBLIC_SITE_URL, 'NEXT_PUBLIC_SITE_URL'))
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an origin only, like https://example.com')
  }
  return url.origin
}
