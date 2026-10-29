'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import type { FormState } from '@/lib/forms/state'
import { logSecurityEvent } from '@/lib/log'
import { createSessionClient } from '@/lib/supabase/server'
import { StoreCodeInput } from '@/lib/validation/account'

/** Typed store code → its join page. Validation only; the page looks the store up. */
export async function goToStore(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = StoreCodeInput.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'invalid',
      fieldErrors: { code: 'Check the store code. It looks like BCF-ROB-7K2Q9MXH.' },
      values: { code: String(formData.get('code') ?? '').slice(0, 40) },
    }
  }
  redirect(`/join/${parsed.data.code}`)
}

/** Move the signed-in learner to the store with this code (PRD 6.3). The code is the authorisation. */
export async function changeStore(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser()
  const parsed = StoreCodeInput.safeParse(Object.fromEntries(formData))
  const invalid: FormState = {
    status: 'invalid',
    fieldErrors: { code: "We couldn't find that store. Check the code with your manager." },
  }
  if (!parsed.success) return invalid
  const supabase = await createSessionClient()
  const { data, error } = await supabase.rpc('join_store', { p_code: parsed.data.code })
  if (error) {
    logSecurityEvent('store_change_failed', { userId: user.id, code: error.code })
    return { status: 'error' }
  }
  if (!data?.length) return invalid
  redirect('/dashboard')
}
