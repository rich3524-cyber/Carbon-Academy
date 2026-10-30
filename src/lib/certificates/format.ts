import { z } from 'zod'

/** Certificate numbers and verification codes (plan decision 5). Crockford letters only. */
export const CertificateNumber = z.string().regex(/^COA-\d{4}-\d{5}$/)
export const VerifyCode = z
  .string()
  .max(19)
  .transform((s) => s.toUpperCase())
  .pipe(z.string().regex(/^COA-\d{4}-\d{5}-[0-9A-HJKMNP-TV-Z]{4}$/))

const TZ = 'Australia/Brisbane'

/** "30 October 2026" (BRAND.md dates, p.16), in Brisbane time. */
export function displayDate(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TZ,
  }).format(new Date(iso))
}

/** CarbonOffroad_Certificate_[Number]_v1_[YYYYMMDD].pdf (BRAND.md p.50). */
export function certificateFilename(number: string, issuedAt: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TZ,
  }).format(new Date(issuedAt))
  return `CarbonOffroad_Certificate_${number}_v1_${parts.replaceAll('-', '')}.pdf`
}

export type CertificateStatus = 'active' | 'expired' | 'revoked'

export function certificateStatus(
  c: { expiresAt: string; revokedAt: string | null },
  now = new Date(),
): CertificateStatus {
  if (c.revokedAt) return 'revoked'
  return new Date(c.expiresAt) > now ? 'active' : 'expired'
}

/** Renewal opens `windowDays` before expiry (plan decision 8). */
export function isRenewalOpen(expiresAt: string, windowDays: number, now = new Date()): boolean {
  return new Date(expiresAt).getTime() - windowDays * 86_400_000 <= now.getTime()
}
