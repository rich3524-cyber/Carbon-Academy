import { describe, expect, it } from 'vitest'
import { certificationView } from './view'

// Dashboard copy for plan decisions 7, 8 and 14 (draft copy, awaiting Rich's approval).
const now = new Date('2026-10-30T00:00:00Z')
const certificate = {
  number: 'COA-2026-00001',
  checkCode: 'K7Q9',
  issuedAt: '2026-10-29T15:00:00Z',
  expiresAt: '2027-10-29T15:00:00Z',
  revokedAt: null,
}
const store = { name: 'Test Store Robina', certifiedStaff: 1, threshold: 2, isCertified: false }

describe('certificationView', () => {
  it('shows an active certificate with its PDF and verification links', () => {
    const view = certificationView({ certificate, store, renewalWindowDays: 30, now })
    expect(view.card).toEqual({
      number: 'COA-2026-00001',
      status: 'active',
      issued: '30 October 2026',
      expires: '30 October 2027',
      pdfPath: '/certificates/COA-2026-00001',
      verifyPath: '/verify/COA-2026-00001-K7Q9',
      notice: null,
    })
  })

  it('opens renewal 30 days before expiry', () => {
    const soon = { ...certificate, expiresAt: '2026-11-20T00:00:00Z' }
    expect(
      certificationView({ certificate: soon, store, renewalWindowDays: 30, now }).card?.notice,
    ).toBe('Your certificate expires on 20 November 2026. Pass every core lesson again to renew.')
  })

  it('says when a certificate has expired', () => {
    const old = { ...certificate, expiresAt: '2026-10-01T00:00:00Z' }
    const card = certificationView({ certificate: old, store, renewalWindowDays: 30, now }).card
    expect(card?.status).toBe('expired')
    expect(card?.notice).toBe('Expired on 1 October 2026. Pass every core lesson again to renew.')
  })

  it('hides the PDF of a revoked certificate', () => {
    const revoked = { ...certificate, revokedAt: '2026-10-29T00:00:00Z' }
    const card = certificationView({ certificate: revoked, store, renewalWindowDays: 30, now }).card
    expect(card?.status).toBe('revoked')
    expect(card?.pdfPath).toBeNull()
    expect(card?.notice).toBe('This certificate has been revoked.')
  })

  it('reports the store, certified or not', () => {
    expect(
      certificationView({ certificate: null, store, renewalWindowDays: 30, now }).storeLine,
    ).toBe('Test Store Robina: 1 of 2 certified staff needed to become a Carbon Certified Store.')
    const certified = { ...store, certifiedStaff: 2, isCertified: true }
    expect(
      certificationView({ certificate: null, store: certified, renewalWindowDays: 30, now })
        .storeLine,
    ).toBe('Test Store Robina is a Carbon Certified Store.')
  })

  it('tells customers how to become certified (D1)', () => {
    const view = certificationView({ certificate: null, store: null, renewalWindowDays: 30, now })
    expect(view.card).toBeNull()
    expect(view.storeLine).toBeNull()
    expect(view.customerNote).toBe('Join your store with a store code to become Carbon Certified.')
  })
})
