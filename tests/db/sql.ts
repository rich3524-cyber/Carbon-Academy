import { execFileSync } from 'node:child_process'

// The API can't reach the auth schema, so the 5-minute and 8-hour MFA windows are tested by
// backdating auth.mfa_amr_claims directly. Local container only; clients.ts already refuses
// hosted URLs.
const CONTAINER = 'supabase_db_Carbon-Academy'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function localSql(sql: string): string {
  return execFileSync(
    'docker',
    ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tAc', sql],
    { encoding: 'utf8' },
  ).trim()
}

function checkId(userId: string) {
  if (!UUID.test(userId)) throw new Error('Bad test user ID')
}

/** Moves every TOTP verification on this user's sessions back by the given minutes. */
export function backdateTotp(userId: string, minutes: number) {
  checkId(userId)
  if (!Number.isInteger(minutes)) throw new Error('Bad minutes')
  localSql(
    `update auth.mfa_amr_claims c set updated_at = now() - interval '${minutes} minutes'
     from auth.sessions s
     where s.id = c.session_id and s.user_id = '${userId}' and c.authentication_method = 'totp'`,
  )
}

export function sessionCount(userId: string): number {
  checkId(userId)
  return Number(localSql(`select count(*) from auth.sessions where user_id = '${userId}'`))
}
