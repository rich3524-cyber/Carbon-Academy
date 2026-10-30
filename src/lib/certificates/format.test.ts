import { describe, expect, it } from 'vitest'
import {
  CertificateNumber,
  VerifyCode,
  certificateFilename,
  certificateStatus,
  displayDate,
  isRenewalOpen,
} from './format'

describe('certificate formats', () => {
  it('accepts numbers and verify codes in the issued format only', () => {
    expect(CertificateNumber.safeParse('COA-2026-00001').success).toBe(true)
    expect(VerifyCode.parse('coa-2026-00001-k7q9')).toBe('COA-2026-00001-K7Q9')
    for (const bad of ['COA-2026-1', 'COA-2026-00001-K7Q', 'COA-2026-00001-K7QI', '../etc', ''])
      expect(VerifyCode.safeParse(bad).success).toBe(false)
  })

  it('formats dates in Brisbane time, as on the certificate', () => {
    expect(displayDate('2026-10-29T15:00:00Z')).toBe('30 October 2026')
  })

  it('names the download as BRAND.md p.50 says', () => {
    expect(certificateFilename('COA-2026-00001', '2026-10-29T15:00:00Z')).toBe(
      'CarbonOffroad_Certificate_COA-2026-00001_v1_20261030.pdf',
    )
  })

  it('works out status and the renewal window', () => {
    const now = new Date('2026-10-30T00:00:00Z')
    expect(certificateStatus({ expiresAt: '2027-01-01T00:00:00Z', revokedAt: null }, now)).toBe(
      'active',
    )
    expect(certificateStatus({ expiresAt: '2026-10-01T00:00:00Z', revokedAt: null }, now)).toBe(
      'expired',
    )
    expect(
      certificateStatus(
        { expiresAt: '2027-01-01T00:00:00Z', revokedAt: '2026-10-29T00:00:00Z' },
        now,
      ),
    ).toBe('revoked')
    expect(isRenewalOpen('2026-11-20T00:00:00Z', 30, now)).toBe(true)
    expect(isRenewalOpen('2027-01-20T00:00:00Z', 30, now)).toBe(false)
  })
})
