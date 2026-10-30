import { describe, expect, it } from 'vitest'
import { qrSvg, qrUrl } from './qr'

const SITE = 'https://carbonoffroadacademy.netlify.app'

describe('qrUrl (decision 10, BRAND p.52)', () => {
  it('points at the short link with UTM source, medium qr and campaign', () => {
    expect(qrUrl(SITE, 'winch-fitting', 'packaging', 'launch-2026')).toBe(
      `${SITE}/go/winch-fitting?utm_source=packaging&utm_medium=qr&utm_campaign=launch-2026`,
    )
  })

  it("refuses UTM values that aren't lower case, digits and hyphens", () => {
    for (const bad of ['', 'Packaging', 'pack aging', 'a&b=c', 'x'.repeat(41)]) {
      expect(() => qrUrl(SITE, 'winch-fitting', bad, 'launch')).toThrow()
      expect(() => qrUrl(SITE, 'winch-fitting', 'packaging', bad)).toThrow()
    }
  })
})

describe('qrSvg', () => {
  it('is plain SVG markup with no script, the same for the same input', () => {
    const svg = qrSvg(`${SITE}/go/winch-fitting?utm_source=packaging`)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('viewBox=')
    expect(svg).not.toMatch(/<script|on\w+=/i)
    expect(qrSvg(`${SITE}/go/winch-fitting?utm_source=packaging`)).toBe(svg)
  })
})
