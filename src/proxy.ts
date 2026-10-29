import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { nonceCsp } from '@/config/csp'
import { authCookieOptions } from '@/lib/supabase/cookies'

// Header Next.js reads to find the nonce (confirmed by the Task 2 spike).
const CSP_REQUEST_HEADER = 'content-security-policy-report-only'

/**
 * Account pages, plus Server Action posts to lesson pages (matcher below):
 * 1. Refresh the Supabase session so Server Components see a valid token. They can't
 *    write cookies themselves (control 09).
 * 2. Add a per-request nonce CSP (control 11).
 * 3. Mark the response private and uncacheable (control 14, T-18).
 * This is a convenience layer, never the access check: pages and actions call
 * requireUser() themselves (control 04).
 */
export async function proxy(request: NextRequest) {
  // Server Action posts to lesson pages: refresh the session and mark no-store, but skip the CSP
  // (the response isn't HTML, and the public CSP already covers lesson pages).
  const isAction = request.headers.has('next-action')
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = nonceCsp(nonce, process.env.NODE_ENV === 'development')
  const requestHeaders = new Headers(request.headers)
  if (!isAction) requestHeaders.set(CSP_REQUEST_HEADER, csp)

  let response = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: authCookieOptions(process.env.NEXT_PUBLIC_SITE_URL!),
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
          requestHeaders.set('cookie', request.cookies.toString())
          response = NextResponse.next({ request: { headers: requestHeaders } })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )
  // Refreshes an expired access token. Don't add code between client creation and this call.
  await supabase.auth.getClaims()

  if (!isAction) response.headers.set('Content-Security-Policy-Report-Only', csp)
  response.headers.set('Cache-Control', 'private, no-store')
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    // T-12: the token hash in this URL must never leak in a Referer header.
    response.headers.set('Referrer-Policy', 'no-referrer')
  }
  return response
}

export const config = {
  matcher: [
    // Account pages. Keep in sync with ACCOUNT_PATHS in src/config/csp.ts (tested in Task 18).
    '/dashboard/:path*',
    '/sign-in',
    '/join',
    '/join/:path*',
    '/auth/:path*',
    // Progress Server Actions POST to lesson pages. Running the proxy for those requests only
    // gives them a managed session refresh and no-store, and leaves the static lesson pages
    // alone (review finding L7, T-18).
    { source: '/lessons/:path*', has: [{ type: 'header', key: 'next-action' }] },
  ],
}
