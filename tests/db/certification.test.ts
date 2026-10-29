import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { admin, publicClient } from './clients'
import { createTestUser, deleteTestUser, type TestUser } from './users'

// Security framework controls 04 and 22; threat model T-37 to T-44; PRD 5.4 and 5.5.
// "Done when": a learner passing every core lesson is certified; expiry and threshold logic
// are tested; verification shows no email or full surname.

const ROBINA = 'TST-ROB-7K2Q9MXH'
const BURLEIGH = 'TST-BUR-5T6Y7Z8W'
const NUMBER = /^COA-\d{4}-\d{5}$/
const users: TestUser[] = []
let coreLessons: string[] = []

type Cert = {
  certificate_number: string
  check_code: string
  first_name: string
  last_name: string
  store_name_at_issue: string
  issued_at: string
  expires_at: string
  revoked_at: string | null
}

async function learner(label: string, storeCode: string | null = ROBINA): Promise<TestUser> {
  const meta: Record<string, unknown> = { first_name: 'Cert', last_name: `Tester${label}` }
  if (storeCode) meta.store_code = storeCode
  const user = await createTestUser(`cert-${label}`, meta)
  users.push(user)
  return user
}

/** Records a passed attempt for each lesson, backdated by `ageDays`. */
async function pass(user: TestUser, lessons: string[], ageDays = 0) {
  if (!lessons.length) return
  const created_at = new Date(Date.now() - ageDays * 86_400_000).toISOString()
  const { error } = await admin.from('quiz_attempts').insert(
    lessons.map((lesson_id) => ({
      user_id: user.id,
      lesson_id,
      answers: {},
      score: 3,
      total: 3,
      passed: true,
      created_at,
    })),
  )
  if (error) throw error
}

/** The internal issuer, called with the secret key (no API role can execute it, T-38). */
async function issue(user: TestUser): Promise<string | null> {
  const { data, error } = await admin.rpc('issue_certificate_if_eligible', { p_user: user.id })
  if (error) throw error
  return data as string | null
}

async function certificatesOf(user: TestUser): Promise<Cert[]> {
  const { data, error } = await admin
    .from('certificates')
    .select(
      'certificate_number, check_code, first_name, last_name, store_name_at_issue, issued_at, expires_at, revoked_at',
    )
    .eq('user_id', user.id)
    .order('issued_at')
  if (error) throw error
  return data as Cert[]
}

async function storeStatus(code: string) {
  const { data: store } = await admin.from('stores').select('id').eq('store_code', code).single()
  const { data, error } = await admin
    .from('store_status')
    .select('active_certified_staff, is_certified')
    .eq('store_id', store!.id)
    .single()
  if (error) throw error
  return data as { active_certified_staff: number; is_certified: boolean }
}

async function updateCertificate(
  number: string | null,
  patch: { expiresInMs?: number; revoked?: boolean },
) {
  const values: Record<string, string> = {}
  if (patch.expiresInMs !== undefined) {
    values.expires_at = new Date(Date.now() + patch.expiresInMs).toISOString()
    values.issued_at = new Date(Date.now() + patch.expiresInMs - 365 * 86_400_000).toISOString()
  }
  if (patch.revoked) values.revoked_at = new Date().toISOString()
  const { error, count } = await admin
    .from('certificates')
    .update(values, { count: 'exact' })
    .eq('certificate_number', number!)
  if (error) throw error
  expect(count).toBe(1)
}

async function setSetting(key: string, value: number) {
  const { error } = await admin.from('settings').update({ value }).eq('key', key)
  if (error) throw error
}

beforeAll(async () => {
  const { data, error } = await admin
    .from('lessons')
    .select('id')
    .eq('published', true)
    .eq('is_core', true)
  if (error) throw error
  coreLessons = data.map((l) => l.id)
  expect(coreLessons.length).toBeGreaterThan(1)
})

afterAll(async () => {
  for (const user of users) await deleteTestUser(user)
  await setSetting('store_certification_threshold', 2)
})

