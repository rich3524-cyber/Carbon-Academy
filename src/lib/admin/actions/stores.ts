'use server'

import { updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/access'
import { callAdmin } from '@/lib/admin/call'
import {
  type AdminFormState,
  failure,
  fields,
  invalid,
  saved,
  STEP_UP_FAILED,
} from '@/lib/admin/form'
import { verifyStepUp } from '@/lib/admin/step-up'
import { PartnerInput, RegenerateInput, StoreInput } from '@/lib/admin/validation'
import { CACHE_TAGS } from '@/lib/content/tags'

// Decisions 6 and 9: partners, stores and store codes.

export async function savePartner(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = PartnerInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  const result = await callAdmin('admin_save_partner', {
    p_id: parsed.data.id,
    p_name: parsed.data.name,
    p_type: parsed.data.type,
    p_parent_group: parsed.data.parentGroup,
  })
  if (!result.ok) return failure(result.error)
  if (!parsed.data.id) redirect(`/admin/partners/${result.data}`)
  return saved()
}

export async function saveStore(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = StoreInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  const store = parsed.data
  if (!store.id && (!store.prefix || !store.location)) {
    return invalid([
      ...(store.prefix ? [] : [{ path: ['prefix'], message: '2 to 5 letters.' }]),
      ...(store.location ? [] : [{ path: ['location'], message: '2 to 5 letters.' }]),
    ])
  }
  const result = await callAdmin('admin_save_store', {
    p_id: store.id,
    p_partner: store.partner,
    p_name: store.name,
    p_suburb: store.suburb,
    p_state: store.state,
    p_country: store.country,
    p_active: store.active,
    p_prefix: store.prefix ?? null,
    p_location: store.location ?? null,
  })
  if (!result.ok) return failure(result.error)
  // Store names, active flags and certified status feed the public certified list.
  updateTag(CACHE_TAGS.certifiedStores)
  if (!store.id) redirect(`/admin/stores/${result.data}`)
  return saved()
}

/** High-risk (decision 4): needs a fresh code. The old code stops working at once. */
export async function regenerateStoreCode(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = RegenerateInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  if (!(await verifyStepUp(formData))) return STEP_UP_FAILED
  const result = await callAdmin('admin_regenerate_store_code', {
    p_store: parsed.data.id,
    p_prefix: parsed.data.prefix,
    p_location: parsed.data.location,
  })
  if (!result.ok) return failure(result.error)
  return saved(`New code: ${result.data}. The old code no longer works.`)
}
