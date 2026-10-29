// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib'
import { describe, expect, it, vi } from 'vitest'
import { LOGO_PATHS, LOGO_VIEWBOX } from './logo-paths'

vi.mock('server-only', () => ({}))
const { buildCertificatePdf } = await import('./pdf')

// BRAND.md "Certificate PDF" (p.21, p.22, p.29, p.48, p.50); plan decisions 4 and 10.
const sample = {
  certificateNumber: 'COA-2026-00001',
  checkCode: 'K7Q9',
  firstName: 'Pat',
  lastName: 'Sample',
  storeName: 'Test Store Robina',
  issuedAt: '2026-10-29T15:00:00Z',
  expiresAt: '2027-10-29T15:00:00Z',
  verifyUrl: 'https://carbonoffroadacademy.netlify.app/verify/COA-2026-00001-K7Q9',
}

describe('certificate PDF', () => {
  it('is one landscape A4 page with the title property set, under 10 MB', async () => {
    const bytes = await buildCertificatePdf(sample)
    expect(bytes.length).toBeLessThan(10 * 1024 * 1024)
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBe(1)
    const { width, height } = pdf.getPage(0).getSize()
    expect(Math.round(width)).toBe(842)
    expect(Math.round(height)).toBe(595)
    expect(pdf.getTitle()).toContain('COA-2026-00001')
  })

  it('embeds its fonts (BRAND.md export rule)', async () => {
    // pdf-lib packs objects into compressed streams, so read the parsed objects, not the bytes.
    const pdf = await PDFDocument.load(await buildCertificatePdf(sample))
    const descriptors = pdf.context
      .enumerateIndirectObjects()
      .map(([, object]) => object)
      .filter((o): o is PDFDict => o instanceof PDFDict && o.has(PDFName.of('FontFile2')))
    const names = descriptors.map((d) => String(d.get(PDFName.of('FontName'))))
    expect(names).toHaveLength(2)
    expect(names.every((n) => n.includes('Arimo'))).toBe(true)
  })

  it('draws the logo from the master SVG, unchanged (p.61)', () => {
    const svg = readFileSync('public/brand/logo-full-black-transparent.svg', 'utf8')
    const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1])
    expect(LOGO_PATHS).toEqual(paths)
    expect(svg).toContain(`viewBox="0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}"`)
  })
})
