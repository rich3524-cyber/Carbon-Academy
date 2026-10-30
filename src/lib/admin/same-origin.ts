/**
 * CSRF check for cookie-authenticated Route Handlers that change or export data (control 08,
 * T-54). Browsers send Sec-Fetch-Site on every request (OWASP Fetch Metadata defence); only
 * 'same-origin' passes. Without it, the Origin header's host must equal the request's host,
 * as Next.js does for Server Actions. Never compared with NEXT_PUBLIC_SITE_URL, which is the
 * production address on deploy previews.
 */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site')
  if (site) return site === 'same-origin'
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
