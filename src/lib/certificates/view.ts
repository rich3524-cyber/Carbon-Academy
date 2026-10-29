import { type CertificateStatus, certificateStatus, displayDate, isRenewalOpen } from './format'

// What the dashboard says about certification (plan decisions 7, 8 and 14). Pure, so every case
// is unit tested. Copy is a draft, awaiting Rich's approval (brand p.69).

export type CertificateRow = {
  number: string
  checkCode: string
  issuedAt: string
  expiresAt: string
  revokedAt: string | null
}
export type StoreRow = {
  name: string
  certifiedStaff: number
  threshold: number
  isCertified: boolean
}

export type CertificateCardView = {
  number: string
  status: CertificateStatus
  issued: string
  expires: string
  pdfPath: string | null
  verifyPath: string
  notice: string | null
}

export type CertificationView = {
  card: CertificateCardView | null
  storeLine: string | null
  customerNote: string | null
}

export function certificationView(input: {
  certificate: CertificateRow | null
  store: StoreRow | null
  renewalWindowDays: number
  now?: Date
}): CertificationView {
  const { certificate: c, store, renewalWindowDays, now = new Date() } = input
  let card: CertificateCardView | null = null
  if (c) {
    const status = certificateStatus({ expiresAt: c.expiresAt, revokedAt: c.revokedAt }, now)
    const expires = displayDate(c.expiresAt)
    const notice =
      status === 'revoked'
        ? 'This certificate has been revoked.'
        : status === 'expired'
          ? `Expired on ${expires}. Pass every core lesson again to renew.`
          : isRenewalOpen(c.expiresAt, renewalWindowDays, now)
            ? `Your certificate expires on ${expires}. Pass every core lesson again to renew.`
            : null
    card = {
      number: c.number,
      status,
      issued: displayDate(c.issuedAt),
      expires,
      pdfPath: status === 'revoked' ? null : `/certificates/${c.number}`,
      verifyPath: `/verify/${c.number}-${c.checkCode}`,
      notice,
    }
  }
  const storeLine = store
    ? store.isCertified
      ? `${store.name} is a Carbon Certified Store.`
      : `${store.name}: ${store.certifiedStaff} of ${store.threshold} certified staff needed to become a Carbon Certified Store.`
    : null
  return {
    card,
    storeLine,
    customerNote: store ? null : 'Join your store with a store code to become Carbon Certified.',
  }
}
