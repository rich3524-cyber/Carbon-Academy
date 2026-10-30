import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const log = vi.fn()
vi.mock('server-only', () => ({}))
vi.mock('@/lib/log', () => ({ logSecurityEvent: log }))
vi.mock('@/lib/supabase/server', () => ({ createSessionClient: async () => ({ rpc }) }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

const { adminError, callAdmin } = await import('./call')

beforeEach(() => {
  rpc.mockReset()
  log.mockReset()
})

describe('callAdmin', () => {
  it('returns the data on success', async () => {
    rpc.mockResolvedValue({ data: { learners: 3 }, error: null })
    await expect(callAdmin('admin_overview', {})).resolves.toEqual({
      ok: true,
      data: { learners: 3 },
    })
    expect(log).not.toHaveBeenCalled()
  })

  it('turns "not an admin" and "not found" into a 404, logging the code', async () => {
    for (const code of ['42501', 'P0002']) {
      rpc.mockResolvedValue({ data: null, error: { code } })
      await expect(callAdmin('admin_overview', {})).rejects.toThrow('NOT_FOUND')
      expect(log).toHaveBeenLastCalledWith('admin_action_failed', {
        action: 'admin_overview',
        code,
      })
    }
  })

  it('maps every other database code to a form error', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'CAA01' } })
    await expect(callAdmin('admin_save_settings', { p_values: {} })).resolves.toEqual({
      ok: false,
      error: 'step_up',
    })
  })
})

describe('adminError', () => {
  it('maps each documented code, and anything else to failed', () => {
    expect(adminError('CAA01')).toBe('step_up')
    expect(adminError('CAA02')).toBe('refused')
    expect(adminError('CAA03')).toBe('blocked_publish')
    expect(adminError('22023')).toBe('invalid')
    expect(adminError('23505')).toBe('duplicate')
    expect(adminError('XX000')).toBe('failed')
    expect(adminError(undefined)).toBe('failed')
  })
})
