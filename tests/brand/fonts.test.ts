import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

// Unlicensed font files must never be committed (CLAUDE.md, BRAND.md). The only fonts in the
// repo are Arimo Regular and Bold (SIL OFL 1.1) for the certificate PDF, shipped with their licence.
const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n')

describe('font files', () => {
  it('commits only the OFL-licensed Arimo fonts, with their licence', () => {
    const fonts = tracked.filter((f) => /\.(ttf|otf|woff2?)$/i.test(f)).sort()
    expect(fonts).toEqual([
      'src/lib/certificates/fonts/Arimo-Bold.ttf',
      'src/lib/certificates/fonts/Arimo-Regular.ttf',
    ])
    expect(tracked).toContain('src/lib/certificates/fonts/OFL.txt')
  })

  it('never commits Eurostile', () => {
    expect(tracked.filter((f) => /eurostile/i.test(f))).toEqual([])
  })
})