describe('issuing (decision 1, D1, decision 7)', () => {
  it('issues one certificate when the last core lesson is passed through submit_quiz', async () => {
    const pat = await learner('pat')
    const [last, ...others] = coreLessons as [string, ...string[]]
    await pass(pat, others)

    // Make the last lesson's quiz unlockable: a known duration and real elapsed watch time.
    await admin.from('lessons').update({ duration_seconds: 100 }).eq('id', last)
    const { error: saveError } = await pat.client.rpc('save_lesson_progress', {
      p_lesson_id: last,
      p_percent: 100,
      p_position_seconds: 90,
    })
    expect(saveError).toBeNull()
    await admin
      .from('lesson_progress')
      .update({ first_progress_at: new Date(Date.now() - 120_000).toISOString() })
      .eq('user_id', pat.id)
      .eq('lesson_id', last)

    const { data: questions } = await admin.from('questions').select('id').eq('lesson_id', last)
    const answers: Record<string, string> = {}
    for (const q of questions!) {
      const { data: right } = await admin
        .from('answer_options')
        .select('id')
        .eq('question_id', q.id)
        .eq('is_correct', true)
        .single()
      answers[q.id] = right!.id
    }
    const { data, error } = await pat.client
      .rpc('submit_quiz', { p_lesson_id: last, p_answers: answers })
      .single()
    await admin.from('lessons').update({ duration_seconds: null }).eq('id', last)
    expect(error).toBeNull()
    expect(data).toMatchObject({ passed: true, certified: true })

    const [cert, ...extra] = await certificatesOf(pat)
    expect(extra).toHaveLength(0)
    expect(cert!.certificate_number).toMatch(NUMBER)
    expect(cert!.check_code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}$/)
    expect(cert!).toMatchObject({
      first_name: 'Cert',
      last_name: 'Testerpat',
      store_name_at_issue: 'Test Store Robina',
      revoked_at: null,
    })
    const months =
      (new Date(cert!.expires_at).getTime() - new Date(cert!.issued_at).getTime()) /
      (30.44 * 86_400_000)
    expect(Math.round(months)).toBe(12)
  })

  it('does not certify a customer, then certifies them on joining a store', async () => {
    const casey = await learner('casey', null)
    await pass(casey, coreLessons)
    expect(await issue(casey)).toBeNull()
    expect(await certificatesOf(casey)).toHaveLength(0)

    const { error } = await casey.client.rpc('join_store', { p_code: ROBINA })
    expect(error).toBeNull()
    const certs = await certificatesOf(casey)
    expect(certs).toHaveLength(1)
    expect(certs[0]!.store_name_at_issue).toBe('Test Store Robina')
  })

  it('does not count non-core or unpublished lessons', async () => {
    const nia = await learner('nia')
    const { data: nonCore } = await admin
      .from('lessons')
      .select('id')
      .eq('published', true)
      .eq('is_core', false)
      .limit(3)
    await pass(nia, [...coreLessons.slice(1), ...nonCore!.map((l) => l.id)])
    expect(await issue(nia)).toBeNull() // one core lesson still missing

    // An unpublished core lesson is not required.
    const { data: category } = await admin.from('categories').select('id').limit(1).single()
    const { data: hidden } = await admin
      .from('lessons')
      .insert({
        category_id: category!.id,
        slug: `cert-hidden-${Date.now()}`,
        title: 'Hidden',
        is_core: true,
        published: false,
      })
      .select('id')
      .single()
    await pass(nia, [coreLessons[0]!])
    expect(await issue(nia)).toMatch(NUMBER)
    await admin.from('lessons').delete().eq('id', hidden!.id)
  })

  it('issues nothing more while a certificate is active and renewal is not open', async () => {
    const ollie = await learner('ollie')
    await pass(ollie, coreLessons)
    expect(await issue(ollie)).toMatch(NUMBER)
    expect(await issue(ollie)).toBeNull()
    expect(await certificatesOf(ollie)).toHaveLength(1)
  })
})

