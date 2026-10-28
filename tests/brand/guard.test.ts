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

  it('spells the brand name as two words (p.16)', () => {
    expect(offenders(copyFiles, /CarbonOffroad|Carbon Off[\s-]Road/)).toEqual([])
  })

  it('uses colour tokens, not raw hex values, in components', () => {
    expect(offenders(sourceFiles, /#[0-9a-fA-F]{3,8}\b/)).toEqual([])
  })

  it('uses no rounded corners (p.32, p.45)', () => {
    expect(offenders(sourceFiles, /\brounded(-[a-z0-9]+)?\b/)).toEqual([])
  })
})
