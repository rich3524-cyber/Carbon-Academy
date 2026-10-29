import { afterEach, describe, expect, it, vi } from 'vitest'
import { siteUrl } from './site'

afterEach(() => vi.unstubAllEnvs())

describe('siteUrl', () => {
  it('returns the configured origin without a trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://academy.carbonoffroad.com.au/')
    expect(siteUrl()).toBe('https://academy.carbonoffroad.com.au')
  })

  it('refuses a value with a path, so links are never built from a bad setting', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com/evil')
    expect(() => siteUrl()).toThrow()
  })
})
