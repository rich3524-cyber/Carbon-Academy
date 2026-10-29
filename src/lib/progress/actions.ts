'use server'

import { z } from 'zod'
import { logSecurityEvent } from '@/lib/log'
import { createSessionClient } from '@/lib/supabase/server'

// Called from public lesson pages, so both actions handle signed-out visitors quietly.
// getClaims() verifies the JWT locally. The database checks it again: auth.uid() inside
// save_lesson_progress, and RLS on the read (controls 04, 05).

const LessonId = z.uuid()
const SaveInput = z.object({
  lessonId: LessonId,
  percent: z.number().min(0).max(100),
  seconds: z.number().int().min(0).max(86_400),
})

async function signedInClient() {
  const supabase = await createSessionClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims.sub ? { supabase, userId: data.claims.sub } : null
}

export async function saveProgress(input: unknown): Promise<{ saved: boolean }> {
  const parsed = SaveInput.safeParse(input)
  if (!parsed.success) return { saved: false }
  const session = await signedInClient()
  if (!session) return { saved: false }
  const { error } = await session.supabase.rpc('save_lesson_progress', {
    p_lesson_id: parsed.data.lessonId,
    p_percent: parsed.data.percent,
    p_position_seconds: parsed.data.seconds,
  })
  if (error) {
    logSecurityEvent('progress_save_failed', { userId: session.userId, code: error.code })
    return { saved: false }
  }
  return { saved: true }
}

export async function getResumePoint(
  lessonId: unknown,
): Promise<{ signedIn: boolean; seconds: number }> {
  const parsed = LessonId.safeParse(lessonId)
  if (!parsed.success) return { signedIn: false, seconds: 0 }
  const session = await signedInClient()
  if (!session) return { signedIn: false, seconds: 0 }
  const { data } = await session.supabase
    .from('lesson_progress')
    .select('last_position_seconds')
    .eq('lesson_id', parsed.data)
    .maybeSingle()
  return { signedIn: true, seconds: data?.last_position_seconds ?? 0 }
}
