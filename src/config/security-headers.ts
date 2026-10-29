/**
 * Baseline browser security headers (ITWM framework control 11, section 4).
 * Public pages use an allowlist CSP in Report-Only mode. Account pages get a nonce-based
 * CSP from proxy.ts (src/config/csp.ts). X-Frame-Options enforces the framing block while the
 * CSP is report-only.
 */
export function contentSecurityPolicy(dev: boolean): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...(dev ? ['ws:'] : [])],
    // Lesson videos only (BUILD_PLAN Phase 2, tag inventory). No other third-party frames.
    'frame-src': ['https://player.vimeo.com'],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  }
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ')
}

/**
 * Public pages get the allowlist CSP from next.config.ts. Account pages are excluded because
 * proxy.ts gives them a per-request nonce CSP instead (Phase 3 Task 7).
 */
export const publicHeaderSource = '/((?!dashboard|sign-in|join|auth).*)'

export function securityHeaders(dev: boolean) {
  return [
    { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy(dev) },
    { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    },
  ]
}
