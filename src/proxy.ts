// Phase 3 Task 2 spike version (replaced in Task 7)
import { type NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'none'`
  const headers = new Headers(request.headers)
  headers.set('content-security-policy-report-only', csp)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy-Report-Only', csp)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = { matcher: ['/spike'] }
