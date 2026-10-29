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
  | 'quiz_submitted'
  | 'quiz_rate_limited'
  | 'quiz_submit_failed'
  | 'certificate_issued'
  | 'certificate_pdf_denied'
  | 'verify_not_found'
  | 'email_skipped'

/**
 * IDs, error codes and pass or fail only. Never emails, names, form data, tokens, URLs or quiz
 * answers (control 15, T-22).
 */
type Fields = {
  userId?: string
  code?: string
  requestId?: string
  lessonId?: string
  outcome?: 'passed' | 'failed'
}

export function logSecurityEvent(event: SecurityEvent, fields: Fields = {}) {
  console.info(JSON.stringify({ kind: 'security', event, ...fields, at: new Date().toISOString() }))
}
