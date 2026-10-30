import { beforeEach, describe, expect, it, vi } from 'vitest'

const challengeAndVerify = vi.fn()
const log = vi.fn()
vi.mock('server-only', () => ({}))
vi.mock('@/lib/log', () => ({ logSecurityEvent: log }))
vi.mock('@/lib/supabase/server', () => ({
  createSessionClient: async () => ({ auth: { mfa: { challengeAndVerify } } }),
}))

const { verifyStepUp } = await import('./step-up')
const FACTOR = '2b1f0d5e-3c4a-4b6d-9e8f-0a1b2c3d4e5f'
const form = (code: string, factor = FACTOR) => {
  const data = new FormData()
  data.set('stepUpCode', code)
  data.set('stepUpFactor', factor)
  return data
}

beforeEach(() => {
  challengeAndVerify.mockReset().mockResolvedValue({ data: {}, error: null })
  log.mockReset()
})

describe('verifyStepUp (decision 4)', () => {
  it('verifies a 6-digit code against the chosen factor', async () => {
    await expect(verifyStepUp(form('123456'))).resolves.toBe(true)
    expect(challengeAndVerify).toHaveBeenCalledWith({ code: '123456', factorId: FACTOR })
  })

  it('never calls Supabase for a malformed code or factor', async () => {
    for (const data of [
      form('12345'),
      form('12345a'),
      form('123456', 'not-a-uuid'),
      new FormData(),
    ]) {
      await expect(verifyStepUp(data)).resolves.toBe(false)
    }
    expect(challengeAndVerify).not.toHaveBeenCalled()
  })

  it('logs a refused code without the code itself', async () => {
    challengeAndVerify.mockResolvedValue({ data: null, error: { code: 'mfa_verification_failed' } })
    await expect(verifyStepUp(form('654321'))).resolves.toBe(false)
    expect(log).toHaveBeenCalledWith('admin_step_up_failed', { code: 'mfa_verification_failed' })
    expect(JSON.stringify(log.mock.calls)).not.toContain('654321')
  })
})
