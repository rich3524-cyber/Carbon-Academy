import { Badge } from '@/components/ui/Badge'
import { buttonClasses } from '@/components/ui/Button'
import type { CertificateCardView } from '@/lib/certificates/view'

const STATUS = {
  active: { label: 'Active', tone: 'accent' },
  expired: { label: 'Expired', tone: 'neutral' },
  revoked: { label: 'Revoked', tone: 'dark' },
} as const

/** The learner's certificate on the dashboard (plan decision 14). */
export function CertificateCard({ card }: { card: CertificateCardView }) {
  const status = STATUS[card.status]
  return (
    <section aria-labelledby="certificate" className="mt-10 rounded-card bg-white p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="certificate" className="text-h2">
          Your certificate
        </h2>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p className="mt-2 text-small">{card.number}</p>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:max-w-md">
        <div>
          <dt className="text-small">Issued</dt>
          <dd className="font-bold">{card.issued}</dd>
        </div>
        <div>
          <dt className="text-small">Expires</dt>
          <dd className="font-bold">{card.expires}</dd>
        </div>
      </dl>
      {card.notice && <p className="mt-4">{card.notice}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {card.pdfPath && (
          // A plain link, not next/link: the PDF is a download from a Route Handler.
          <a className={buttonClasses()} href={card.pdfPath} download>
            Download PDF
          </a>
        )}
        <a className="link" href={card.verifyPath}>
          Verification link
        </a>
      </div>
    </section>
  )
}
