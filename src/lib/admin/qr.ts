import { renderSVG } from 'uqr'
import { z } from 'zod'

/** UTM values on printed codes: lower case, digits and hyphens (BRAND p.52: every QR has UTM). */
export const UtmValue = z.string().regex(/^[a-z0-9-]{1,40}$/)

/**
 * The address a printed QR code opens: the /go/[slug] short link with UTM tracking. Medium is
 * always `qr` (decision 10). Built with URL, so nothing is joined unescaped.
 */
export function qrUrl(siteUrl: string, slug: string, source: string, campaign: string): string {
  const url = new URL(`/go/${encodeURIComponent(slug)}`, siteUrl)
  url.searchParams.set('utm_source', UtmValue.parse(source))
  url.searchParams.set('utm_medium', 'qr')
  url.searchParams.set('utm_campaign', UtmValue.parse(campaign))
  return url.toString()
}

/**
 * A QR code as SVG markup (uqr, MIT, no dependencies). Error correction M and a 4-module quiet
 * zone, the print standard, until the master carbonoffroad QR.svg style arrives (decision 10).
 * Default black on white: the brand guard keeps raw colour values out of source.
 */
export function qrSvg(text: string): string {
  return renderSVG(text, { ecc: 'M', border: 4 })
}
