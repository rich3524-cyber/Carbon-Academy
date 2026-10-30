import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const { vimeoDuration } = await import('./oembed')

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('vimeoDuration (decision 8)', () => {
  it('reads the duration from the public oEmbed endpoint', async () => {
    const fetchSpy = respond(200, { duration: 62, title: 'Demo' })
    await expect(vimeoDuration('76979871')).resolves.toBe(62)
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      'https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F76979871',
    )
  })

  it("makes no request for an ID that isn't numeric", async () => {
    const fetchSpy = respond(200, { duration: 62 })
    await expect(vimeoDuration('76979871/abc')).resolves.toBeNull()
    await expect(vimeoDuration('https://evil.test')).resolves.toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('gives null when Vimeo refuses, times out or sends something odd', async () => {
    respond(404, {})
    await expect(vimeoDuration('76979871')).resolves.toBeNull()
    respond(200, { duration: -5 })
    await expect(vimeoDuration('76979871')).resolves.toBeNull()
    respond(200, { title: 'no duration' })
    await expect(vimeoDuration('76979871')).resolves.toBeNull()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('timed out', 'TimeoutError'))
    await expect(vimeoDuration('76979871')).resolves.toBeNull()
  })
})
