import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { admin, publicClient } from './clients'
import { clientWithToken, createTestUser, deleteTestUser, signInAs, type TestUser } from './users'

// Security framework control 04: the Phase 3 permissions matrix (docs/security/PERMISSIONS.md),
// proven against a real database. Fixture codes come from supabase/seed.sql.

const ROBINA = 'TST-ROB-7K2Q9MXH'
const NERANG = 'TST-NER-3H8W4DPA'
const INACTIVE = 'TST-OLD-9X9X9X9X'

let alice: TestUser | undefined
let bob: TestUser | undefined
let lessonId: string

beforeAll(async () => {
  alice = await createTestUser('alice', {
    first_name: '  Alice ',
    last_name: 'Tester',
    store_code: ROBINA.toLowerCase(),
    marketing_opt_in: true,
    role: 'admin',
  })
  bob = await createTestUser('bob', { first_name: 'Bob', last_name: 'Tester' })
  const { data, error } = await admin
    .from('lessons')
    .select('id')
    .eq('published', true)
    .limit(1)
    .single()
  if (error) throw error
  lessonId = data.id
})

afterAll(async () => {
  await deleteTestUser(alice)
  await deleteTestUser(bob)
})

describe('profile trigger', () => {
  it('creates a learner profile with trimmed names, store from code and consent time', async () => {
    const { data } = await admin.from('profiles').select('*').eq('id', alice!.id).single()
    expect(data).toMatchObject({ first_name: 'Alice', last_name: 'Tester', role: 'learner' })
    expect(data!.marketing_opt_in).toBe(true)
    expect(data!.marketing_opt_in_at).not.toBeNull()
    const { data: store } = await admin
      .from('stores')
      .select('id')
      .eq('store_code', ROBINA)
      .single()
    expect(data!.store_id).toBe(store!.id)
  })

  it('never takes a role from metadata', async () => {
    const { data } = await admin.from('profiles').select('role').eq('id', alice!.id).single()
    expect(data!.role).toBe('learner')
  })

  it('creates a customer (no store) when there is no code', async () => {
    const { data } = await admin
      .from('profiles')
      .select('store_id, marketing_opt_in')
      .eq('id', bob!.id)
      .single()
    expect(data).toEqual({ store_id: null, marketing_opt_in: false })
  })

  it('ignores an unknown or inactive code instead of failing', async () => {
    const user = await createTestUser('carol', {
      first_name: 'C',
      last_name: 'T',
      store_code: INACTIVE,
    })
    const { data } = await admin.from('profiles').select('store_id').eq('id', user.id).single()
    expect(data!.store_id).toBeNull()
    await deleteTestUser(user)
  })

  it('refuses a sign-up with no names (fails closed)', async () => {
    const { error } = await admin.auth.admin.createUser({
      email: `nameless-${crypto.randomUUID().slice(0, 8)}@example.com`,
      email_confirm: true,
      user_metadata: {},
    })
    expect(error).not.toBeNull()
  })

  it('caps over-long names', async () => {
    const user = await createTestUser('long', { first_name: 'x'.repeat(500), last_name: 'T' })
    const { data } = await admin.from('profiles').select('first_name').eq('id', user.id).single()
    expect(data!.first_name).toHaveLength(50)
    await deleteTestUser(user)
  })

  it('creates no profile (and records no consent) until the email is confirmed (T-26)', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `unconfirmed-${crypto.randomUUID().slice(0, 8)}@example.com`,
      email_confirm: false,
      user_metadata: { first_name: 'Eve', last_name: 'Spoof', marketing_opt_in: true },
    })
    const id = created.user!.id
    expect((await admin.from('profiles').select('id').eq('id', id)).data).toEqual([])
    await admin.auth.admin.updateUserById(id, { email_confirm: true })
    const { data } = await admin
      .from('profiles')
      .select('marketing_opt_in_at')
      .eq('id', id)
      .single()
    expect(data!.marketing_opt_in_at).not.toBeNull() // stamped at confirmation, not at request
    await admin.auth.admin.deleteUser(id)
  })

  it('refuses to set a password on an existing account (review H1, T-27)', async () => {
    // Built at run time: a literal password-like string here trips the gitleaks CI scan.
    const attempt = `${crypto.randomUUID()}${crypto.randomUUID()}`
    const { error } = await alice!.client.auth.updateUser({ password: attempt })
    expect(error).not.toBeNull()
    const { error: adminError } = await admin.auth.admin.updateUserById(alice!.id, {
      password: attempt,
    })
    expect(adminError).not.toBeNull()
  })

  it('keeps profiles.email in step with a confirmed email change', async () => {
    const user = await createTestUser('grace')
    const next = `grace-new-${crypto.randomUUID().slice(0, 8)}@example.com`
    await admin.auth.admin.updateUserById(user.id, { email: next, email_confirm: true })
    const { data } = await admin.from('profiles').select('email').eq('id', user.id).single()
    expect(data!.email).toBe(next)
    await deleteTestUser(user)
  })
})

