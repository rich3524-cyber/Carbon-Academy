// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAdmin = vi.fn()
const verifyStepUp = vi.fn()
const callAdmin = vi.fn()
const load = vi.fn()
const log = vi.fn()
vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))
vi.mock('@/lib/admin/access', () => ({ requireAdmin }))
vi.mock('@/lib/admin/step-up', () => ({ verifyStepUp }))
vi.mock('@/lib/admin/call', () => ({ callAdmin }))
vi.mock('@/lib/log', () => ({ logSecurityEvent: log }))
vi.mock('@/lib/site', () => ({ siteUrl: () => 'https://academy.test' }))
vi.mock('@/lib/admin/reports', async (original) => {
  const real = await original<typeof import('@/lib/admin/reports')>()
  return {
    ...real,
    REPORT_DEFINITIONS: {
      ...real.REPORT_DEFINITIONS,
      'certified-staff': { ...real.REPORT_DEFINITIONS['certified-staff'], load },
    },
  }
})

const { POST } = await import('./route')
const context = (report: string) => ({ params: Promise.resolve({ report }) })
const post = (origin: string | null) => {
  const body = new FormData()
  body.set('stepUpCode', '123456')
  body.set('stepUpFactor', '2b1f0d5e-3c4a-4b6d-9e8f-0a1b2c3d4e5f')
  return new Request('https://academy.test/admin/reports/certified-staff/export', {
    method: 'POST',
    headers: origin ? { origin } : {},
    body,
  })
}

beforeEach(() => {
  for (const mock of [requireAdmin, verifyStepUp, callAdmin, load, log]) mock.mockReset()
  verifyStepUp.mockResolvedValue(true)
  callAdmin.mockResolvedValue({ ok: true, data: null })
  load.mockResolvedValue([
    {
      partner_name: 'TST Partner',
      store_name: '+Robina',
      first_name: '=HYPERLINK("x")',
      last_name: 'Tester',
      certificate_number: 'COA-2026-00001',
      issued_at: '2026-10-29T15:00:00Z',
      expires_at: '2027-10-29T15:00:00Z',
      status: 'active',
    },
  ])
})

describe('POST /admin/reports/[report]/export', () => {
  it('refuses a cross-site or origin-less post before anything else (T-54)', async () => {
    for (const origin of ['https://evil.test', null]) {
      await expect(POST(post(origin), context('certified-staff'))).rejects.toThrow('NOT_FOUND')
    }
    expect(requireAdmin).not.toHaveBeenCalled()
    expect(load).not.toHaveBeenCalled()
  })

  it('refuses non-admins', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'))
    await expect(POST(post('https://academy.test'), context('certified-staff'))).rejects.toThrow(
      'NOT_FOUND',
    )
    expect(load).not.toHaveBeenCalled()
  })

  it('sends a failed code back to the report page without loading data', async () => {
    verifyStepUp.mockResolvedValue(false)
    const response = await POST(post('https://academy.test'), context('certified-staff'))
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(
      'https://academy.test/admin/reports/certified-staff?stepup=failed',
    )
    expect(load).not.toHaveBeenCalled()
  })

  it('returns a neutralised CSV, logged in the audit log and never cached', async () => {
    const response = await POST(post('https://academy.test'), context('certified-staff'))
    expect(callAdmin).toHaveBeenCalledWith('admin_log_export', {
      p_report: 'certified-staff',
      p_rows: 1,
    })
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('content-disposition')).toMatch(
      /^attachment; filename="CarbonOffroad_Report_CertifiedStaff_v1_\d{8}\.csv"$/,
    )
    // TextDecoder drops the byte-order mark unless told not to.
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await response.arrayBuffer())
    expect(text.startsWith('﻿')).toBe(true)
    expect(text).toContain(`"'=HYPERLINK(""x"")"`)
    expect(text).toContain(`"'+Robina"`)
    expect(text).not.toContain('@')
    expect(log).toHaveBeenCalledWith('admin_export', { action: 'certified-staff', rows: 1 })
  })

  it('gives an unknown report the same 404', async () => {
    await expect(POST(post('https://academy.test'), context('everything'))).rejects.toThrow(
      'NOT_FOUND',
    )
  })
})
