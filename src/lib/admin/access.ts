import 'server-only'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { cache } from 'react'
import { logSecurityEvent } from '@/lib/log'
import { createSessionClient } from '@/lib/supabase/server'

export type AdminAccess = 'none' | 'enrol' | 'verify' | 'ok'
const STATES: readonly string[] = ['none', 'enrol', 'verify', 'ok']

/** Asked of the database on every request (decision 1). Never 'use cache' (control 14). */
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  await connection()
  const supabase = await createSessionClient()
  const { data, error } = await supabase.rpc('admin_access')
  return !error && typeof data === 'string' && STATES.includes(data)
    ? (data as AdminAccess)
    : 'none'
})

/**
 * First line of every /admin page, Server Action and route. Anyone who isn't an active admin
 * gets a 404, so the area's existence isn't revealed; an admin without MFA in this session goes
 * to /admin/mfa. The database checks again in every admin_* function.
 */
export async function requireAdmin(): Promise<void> {
  const access = await getAdminAccess()
  if (access === 'ok') return
  logSecurityEvent('admin_denied', { code: access === 'none' ? 'not_admin' : 'mfa' })
  if (access === 'none') notFound()
  redirect('/admin/mfa')
}

/** /admin/mfa only: any admin, with or without MFA in this session. */
export async function requireAdminForMfa(): Promise<Exclude<AdminAccess, 'none'>> {
  const access = await getAdminAccess()
  if (access === 'none') {
    logSecurityEvent('admin_denied', { code: 'not_admin' })
    notFound()
  }
  return access
}