describe('anonymous access', () => {
  // 42501 = permission denied. Asserting the code (not just "no data") means a query that fails
  // for some other reason can't pass as "refused".
  it.each(['partners', 'stores', 'profiles', 'lesson_progress'])(
    'cannot read %s',
    async (table) => {
      const { error } = await publicClient.from(table).select('*')
      expect(error?.code).toBe('42501')
    },
  )

  it.each([
    ['partners', 'id'],
    ['stores', 'id'],
    ['profiles', 'id'],
    ['lesson_progress', 'user_id'],
  ])('cannot update %s', async (table, key) => {
    const { error } = await publicClient.from(table).update({}).not(key, 'is', null)
    expect(error?.code).toBe('42501')
  })

  // 42501 = permission denied, so the test fails if a write is refused for some other reason
  // (a bad column, say) while the privilege is still there.
  it.each([
    ['partners', 'id'],
    ['stores', 'id'],
    ['profiles', 'id'],
    ['lesson_progress', 'user_id'],
  ])('cannot write or delete %s', async (table, key) => {
    const insert = await publicClient.from(table).insert({})
    expect(insert.error?.code).toBe('42501')
    const del = await publicClient.from(table).delete().not(key, 'is', null)
    expect(del.error?.code).toBe('42501')
  })

  it('looks up an active store by code, case-insensitively, without the code or id', async () => {
    const { data, error } = await publicClient.rpc('lookup_store', { p_code: ' tst-rob-7k2q9mxh ' })
    expect(error).toBeNull()
    expect(data).toEqual([
      {
        store_name: 'Test Store Robina',
        partner_name: 'Test Partner',
        suburb: 'Robina',
        state: 'QLD',
      },
    ])
  })

  it('finds nothing for an inactive, unknown or malformed code', async () => {
    for (const p_code of [INACTIVE, 'TST-ROB-00000000', "x' or 1=1 --", 'a'.repeat(500)]) {
      const { data } = await publicClient.rpc('lookup_store', { p_code })
      expect(data).toEqual([])
    }
  })

  it('cannot save progress or join a store', async () => {
    const save = await publicClient.rpc('save_lesson_progress', {
      p_lesson_id: lessonId,
      p_percent: 50,
      p_position_seconds: 10,
    })
    expect(save.error?.code).toBe('42501')
    const join = await publicClient.rpc('join_store', { p_code: ROBINA })
    expect(join.error?.code).toBe('42501')
  })

  // Tells the two layers apart: the missing grant fails with "permission denied for function",
  // the in-function check with "not signed in". This proves the grant layer on its own.
  it.each([
    ['join_store', { p_code: ROBINA }],
    [
      'save_lesson_progress',
      { p_lesson_id: '00000000-0000-4000-8000-000000000000', p_percent: 1, p_position_seconds: 1 },
    ],
    ['current_learner', {}],
    ['normalise_store_code', { p_code: 'x' }],
  ])('has no EXECUTE grant on %s', async (fn, args) => {
    const { error } = await publicClient.rpc(fn, args)
    expect(error?.code).toBe('42501')
    expect(error?.message).toMatch(/permission denied for function/)
  })
})

