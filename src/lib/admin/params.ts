import 'server-only'
import { notFound } from 'next/navigation'
import { z } from 'zod'

/** A route's [id] as a UUID, or the same 404 as everything else. */
export function idParam(value: string): string {
  const parsed = z.uuid().safeParse(value)
  if (!parsed.success) notFound()
  return parsed.data
}
