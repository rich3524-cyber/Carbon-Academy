import 'server-only'
import { logSecurityEvent } from '@/lib/log'

export type Email = { to: string; subject: string; html: string; text: string; template: string }

/**
 * Transactional email (plan decision 2). There is no provider until PRD D5 is decided, so this
 * sends nothing. When it is decided, implement this function only, after the vendor
 * assessment (framework section 5), the APP 8 disclosure and SPF/DKIM (control 18).
 * Never log the address (control 15).
 */
export async function sendEmail(email: Email): Promise<{ sent: boolean }> {
  logSecurityEvent('email_skipped', { code: email.template })
  return { sent: false }
}
