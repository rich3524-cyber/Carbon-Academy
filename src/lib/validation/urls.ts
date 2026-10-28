/** Hosts the warranty registration CTA may link to (security framework control 07). */
export const WARRANTY_HOSTS = ['carbonoffroad.com.au', 'www.carbonoffroad.com.au'] as const

/** Returns the URL if it is https on an allowed host with no credentials, otherwise null. */
export function safeHttpsUrl(value: unknown, allowedHosts: readonly string[]): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 500) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null
  if (!allowedHosts.includes(url.hostname)) return null
  return url.toString()
}

/** Vimeo video IDs are numeric. Anything else is treated as "no video" (control 07). */
export function isVimeoId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{6,12}$/.test(value)
}
