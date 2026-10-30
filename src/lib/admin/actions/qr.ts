'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/access'
import { callAdmin } from '@/lib/admin/call'
import { type AdminFormState, failure, fields, invalid, saved } from '@/lib/admin/form'
import { QrLinkInput } from '@/lib/admin/validation'

/** Decision 10: create a short link, or point an existing one at another lesson. */
export async function saveQrLink(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = QrLinkInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  const result = await callAdmin('admin_save_qr_link', {
    p_id: parsed.data.id,
    p_slug: parsed.data.slug,
    p_lesson: parsed.data.lesson,
  })
  if (!result.ok) {
    if (result.error === 'duplicate') {
      return { ...failure('duplicate'), fieldErrors: { slug: 'Another QR link uses that.' } }
    }
    return failure(result.error)
  }
  if (!parsed.data.id) redirect(`/admin/qr/${result.data}`)
  return saved()
}
