import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInWithOtp = vi.fn()
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createSessionClient: async () => ({ auth: { signInWithOtp } }),
}))
vi.mock('@/lib/stores/lookup', () => ({
  lookupStore: vi.fn(async (code: string) =>
    code === 'TST-ROB-7K2Q9MXH'
      ? { storeName: 'Test Store Robina', partnerName: 'Test Partner' }
      : null,
  ),
}))
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}))
vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://academy.example.com')

const { requestJoinLink, requestSignInLink } = await import('./actions')
const idle = { status: 'idle' } as const

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

beforeEach(() => signInWithOtp.mockReset().mockResolvedValue({ error: null }))

describe('requestSignInLink (T-09)', () => {
  it('sends a link for existing accounts only, and never creates one', async () => {
    await requestSignInLink(idle, form({ email: 'Pat@Example.com', website: '' }))
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'pat@example.com',
      options: {
        shouldCreateUser: false,
        emailRedirectTo: 'https://academy.example.com/dashboard',
      },
    })
  })

  it('brings the learner back to the lesson they came from (decision 15)', async () => {
    await requestSignInLink(
      idle,
      form({ email: 'pat@example.com', website: '', next: '/lessons/winches/scout-pro-10k-v3' }),
    )
    expect(signInWithOtp.mock.calls[0]![0].options.emailRedirectTo).toBe(
      'https://academy.example.com/lessons/winches/scout-pro-10k-v3',
    )
  })

  it.each([
    'https://evil.example/x',
    '//evil.example/x',
    '/admin/learners',
    '/lessons/../dashboard?x=1',
  ])('falls back to the dashboard for next=%s (T-13)', async (next) => {
    await requestSignInLink(idle, form({ email: 'pat@example.com', website: '', next }))
    expect(signInWithOtp.mock.calls[0]![0].options.emailRedirectTo).toBe(
      'https://academy.example.com/dashboard',
    )
  })

  it('gives the same answer whether or not the account exists', async () => {
    const known = await requestSignInLink(idle, form({ email: 'a@example.com', website: '' }))
    signInWithOtp.mockResolvedValue({ error: { status: 422, code: 'otp_disabled', message: 'x' } })
    const unknown = await requestSignInLink(idle, form({ email: 'b@example.com', website: '' }))
    expect(unknown).toEqual(known)
  })

  it('reports a field error for an invalid email', async () => {
    const result = await requestSignInLink(idle, form({ email: 'nope', website: '' }))
    expect(result.status).toBe('invalid')
    expect(signInWithOtp).not.toHaveBeenCalled()
  })

  it('pretends to succeed for bots that fill the honeypot', async () => {
    const result = await requestSignInLink(
      idle,
      form({ email: 'a@example.com', website: 'http://spam' }),
    )
    expect(result.status).toBe('sent')
    expect(signInWithOtp).not.toHaveBeenCalled()
  })

  it('shows a generic error only when Supabase itself fails', async () => {
    signInWithOtp.mockResolvedValue({
      error: { status: 500, code: 'unexpected_failure', message: 'x' },
    })
    const result = await requestSignInLink(idle, form({ email: 'a@example.com', website: '' }))
    expect(result.status).toBe('error')
  })
})

describe('requestJoinLink', () => {
  const valid = { firstName: 'Pat', lastName: 'Lee', email: 'pat@example.com', website: '' }

  it('creates the account with names, store code and consent, and lands on the join page', async () => {
    await requestJoinLink(idle, form({ ...valid, code: 'tst-rob-7k2q9mxh', marketingOptIn: 'on' }))
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'pat@example.com',
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'https://academy.example.com/join/TST-ROB-7K2Q9MXH',
        data: {
          first_name: 'Pat',
          last_name: 'Lee',
          store_code: 'TST-ROB-7K2Q9MXH',
          marketing_opt_in: true,
        },
      },
    })
  })

  it('joins customers without a code, with no marketing consent unless ticked', async () => {
    await requestJoinLink(idle, form(valid))
    expect(signInWithOtp.mock.calls[0]![0].options).toMatchObject({
      emailRedirectTo: 'https://academy.example.com/dashboard',
      data: { first_name: 'Pat', last_name: 'Lee', marketing_opt_in: false },
    })
    expect(signInWithOtp.mock.calls[0]![0].options.data).not.toHaveProperty('store_code')
  })

  it('refuses a code that matches no active store', async () => {
    const result = await requestJoinLink(idle, form({ ...valid, code: 'TST-NOP-00000000' }))
    expect(result.status).toBe('invalid')
    expect(signInWithOtp).not.toHaveBeenCalled()
  })

  it('returns the typed values so the form can refill, but never the honeypot', async () => {
    const result = await requestJoinLink(idle, form({ ...valid, firstName: '' }))
    expect(result.status).toBe('invalid')
    expect(result.fieldErrors).toHaveProperty('firstName')
    expect(result.values).toMatchObject({ lastName: 'Lee', email: 'pat@example.com' })
    expect(result.values).not.toHaveProperty('website')
  })
})
