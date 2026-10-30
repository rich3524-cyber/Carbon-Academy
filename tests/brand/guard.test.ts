import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function filesIn(dir: string, extensions: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return filesIn(path, extensions)
    return extensions.some((ext) => name.endsWith(ext)) ? [path] : []
  })
}

const generatedTypes = join(root, 'src', 'types')
const sourceFiles = filesIn(join(root, 'src'), ['.ts', '.tsx']).filter(
  (path) => !/\.test\.tsx?$/.test(path) && !path.startsWith(generatedTypes),
)
const copyFiles = [...sourceFiles, join(root, 'supabase', 'seed.sql')]

function offenders(files: string[], pattern: RegExp): string[] {
  return files.flatMap((file) => {
    let text: string
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      return []
    }
    return text
      .split('\n')
      .flatMap((line, i) =>
        pattern.test(line) ? [`${relative(root, file)}:${i + 1}: ${line.trim()}`] : [],
      )
  })
}

describe('brand guard', () => {
  it('uses no banned words (BRAND.md writing rules, p.17)', () => {
    const banned =
      /\b(mate|cheap|budget|unbreakable|indestructible|bulletproof|game-changer|revolutionary|next-level|send it|full send|yolo)\b/i
    expect(offenders(copyFiles, banned)).toEqual([])
  })

  it('never says "Australian made" (p.4)', () => {
    expect(offenders(copyFiles, /australian[\s-]+made/i)).toEqual([])
  })

  // Account handles in URLs (facebook.com/CarbonOffroadAU) are addresses, not copy, so a
  // name straight after "/" or "@" is allowed. So are file names, which follow the p.50
  // convention (CarbonOffroad_Certificate_...), so the name may be joined to an underscore.
  it('spells the brand name as two words (p.16)', () => {
    expect(offenders(copyFiles, /(?<![/@])CarbonOffroad(?!_)|Carbon Off[\s-]Road/)).toEqual([])
  })

  // Email HTML can't use CSS tokens, so BRAND.md gives the email colours as hex (p.45). Only the
  // email templates may use them.
  it('uses colour tokens, not raw hex values, in components', () => {
    const emailTemplates = join(root, 'src', 'lib', 'email')
    const files = sourceFiles.filter((path) => !path.startsWith(emailTemplates))
    expect(offenders(files, /#[0-9a-fA-F]{3,8}\b/)).toEqual([])
  })

  // BRAND.md "Website style" (approved 29 Oct 2026): rounded corners match carbonoffroad.com.au,
  // but only through the named radius tokens, never Tailwind's defaults or arbitrary values.
  it('rounds corners only with the named website radius tokens', () => {
    const allowed = /^rounded(-(t|b|l|r|s|e|tl|tr|bl|br))?-(pill|card|field|tile)$/
    const bad = sourceFiles.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, i) =>
          (line.match(/(?<![\w-])rounded(?:-[\w[\]]+)*/g) ?? [])
            .filter((token) => !allowed.test(token))
            .map((token) => `${relative(root, file)}:${i + 1}: ${token}`),
        ),
    )
    expect(bad).toEqual([])
  })

  it('recognises allowed and disallowed radius classes', () => {
    const allowed = /^rounded(-(t|b|l|r|s|e|tl|tr|bl|br))?-(pill|card|field|tile)$/
    for (const ok of [
      'rounded-pill',
      'rounded-card',
      'rounded-t-card',
      'rounded-field',
      'rounded-tile',
    ]) {
      expect(allowed.test(ok)).toBe(true)
    }
    for (const no of ['rounded', 'rounded-lg', 'rounded-full', 'rounded-[25px]', 'rounded-t-lg']) {
      expect(allowed.test(no)).toBe(false)
    }
  })
})
