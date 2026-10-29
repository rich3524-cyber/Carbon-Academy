'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { z } from 'zod'
import { safeNextPath } from '@/lib/auth/next-path'
import type { FormState } from '@/lib/forms/state'
import { logSecurityEvent } from '@/lib/log'
import { siteUrl } from '@/lib/site'
import { authCookieOptions, isAuthCookie } from '@/lib/supabase/cookies'
import { lookupStore } from '@/lib/stores/lookup'
import { createSessionClient } from '@/lib/supabase/server'
import { ConfirmInput, JoinInput, SignInInput } from '@/lib/validation/account'

// Every function here is a public endpoint (security framework section 4). Each one
// validates its own input, and none trusts the page that renders it.

const SENT: FormState = { status: 'sent' }
const FAILED: FormState = { status: 'error' }

async function requestId() {
  return (await headers()).get('x-nf-request-id') ?? undefined
}

/** Field errors keyed by form field, from a Zod error. Messages are ours, never Zod's. */
function fieldErrors(error: z.ZodError, messages: Record<string, string>) {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0])
    if (messages[key]) result[key] = messages[key]
  }
  return result
}

const MESSAGES = {
  email: 'Enter a valid email address, like name@example.com.',
  firstName: 'Enter your first name.',
  lastName: 'Enter your last name.',
  code: 'Check the store code. It looks like BCF-ROB-7K2Q9MXH.',
}

/**
 * Supabase sends the email while the request waits, so an existing account answers more slowly
 * than an unknown one. Holding every reply to a minimum time hides most of that difference
 * (review finding L5, T-09). Not a hard guarantee: a send slower than the floor still shows.
 */
const RESPONSE_FLOOR_MS = process.env.NODE_ENV === 'test' ? 0 : 1500

async function withResponseFloor(work: () => Promise<FormState>): Promise<FormState> {
  const started = Date.now()
  const result = await work()
  const wait = RESPONSE_FLOOR_MS - (Date.now() - started)
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  return result
}

/** Sign in to an existing account. One answer for every outcome (control 02, T-09). */
export async function requestSignInLink(prev: FormState, formData: FormData): Promise<FormState> {
  return withResponseFloor(() => sendSignInLink(prev, formData))
}

async function sendSignInLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = SignInInput.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { status: 'invalid', fieldErrors: fieldErrors(parsed.error, MESSAGES) }
  }
  if (parsed.data.website) {
    logSecurityEvent('honeypot_tripped', { requestId: await requestId() })
    return SENT
  }
  const supabase = await createSessionClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl()}/dashboard` },
  })
  if (error) {
    logSecurityEvent('sign_in_link_failed', { code: error.code, requestId: await requestId() })
    if ((error.status ?? 500) >= 500) return FAILED
  }
  return SENT
}

/** Create an account (staff with a store code, or customers without one), or sign in again. */
export async function requestJoinLink(prev: FormState, formData: FormData): Promise<FormState> {
  return withResponseFloor(() => sendJoinLink(prev, formData))
}

async function sendJoinLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData)
  const values = {
    firstName: String(raw.firstName ?? '').slice(0, 50),
    lastName: String(raw.lastName ?? '').slice(0, 50),
    email: String(raw.email ?? '').slice(0, 254),
  }
  const parsed = JoinInput.safeParse(raw)
  if (!parsed.success) {
    return { status: 'invalid', fieldErrors: fieldErrors(parsed.error, MESSAGES), values }
  }
  const { firstName, lastName, email, marketingOptIn, code, website } = parsed.data
  if (website) {
    logSecurityEvent('honeypot_tripped', { requestId: await requestId() })
    return SENT
  }
  if (code && !(await lookupStore(code))) {
    logSecurityEvent('store_code_not_found', { requestId: await requestId() })
    return { status: 'invalid', fieldErrors: { code: MESSAGES.code }, values }
  }
  const supabase = await createSessionClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl()}${code ? `/join/${code}` : '/dashboard'}`,
      data: {
        first_name: firstName,
        last_name: lastName,
        ...(code ? { store_code: code } : {}),
        marketing_opt_in: marketingOptIn,
      },
    },
  })
  if (error) {
    // signup_disabled is expected on hosted projects while EX-01 is open.
    logSecurityEvent('join_link_failed', { code: error.code, requestId: await requestId() })
    if ((error.status ?? 500) >= 500) return { ...FAILED, values }
  }
  return SENT
}

/** Step two of a magic link: exchange the token for a session, on POST only (T-12, control 08). */
export async function confirmSignIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = ConfirmInput.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { status: 'invalid' }
  const supabase = await createSessionClient()
  // ASVS 7.2.4: signing in again ends any session already on this device. No-op if none.
  await supabase.auth.signOut({ scope: 'local' })
  const { data, error } = await supabase.auth.verifyOtp({
    type: 'email',
    token_hash: parsed.data.tokenHash,
  })
  if (error || !data.user) {
    logSecurityEvent('sign_in_failed', { code: error?.code, requestId: await requestId() })
    return { status: 'invalid' }
  }
  // ASVS 16.3.1: successful authentications are logged too.
  logSecurityEvent('sign_in_succeeded', { userId: data.user.id, requestId: await requestId() })
  redirect(safeNextPath(parsed.data.next, siteUrl()))
}

/**
 * Ends the session at Supabase, then always clears the session cookies on this device. If the
 * Supabase call fails (a network error, say), supabase-js keeps its cookies, and a learner on a
 * shared store device would think they'd signed out when they hadn't (review finding L3, T-21).
 */
async function endSession(scope: 'local' | 'global') {
  const supabase = await createSessionClient()
  const { error } = await supabase.auth.signOut({ scope })
  if (error) logSecurityEvent('sign_out_failed', { code: error.code, requestId: await requestId() })
  const cookieStore = await cookies()
  const options = authCookieOptions(siteUrl())
  for (const { name } of cookieStore.getAll()) {
    // Set an expired cookie with the same attributes. A __Host- cookie can only be cleared that way.
    if (isAuthCookie(name, options.name)) cookieStore.set(name, '', { ...options, maxAge: 0 })
  }
  redirect('/')
}

/** Sign out this device: ends this session (ASVS 7.4.1). */
export async function signOut() {
  await endSession('local')
}

/** Sign out on every device: ends all of this learner's sessions (ASVS 7.4.3, 7.5.2 in part). */
export async function signOutEverywhere() {
  await endSession('global')
}
