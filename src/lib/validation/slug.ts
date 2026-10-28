import { z } from 'zod'

/** QR short-link slugs: lowercase kebab-case, at most 80 characters (control 05). */
export const QrSlug = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
