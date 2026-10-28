import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Without the Next.js runtime, Netlify publishes .next as static files: every page 404s and
// server build output becomes downloadable (29 Oct 2026 incident; security framework control 14).
const toml = readFileSync(join(process.cwd(), 'netlify.toml'), 'utf8')

describe('netlify.toml', () => {
  it('declares the Next.js runtime plugin', () => {
    expect(toml).toMatch(/\[\[plugins\]\]\s*\n\s*package\s*=\s*"@netlify\/plugin-nextjs"/)
  })

  it('runs the client-bundle secret scan after every build (control 10)', () => {
    expect(toml).toMatch(/command\s*=\s*"npm run build && npm run check:bundle"/)
  })
})
