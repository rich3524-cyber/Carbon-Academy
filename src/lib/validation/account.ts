import { z } from 'zod'

// Security framework control 05: every Server Action parses its input with these schemas.
// z.object strips unknown keys, so extra fields (role, store_id) never get through.

export const Email = z.string().trim().toLowerCase().max(254).pipe(z.email())

/** Letters (any language), combining marks, spaces, apostrophes, hyphens and full stops. */
export const PersonName = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[\p{L}\p{M}' .-]+$/u)

/** PREFIX-LOCATION-XXXXXX, the last part in Crockford base32 (decision 5). */
export const StoreCode = z
  .string()
  .max(40)
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2,5}-[A-Z]{2,5}-[0-9A-HJKMNP-TV-Z]{8}$/)

/** Hidden field that people never fill in, but bots do (control 19). */
const Honeypot = z.string().max(200).default('')

export const SignInInput = z.object({
  email: Email,
  website: Honeypot,
  // Where the link should land. Checked against the allowlist by safeNextPath before use (T-13).
  next: z.string().max(500).optional(),
})

export const JoinInput = z.object({
  firstName: PersonName,
  lastName: PersonName,
  email: Email,
  marketingOptIn: z
    .literal('on')
    .optional()
    .transform((value) => value === 'on'),
  code: StoreCode.optional(),
  website: Honeypot,
})

export const StoreCodeInput = z.object({ code: StoreCode })

export const ConfirmInput = z.object({
  tokenHash: z.string().regex(/^[A-Za-z0-9_-]{20,200}$/),
  next: z.string().max(500).optional(),
})
