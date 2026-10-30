import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const log = vi.fn()
vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}))
vi.mock('@/lib/log', () => ({ logSecurityEvent: log }))
vi.mock('@/lib/supabase/server', () => ({ createSessionClient: async () => ({ rpc }) }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`)
  }),
}))

const { requireAdmin, requireAdminForMfa } = await import('./access')
const access = (data: unknown, error: unknown = null) => rpc.mockResolvedValue({ data, error })

beforeEach(() => {
  rpc.mockReset()
  log.mockReset()
})

describe('requireAdmin (decision 1)', () => {
  it('lets a current admin through', async () => {
    access('ok')
    await expect(requireAdmin()).resolves.toBeUndefined()
    expect(log).not.toHaveBeenCalled()
  })

  it('gives everyone else a 404 and logs it', async () => {
    for (const [data, error] of [
      ['none', null],
      [null, { code: '42501' }],
      ['admin', null],
      [undefined, null],
    ]) {
      access(data, error)
      await expect(requireAdmin()).rejects.toThrow('NOT_FOUND')
    }
    expect(log).toHaveBeenCalledWith('admin_denied', { code: 'not_admin' })
  })

  it('sends an admin without MFA in this session to /admin/mfa', async () => {
    for (const state of ['enrol', 'verify']) {
      access(state)
      await expect(requireAdmin()).rejects.toThrow('REDIRECT /admin/mfa')
    }
    expect(log).toHaveBeenCalledWith('admin_denied', { code: 'mfa' })
  })
})

describe('requireAdminForMfa', () => {
  it('lets any admin reach the MFA page and refuses everyone else', async () => {
    for (const state of ['enrol', 'verify', 'ok']) {
      access(state)
      await expect(requireAdminForMfa()).resolves.toBe(state)
    }
    access('none')
    await expect(requireAdminForMfa()).rejects.toThrow('NOT_FOUND')
  })
})
