// Fails the build if a server-only secret appears in browser JavaScript (security framework control 10).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const serverOnlyNames = ['SUPABASE_SECRET_KEY', 'VIMEO_ACCESS_TOKEN']
const needles = [
  ...serverOnlyNames
    .map((name) => process.env[name])
    .filter((value) => value && value.length >= 12),
  'sb_secret_',
]

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

const clientFiles = files('.next/static')
const hits = clientFiles.filter((file) => {
  const text = readFileSync(file, 'utf8')
  return needles.some((needle) => text.includes(needle))
})

if (hits.length > 0) {
  console.error('Server secret found in client bundle:\n' + hits.join('\n'))
  process.exit(1)
}
console.log(`No server secrets found in ${clientFiles.length} client files.`)
