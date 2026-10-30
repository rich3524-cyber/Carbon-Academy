import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Decision 1 and framework section 4: every admin page, route and Server Action checks access
// itself. Layouts don't count: they don't re-run on every navigation.
const root = process.cwd()
function filesIn(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesIn(path) : [path]
  })
}
const CHECK = /\brequireAdmin(ForMfa)?\(\)/

describe('admin guard', () => {
  it('every admin page and route calls requireAdmin', () => {
    const entries = filesIn(join(root, 'src', 'app', 'admin')).filter((f) =>
      /[\\/](page|route)\.tsx?$/.test(f),
    )
    expect(entries.length).toBeGreaterThan(10)
    const missing = entries.filter((f) => !CHECK.test(readFileSync(f, 'utf8')))
    expect(missing.map((f) => relative(root, f))).toEqual([])
  })

  it('every exported admin Server Action calls requireAdmin first', () => {
    const files = filesIn(join(root, 'src', 'lib', 'admin', 'actions')).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
    )
    expect(files.length).toBeGreaterThan(3)
    const missing = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split(/(?=export async function )/)
        .filter((chunk) => chunk.startsWith('export async function '))
        .filter((chunk) => !CHECK.test(chunk))
        .map((chunk) => `${relative(root, file)}: ${chunk.slice(22, chunk.indexOf('('))}`),
    )
    expect(missing).toEqual([])
  })

  it('admin action files are Server Action modules', () => {
    const files = filesIn(join(root, 'src', 'lib', 'admin', 'actions')).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
    )
    const notActions = files.filter((f) => !readFileSync(f, 'utf8').startsWith("'use server'"))
    expect(notActions.map((f) => relative(root, f))).toEqual([])
  })
})
