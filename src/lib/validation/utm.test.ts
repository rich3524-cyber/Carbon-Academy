import { describe, expect, it } from 'vitest'
import { pickUtm } from './utm'

const params = (query: string) => new URLSearchParams(query)

describe('pickUtm', () => {
  it('keeps the known UTM keys', () => {
    expect(
      pickUtm(
        params(
          'utm_source=packaging&utm_medium=qr&utm_campaign=scout-pro&utm_content=box&utm_term=winch',
        ),
      ),
    ).toEqual({
      utm_source: 'packaging',
      utm_medium: 'qr',
      utm_campaign: 'scout-pro',
      utm_content: 'box',
      utm_term: 'winch',
    })
  })

  it('drops unknown keys, including tracking IDs and personal data', () => {
    expect(pickUtm(params('utm_source=packaging&gclid=abc&email=a@b.com&fbclid=x'))).toEqual({
      utm_source: 'packaging',
    })
  })

  it('drops values with unexpected characters or over 100 characters', () => {
    expect(
      pickUtm(params(`utm_source=<script>&utm_medium=${'a'.repeat(101)}&utm_campaign=ok`)),
    ).toEqual({ utm_campaign: 'ok' })
  })

  it('trims whitespace and ignores empty values', () => {
    expect(pickUtm(params('utm_source=%20packaging%20&utm_medium='))).toEqual({
      utm_source: 'packaging',
    })
  })
})
