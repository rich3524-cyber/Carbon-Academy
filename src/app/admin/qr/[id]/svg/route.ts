import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/access'
import { readAdmin } from '@/lib/admin/call'
import { qrFilename } from '@/lib/admin/files'
import { qrSvg, qrUrl, UtmValue } from '@/lib/admin/qr'
import { siteUrl } from '@/lib/site'

const Query = z.object({ source: UtmValue, campaign: UtmValue })

/** The QR code for a short link, as an SVG file (decision 10). Admins only. */
export async function GET(request: Request, { params }: RouteContext<'/admin/qr/[id]/svg'>) {
  await connection()
  await requireAdmin()
  const id = z.uuid().safeParse((await params).id)
  const query = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!id.success) notFound()
  if (!query.success) {
    return new Response('UTM source and campaign: lower case letters, numbers and hyphens.', {
      status: 400,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }
  const link = (await readAdmin('admin_list_qr_links', {})).find((l) => l.id === id.data)
  if (!link) notFound()

  const svg = qrSvg(qrUrl(siteUrl(), link.slug, query.data.source, query.data.campaign))
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${qrFilename(link.slug)}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
