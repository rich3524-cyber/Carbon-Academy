import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/certificates/data', () => ({
  getCertifiedStores: async () => [
    { name: 'Test Store Robina', suburb: 'Robina', state: 'QLD', country: 'AU' },
  ],
}))
const { GET } = await import('./route')

// PRD 5.5, plan decision 12, T-42: store fields only, cached, no CORS.
describe('GET /api/certified-stores', () => {
  it('returns store fields only, cached for an hour, with no CORS header', async () => {
    const res = await GET()
    const body = (await res.json()) as { stores: Record<string, unknown>[] }
    expect(Object.keys(body)).toEqual(['stores'])
    expect(Object.keys(body.stores[0]!).sort()).toEqual(['country', 'name', 'state', 'suburb'])
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600, s-maxage=3600')
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })
})
