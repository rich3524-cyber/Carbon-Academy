import { beforeEach, describe, expect, it, vi } from 'vitest'

const getClaims = vi.fn()
const maybeSingle = vi.fn()
const eq = vi.fn(() => ({ maybeSingle }))
const select = vi.fn(() => ({ eq }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createSessionClient: async () => ({ auth: { getClaims }, from: () => ({ select }) }),
}))
const log = vi.fn()
vi.mock('@/lib/log', () => ({ logSecurityEvent: (...args: unknown[]) => log(...args) }))
vi.mock('@/lib/certificates/pdf', () => ({
  buildCertificatePdf: async () => new Uint8Array([37, 80, 68, 70]),
}))
vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://academy.example.com')

const { GET } = await import('./route')
const call = (number: string) =>
  GET(new Request(`https://academy.example.com/certificates/${number}`), {
    params: Promise.resolve({ number }),
  } as never)

const row = {
  certificate_number: 'COA-2026-00001',
  check_code: 'K7Q9',
  first_name: 'Pat',
  last_name: 'Sample',
  store_name_at_issue: 'Test Store Robina',
  issued_at: '2026-10-29T15:00:00Z',
  expires_at: '2027-10-29T15:00:00Z',
  revoked_at: null,
}

beforeEach(() => {
  log.mockReset()
  maybeSingle.mockReset().mockResolvedValue({ data: row, error: null })
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: 'user-1' } } })
})

describe('GET /certificates/[number] (a public endpoint: it authenticates itself; T-41)', () => {
  it('returns 404 for a malformed number without touching the database', async () => {
    const res = await call('../../etc')
    expect(res.status).toBe(404)
    expect(getClaims).not.toHaveBeenCalled()
  })

  it('returns 404 when signed out, and logs it', async () => {
    getClaims.mockResolvedValue({ data: null })
    expect((await call('COA-2026-00001')).status).toBe(404)
    expect(log).toHaveBeenCalledWith('certificate_pdf_denied', { code: 'signed_out' })
  })

  it("returns 404 for someone else's certificate (RLS returns no row)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })
    expect((await call('COA-2026-00001')).status).toBe(404)
    expect(log).toHaveBeenCalledWith('certificate_pdf_denied', {
      userId: 'user-1',
      code: 'not_found',
    })
  })

  it('returns 404 for a revoked certificate', async () => {
    maybeSingle.mockResolvedValue({
      data: { ...row, revoked_at: '2026-11-01T00:00:00Z' },
      error: null,
    })
    expect((await call('COA-2026-00001')).status).toBe(404)
  })

  it('gives the owner the PDF, private and uncached, with the BRAND.md file name', async () => {
    const res = await call('COA-2026-00001')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(res.headers.get('content-disposition')).toBe(
      'attachment; filename="CarbonOffroad_Certificate_COA-2026-00001_v1_20261030.pdf"',
    )
    expect(eq).toHaveBeenCalledWith('certificate_number', 'COA-2026-00001')
  })
})
