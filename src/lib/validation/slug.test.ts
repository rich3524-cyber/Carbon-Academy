import { describe, expect, it } from 'vitest'
import { QrSlug } from './slug'

describe('QrSlug', () => {
  it('accepts lowercase kebab-case slugs', () => {
    expect(QrSlug.safeParse('scout-pro-10k-v3').success).toBe(true)
  })

  it.each([
    ['Scout-Pro'],
    ['scout pro'],
    ['../etc'],
    ["x';drop table qr_links;--"],
    ['-x'],
    ['a'.repeat(81)],
    [''],
  ])('rejects %s', (value) => {
    expect(QrSlug.safeParse(value).success).toBe(false)
  })
})
