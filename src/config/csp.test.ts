import { describe, expect, it } from 'vitest'
import { ACCOUNT_PATHS, isAccountPath, nonceCsp } from './csp'

describe('nonceCsp (control 11, Tier C authenticated areas)', () => {
  const csp = nonceCsp('abc123', false)

  it('allows scripts only by nonce, with strict-dynamic and no unsafe-inline', () => {
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'")
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/)
    expect(csp).not.toContain('unsafe-eval')
  })

  it('blocks framing, plugins, base-tag tricks and off-site form posts', () => {
    for (const directive of [
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-src 'none'",
    ]) {
      expect(csp).toContain(directive)
    }
  })

  it('allows the Vimeo player frame only when asked (admin lesson pages)', () => {
    expect(nonceCsp('n', false, { vimeo: true })).toContain('frame-src https://player.vimeo.com;')
    expect(nonceCsp('n', false, { vimeo: false })).toContain("frame-src 'none'")
  })

  it('adds unsafe-eval in development only (React debugging)', () => {
    expect(nonceCsp('n', true)).toContain("'unsafe-eval'")
  })
})

describe('isAccountPath', () => {
  it.each([
    '/dashboard',
    '/sign-in',
    '/join',
    '/join/TST-ROB-7K2Q9MXH',
    '/auth/confirm',
    '/admin',
    '/admin/learners/x',
  ])('includes %s', (path) => {
    expect(isAccountPath(path)).toBe(true)
  })
  it.each([
    '/',
    '/lessons',
    '/lessons/winches',
    '/certified',
    '/go/x',
    '/joiner',
    '/sign-in-help',
    '/administrator',
  ])('excludes %s', (path) => {
    expect(isAccountPath(path)).toBe(false)
  })
  it('matches the proxy matcher list', () => {
    expect(ACCOUNT_PATHS).toEqual(['/dashboard', '/sign-in', '/join', '/auth', '/admin'])
  })
})
