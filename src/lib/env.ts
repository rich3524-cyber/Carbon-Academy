/**
 * Returns an environment variable's value, or throws if it is missing.
 * Pass `process.env.NAME` directly so Next.js can inline NEXT_PUBLIC_ values.
 */
export function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`)
  }
  return value
}
