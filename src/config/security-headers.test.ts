import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, securityHeaders } from './security-headers'

const header = (name: string, dev = false) =>
  securityHeaders(dev).find((h) => h.key === name)?.value

describe('securityHeaders (control 11)', () => {
  it('sets every baseline header', () => {
    expect(securityHeaders(false).map((h) => h.key)).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy-Report-Only',
        'Strict-Transport-Security',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'X-Frame-Options',
        'Permissions-Policy',
      ]),
    )
  })

  it('uses the framework values', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff')
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(header('X-Frame-Options')).toBe('DENY')
  })

  it('applies HSTS without includeSubDomains until the domain is confirmed (control 01)', () => {
    expect(header('Strict-Transport-Security')).toBe('max-age=31536000')
  })
})

describe('contentSecurityPolicy', () => {
  it('locks down objects, base URI, forms and framing', () => {
    const csp = contentSecurityPolicy(false)
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("default-src 'self'")
  })

  it('allows frames from the Vimeo player only', () => {
    const csp = contentSecurityPolicy(false)
    expect(csp).toContain('frame-src https://player.vimeo.com;')
    expect(csp).not.toContain("frame-src 'none'")
  })

  it("never allows 'unsafe-eval' in production", () => {
    expect(contentSecurityPolicy(false)).not.toContain('unsafe-eval')
  })

  it("allows 'unsafe-eval' only in development, for fast refresh", () => {
    expect(contentSecurityPolicy(true)).toContain("'unsafe-eval'")
  })
})
