import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Container } from '@/components/ui/Container'
import { type Verification, verifyCertificate } from '@/lib/certificates/data'
import { displayDate } from '@/lib/certificates/format'
import { logSecurityEvent } from '@/lib/log'

// Public certificate check (PRD 5.4). Needs the number and its check code (plan decision 5,
// T-39), shows six fields only (T-40) and is never indexed or cached: status changes with time.
export const metadata: Metadata = {
  title: 'Certificate check',
  robots: { index: false, follow: false },
}

const STATUS: Record<
  Verification['status'],
  { label: string; tone: 'accent' | 'neutral' | 'dark' }
> = {
  active: { label: 'Active', tone: 'accent' },
  expired: { label: 'Expired', tone: 'neutral' },
  revoked: { label: 'Revoked', tone: 'dark' },
}

export default function VerifyPage(props: PageProps<'/verify/[code]'>) {
  return (
    <Container className="max-w-2xl py-10 md:py-14">
      <h1 className="text-h1 md:text-h1-lg">Certificate check</h1>
      <Suspense fallback={<p className="mt-6">Checking the certificate…</p>}>
        <Result params={props.params} />
      </Suspense>
    </Container>
  )
}

async function Result({ params }: Pick<PageProps<'/verify/[code]'>, 'params'>) {
  await connection()
  const { code } = await params
  const result = await verifyCertificate(decodeURIComponent(code))
  if (!result) {
    // Never echo the code: it is attacker-controlled input (control 15).
    logSecurityEvent('verify_not_found')
    return (
      <p className="mt-6">
        {/* Draft copy, awaiting Rich's approval (brand p.69). */}
        We couldn&apos;t find that certificate. Check the code printed on the certificate and try
        again.
      </p>
    )
  }
  const status = STATUS[result.status]
  return (
    <section aria-label="Certificate details" className="mt-6 rounded-card bg-white p-6 md:p-8">
      <p className="text-h2 font-extrabold uppercase">
        {result.firstName} {result.lastInitial}.
      </p>
      <p className="mt-2">{result.storeName}</p>
      <p className="mt-4">
        <Badge tone={status.tone}>{status.label}</Badge>
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-small">Issued</dt>
          <dd className="font-bold">{displayDate(result.issuedAt)}</dd>
        </div>
        <div>
          <dt className="text-small">Expires</dt>
          <dd className="font-bold">{displayDate(result.expiresAt)}</dd>
        </div>
      </dl>
      <p className="mt-6 text-small">
        Carbon Certified staff have passed every core lesson in the Carbon Offroad Academy.
      </p>
    </section>
  )
}