describe('learner access', () => {
  it('reads only their own profile', async () => {
    const { data } = await alice!.client.from('profiles').select('id')
    expect(data).toEqual([{ id: alice!.id }])
  })

  it('reads their own store without its code, and no other store', async () => {
    const { data } = await alice!.client.from('stores').select('name')
    expect(data).toEqual([{ name: 'Test Store Robina' }])
    const { error } = await alice!.client.from('stores').select('store_code')
    expect(error?.code).toBe('42501')
  })

  it('reads their own partner only, never the other partner', async () => {
    // seed.sql has two partners, so this proves cross-partner isolation, not just "one row".
    const { data } = await alice!.client.from('partners').select('name')
    expect(data).toEqual([{ name: 'Test Partner' }])
    const { data: none } = await bob!.client.from('partners').select('name')
    expect(none).toEqual([])
  })

  it('cannot update, insert or delete profiles directly', async () => {
    const update = await alice!.client
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', alice!.id)
    expect(update.error?.code).toBe('42501')
    const other = await alice!.client
      .from('profiles')
      .update({ first_name: 'Hacked' })
      .eq('id', bob!.id)
    expect(other.error?.code).toBe('42501')
    const insert = await alice!.client
      .from('profiles')
      .insert({ id: bob!.id, first_name: 'x', last_name: 'y', email: 'x@example.com' })
    expect(insert.error?.code).toBe('42501')
    const del = await alice!.client.from('profiles').delete().eq('id', alice!.id)
    expect(del.error?.code).toBe('42501')
  })

  it('cannot write stores or partners', async () => {
    const attempts = [
      alice!.client.from('stores').update({ name: 'Hacked' }).neq('name', ''),
      alice!.client.from('stores').delete().neq('name', ''),
      alice!.client.from('stores').insert({ name: 'Fake store', store_code: 'TST-FAK-AAAAAAAA' }),
      alice!.client.from('partners').insert({ name: 'Fake partner' }),
      alice!.client.from('partners').update({ name: 'Hacked' }).neq('name', ''),
      alice!.client.from('partners').delete().neq('name', ''),
    ]
    for (const { error } of await Promise.all(attempts)) expect(error?.code).toBe('42501')
    const { count } = await admin
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('name', 'Hacked')
    expect(count).toBe(0)
  })

  it('saves progress through the function and keeps the maximum percent', async () => {
    await alice!.client.rpc('save_lesson_progress', {
      p_lesson_id: lessonId,
      p_percent: 60,
      p_position_seconds: 30,
    })
    await new Promise((r) => setTimeout(r, 2100)) // the function ignores saves under 2 s apart
    await alice!.client.rpc('save_lesson_progress', {
      p_lesson_id: lessonId,
      p_percent: 20,
      p_position_seconds: 12,
    })
    const { data } = await alice!.client
      .from('lesson_progress')
      .select('max_percent, last_position_seconds, completed_at')
      .eq('lesson_id', lessonId)
      .single()
    expect(data).toEqual({ max_percent: 60, last_position_seconds: 12, completed_at: null })
  })

  it('clamps percent and marks the lesson complete at 90%', async () => {
    await new Promise((r) => setTimeout(r, 2100))
    await alice!.client.rpc('save_lesson_progress', {
      p_lesson_id: lessonId,
      p_percent: 250,
      p_position_seconds: -5,
    })
    const { data } = await alice!.client
      .from('lesson_progress')
      .select('max_percent, last_position_seconds, completed_at')
      .eq('lesson_id', lessonId)
      .single()
    expect(data!.max_percent).toBe(100)
    expect(data!.last_position_seconds).toBe(0)
    expect(data!.completed_at).not.toBeNull()
  })

  it("never sees another learner's progress", async () => {
    const { count } = await admin
      .from('lesson_progress')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', alice!.id)
    expect(count).toBeGreaterThan(0) // Alice's rows exist...
    const { data } = await bob!.client
      .from('lesson_progress')
      .select('user_id')
      .eq('user_id', alice!.id)
    expect(data).toEqual([]) // ...but Bob can't see them
  })

  it('cannot write or delete progress rows directly', async () => {
    const insert = await bob!.client
      .from('lesson_progress')
      .insert({ user_id: bob!.id, lesson_id: lessonId, max_percent: 100 })
    expect(insert.error?.code).toBe('42501')
    const update = await alice!.client
      .from('lesson_progress')
      .update({ max_percent: 100 })
      .eq('user_id', alice!.id)
    expect(update.error?.code).toBe('42501')
    const del = await alice!.client.from('lesson_progress').delete().eq('user_id', alice!.id)
    expect(del.error?.code).toBe('42501')
  })

  it('refuses progress on an unpublished lesson', async () => {
    const { data: category } = await admin.from('categories').select('id').limit(1).single()
    const { data: draft } = await admin
      .from('lessons')
      .insert({
        category_id: category!.id,
        slug: 'accounts-test-draft',
        title: '[TEST] Draft',
        published: false,
      })
      .select('id')
      .single()
    const { error } = await bob!.client.rpc('save_lesson_progress', {
      p_lesson_id: draft!.id,
      p_percent: 50,
      p_position_seconds: 5,
    })
    expect(error?.code).toBe('P0002') // "lesson not available", not a missing function
    await admin.from('lessons').delete().eq('id', draft!.id)
  })

  it('changes store only with a valid code', async () => {
    const { data: moved } = await bob!.client.rpc('join_store', { p_code: NERANG })
    expect(moved).toEqual([{ store_name: 'Test Store Nerang' }])
    const { data: refused } = await bob!.client.rpc('join_store', { p_code: INACTIVE })
    expect(refused).toEqual([])
    const { data } = await admin.from('profiles').select('store_id').eq('id', bob!.id).single()
    const { data: nerang } = await admin
      .from('stores')
      .select('id')
      .eq('store_code', NERANG)
      .single()
    expect(data!.store_id).toBe(nerang!.id)
  })

  it('deleting the auth user removes the profile and progress (retention cascade)', async () => {
    const user = await createTestUser('dave')
    await user.client.rpc('save_lesson_progress', {
      p_lesson_id: lessonId,
      p_percent: 10,
      p_position_seconds: 1,
    })
    await deleteTestUser(user)
    const { data: profile } = await admin.from('profiles').select('id').eq('id', user.id)
    const { data: progress } = await admin
      .from('lesson_progress')
      .select('user_id')
      .eq('user_id', user.id)
    expect(profile).toEqual([])
    expect(progress).toEqual([])
  })
})

