'use server'

import { getProgramSettings } from '@/lib/content/settings'
import { certificateIssuedEmail } from '@/lib/email/certificate'
import { sendEmail } from '@/lib/email/send'
import { logSecurityEvent } from '@/lib/log'
import {
  type QuizQuestion,
  type QuizRefusal,
  type QuizState,
  groupQuestions,
  refusalFor,
  toQuizState,
} from '@/lib/quiz/shape'
import { siteUrl } from '@/lib/site'
import { createSessionClient } from '@/lib/supabase/server'
import { QuizLessonId, QuizSubmission } from '@/lib/validation/quiz'

// Called from public, static lesson pages. Each action authenticates and validates itself;
// the database functions check the session, unlock, limit and answers again (controls 04, 05).
// Questions only ever travel in these POST responses, never in the cached page (T-36).

export type QuizStatus = { state: QuizState; attemptsLeft: number }
export type StartResult =
  { ok: true; questions: QuizQuestion[] } | { ok: false; reason: QuizRefusal }
export type SubmitResult =
  | { ok: true; score: number; total: number; passed: boolean; certified: boolean }
  | { ok: false; reason: QuizRefusal }

async function signedInClient() {
  const supabase = await createSessionClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims.sub ? { supabase, userId: data.claims.sub } : null
}

export async function getQuizStatus(lessonId: unknown): Promise<QuizStatus> {
  const parsed = QuizLessonId.safeParse(lessonId)
  if (!parsed.success) return { state: 'unavailable', attemptsLeft: 0 }
  const supabase = await createSessionClient()
  const { data, error } = await supabase.rpc('quiz_status', { p_lesson_id: parsed.data }).single()
  if (error || !data) return { state: 'unavailable', attemptsLeft: 0 }
  return { state: toQuizState(data.state), attemptsLeft: data.attempts_left }
}

export async function startQuiz(lessonId: unknown): Promise<StartResult> {
  const parsed = QuizLessonId.safeParse(lessonId)
  if (!parsed.success) return { ok: false, reason: 'invalid' }
  const session = await signedInClient()
  if (!session) return { ok: false, reason: 'signed_out' }
  const { data, error } = await session.supabase.rpc('get_quiz', { p_lesson_id: parsed.data })
  if (error) return { ok: false, reason: refusalFor(error.code) }
  const questions = groupQuestions(data ?? [])
  return questions.length ? { ok: true, questions } : { ok: false, reason: 'locked' }
}

export async function submitQuiz(input: unknown): Promise<SubmitResult> {
  const parsed = QuizSubmission.safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'invalid' }
  const session = await signedInClient()
  if (!session) return { ok: false, reason: 'signed_out' }
  const { lessonId, answers } = parsed.data
  const { data, error } = await session.supabase
    .rpc('submit_quiz', { p_lesson_id: lessonId, p_answers: answers })
    .single()
  if (error || !data) {
    const reason = refusalFor(error?.code)
    logSecurityEvent(reason === 'limited' ? 'quiz_rate_limited' : 'quiz_submit_failed', {
      userId: session.userId,
      lessonId,
      code: error?.code,
    })
    return { ok: false, reason }
  }
  logSecurityEvent('quiz_submitted', {
    userId: session.userId,
    lessonId,
    outcome: data.passed ? 'passed' : 'failed',
  })
  if (data.certified) {
    logSecurityEvent('certificate_issued', { userId: session.userId, code: 'issued' })
    await emailCertificate(session.supabase)
  }
  return {
    ok: true,
    score: data.score,
    total: data.total,
    passed: data.passed,
    certified: data.certified,
  }
}

type SessionClient = Awaited<ReturnType<typeof createSessionClient>>

/**
 * "You're Carbon Certified" (plan decision 2). The learner's own profile row gives the first
 * name and address. A failed email never undoes or hides the certificate: it's on the dashboard.
 */
async function emailCertificate(supabase: SessionClient) {
  try {
    const [{ data: profile }, settings] = await Promise.all([
      supabase.from('profiles').select('first_name, email').single(),
      getProgramSettings(),
    ])
    if (!profile) return
    await sendEmail(
      certificateIssuedEmail({
        to: profile.email,
        firstName: profile.first_name,
        siteUrl: siteUrl(),
        companyAddress: settings.companyAddress,
      }),
    )
  } catch {
    logSecurityEvent('email_skipped', { code: 'certificate_issued_failed' })
  }
}
