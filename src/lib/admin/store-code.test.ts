import { describe, expect, it } from 'vitest'
import { suggestLocation, suggestPrefix } from './store-code'

describe('suggestPrefix (decision 6)', () => {
  it.each([
    ['Super Retail Group', 'SRG'],
    ['BCF', 'BCF'],
    ['Opposite Lock', 'OL'],
    ['Autobarn', 'AUTOB'],
    ['A & B Tyres and Off Road', 'TAO'],
    ['', ''],
  ])('%s → %s', (name, prefix) => {
    expect(suggestPrefix(name)).toBe(prefix)
  })
})

describe('suggestLocation', () => {
  it('takes the first three letters', () => {
    expect(suggestLocation('Robina')).toBe('ROB')
    expect(suggestLocation('Burleigh Heads')).toBe('BUR')
    expect(suggestLocation('')).toBe('')
  })
})
