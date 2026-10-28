import { z } from 'zod'

export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const
export type UtmKey = (typeof UTM_KEYS)[number]
export type Utm = Partial<Record<UtmKey, string>>

const UtmValue = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9 ._~+-]+$/)

/** Keeps only the known UTM keys with safe values. Everything else is dropped (control 12). */
export function pickUtm(params: URLSearchParams): Utm {
  const utm: Utm = {}
  for (const key of UTM_KEYS) {
    const result = UtmValue.safeParse(params.get(key) ?? '')
    if (result.success) utm[key] = result.data
  }
  return utm
}
