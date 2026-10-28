import { describe, expect, it } from 'vitest'
import { toProgramSettings } from './program-settings'

describe('toProgramSettings', () => {
  it('maps settings rows and validates the warranty URL', () => {
    expect(
      toProgramSettings([
        { key: 'warranty_registration_url', value: 'https://carbonoffroad.com.au/pages/warranty' },
        { key: 'certificate_validity_months', value: 12 },
        { key: 'store_certification_threshold', value: 2 },
      ]),
    ).toEqual({
      warrantyUrl: 'https://carbonoffroad.com.au/pages/warranty',
      certificateValidityMonths: 12,
      storeThreshold: 2,
    })
  })

  it('drops an unsafe warranty URL and falls back to PRD defaults', () => {
    expect(
      toProgramSettings([{ key: 'warranty_registration_url', value: 'javascript:alert(1)' }]),
    ).toEqual({ warrantyUrl: null, certificateValidityMonths: 12, storeThreshold: 2 })
  })
})
