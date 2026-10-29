type SecurityEvent =
  | 'sign_in_link_failed'
  | 'join_link_failed'
  | 'sign_in_failed'
  | 'sign_in_succeeded'
  | 'sign_out_failed'
  | 'honeypot_tripped'
  | 'store_code_not_found'
  | 'progress_save_failed'
  | 'store_change_failed'

/** IDs and error codes only. Never emails, names, form data, tokens or URLs (control 15, T-22). */
type Fields = { userId?: string; code?: string; requestId?: string }

export function logSecurityEvent(event: SecurityEvent, fields: Fields = {}) {
  console.info(JSON.stringify({ kind: 'security', event, ...fields, at: new Date().toISOString() }))
}