describe('renewal and revoking (decision 8, D3, T-44)', () => {
  it('counts only passes made after the renewal window opened', async () => {
    const rae = await learner('rae')
    await pass(rae, coreLessons, 60)
    const first = await issue(rae)
    expect(first).toMatch(NUMBER)

    // Expires in 10 days: the 30-day window opened 20 days ago, after the 60-day-old passes.
    await updateCertificate(first, { expiresInMs: 10 * 86_400_000 })
    expect(await issue(rae)).toBeNull()

    await pass(rae, coreLessons)
    const second = await issue(rae)
    expect(second).toMatch(NUMBER)
    expect(second).not.toBe(first)
    expect(await certificatesOf(rae)).toHaveLength(2)
  })

  it('never reissues after a revoke', async () => {
    const vic = await learner('vic')
    await pass(vic, coreLessons)
    const number = await issue(vic)
    await updateCertificate(number, { expiresInMs: -1000, revoked: true })
    await pass(vic, coreLessons)
    expect(await issue(vic)).toBeNull()
  })
})

describe('certificate numbers under concurrency (T-37)', () => {
  it('20 learners issued at once get 20 distinct, consecutive numbers', async () => {
    const crowd = await Promise.all(Array.from({ length: 20 }, (_, i) => learner(`crowd${i}`)))
    await Promise.all(crowd.map((u) => pass(u, coreLessons)))
    const numbers = await Promise.all(crowd.map(issue))
    expect(numbers.every((n) => n !== null && NUMBER.test(n))).toBe(true)
    expect(new Set(numbers).size).toBe(20)
    const seq = numbers.map((n) => Number(n!.slice(-5))).sort((a, b) => a - b)
    expect(seq[19]! - seq[0]!).toBe(19) // one run, no gaps
  })

  it('10 parallel issues for one learner create exactly one certificate', async () => {
    const twin = await learner('twin')
    await pass(twin, coreLessons)
    const results = await Promise.all(Array.from({ length: 10 }, () => issue(twin)))
    expect(results.filter((n) => n !== null)).toHaveLength(1)
    expect(await certificatesOf(twin)).toHaveLength(1)
  })
})

describe('store status (PRD 5.5, 6.3; decision 6)', () => {
  it('counts the current store, active certificates only, against the threshold', async () => {
    const before = await storeStatus(BURLEIGH)
    const ann = await learner('ann', BURLEIGH)
    const ben = await learner('ben', BURLEIGH)
    for (const u of [ann, ben]) {
      await pass(u, coreLessons)
      await issue(u)
    }
    let status = await storeStatus(BURLEIGH)
    expect(status.active_certified_staff).toBe(before.active_certified_staff + 2)
    expect(status.is_certified).toBe(true)

    // Expiry takes effect on the next read, with no job.
    const [annCert] = await certificatesOf(ann)
    await updateCertificate(annCert!.certificate_number, { expiresInMs: -60_000 })
    status = await storeStatus(BURLEIGH)
    expect(status.active_certified_staff).toBe(before.active_certified_staff + 1)

    // Moving store moves the count; the certificate keeps its store at issue.
    const robinaBefore = await storeStatus(ROBINA)
    await ben.client.rpc('join_store', { p_code: ROBINA })
    expect((await storeStatus(BURLEIGH)).active_certified_staff).toBe(before.active_certified_staff)
    expect((await storeStatus(ROBINA)).active_certified_staff).toBe(
      robinaBefore.active_certified_staff + 1,
    )
    expect((await certificatesOf(ben))[0]!.store_name_at_issue).toBe('Other Store Burleigh')

    // The threshold is a setting.
    await setSetting('store_certification_threshold', 1)
    expect((await storeStatus(ROBINA)).is_certified).toBe(true)
    await setSetting('store_certification_threshold', 2)
  })

  it('certified_stores returns business fields for certified stores only', async () => {
    await setSetting('store_certification_threshold', 1)
    const { data, error } = await publicClient.rpc('certified_stores')
    await setSetting('store_certification_threshold', 2)
    expect(error).toBeNull()
    const rows = data as Record<string, unknown>[]
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows)
      expect(Object.keys(row).sort()).toEqual(['country', 'name', 'state', 'suburb'])
    expect(rows.map((r) => r.name)).not.toContain('Test Store Closed')
  })
})

