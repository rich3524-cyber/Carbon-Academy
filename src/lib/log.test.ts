import { describe, expect, it, vi } from 'vitest'
import { logSecurityEvent } from './log'

describe('logSecurityEvent', () => {
  it('writes one JSON line with the event and allowed fields only', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    logSecurityEvent('sign_in_failed', { userId: 'u1', code: 'otp_expired' })
    const line = JSON.parse(spy.mock.calls[0]![0] as string)
    expect(line).toMatchObject({
      kind: 'security',
      event: 'sign_in_failed',
      userId: 'u1',
      code: 'otp_expired',
    })
    expect(typeof line.at).toBe('string')
    spy.mockRestore()
  })
})
