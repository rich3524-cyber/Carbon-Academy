// Prints a one-time sign-in link for a fictional @example.com user on STAGING only (EX-01).
// No email is sent. Needs .env.staging.local (git-ignored):
//   STAGING_SUPABASE_URL=https://naxngnrzjpdqvuphgbht.supabase.co
//   STAGING_SUPABASE_SECRET_KEY=...
//
//   node scripts/staging-sign-in-link.mjs https://deploy-preview-N--carbonoffroadacademy.netlify.app [label]
//   node scripts/staging-sign-in-link.mjs --delete [label]    removes the fictional user afterwards
//   node scripts/staging-sign-in-link.mjs https://deploy-preview-N--... admin --admin
//     Phase 6: makes the fictional user an admin (still @example.com, EX-01) and links to /admin,
//     where they set up an authenticator app before anything else.
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env.staging.local')
const makeAdmin = process.argv.includes('--admin')
const args = process.argv.slice(2).filter((arg) => arg !== '--admin')
const deleting = args[0] === '--delete'
const [previewOrigin, label = 'preview'] = deleting ? [undefined, args[1]] : args
if (
  !deleting &&
  !/^https:\/\/[a-z0-9-]+--carbonoffroadacademy\.netlify\.app$/.test(previewOrigin ?? '')
) {
  throw new Error(
    'Usage: node scripts/staging-sign-in-link.mjs https://deploy-preview-N--carbonoffroadacademy.netlify.app [label]',
  )
}
if (!/^[a-z0-9-]{1,30}$/.test(label))
  throw new Error('Label: lowercase letters, digits and hyphens')
// Trim: a key pasted into a text editor often picks up a stray space.
const url = (process.env.STAGING_SUPABASE_URL ?? '').trim()
const secretKey = (process.env.STAGING_SUPABASE_SECRET_KEY ?? '').trim()
if (!url.startsWith('https://naxngnrzjpdqvuphgbht.')) throw new Error('Staging project only')

const admin = createClient(url, secretKey, {
  auth: { persistSession: false },
})
const email = `${label}@example.com`

if (deleting) {
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) throw error
  const user = data.users.find((u) => u.email === email)
  if (user) await admin.auth.admin.deleteUser(user.id)
  console.log(user ? `Deleted ${email}` : `No user ${email}`)
} else {
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: makeAdmin
      ? { first_name: 'Preview', last_name: 'Admin' }
      : { first_name: 'Preview', last_name: 'Tester', store_code: 'TST-ROB-7K2Q9MXH' },
  })
  if (created.error && created.error.code !== 'email_exists') throw created.error
  if (makeAdmin) {
    const { data: users, error: listError } = await admin.auth.admin.listUsers()
    if (listError) throw listError
    const user = users.users.find((u) => u.email === email)
    if (!user) throw new Error(`No user ${email}`)
    const { error: roleError } = await admin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id)
    if (roleError) throw roleError
    console.log(`${email} is an admin on staging`)
  }
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  // The code's length (never the code) confirms the staging OTP length setting (10).
  console.log(`One-time code length: ${data.properties.email_otp?.length ?? 'unknown'}`)
  console.log(
    `${previewOrigin}/auth/confirm?next=${makeAdmin ? '%2Fadmin' : '%2Fdashboard'}#token_hash=${data.properties.hashed_token}`,
  )
}
