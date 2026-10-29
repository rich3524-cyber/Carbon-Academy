/**
 * Session cookie attributes (security framework control 09). There is no browser Supabase
 * client, so the cookie can be HttpOnly. __Host- needs Secure, so plain-http local
 * development uses an unprefixed name.
 */
export function authCookieOptions(site: string) {
  const secure = site.startsWith('https://')
  return {
    name: secure ? '__Host-sb-auth' : 'sb-auth',
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    // Matches the 30-day absolute session limit (decision 3). @supabase/ssr defaults to 400 days
    // (review finding L8).
    maxAge: 60 * 60 * 24 * 30,
  }
}

/** Every cookie name @supabase/ssr may use for the session: base, chunks (.0, .1…), PKCE verifier. */
export function isAuthCookie(cookieName: string, baseName: string): boolean {
  return (
    cookieName === baseName ||
    cookieName.startsWith(`${baseName}.`) ||
    cookieName.startsWith(`${baseName}-`)
  )
}
