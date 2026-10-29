import { describe, expect, it } from 'vitest'
import { WARRANTY_HOSTS, isVimeoId, safeHttpsUrl } from './urls'

describe('safeHttpsUrl', () => {
  it('accepts https URLs on an allowed host', () => {
    expect(safeHttpsUrl('https://carbonoffroad.com.au/pages/warranty', WARRANTY_HOSTS)).toBe(
      'https://carbonoffroad.com.au/pages/warranty',
    )
  })

  it.each([
    ['javascript:alert(1)'],
    ['http://carbonoffroad.com.au/pages/warranty'],
    ['https://carbonoffroad.com.au.evil.example/warranty'],
    ['https://evil.example/https://carbonoffroad.com.au'],
    ['https://user:pass@carbonoffroad.com.au/warranty'],
    ['not a url'],
    [''],
  ])('rejects %s', (value) => {
    expect(safeHttpsUrl(value, WARRANTY_HOSTS)).toBeNull()
  })

  it('rejects non-strings and very long values', () => {
    expect(safeHttpsUrl(null, WARRANTY_HOSTS)).toBeNull()
    expect(safeHttpsUrl(42, WARRANTY_HOSTS)).toBeNull()
    expect(
      safeHttpsUrl(`https://carbonoffroad.com.au/${'a'.repeat(600)}`, WARRANTY_HOSTS),
    ).toBeNull()
  })
})

describe('isVimeoId', () => {
  it('accepts numeric Vimeo IDs', () => {
    expect(isVimeoId('76979871')).toBe(true)
  })

  it.each([['abc'], ['123'], ['76979871?h=abc'], ['../../x'], [null], [76979871]])(
    'rejects %s',
    (value) => {
      expect(isVimeoId(value)).toBe(false)
    },
  )
})
