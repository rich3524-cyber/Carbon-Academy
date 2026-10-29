import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const getClaims = vi.fn()
const maybeSingle = vi.fn()
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createSessionClient: async () => ({
    auth: { getClaims },
    rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}))

const { getResumePoint, saveProgress } = await import('./actions')
const LESSON = '3f9a1c2e-4b5d-4e6f-8a7b-9c0d1e2f3a4b'

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ error: null })
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null })
  maybeSingle.mockReset().mockResolvedValue({ data: { last_position_seconds: 42 }, error: null })
})

describe('saveProgress (a public endpoint: authenticates and validates itself)', () => {
  it('saves through the database function, without passing a user id', async () => {
    expect(await saveProgress({ lessonId: LESSON, percent: 40, seconds: 61 })).toEqual({
      saved: true,
    })
    expect(rpc).toHaveBeenCalledWith('save_lesson_progress', {
      p_lesson_id: LESSON,
      p_percent: 40,
      p_position_seconds: 61,
    })
  })

  it('does nothing when signed out', async () => {
    getClaims.mockResolvedValue({ data: null, error: null })
    expect(await saveProgress({ lessonId: LESSON, percent: 40, seconds: 61 })).toEqual({
      saved: false,
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    { lessonId: 'not-a-uuid', percent: 40, seconds: 1 },
    { lessonId: LESSON, percent: 400, seconds: 1 },
    { lessonId: LESSON, percent: 40, seconds: -1 },
    { lessonId: LESSON, percent: 40, seconds: 1.5 },
    'nonsense',
  ])('rejects %j', async (input) => {
    expect(await saveProgress(input)).toEqual({ saved: false })
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('getResumePoint', () => {
  it('returns the saved position for a signed-in learner', async () => {
    expect(await getResumePoint(LESSON)).toEqual({ signedIn: true, seconds: 42 })
  })

  it('tells the player not to track when signed out', async () => {
    getClaims.mockResolvedValue({ data: null, error: null })
    expect(await getResumePoint(LESSON)).toEqual({ signedIn: false, seconds: 0 })
  })

  it('ignores a malformed lesson id', async () => {
    expect(await getResumePoint('x')).toEqual({ signedIn: false, seconds: 0 })
  })
})
