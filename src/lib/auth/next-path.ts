/** Pages a sign-in link may land on. Anything else goes to the dashboard (T-13). */
const ALLOWED = [
  /^\/dashboard$/,
  /^\/join\/[A-Z]{2,5}-[A-Z]{2,5}-[0-9A-HJKMNP-TV-Z]{8}$/,
  /^\/lessons(\/[a-z0-9-]+){0,2}$/,
  // Phase 6: admins sign in with the same link. Non-admins get a 404 there (requireAdmin).
  /^\/admin$/,
]

export function safeNextPath(next: string | null | undefined, site: string): string {
  if (!next) return '/dashboard'
  let url: URL
  try {
    url = new URL(next, site)
  } catch {
    return '/dashboard'
  }
  if (url.origin !== new URL(site).origin) return '/dashboard'
  return ALLOWED.some((pattern) => pattern.test(url.pathname)) ? url.pathname : '/dashboard'
}
