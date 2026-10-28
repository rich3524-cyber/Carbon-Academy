import { type NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { QrSlug } from '@/lib/validation/slug'
import { pickUtm } from '@/lib/validation/utm'

/**
 * QR short link: log the scan, keep known UTMs, redirect to the lesson (PRD 5.1).
 * A public endpoint, so it validates everything itself (security framework controls 05, 12).
 * The target is built only from database slugs on our own origin: never an open redirect.
 */
export async function GET(request: NextRequest, ctx: RouteContext<'/go/[slug]'>) {
  const fallback = new URL('/lessons', request.url)
  const slug = QrSlug.safeParse((await ctx.params).slug)
  if (!slug.success) return redirect(fallback)

  const utm = pickUtm(request.nextUrl.searchParams)
  const { data, error } = await createPublicClient()
    .rpc('log_qr_scan', {
      p_slug: slug.data,
      p_utm_source: utm.utm_source,
      p_utm_medium: utm.utm_medium,
      p_utm_campaign: utm.utm_campaign,
    })
    .maybeSingle()
  if (error || !data) return redirect(fallback)

  const target = new URL(`/lessons/${data.category_slug}/${data.lesson_slug}`, request.url)
  for (const [key, value] of Object.entries(utm)) target.searchParams.set(key, value)
  return redirect(target)
}

/** Never cache a redirect that records a scan (control 14). */
function redirect(url: URL) {
  const response = NextResponse.redirect(url, 302)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
