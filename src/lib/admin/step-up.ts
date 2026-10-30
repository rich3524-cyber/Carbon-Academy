import 'server-only'
import { z } from 'zod'
import { logSecurityEvent } from '@/lib/log'
import { createSessionClient } from '@/lib/supabase/server'

const StepUpInput = z.object({ code: z.string().regex(/^\d{6}$/), factorId: z.uuid() })

/**
 * Decision 4: verifies a fresh code with Supabase Auth, which records a new TOTP time on this
 * session. The admin_* function then checks that time itself, so skipping this gets CAA01.
 */
export async function verifyStepUp(formData: FormData): Promise<boolean> {
  const parsed = StepUpInput.safeParse({
    code: formData.get('stepUpCode'),
    factorId: formData.get('stepUpFactor'),
  })
  if (!parsed.success) return false
  const supabase = await createSessionClient()
  const { error } = await supabase.auth.mfa.challengeAndVerify(parsed.data)
  if (error) {
    logSecurityEvent('admin_step_up_failed', { code: error.code })
    return false
  }
  return true
}
