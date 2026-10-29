import { describe, expect, it } from 'vitest'
import { authCookieOptions, isAuthCookie } from './cookies'

// Security framework control 09: Secure, HttpOnly, SameSite and the __Host- prefix.
describe('authCookieOptions', () => {
  it('uses a __Host- prefixed, HttpOnly, Secure, Lax cookie on HTTPS', () => {
    expect(authCookieOptions('https://academy.carbonoffroad.com.au')).toEqual({
      name: '__Host-sb-auth',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  })

  it('recognises every session cookie name, and nothing else', () => {
    for (const name of [
      '__Host-sb-auth',
      '__Host-sb-auth.0',
      '__Host-sb-auth.1',
      '__Host-sb-auth-code-verifier',
    ]) {
      expect(isAuthCookie(name, '__Host-sb-auth')).toBe(true)
    }
    expect(isAuthCookie('__Host-sb-authx', '__Host-sb-auth')).toBe(false)
    expect(isAuthCookie('analytics', '__Host-sb-auth')).toBe(false)
  })

  it('drops Secure and the prefix only for local http development', () => {
    expect(authCookieOptions('http://localhost:3000')).toMatchObject({
      name: 'sb-auth',
      httpOnly: true,
      secure: false,
    })
  })
})
