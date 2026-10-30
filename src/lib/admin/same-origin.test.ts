import { describe, expect, it } from 'vitest'
import { isSameOrigin } from './same-origin'

const request = (headers: Record<string, string>) =>
  new Request('https://deploy-preview-25--site.netlify.app/admin/reports/audit/export', {
    method: 'POST',
    headers,
  })

describe('isSameOrigin (control 08, T-54)', () => {
  it('trusts the browser: only Sec-Fetch-Site same-origin passes', () => {
    expect(isSameOrigin(request({ 'sec-fetch-site': 'same-origin' }))).toBe(true)
    for (const site of ['cross-site', 'same-site', 'none']) {
      expect(isSameOrigin(request({ 'sec-fetch-site': site, origin: 'https://evil.test' }))).toBe(
        false,
      )
    }
  })

  it('falls back to Origin against the request host, whatever the site URL setting says', () => {
    const host = 'deploy-preview-25--site.netlify.app'
    expect(isSameOrigin(request({ origin: `https://${host}`, host }))).toBe(true)
    expect(
      isSameOrigin(
        request({ origin: `https://${host}`, 'x-forwarded-host': host, host: 'internal' }),
      ),
    ).toBe(true)
    expect(isSameOrigin(request({ origin: 'https://evil.test', host }))).toBe(false)
    expect(isSameOrigin(request({ host }))).toBe(false)
    expect(isSameOrigin(request({ origin: 'not a url', host }))).toBe(false)
  })
})
