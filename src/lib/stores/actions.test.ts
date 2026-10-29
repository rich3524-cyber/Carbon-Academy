import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const requireUser = vi.fn()
vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/session', () => ({ requireUser }))
vi.mock('@/lib/supabase/server', () => ({ createSessionClient: async () => ({ rpc }) }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`)
  }),
}))

const { changeStore } = await import('./actions')
const idle = { status: 'idle' } as const
const form = (code: string) => {
  const data = new FormData()
  data.set('code', code)
  return data
}

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: [{ store_name: 'Test Store Nerang' }], error: null })
  requireUser
    .mockReset()
    .mockResolvedValue({ id: 'u1', firstName: 'Pat', email: 'pat@example.com', storeName: null })
})

describe('changeStore', () => {
  it('requires a signed-in learner', async () => {
    requireUser.mockRejectedValue(new Error('REDIRECT /sign-in'))
    await expect(changeStore(idle, form('TST-NER-3H8W4DPA'))).rejects.toThrow('REDIRECT /sign-in')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('moves the learner through join_store and goes to the dashboard', async () => {
    await expect(changeStore(idle, form('tst-ner-3h8w4dpa'))).rejects.toThrow('REDIRECT /dashboard')
    expect(rpc).toHaveBeenCalledWith('join_store', { p_code: 'TST-NER-3H8W4DPA' })
  })

  it('reports an unknown or inactive code', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    const result = await changeStore(idle, form('TST-OLD-9X9X9X9X'))
    expect(result.status).toBe('invalid')
  })

  it('rejects a malformed code without calling the database', async () => {
    const result = await changeStore(idle, form("x' or 1=1"))
    expect(result.status).toBe('invalid')
    expect(rpc).not.toHaveBeenCalled()
  })
})