describe('session end (ASVS 7.4.1, 7.4.2)', () => {
  it('stops a copied access token working at the database as soon as the learner signs out', async () => {
    const user = await createTestUser('erin')
    const { data } = await user.client.auth.getSession()
    const stale = clientWithToken(data.session!.access_token)
    expect((await stale.from('profiles').select('id')).data).toEqual([{ id: user.id }]) // works now...
    await user.client.auth.signOut({ scope: 'local' })
    expect((await stale.from('profiles').select('id')).data).toEqual([]) // ...not after sign-out
    const save = await stale.rpc('save_lesson_progress', {
      p_lesson_id: lessonId,
      p_percent: 5,
      p_position_seconds: 1,
    })
    expect(save.error).not.toBeNull()
    await deleteTestUser(user)
  })

  it('cuts off a deactivated learner straight away', async () => {
    const user = await createTestUser('frank')
    await admin.from('profiles').update({ active: false }).eq('id', user.id)
    expect((await user.client.from('profiles').select('id')).data).toEqual([])
    const join = await user.client.rpc('join_store', { p_code: ROBINA })
    expect(join.error).not.toBeNull()
    const save = await user.client.rpc('save_lesson_progress', {
      p_lesson_id: lessonId,
      p_percent: 5,
      p_position_seconds: 1,
    })
    expect(save.error).not.toBeNull()
    await deleteTestUser(user)
  })

  it('"sign out on all devices" ends the other sessions at the database too', async () => {
    const user = await createTestUser('heidi')
    const phone = await signInAs(user.email) // a second session for the same learner
    const { data } = await phone.auth.getSession()
    const phoneToken = clientWithToken(data.session!.access_token)
    expect((await phoneToken.from('profiles').select('id')).data).toEqual([{ id: user.id }])
    await user.client.auth.signOut({ scope: 'global' })
    expect((await phoneToken.from('profiles').select('id')).data).toEqual([])
    await deleteTestUser(user)
  })
})