describe('verification (PRD 5.4; T-39, T-40)', () => {
  it('needs the check code and returns six fields, with no surname or email', async () => {
    const vera = await learner('vera')
    await pass(vera, coreLessons)
    const number = await issue(vera)
    const [cert] = await certificatesOf(vera)
    const code = `${number}-${cert!.check_code}`

    const { data } = await publicClient.rpc('verify_certificate', { p_code: code.toLowerCase() })
    const rows = data as Record<string, unknown>[]
    expect(rows).toHaveLength(1)
    expect(Object.keys(rows[0]!).sort()).toEqual([
      'expires_at',
      'first_name',
      'issued_at',
      'last_initial',
      'status',
      'store_name',
    ])
    expect(rows[0]).toMatchObject({
      first_name: 'Cert',
      last_initial: 'T',
      status: 'active',
      store_name: 'Test Store Robina',
    })
    expect(JSON.stringify(rows)).not.toContain('Testervera')
    expect(JSON.stringify(rows)).not.toContain(vera.email)

    const wrongCode = cert!.check_code === 'AAAA' ? 'BBBB' : 'AAAA'
    for (const bad of [number!, `${number}-${wrongCode}`, `${number}-`, `x${code}`, '']) {
      const { data: none } = await publicClient.rpc('verify_certificate', { p_code: bad })
      expect(none).toEqual([])
    }
  })

  it('reports expired and revoked certificates', async () => {
    const eli = await learner('eli')
    await pass(eli, coreLessons)
    const number = await issue(eli)
    const [cert] = await certificatesOf(eli)
    const code = `${number}-${cert!.check_code}`
    const statusOf = async () =>
      (
        (await publicClient.rpc('verify_certificate', { p_code: code })).data as {
          status: string
        }[]
      )[0]!.status

    await updateCertificate(number, { expiresInMs: -1000 })
    expect(await statusOf()).toBe('expired')
    await updateCertificate(number, { revoked: true })
    expect(await statusOf()).toBe('revoked')
  })
})

describe('access (T-38, T-41)', () => {
  let owner: TestUser
  let other: TestUser
  const columns = 'certificate_number, check_code, first_name, last_name, issued_at, expires_at'

  beforeAll(async () => {
    owner = await learner('owner')
    other = await learner('other')
    await pass(owner, coreLessons)
    await issue(owner)
  })

  it('learners read only their own certificates', async () => {
    const own = await owner.client.from('certificates').select(columns)
    expect(own.error).toBeNull()
    expect(own.data).toHaveLength(1)
    const theirs = await other.client.from('certificates').select(columns)
    expect(theirs.data).toEqual([])
  })

  it('nobody writes certificates, reads the counter or the store view, or runs the issuer', async () => {
    const client: SupabaseClient = other.client
    const insert = await client.from('certificates').insert({
      certificate_number: 'COA-2026-99999',
      check_code: 'AAAA',
      user_id: other.id,
      store_name_at_issue: 'x',
      first_name: 'x',
      last_name: 'x',
      expires_at: new Date(Date.now() + 1e10).toISOString(),
    })
    expect(insert.error).not.toBeNull()
    const update = await owner.client
      .from('certificates')
      .update({ revoked_at: null })
      .eq('user_id', owner.id)
    expect(update.error).not.toBeNull()
    expect((await client.from('certificate_counters').select('year')).error?.code).toBe('42501')
    expect((await client.from('store_status').select('store_id')).error?.code).toBe('42501')
    expect(
      (await client.rpc('issue_certificate_if_eligible', { p_user: other.id })).error,
    ).not.toBeNull()
    expect(
      (await publicClient.rpc('issue_certificate_if_eligible', { p_user: other.id })).error,
    ).not.toBeNull()
  })

  it("my_store_status reports the learner's own store", async () => {
    const { data, error } = await owner.client.rpc('my_store_status').single()
    expect(error).toBeNull()
    expect(data).toMatchObject({ store_name: 'Test Store Robina', threshold: 2 })
  })
})
