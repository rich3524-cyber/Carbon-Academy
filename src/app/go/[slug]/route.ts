import { type NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { QrSlug } from '@/lib/validation/slug'
import { pickUtm } from '@/lib/validation/utm'

/**
 * QR short link: log the scan, keep known UTMs, redirect to the lesson (PRD 5.1).
 * A public endpoint, so it validates everything itself (security framework controls 05, 12).
 * The target is a relative path built only from database slugs: never an open redirect.
 */
export async function GET(request: NextRequest, ctx: RouteContext<'/go/[slug]'>) {
  const slug = QrSlug.safeParse((await ctx.params).slug)
  if (!slug.success) return redirect('/lessons')

  const utm = pickUtm(request.nextUrl.searchParams)
  const { data, error } = await createPublicClient()
    .rpc('log_qr_scan', {
      p_slug: slug.data,
      p_utm_source: utm.utm_source,
      p_utm_medium: utm.utm_medium,
      p_utm_campaign: utm.utm_campaign,
    })
    .maybeSingle()
  if (error || !data) return redirect('/lessons')

  const query = new URLSearchParams(utm).toString()
  const path = `/lessons/${data.category_slug}/${data.lesson_slug}`
  return redirect(query ? `${path}?${query}` : path)
}

/**
 * Relative Location: on Netlify, request.url is the deploy's own address, so an absolute
 * redirect would send visitors to a pinned deploy instead of the public site (29 Oct 2026).
 * Never cache a redirect that records a scan (control 14).
 */
function redirect(path: string) {
  return new NextResponse(null, {
    status: 302,
    headers: { Location: path, 'Cache-Control': 'no-store' },
  })
}
