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
  STEP_UP_FAILED,
  stateOf,
} from '@/lib/admin/form'
import { verifyStepUp } from '@/lib/admin/step-up'
import {
  ActiveInput,
  DeleteLearnerInput,
  LearnerIdInput,
  LearnerStoreInput,
  ReinstateInput,
  RevokeInput,
  RoleInput,
  SearchInput,
} from '@/lib/admin/validation'
import { CACHE_TAGS } from '@/lib/content/tags'

// Decision 7. Store, account and certificate changes all move the public certified stores
// list, so they refresh its cache tag.

export async function setLearnerStore(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = LearnerStoreInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  const result = await callAdmin('admin_set_learner_store', {
    p_user: parsed.data.id,
    p_store: parsed.data.store,
  })
  if (result.ok) updateTag(CACHE_TAGS.certifiedStores)
  return stateOf(
    result,
    undefined,
    parsed.data.store ? 'Store changed.' : 'Removed from the store.',
  )
}

export async function setLearnerActive(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = ActiveInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  const result = await callAdmin('admin_set_learner_active', {
    p_user: parsed.data.id,
    p_active: parsed.data.active,
  })
  if (result.ok) updateTag(CACHE_TAGS.certifiedStores)
  return stateOf(
    result,
    "Admins can't be deactivated. Remove the admin role first.",
    parsed.data.active ? 'Account reactivated.' : 'Account deactivated and signed out everywhere.',
  )
}

/** High-risk: needs a fresh code (decision 4). */
export async function setRole(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = RoleInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  if (!(await verifyStepUp(formData))) return STEP_UP_FAILED
  const result = await callAdmin('admin_set_role', {
    p_user: parsed.data.id,
    p_role: parsed.data.role,
  })
  return stateOf(
    result,
    "You can't change your own role, and a deactivated account can't be made an admin.",
    parsed.data.role === 'admin'
      ? "Now an admin. They'll set up an authenticator app at their next visit to Admin."
      : 'No longer an admin.',
  )
}

/** High-risk: removes every authenticator and signs them out (decision 3). */
export async function resetMfa(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = LearnerIdInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  if (!(await verifyStepUp(formData))) return STEP_UP_FAILED
  const result = await callAdmin('admin_reset_mfa', { p_user: parsed.data.id })
  return stateOf(
    result,
    "You can't reset your own authenticator.",
    "Authenticators removed and signed out. They'll set up a new one at their next visit to Admin.",
  )
}

export async function revokeCertificate(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = RevokeInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  if (!(await verifyStepUp(formData))) return STEP_UP_FAILED
  const result = await callAdmin('admin_revoke_certificate', {
    p_certificate: parsed.data.certificate,
    p_reason: parsed.data.reason,
  })
  if (result.ok) updateTag(CACHE_TAGS.certifiedStores)
  return stateOf(result, 'That certificate is already revoked.', 'Certificate revoked.')
}

export async function reinstateCertificate(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = ReinstateInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  if (!(await verifyStepUp(formData))) return STEP_UP_FAILED
  const result = await callAdmin('admin_reinstate_certificate', {
    p_certificate: parsed.data.certificate,
  })
  if (result.ok) updateTag(CACHE_TAGS.certifiedStores)
  return stateOf(result, "That certificate isn't revoked.", 'Certificate reinstated.')
}

/** Deletion on request (decision 7): type the full name and a fresh code. Can't be undone. */
export async function deleteLearner(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin()
  const parsed = DeleteLearnerInput.safeParse(fields(formData))
  if (!parsed.success) return invalid(parsed.error.issues)
  if (!(await verifyStepUp(formData))) return STEP_UP_FAILED
  const result = await callAdmin('admin_delete_learner', {
    p_user: parsed.data.id,
    p_confirm_name: parsed.data.confirmName,
  })
  if (!result.ok) {
    if (result.error === 'invalid') {
      return {
        status: 'error',
        message: 'Type their first and last name exactly to confirm.',
        fieldErrors: { confirmName: "That doesn't match their name." },
      }
    }
    return failure(result.error, "Admins can't be deleted. Remove the admin role first.")
  }
  updateTag(CACHE_TAGS.certifiedStores)
  redirect('/admin/learners?deleted=1')
}

export type LearnerRow = {
  id: string
  name: string
  email: string
  store: string | null
  role: string
  active: boolean
  certificate: string | null
}
export type SearchState = { rows: LearnerRow[] | null; error?: string }

/**
 * POST, not a GET query: names and emails never appear in a URL, so they stay out of request
 * logs (SECURITY.md log inventory).
 */
export async function searchLearners(_prev: SearchState, formData: FormData): Promise<SearchState> {
  await requireAdmin()
  const parsed = SearchInput.safeParse(fields(formData))
  if (!parsed.success) return { rows: null, error: 'Enter at least 2 characters.' }
  const result = await callAdmin('admin_search_learners', { p_query: parsed.data.q })
  if (!result.ok) return { rows: null, error: 'Something went wrong on our end.' }
  return {
    rows: result.data.map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      email: row.email,
      store: row.store_name,
      role: row.role,
      active: row.active,
      certificate: row.certificate_status,
    })),
  }
}
