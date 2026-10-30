import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const getClaims = vi.fn()
vi.mock('server-only', () => ({}))
const profileSingle = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createSessionClient: async () => ({
    auth: { getClaims },
    rpc,
    from: () => ({ select: () => ({ single: profileSingle }) }),
  }),
}))
const sendEmail = vi.fn()
vi.mock('@/lib/email/send', () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }))
vi.mock('@/lib/content/settings', () => ({
  getProgramSettings: async () => ({
    companyAddress: 'Unit 1a, 1 Waterway Drive, Coomera QLD 4209',
  }),
}))
vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://academy.example.com')
const log = vi.fn()
vi.mock('@/lib/log', () => ({ logSecurityEvent: (...args: unknown[]) => log(...args) }))

const { getQuizStatus, startQuiz, submitQuiz } = await import('./actions')
const L = '3f9a1c2e-4b5d-4e6f-8a7b-9c0d1e2f3a4b'
const Q = '0b8e5a52-1c4d-4f0e-9b1a-2c3d4e5f6a7b'
const O = '7c6d5e4f-3a2b-4c1d-8e9f-0a1b2c3d4e5f'

/** rpc() returns a builder with .single() for single-row calls, and a promise for others. */
function rpcResult(result: unknown) {
  const promise = Promise.resolve(result)
  return Object.assign(promise, { single: () => promise })
}

beforeEach(() => {
  rpc.mockReset()
  log.mockReset()
  sendEmail.mockReset().mockResolvedValue({ sent: false })
  profileSingle.mockReset().mockResolvedValue({
    data: { first_name: 'Pat', email: 'pat@example.com' },
    error: null,
  })
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null })
})

describe('getQuizStatus', () => {
  it('returns the state and attempts left', async () => {
    rpc.mockReturnValue(rpcResult({ data: { state: 'ready', attempts_left: 7 }, error: null }))
    expect(await getQuizStatus(L)).toEqual({ state: 'ready', attemptsLeft: 7 })
    expect(rpc).toHaveBeenCalledWith('quiz_status', { p_lesson_id: L })
  })

  it('is unavailable for a bad ID or a database error', async () => {
    expect(await getQuizStatus('nope')).toEqual({ state: 'unavailable', attemptsLeft: 0 })
    rpc.mockReturnValue(rpcResult({ data: null, error: { code: 'XX000' } }))
    expect(await getQuizStatus(L)).toEqual({ state: 'unavailable', attemptsLeft: 0 })
  })
})

describe('startQuiz', () => {
  it('groups questions and passes on only the named fields', async () => {
    rpc.mockReturnValue(
      rpcResult({
        data: [{ question_id: Q, prompt: 'P', option_id: O, option_text: 'T', is_correct: true }],
        error: null,
      }),
    )
    const result = await startQuiz(L)
    expect(result).toEqual({
      ok: true,
      questions: [{ id: Q, prompt: 'P', options: [{ id: O, text: 'T' }] }],
    })
    expect(JSON.stringify(result)).not.toContain('is_correct')
  })

  it('is locked when nothing comes back, and signed out without a session', async () => {
    rpc.mockReturnValue(rpcResult({ data: [], error: null }))
    expect(await startQuiz(L)).toEqual({ ok: false, reason: 'locked' })
    getClaims.mockResolvedValue({ data: null, error: null })
    expect(await startQuiz(L)).toEqual({ ok: false, reason: 'signed_out' })
  })
})

describe('submitQuiz (a public endpoint: authenticates and validates itself)', () => {
  it('grades through the database without passing a user ID, and logs no answers', async () => {
    rpc.mockReturnValue(
      rpcResult({ data: { score: 2, total: 3, passed: false, certified: false }, error: null }),
    )
    expect(await submitQuiz({ lessonId: L, answers: { [Q]: O } })).toEqual({
      ok: true,
      score: 2,
      total: 3,
      passed: false,
      certified: false,
    })
    expect(sendEmail).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith('submit_quiz', { p_lesson_id: L, p_answers: { [Q]: O } })
    expect(log).toHaveBeenCalledWith('quiz_submitted', {
      userId: 'user-1',
      lessonId: L,
      outcome: 'failed',
    })
    expect(JSON.stringify(log.mock.calls)).not.toContain(O)
  })

  it('on the pass that certifies, logs it and sends the certificate email (decision 2)', async () => {
    rpc.mockReturnValue(
      rpcResult({ data: { score: 3, total: 3, passed: true, certified: true }, error: null }),
    )
    expect(await submitQuiz({ lessonId: L, answers: { [Q]: O } })).toMatchObject({
      ok: true,
      certified: true,
    })
    expect(log).toHaveBeenCalledWith('certificate_issued', { userId: 'user-1', code: 'issued' })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const email = sendEmail.mock.calls[0]![0] as { to: string; subject: string; html: string }
    expect(email.to).toBe('pat@example.com')
    expect(email.subject).toBe("You're Carbon Certified")
    expect(email.html).toContain('Hi Pat,')
  })

  it('still reports the certificate if the email step fails', async () => {
    rpc.mockReturnValue(
      rpcResult({ data: { score: 3, total: 3, passed: true, certified: true }, error: null }),
    )
    sendEmail.mockRejectedValue(new Error('provider down'))
    expect(await submitQuiz({ lessonId: L, answers: { [Q]: O } })).toMatchObject({
      certified: true,
    })
  })

  it.each([
    ['CAQ02', 'limited', 'quiz_rate_limited'],
    ['CAQ01', 'locked', 'quiz_submit_failed'],
    ['22023', 'invalid', 'quiz_submit_failed'],
  ])('maps database code %s to %s', async (code, reason, event) => {
    rpc.mockReturnValue(rpcResult({ data: null, error: { code } }))
    expect(await submitQuiz({ lessonId: L, answers: { [Q]: O } })).toEqual({ ok: false, reason })
    expect(log).toHaveBeenCalledWith(event, { userId: 'user-1', lessonId: L, code })
  })

  it('rejects bad input and signed-out callers without touching the database', async () => {
    expect(await submitQuiz({ lessonId: L, answers: { [Q]: 'x' } })).toEqual({
      ok: false,
      reason: 'invalid',
    })
    getClaims.mockResolvedValue({ data: null, error: null })
    expect(await submitQuiz({ lessonId: L, answers: { [Q]: O } })).toEqual({
      ok: false,
      reason: 'signed_out',
    })
    expect(rpc).not.toHaveBeenCalled()
  })
})
