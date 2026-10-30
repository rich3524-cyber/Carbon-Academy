import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { admin } from './clients'
import { totp } from './totp'

// Fictional @example.com users only (EX-01). Created with the secret key on the local stack.

const url = process.env.SUPABASE_TEST_URL!
const publishable = process.env.SUPABASE_TEST_PUBLISHABLE_KEY!

export type TestUser = { id: string; email: string; client: SupabaseClient }

export async function createTestUser(
  label: string,
  metadata: Record<string, unknown> = { first_name: 'Test', last_name: label },
): Promise<TestUser> {
  const email = `${label}-${crypto.randomUUID().slice(0, 8)}@example.com`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: metadata,
  })
  if (error) throw error
  return { id: data.user.id, email, client: await signInAs(email) }
}

/** Signs in through a generated magic link, as the app does (verifyOtp with a token hash). */
export async function signInAs(email: string): Promise<SupabaseClient> {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  const client = createClient(url, publishable, { auth: { persistSession: false } })
  const { error: verifyError } = await client.auth.verifyOtp({
    type: 'email',
    token_hash: data.properties.hashed_token,
  })
  if (verifyError) throw verifyError
  return client
}

export type TestAdmin = TestUser & {
  factorId: string
  secret: string
  stepUp: () => Promise<void>
}

/** A fictional admin with a real enrolled TOTP factor. `verified: false` stops at aal1. */
export async function createTestAdmin(
  label: string,
  { verified = true, enrolled = true } = {},
): Promise<TestAdmin> {
  const user = await createTestUser(label, { first_name: 'Admin', last_name: label })
  const { error } = await admin.from('profiles').update({ role: 'admin' }).eq('id', user.id)
  if (error) throw error
  if (!enrolled) return { ...user, factorId: '', secret: '', stepUp: async () => {} }
  const { data, error: enrolError } = await user.client.auth.mfa.enroll({ factorType: 'totp' })
  if (enrolError) throw enrolError
  const verify = async (at?: number) => {
    const code = totp(data.totp.secret, at)
    const result = await user.client.auth.mfa.challengeAndVerify({ factorId: data.id, code })
    if (result.error) throw result.error
  }
  if (verified) await verify()
  return { ...user, factorId: data.id, secret: data.totp.secret, stepUp: () => verify() }
}

export async function deleteTestUser(user: TestUser | undefined) {
  if (user) await admin.auth.admin.deleteUser(user.id)
}

/** A client that replays a raw access token, as an attacker with a copied token would. */
export function clientWithToken(accessToken: string): SupabaseClient {
  return createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}
