/**
 * Nonce-based CSP for account pages (security framework control 11: Tier C and authenticated
 * areas). Sent as Report-Only in Phase 3, enforced at the Phase 7 gate (decision 10).
 * Styles keep 'unsafe-inline' for React style attributes, as on public pages.
 */
export function nonceCsp(nonce: string, dev: boolean): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...(dev ? ['ws:'] : [])],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  }
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ')
}

/** Path prefixes rendered per request with the nonce CSP and no-store. Keep in sync with proxy.ts. */
export const ACCOUNT_PATHS = ['/dashboard', '/sign-in', '/join', '/auth']

export function isAccountPath(pathname: string): boolean {
  return ACCOUNT_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
