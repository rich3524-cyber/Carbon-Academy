import 'server-only'
import { notFound } from 'next/navigation'
import { logSecurityEvent } from '@/lib/log'
import { createSessionClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type Functions = Database['public']['Functions']
export type AdminFunction = Extract<keyof Functions, `admin_${string}`>

/**
 * Generated types mark every argument as required and non-null, but the functions take null for
 * "none" (a new record, no store). Every argument is still sent, so PostgREST finds the function.
 */
export type AdminArgs<F extends AdminFunction> = {
  [K in keyof Functions[F]['Args']]: Functions[F]['Args'][K] | null
}

/** What an admin form can show. Each maps to one plain message in the UI. */
export type AdminError =
  'step_up' | 'refused' | 'blocked_publish' | 'invalid' | 'duplicate' | 'failed'
export type AdminResult<T> = { ok: true; data: T } | { ok: false; error: AdminError }

const BY_CODE: Record<string, AdminError> = {
  CAA01: 'step_up',
  CAA02: 'refused',
  CAA03: 'blocked_publish',
  '22023': 'invalid',
  '23505': 'duplicate',
}

/** The database's error code as the form sees it. 42501 and P0002 never get here (404). */
export function adminError(code: string | undefined): AdminError {
  return (code && BY_CODE[code]) || 'failed'
}

/**
 * Runs an admin_* function as the signed-in user (decision 1). The function checks admin access,
 * MFA and step-up itself. "Not an admin" (42501) and "not found" (P0002) become a 404, like the
 * pages; everything else comes back as an AdminError for the form.
 */
export async function callAdmin<F extends AdminFunction>(
  fn: F,
  args: AdminArgs<F>,
): Promise<AdminResult<Functions[F]['Returns']>> {
  const supabase = await createSessionClient()
  const { data, error } = await supabase.rpc(fn, args as never)
  if (!error) return { ok: true, data: data as Functions[F]['Returns'] }
  logSecurityEvent('admin_action_failed', { action: fn, code: error.code })
  if (error.code === '42501' || error.code === 'P0002') notFound()
  return { ok: false, error: adminError(error.code) }
}

/** For pages: the data, or a thrown error for the error boundary (never shown in detail). */
export async function readAdmin<F extends AdminFunction>(
  fn: F,
  args: AdminArgs<F>,
): Promise<Functions[F]['Returns']> {
  const result = await callAdmin(fn, args)
  if (!result.ok) throw new Error(`Admin read failed: ${fn}`)
  return result.data
}
