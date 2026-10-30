import 'server-only'
import { z } from 'zod'
import { siteUrl } from '@/lib/site'
import { isVimeoId } from '@/lib/validation/urls'

const OEmbed = z.object({ duration: z.number().int().positive().max(36_000) })

/**
 * Duration in seconds from Vimeo's public oEmbed endpoint, or null (decision 8). No token.
 * Domain-restricted videos only answer when the Referer is an allowed domain, so it's our site.
 */
export async function vimeoDuration(id: string): Promise<number | null> {
  if (!isVimeoId(id)) return null
  const target = encodeURIComponent(`https://vimeo.com/${id}`)
  try {
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=${target}`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
      headers: { Referer: `${siteUrl()}/` },
    })
    if (!response.ok) return null
    const parsed = OEmbed.safeParse(await response.json())
    return parsed.success ? parsed.data.duration : null
  } catch {
    return null
  }
}
