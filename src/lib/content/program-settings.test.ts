import { describe, expect, it } from 'vitest'
import { toProgramSettings } from './program-settings'

const HEAD_OFFICE = 'Unit 1a, 1 Waterway Drive, Coomera QLD 4209'

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
      companyAddress: HEAD_OFFICE,
    })
  })

  it('reads the company address for email footers (BRAND.md Email)', () => {
    expect(
      toProgramSettings([{ key: 'company_address', value: '11 Blanck Street, Ormeau QLD 4208' }])
        .companyAddress,
    ).toBe('11 Blanck Street, Ormeau QLD 4208')
  })

  it('drops an unsafe warranty URL and falls back to PRD defaults', () => {
    expect(
      toProgramSettings([{ key: 'warranty_registration_url', value: 'javascript:alert(1)' }]),
    ).toEqual({
      warrantyUrl: null,
      certificateValidityMonths: 12,
      storeThreshold: 2,
      companyAddress: HEAD_OFFICE,
    })
  })
})
