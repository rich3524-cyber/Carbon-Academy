'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin, requireAdminForMfa } from '@/lib/admin/access'
import { getMyFactors, nextFactorName } from '@/lib/admin/factors'
import { type AdminFormState, ADMIN_MESSAGES, STEP_UP_FAILED, saved } from '@/lib/admin/form'
import { qrSvg } from '@/lib/admin/qr'
import { verifyStepUp } from '@/lib/admin/step-up'
import { logSecurityEvent } from '@/lib/log'
import { createSessionClient } from '@/lib/supabase/server'

// Decisions 2 and 3: TOTP enrolment, verification and the backup factor. Supabase Auth refuses
// a second factor or a removal without aal2 itself (proved in Phase 6 Task 1).

const CodeInput = z.object({ factorId: z.uuid(), code: z.string().regex(/^\d{6}$/) })
const WRONG_CODE: AdminFormState = {
  status: 'error',
  fieldErrors: {
    code: "That code didn't work. Check the time on your phone and try the next one.",
  },
}

/** Starts enrolling a TOTP factor: returns the QR code and setup key to show once. */
export async function startEnrol(): Promise<AdminFormState> {
  const access = await requireAdminForMfa()
  // An admin who already has a factor must verify it first; Supabase would refuse anyway.
  if (access === 'verify') redirect('/admin/mfa')
  const supabase = await createSessionClient()
  const factors = await getMyFactors()
  for (const factor of factors.filter((f) => !f.verified)) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id })
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: nextFactorName(factors.filter((f) => f.verified).map((f) => f.name)),
  })
  if (error) {
    logSecurityEvent('admin_mfa_failed', { code: error.code })
    return { status: 'error', message: ADMIN_MESSAGES.failed }
  }
  return {
    status: 'idle',
    payload: { factorId: data.id, secret: data.totp.secret, qr: qrSvg(data.totp.uri) },
  }
}

/** Confirms enrolment with the first code. The session is aal2 afterwards. */
export async function confirmEnrol(
  prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdminForMfa()
  const parsed = CodeInput.safeParse({
    factorId: formData.get('factorId'),
    code: formData.get('code'),
  })
  if (!parsed.success) return { ...prev, ...WRONG_CODE }
  const supabase = await createSessionClient()
  const { error } = await supabase.auth.mfa.challengeAndVerify(parsed.data)
  if (error) {
    logSecurityEvent('admin_mfa_failed', { code: error.code })
    return { ...prev, ...WRONG_CODE }
  }
  redirect('/admin/security?backup=1')
}

/** Brings this session to aal2 with a code from an enrolled factor. */
export async function verifySession(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdminForMfa()
  const parsed = CodeInput.safeParse({
    factorId: formData.get('factorId'),
    code: formData.get('code'),
  })
  if (!parsed.success) return WRONG_CODE
  const supabase = await createSessionClient()
  const { error } = await supabase.auth.mfa.challengeAndVerify(parsed.data)
  if (error) {
    logSecurityEvent('admin_mfa_failed', { code: error.code })
    return WRONG_CODE
  }
  redirect('/admin')
}

/** Removes one of your own factors, with step-up. Never the last one. */
export async function removeFactor(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const factorId = z.uuid().safeParse(formData.get('factorId'))
  if (!factorId.success) return { status: 'error', message: ADMIN_MESSAGES.invalid }
  const verified = (await getMyFactors()).filter((f) => f.verified)
  if (!verified.some((f) => f.id === factorId.data)) {
    return { status: 'error', message: ADMIN_MESSAGES.invalid }
  }
  if (verified.length < 2) {
    return {
      status: 'error',
      message: "You can't remove your only authenticator. Add a backup first.",
    }
  }
  if (!(await verifyStepUp(formData))) return STEP_UP_FAILED
  const supabase = await createSessionClient()
  const { error } = await supabase.auth.mfa.unenroll({ factorId: factorId.data })
  if (error) {
    logSecurityEvent('admin_mfa_failed', { code: error.code })
    return { status: 'error', message: ADMIN_MESSAGES.failed }
  }
  await supabase.auth.refreshSession()
  return saved('Authenticator removed.')
}
