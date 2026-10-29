// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
vi.mock('@/lib/supabase/public', () => ({
  createPublicClient: () => ({
    rpc: (...args: unknown[]) => ({ maybeSingle: () => rpc(...args) }),
  }),
}))

const { GET } = await import('./route')

// On Netlify the request URL is the deploy's own address, not the public site.
const DEPLOY_ORIGIN = 'https://6ae28e184e84352087bb9588--carbonoffroadacademy.netlify.app'

const call = (path: string, slug: string) =>
  GET(new NextRequest(`${DEPLOY_ORIGIN}${path}`), { params: Promise.resolve({ slug }) })

beforeEach(() => {
  rpc.mockReset()
})

describe('GET /go/[slug]', () => {
  it('redirects relatively, so visitors stay on the address they used', async () => {
    rpc.mockResolvedValue({
      data: { category_slug: 'winches', lesson_slug: 'scout-pro-10k-v3' },
      error: null,
    })
    const res = await call('/go/test-slug?utm_source=packaging&gclid=abc', 'test-slug')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(
      '/lessons/winches/scout-pro-10k-v3?utm_source=packaging',
    )
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('sends an unknown slug to the library', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    const res = await call('/go/no-such-slug', 'no-such-slug')
    expect(res.headers.get('location')).toBe('/lessons')
  })

  it('sends a malformed slug to the library without calling the database', async () => {
    const res = await call('/go/Not%20A%20Slug', 'Not A Slug')
    expect(res.headers.get('location')).toBe('/lessons')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('passes only the known UTM values to the database', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await call('/go/test-slug?utm_source=packaging&utm_medium=qr&email=a@b.com', 'test-slug')
    expect(rpc).toHaveBeenCalledWith('log_qr_scan', {
      p_slug: 'test-slug',
      p_utm_source: 'packaging',
      p_utm_medium: 'qr',
      p_utm_campaign: undefined,
    })
  })
})
