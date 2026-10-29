import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Without our own icons, Netlify serves its logo at /favicon.ico. These come from the
// icon-only master (BRAND.md "Logo files"), scaled, never redrawn (p.21, p.61).

/** Width and height from a PNG's IHDR chunk. */
function pngSize(png: Buffer) {
  expect(png.subarray(1, 4).toString('latin1')).toBe('PNG')
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

describe('site icons', () => {
  it('ships a favicon.ico with 16, 32 and 48 px images', () => {
    const ico = readFileSync('src/app/favicon.ico')
    expect(ico.readUInt16LE(2)).toBe(1) // type 1 = icon
    const count = ico.readUInt16LE(4)
    const sizes = Array.from({ length: count }, (_, i) => ico.readUInt8(6 + i * 16))
    expect(sizes).toEqual([16, 32, 48])
  })

  it.each([
    ['src/app/icon.png', 32],
    ['src/app/apple-icon.png', 180],
  ])('%s is %i px square', (file, size) => {
    expect(pngSize(readFileSync(file))).toEqual({ width: size, height: size })
  })
})
