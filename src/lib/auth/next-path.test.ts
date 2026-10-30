import { describe, expect, it } from 'vitest'
import { safeNextPath } from './next-path'

const SITE = 'https://academy.carbonoffroad.com.au'

// T-13: the post-sign-in redirect never leaves the site and only goes to known pages.
describe('safeNextPath', () => {
  it.each([
    ['/dashboard', '/dashboard'],
    ['/join/TST-ROB-7K2Q9MXH', '/join/TST-ROB-7K2Q9MXH'],
    ['/lessons/winches/scout-pro-10k-v3', '/lessons/winches/scout-pro-10k-v3'],
    [`${SITE}/join/TST-ROB-7K2Q9MXH`, '/join/TST-ROB-7K2Q9MXH'],
    ['/dashboard?utm_source=x#top', '/dashboard'],
    ['/admin', '/admin'],
  ])('allows %s', (input, expected) => {
    expect(safeNextPath(input, SITE)).toBe(expected)
  })

  it.each([
    null,
    '',
    '//evil.example/dashboard',
    '/\\evil.example',
    'https://evil.example/dashboard',
    'javascript:alert(1)',
    'https://academy.carbonoffroad.com.au.evil.example/dashboard',
    '/auth/confirm',
    '/sign-in',
    '/join/../../etc',
    '/admin/learners',
    '/administrator',
  ])('falls back to /dashboard for %j', (input) => {
    expect(safeNextPath(input, SITE)).toBe('/dashboard')
  })
})
