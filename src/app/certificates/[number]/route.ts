import { buildCertificatePdf } from '@/lib/certificates/pdf'
import { CertificateNumber, certificateFilename } from '@/lib/certificates/format'
import { logSecurityEvent } from '@/lib/log'
import { siteUrl } from '@/lib/site'
import { createSessionClient } from '@/lib/supabase/server'

// A public endpoint like any Route Handler: it authenticates itself, and RLS returns only the
// learner's own certificate (control 04, T-41). Every refusal is the same 404.
const notFound = () =>
  new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

export async function GET(_request: Request, ctx: RouteContext<'/certificates/[number]'>) {
  const { number } = await ctx.params
  if (!CertificateNumber.safeParse(number).success) return notFound()
  const supabase = await createSessionClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims.sub
  if (!userId) {
    logSecurityEvent('certificate_pdf_denied', { code: 'signed_out' })
    return notFound()
  }
  const { data } = await supabase
    .from('certificates')
    .select(
      'certificate_number, check_code, first_name, last_name, store_name_at_issue, issued_at, expires_at, revoked_at',
    )
    .eq('certificate_number', number)
    .maybeSingle()
  if (!data || data.revoked_at) {
    logSecurityEvent('certificate_pdf_denied', { userId, code: data ? 'revoked' : 'not_found' })
    return notFound()
  }
  const bytes = await buildCertificatePdf({
    certificateNumber: data.certificate_number,
    checkCode: data.check_code,
    firstName: data.first_name,
    lastName: data.last_name,
    storeName: data.store_name_at_issue,
    issuedAt: data.issued_at,
    expiresAt: data.expires_at,
    verifyUrl: `${siteUrl()}/verify/${data.certificate_number}-${data.check_code}`,
  })
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${certificateFilename(data.certificate_number, data.issued_at)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
