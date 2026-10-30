import { beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 6 admin Server Actions: access first, Zod, step-up where needed, then the database.
const requireAdmin = vi.fn()
const callAdmin = vi.fn()
const verifyStepUp = vi.fn()
const vimeoDuration = vi.fn()
const updateTag = vi.fn()
const listFactors = vi.fn()
const unenroll = vi.fn()
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ updateTag }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`)
  }),
}))
vi.mock('@/lib/admin/access', () => ({ requireAdmin, requireAdminForMfa: requireAdmin }))
vi.mock('@/lib/admin/call', () => ({ callAdmin }))
vi.mock('@/lib/admin/step-up', () => ({ verifyStepUp }))
vi.mock('@/lib/vimeo/oembed', () => ({ vimeoDuration }))
vi.mock('@/lib/log', () => ({ logSecurityEvent: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createSessionClient: async () => ({
    auth: { mfa: { listFactors, unenroll }, refreshSession: vi.fn() },
  }),
}))

const { saveLesson } = await import('./content')
const { regenerateStoreCode } = await import('./stores')
const { deleteLearner, setRole, searchLearners } = await import('./learners')
const { saveSettings } = await import('./settings')
const { removeFactor } = await import('./mfa')

const ID = '2b1f0d5e-3c4a-4b6d-9e8f-0a1b2c3d4e5f'
const OTHER = '3c2e1f6a-4d5b-4c7e-8f9a-1b2c3d4e5f6a'
const idle = { status: 'idle' } as const
const form = (values: Record<string, string>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}
const lesson = {
  id: ID,
  category: OTHER,
  slug: 'winch-fitting',
  title: 'Winch fitting',
  vimeoId: '76979871',
  duration: '',
  region: 'AU',
  isCore: 'on',
  published: 'on',
}

beforeEach(() => {
  for (const mock of [
    requireAdmin,
    callAdmin,
    verifyStepUp,
    vimeoDuration,
    updateTag,
    listFactors,
    unenroll,
  ]) {
    mock.mockReset()
  }
  callAdmin.mockResolvedValue({ ok: true, data: ID })
  verifyStepUp.mockResolvedValue(true)
})

describe('every action checks access first', () => {
  it('stops before reading the form or calling the database', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'))
    await expect(saveLesson(idle, form(lesson))).rejects.toThrow('NOT_FOUND')
    await expect(saveSettings(idle, form({}))).rejects.toThrow('NOT_FOUND')
    await expect(searchLearners({ rows: null }, form({ q: 'pat' }))).rejects.toThrow('NOT_FOUND')
    expect(callAdmin).not.toHaveBeenCalled()
    expect(verifyStepUp).not.toHaveBeenCalled()
  })
})

describe('saveLesson', () => {
  it('fills a blank length from Vimeo and sends null, not undefined, for empty fields', async () => {
    vimeoDuration.mockResolvedValue(62)
    const result = await saveLesson(idle, form(lesson))
    expect(callAdmin).toHaveBeenCalledWith('admin_save_lesson', {
      p_id: ID,
      p_category: OTHER,
      p_slug: 'winch-fitting',
      p_title: 'Winch fitting',
      p_summary: null,
      p_product_name: null,
      p_vimeo_id: '76979871',
      p_duration_seconds: 62,
      p_is_core: true,
      p_region: 'AU',
      p_published: true,
    })
    expect(updateTag).toHaveBeenCalledWith('content')
    expect(result.message).toContain('62 seconds')
  })

  it('explains the core-lesson publish guard (T-55)', async () => {
    callAdmin.mockResolvedValue({ ok: false, error: 'blocked_publish' })
    const result = await saveLesson(idle, form({ ...lesson, duration: '62' }))
    expect(result).toMatchObject({
      status: 'error',
      message: 'Add a quiz and the video length before publishing a core lesson.',
    })
    expect(updateTag).not.toHaveBeenCalled()
  })

  it('returns field errors without calling the database', async () => {
    const result = await saveLesson(idle, form({ ...lesson, slug: 'Bad Slug!' }))
    expect(result.fieldErrors?.slug).toBeTruthy()
    expect(callAdmin).not.toHaveBeenCalled()
  })
})

describe('step-up actions (decision 4)', () => {
  it('never reach the database with a refused code', async () => {
    verifyStepUp.mockResolvedValue(false)
    const results = [
      await regenerateStoreCode(idle, form({ id: ID, prefix: 'BCF', location: 'ROB' })),
      await setRole(idle, form({ id: ID, role: 'admin' })),
      await deleteLearner(idle, form({ id: ID, confirmName: 'Pat Tester' })),
    ]
    for (const result of results) expect(result.message).toMatch(/didn't work or has expired/)
    expect(callAdmin).not.toHaveBeenCalled()
  })

  it('shows the new store code once, from the database', async () => {
    callAdmin.mockResolvedValue({ ok: true, data: 'BCF-ROB-7K2Q9MXH' })
    const result = await regenerateStoreCode(idle, form({ id: ID, prefix: 'bcf', location: 'rob' }))
    expect(callAdmin).toHaveBeenCalledWith('admin_regenerate_store_code', {
      p_store: ID,
      p_prefix: 'BCF',
      p_location: 'ROB',
    })
    expect(result.message).toContain('BCF-ROB-7K2Q9MXH')
  })

  it('gives guard refusals a plain reason', async () => {
    callAdmin.mockResolvedValue({ ok: false, error: 'refused' })
    const result = await setRole(idle, form({ id: ID, role: 'learner' }))
    expect(result.message).toMatch(/can't change your own role/)
  })

  it("asks for the exact name when a deletion name doesn't match", async () => {
    callAdmin.mockResolvedValue({ ok: false, error: 'invalid' })
    const result = await deleteLearner(idle, form({ id: ID, confirmName: 'Someone' }))
    expect(result.fieldErrors?.confirmName).toBeTruthy()
  })

  it('saves settings with the database keys and refreshes both caches', async () => {
    await saveSettings(
      idle,
      form({
        passMark: '90',
        threshold: '2',
        validityMonths: '12',
        renewalDays: '30',
        attemptsPerHour: '5',
        warrantyUrl: '',
        companyAddress: 'Unit 1a, 1 Waterway Drive, Coomera QLD 4209',
      }),
    )
    expect(callAdmin).toHaveBeenCalledWith('admin_save_settings', {
      p_values: {
        pass_mark_percent: 90,
        store_certification_threshold: 2,
        certificate_validity_months: 12,
        certificate_renewal_window_days: 30,
        quiz_attempts_per_hour: 5,
        warranty_registration_url: null,
        company_address: 'Unit 1a, 1 Waterway Drive, Coomera QLD 4209',
      },
    })
    expect(updateTag).toHaveBeenCalledWith('settings')
    expect(updateTag).toHaveBeenCalledWith('certified-stores')
  })
})

describe('removeFactor (decision 3)', () => {
  it("won't remove your only authenticator, and asks no code for it", async () => {
    listFactors.mockResolvedValue({
      data: {
        all: [
          { id: ID, factor_type: 'totp', status: 'verified', friendly_name: 'A', created_at: '' },
        ],
      },
      error: null,
    })
    const result = await removeFactor(idle, form({ factorId: ID }))
    expect(result.message).toMatch(/only authenticator/)
    expect(verifyStepUp).not.toHaveBeenCalled()
    expect(unenroll).not.toHaveBeenCalled()
  })

  it('removes one of two after a fresh code', async () => {
    listFactors.mockResolvedValue({
      data: {
        all: [
          { id: ID, factor_type: 'totp', status: 'verified', friendly_name: 'A', created_at: '' },
          {
            id: OTHER,
            factor_type: 'totp',
            status: 'verified',
            friendly_name: 'B',
            created_at: '',
          },
        ],
      },
      error: null,
    })
    unenroll.mockResolvedValue({ error: null })
    const result = await removeFactor(idle, form({ factorId: OTHER }))
    expect(verifyStepUp).toHaveBeenCalled()
    expect(unenroll).toHaveBeenCalledWith({ factorId: OTHER })
    expect(result.status).toBe('saved')
  })
})
