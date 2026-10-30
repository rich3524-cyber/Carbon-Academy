'use server'

import { updateTag } from 'next/cache'
import { requireAdmin } from '@/lib/admin/access'
import { callAdmin } from '@/lib/admin/call'
import { type AdminFormState, fields, invalid, STEP_UP_FAILED, stateOf } from '@/lib/admin/form'
import { verifyStepUp } from '@/lib/admin/step-up'
import { SettingsInput } from '@/lib/admin/validation'
import { CACHE_TAGS } from '@/lib/content/tags'

/**
 * Decision 12. Fixed keys only: there's no way to add a free-form setting, so nothing secret
 * can land in the publicly readable settings table. High-risk, so it needs a fresh code.
 */
export async function saveSettings(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = SettingsInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  if (!(await verifyStepUp(formData))) return STEP_UP_FAILED
  const s = parsed.data
  const result = await callAdmin('admin_save_settings', {
    p_values: {
      pass_mark_percent: s.passMark,
      store_certification_threshold: s.threshold,
      certificate_validity_months: s.validityMonths,
      certificate_renewal_window_days: s.renewalDays,
      quiz_attempts_per_hour: s.attemptsPerHour,
      warranty_registration_url: s.warrantyUrl,
      company_address: s.companyAddress,
    },
  })
  if (result.ok) {
    updateTag(CACHE_TAGS.settings)
    // The threshold decides which stores are certified.
    updateTag(CACHE_TAGS.certifiedStores)
  }
  return stateOf(result, undefined, 'Settings saved.')
}
