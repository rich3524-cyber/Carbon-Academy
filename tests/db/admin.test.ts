import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { admin, publicClient } from './clients'
import { backdateTotp, localSql, sessionCount } from './sql'
import { totp } from './totp'
import {
  clientWithToken,
  createTestAdmin,
  createTestUser,
  deleteTestUser,
  signInAs,
  type TestAdmin,
  type TestUser,
} from './users'

// Security framework controls 03, 04 and 15; threat model T-45 to T-55; Phase 6 plan Task 5.
// "Done when" 1: nobody but a current admin gets anything from an admin function.

const ROBINA = 'TST-ROB-7K2Q9MXH'
const CODE = /^[A-Z]{2,5}-[A-Z]{2,5}-[0-9A-HJKMNP-TV-Z]{8}$/
const users: TestUser[] = []
const created = { lessons: [] as string[], categories: [] as string[], partners: [] as string[] }

let boss: TestAdmin
let refused: [string, SupabaseClient][] = []
let robinaId: string
let categoryId: string
let coreLessons: string[] = []

async function track<T extends TestUser>(user: Promise<T>): Promise<T> {
  const value = await user
  users.push(value)
  return value
}

async function learner(label: string, meta: Record<string, unknown> = {}): Promise<TestUser> {
  return track(createTestUser(`adm-${label}`, { first_name: 'Admin', last_name: label, ...meta }))
}

/** Calls an admin function as the client and returns { data, code }. */
async function call(client: SupabaseClient, fn: string, args: Record<string, unknown> = {}) {
  const { data, error } = await client.rpc(fn, args)
  return { data, code: error?.code ?? null }
}

async function ok<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await boss.client.rpc(fn, args)
  if (error) throw new Error(`${fn}: ${error.code} ${error.message}`)
  return data as T
}

async function auditRows(action: string) {
  const { data, error } = await admin
    .from('admin_audit_log')
    .select('actor_id, actor_name, target_id, details')
    .eq('action', action)
    .order('id', { ascending: false })
  if (error) throw error
  return data
}

/** Runs the write and checks it left exactly one audit row for the action, naming the admin. */
async function expectAudited<T>(action: string, write: () => Promise<T>): Promise<T> {
  const before = (await auditRows(action)).length
  const result = await write()
  const rows = await auditRows(action)
  expect(rows.length - before).toBe(1)
  expect(rows[0]?.actor_name).toBe('Admin boss')
  return result
}

async function newLesson(slug: string, overrides: Record<string, unknown> = {}): Promise<string> {
  const id = await ok<string>('admin_save_lesson', {
    p_id: null,
    p_category: categoryId,
    p_slug: slug,
    p_title: `Admin test ${slug}`,
    p_summary: null,
    p_product_name: null,
    p_vimeo_id: '76979871',
    p_duration_seconds: 62,
    p_is_core: false,
    p_region: 'AU',
    p_published: false,
    ...overrides,
  })
  created.lessons.push(id)
  return id
}

function quiz(correct: number[] = [1, 1], options = 3) {
  return correct.map((count, q) => ({
    prompt: `Question ${q + 1}`,
    options: Array.from({ length: options }, (_, i) => ({
      text: `Option ${i + 1}`,
      correct: i < count,
    })),
  }))
}

async function newStore(name: string): Promise<{ id: string; code: string }> {
  const partner = await ok<string>('admin_save_partner', {
    p_id: null,
    p_name: `Admin Test Partner ${name}`,
    p_type: 'retailer',
    p_parent_group: null,
  })
  created.partners.push(partner)
  const id = await ok<string>('admin_save_store', {
    p_id: null,
    p_partner: partner,
    p_name: `Admin Test ${name}`,
    p_suburb: 'Robina',
    p_state: 'QLD',
    p_country: 'AU',
    p_active: true,
    p_prefix: 'TSA',
    p_location: 'ADM',
  })
  const { data } = await admin.from('stores').select('store_code').eq('id', id).single()
  return { id, code: data!.store_code }
}

async function passAllCore(user: TestUser) {
  const { error } = await admin.from('quiz_attempts').insert(
    coreLessons.map((lesson_id) => ({
      user_id: user.id,
      lesson_id,
      answers: {},
      score: 3,
      total: 3,
      passed: true,
    })),
  )
  if (error) throw error
}

beforeAll(async () => {
  boss = await track(createTestAdmin('boss'))
  // Enrolled and verified once, then signed in again: a new session at aal1.
  const aal1 = await track(createTestAdmin('aal1'))
  const unverified = { client: await signInAs(aal1.email) }
  const stale = await track(createTestAdmin('stale'))
  backdateTotp(stale.id, 540)
  const off = await track(createTestAdmin('off'))
  await admin.from('profiles').update({ active: false }).eq('id', off.id)
  const out = await track(createTestAdmin('out'))
  const token = (await out.client.auth.getSession()).data.session!.access_token
  await out.client.auth.signOut()
  const plain = await learner('plain', { store_code: ROBINA })
  refused = [
    ['anon', publicClient],
    ['learner', plain.client],
    ['admin at aal1', unverified.client],
    ['admin 9 hours stale', stale.client],
    ['deactivated admin', off.client],
    ['signed-out admin (copied token)', clientWithToken(token)],
  ]

  const { data: store } = await admin.from('stores').select('id').eq('store_code', ROBINA).single()
  robinaId = store!.id
  const { data: lessons } = await admin
    .from('lessons')
    .select('id')
    .eq('published', true)
    .eq('is_core', true)
  coreLessons = (lessons ?? []).map((l) => l.id)
  categoryId = await ok<string>('admin_save_category', {
    p_id: null,
    p_slug: `admin-test-${Date.now()}`,
    p_name: 'Admin test category',
    p_description: null,
  })
  created.categories.push(categoryId)
}, 120_000)

afterAll(async () => {
  for (const id of created.lessons) await admin.from('lessons').delete().eq('id', id)
  for (const id of created.categories) await admin.from('categories').delete().eq('id', id)
  for (const id of created.partners) {
    await admin.from('stores').delete().eq('partner_id', id)
    await admin.from('partners').delete().eq('id', id)
  }
  for (const user of users) await deleteTestUser(user)
})

describe('admin access', () => {
  it('every admin_* function refuses everyone but a current admin', async () => {
    // Enumerated from the database, so a new function can't be missed (T-45).
    const functions = localSql(
      `select proname || ':' || coalesce(array_to_string(proargnames[1:pronargs], ','), '')
       from pg_proc
       where pronamespace = 'public'::regnamespace and proname like 'admin\\_%'
         and proname not in ('admin_access') order by 1`,
    )
      .split('\n')
      .map((line) => {
        const [name, args] = line.split(':')
        return { name: name!, args: args ? args.split(',') : [] }
      })
    expect(functions.length).toBeGreaterThanOrEqual(30)
    const failures: string[] = []
    for (const { name, args } of functions) {
      const nulls = Object.fromEntries(args.map((arg) => [arg, null]))
      for (const [who, client] of refused) {
        const { code } = await call(client, name, nulls)
        if (code !== '42501') failures.push(`${name} as ${who}: ${code}`)
      }
    }
    expect(failures).toEqual([])
  }, 120_000)

  it("admin_access tells a learner only 'none', and an admin 'enrol', 'verify' or 'ok'", async () => {
    const fresh = await track(createTestAdmin('fresh', { enrolled: false }))
    const states = Object.fromEntries(
      await Promise.all(
        refused.map(async ([who, client]) => [who, (await call(client, 'admin_access')).data]),
      ),
    )
    expect(states).toEqual({
      anon: null,
      learner: 'none',
      'admin at aal1': 'verify',
      'admin 9 hours stale': 'verify',
      'deactivated admin': 'none',
      'signed-out admin (copied token)': 'none',
    })
    expect((await call(fresh.client, 'admin_access')).data).toBe('enrol')
    expect((await call(boss.client, 'admin_access')).data).toBe('ok')
    expect((await call(publicClient, 'admin_access')).code).toBe('42501')
  })

  it('high-risk functions need a TOTP in the last 5 minutes', async () => {
    const store = await newStore('stepup')
    const target = await learner('target')
    const resettable = await track(createTestAdmin('resettable'))
    const certified = await learner('certified', { store_code: ROBINA })
    await passAllCore(certified)
    await admin.rpc('issue_certificate_if_eligible', { p_user: certified.id })
    const { data: cert } = await admin
      .from('certificates')
      .select('id')
      .eq('user_id', certified.id)
      .single()
    const goner = await learner('goner')

    const calls: [string, Record<string, unknown>][] = [
      ['admin_regenerate_store_code', { p_store: store.id, p_prefix: 'TSA', p_location: 'ADM' }],
      ['admin_set_role', { p_user: target.id, p_role: 'learner' }],
      ['admin_reset_mfa', { p_user: resettable.id }],
      ['admin_revoke_certificate', { p_certificate: cert!.id, p_reason: 'Test revoke' }],
      ['admin_reinstate_certificate', { p_certificate: cert!.id }],
      ['admin_delete_learner', { p_user: goner.id, p_confirm_name: 'Admin goner' }],
      ['admin_save_settings', { p_values: {} }],
      ['admin_log_export', { p_report: 'audit', p_rows: 0 }],
    ]
    backdateTotp(boss.id, 6)
    for (const [fn, args] of calls) {
      expect([fn, (await call(boss.client, fn, args)).code]).toEqual([fn, 'CAA01'])
    }
    await boss.stepUp()
    for (const [fn, args] of calls) {
      expect([fn, (await call(boss.client, fn, args)).code]).toEqual([fn, null])
    }
  })

  it('plain admin functions work at aal2 without step-up', async () => {
    backdateTotp(boss.id, 6)
    await newLesson(`plain-${Date.now()}`)
    await newStore('plain')
    expect(await ok('admin_overview')).toHaveProperty('learners')
  })
})

describe('audit log', () => {
  it('every write leaves exactly one audit row, naming the operator', async () => {
    await boss.stepUp()
    const slug = `audit-${Date.now()}`
    const lesson = await expectAudited('lesson_saved', () => newLesson(slug))
    await newLesson(`${slug}-b`)
    await expectAudited('lesson_moved', () =>
      ok('admin_move_lesson', { p_id: lesson, p_direction: 1 }),
    )
    await expectAudited('category_moved', () =>
      ok('admin_move_category', { p_id: categoryId, p_direction: -1 }),
    )
    await expectAudited('category_saved', () =>
      ok('admin_save_category', {
        p_id: categoryId,
        p_slug: `admin-test-${Date.now()}`,
        p_name: 'Admin test category',
        p_description: 'Edited',
      }),
    )
    await expectAudited('quiz_saved', () =>
      ok('admin_save_quiz', { p_lesson: lesson, p_questions: quiz() }),
    )
    const store = await expectAudited('store_saved', () => newStore('audit'))
    await expectAudited('partner_saved', () =>
      ok('admin_save_partner', {
        p_id: null,
        p_name: 'Admin Test Partner audit-2',
        p_type: null,
        p_parent_group: 'Test Group',
      }).then((id) => created.partners.push(id as string)),
    )
    await expectAudited('store_code_regenerated', () =>
      ok('admin_regenerate_store_code', { p_store: store.id, p_prefix: 'TSA', p_location: 'AUD' }),
    )
    await expectAudited('qr_link_saved', () =>
      ok('admin_save_qr_link', { p_id: null, p_slug: `qr-${slug}`, p_lesson: lesson }),
    )
    const mover = await learner('mover-audit')
    await expectAudited('learner_store_changed', () =>
      ok('admin_set_learner_store', { p_user: mover.id, p_store: store.id }),
    )
    await expectAudited('learner_deactivated', () =>
      ok('admin_set_learner_active', { p_user: mover.id, p_active: false }),
    )
    await expectAudited('learner_activated', () =>
      ok('admin_set_learner_active', { p_user: mover.id, p_active: true }),
    )
    await expectAudited('report_exported', () =>
      ok('admin_log_export', { p_report: 'certified-staff', p_rows: 3 }),
    )
    await admin.from('qr_links').delete().eq('slug', `qr-${slug}`)
    const draft = await newLesson(`${slug}-gone`)
    await expectAudited('lesson_deleted', () => ok('admin_delete_lesson', { p_id: draft }))

    const listed = await ok<{ actor_name: string; action: string }[]>('admin_list_audit', {
      p_action: 'lesson_deleted',
      p_before: null,
    })
    expect(listed[0]).toMatchObject({ actor_name: 'Admin boss', action: 'lesson_deleted' })
  })

  it('nobody reads or writes the audit table directly, admins included', async () => {
    const someone = refused[1]![1]
    for (const client of [someone, boss.client]) {
      const read = await client.from('admin_audit_log').select('id').limit(1)
      expect(read.error?.code).toBe('42501')
      const insert = await client.from('admin_audit_log').insert({
        actor_id: boss.id,
        actor_name: 'x',
        action: 'settings_changed',
        target_type: 'settings',
      })
      expect(insert.error?.code).toBe('42501')
      const update = await client.from('admin_audit_log').update({ actor_name: 'x' }).gt('id', 0)
      expect(update.error?.code).toBe('42501')
      const remove = await client.from('admin_audit_log').delete().gt('id', 0)
      expect(remove.error?.code).toBe('42501')
    }
  })

  it('store codes never reach the audit log', async () => {
    await boss.stepUp()
    const store = await newStore('secret')
    const fresh = await ok<string>('admin_regenerate_store_code', {
      p_store: store.id,
      p_prefix: 'TSA',
      p_location: 'SEC',
    })
    const { data } = await admin.from('admin_audit_log').select('details').eq('target_id', store.id)
    const text = JSON.stringify(data)
    for (const code of [store.code, fresh]) {
      expect(text).not.toContain(code)
      expect(text).not.toContain(code.slice(-8))
    }
  })
})

describe('stores and roles', () => {
  it('regenerating a code stops the old one at once', async () => {
    await boss.stepUp()
    const store = await newStore('regen')
    expect(store.code).toMatch(CODE)
    const fresh = await ok<string>('admin_regenerate_store_code', {
      p_store: store.id,
      p_prefix: 'TSA',
      p_location: 'NEW',
    })
    expect(fresh).toMatch(CODE)
    expect(fresh).not.toBe(store.code)
    expect((await publicClient.rpc('lookup_store', { p_code: store.code })).data).toEqual([])
    expect((await publicClient.rpc('lookup_store', { p_code: fresh })).data).toHaveLength(1)
  })

  it("role guards: not yourself, the last admin stays, admins can't be deactivated or deleted", async () => {
    await boss.stepUp()
    expect(
      (await call(boss.client, 'admin_set_role', { p_user: boss.id, p_role: 'learner' })).code,
    ).toBe('CAA02')
    const a = await track(createTestAdmin('pair-a'))
    const b = await track(createTestAdmin('pair-b'))
    await Promise.allSettled([
      a.client.rpc('admin_set_role', { p_user: b.id, p_role: 'learner' }),
      b.client.rpc('admin_set_role', { p_user: a.id, p_role: 'learner' }),
    ])
    const { data } = await admin.from('profiles').select('role').in('id', [a.id, b.id])
    expect(data!.filter((row) => row.role === 'admin')).toHaveLength(1)

    const other = await track(createTestAdmin('other'))
    expect(
      (await call(boss.client, 'admin_set_learner_active', { p_user: other.id, p_active: false }))
        .code,
    ).toBe('CAA02')
    expect(
      (
        await call(boss.client, 'admin_delete_learner', {
          p_user: other.id,
          p_confirm_name: 'Admin other',
        })
      ).code,
    ).toBe('CAA02')
    expect(
      (await call(boss.client, 'admin_set_learner_active', { p_user: boss.id, p_active: false }))
        .code,
    ).toBe('CAA02')
  })

  it('a demoted or deactivated account loses access on its next call', async () => {
    const demoted = await track(createTestAdmin('demoted'))
    expect((await call(demoted.client, 'admin_overview')).code).toBeNull()
    await boss.stepUp()
    await expectAudited('role_changed', () =>
      ok('admin_set_role', { p_user: demoted.id, p_role: 'learner' }),
    )
    expect((await call(demoted.client, 'admin_overview')).code).toBe('42501')

    const leaver = await learner('leaver', { store_code: ROBINA })
    expect(sessionCount(leaver.id)).toBeGreaterThan(0)
    await ok('admin_set_learner_active', { p_user: leaver.id, p_active: false })
    expect(sessionCount(leaver.id)).toBe(0)
    const { data } = await leaver.client.from('profiles').select('id')
    expect(data ?? []).toEqual([])
  })
})

describe('MFA changes', () => {
  it('admin_reset_mfa removes factors and sessions, audited by the resetting admin', async () => {
    const locked = await track(createTestAdmin('locked'))
    await boss.stepUp()
    await expectAudited('mfa_reset', () => ok('admin_reset_mfa', { p_user: locked.id }))
    expect(localSql(`select count(*) from auth.mfa_factors where user_id = '${locked.id}'`)).toBe(
      '0',
    )
    expect(sessionCount(locked.id)).toBe(0)
    const removed = (await auditRows('mfa_factor_removed')).filter((r) => r.target_id === locked.id)
    expect(removed).toHaveLength(1)
    expect(removed[0]!.actor_name).toBe('Admin boss')
  })

  it('the trigger records factors an admin adds or removes through the Auth API', async () => {
    const owner = await track(createTestAdmin('owner'))
    const ofOwner = async (action: string) =>
      (await auditRows(action)).filter((r) => r.target_id === owner.id)
    const { data: backup, error } = await owner.client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Backup',
    })
    if (error) throw error
    const verified = await owner.client.auth.mfa.challengeAndVerify({
      factorId: backup.id,
      code: totp(backup.totp.secret),
    })
    expect(verified.error).toBeNull()
    expect(await ofOwner('mfa_factor_added')).toHaveLength(2) // the first factor, then the backup
    await owner.client.auth.mfa.unenroll({ factorId: backup.id })
    const removed = await ofOwner('mfa_factor_removed')
    expect(removed).toHaveLength(1)
    expect(removed[0]!.actor_name).toBe('Admin owner')

    const plain = await learner('mfa-learner')
    const { data: factor } = await plain.client.auth.mfa.enroll({ factorType: 'totp' })
    await plain.client.auth.mfa.challengeAndVerify({
      factorId: factor!.id,
      code: totp(factor!.totp.secret),
    })
    const { data: rows } = await admin
      .from('admin_audit_log')
      .select('id')
      .eq('target_id', plain.id)
    expect(rows).toEqual([])
  })
})

describe('content', () => {
  it('quiz save enforces 3 or 4 options with exactly one correct, and keeps answers admin-only', async () => {
    const lesson = await newLesson(`quiz-${Date.now()}`)
    const bad = [
      [],
      quiz([1, 1, 1, 1, 1, 1]),
      quiz([0, 1]),
      quiz([2, 1]),
      quiz([1], 2),
      quiz([1], 5),
      [{ prompt: '', options: quiz()[0]!.options }],
    ]
    for (const questions of bad) {
      const { code } = await call(boss.client, 'admin_save_quiz', {
        p_lesson: lesson,
        p_questions: questions,
      })
      expect(code).toBe('22023')
    }
    await ok('admin_save_quiz', { p_lesson: lesson, p_questions: quiz([1, 1], 4) })
    const saved = await ok<{ quiz_ready: boolean }>('admin_get_lesson', { p_id: lesson })
    expect(saved.quiz_ready).toBe(true)
    const back = await ok<{ options: { correct: boolean }[] }[]>('admin_get_quiz', {
      p_lesson: lesson,
    })
    expect(back).toHaveLength(2)
    expect(back[0]!.options.filter((o) => o.correct)).toHaveLength(1)
    const learnerRead = await refused[1]![1].from('answer_options').select('is_correct').limit(1)
    expect(learnerRead.error?.code).toBe('42501')
  })

  it("a core lesson can't be published without a ready quiz and a duration", async () => {
    const lesson = await newLesson(`core-${Date.now()}`, { p_duration_seconds: null })
    const publish = (duration: number | null) =>
      call(boss.client, 'admin_save_lesson', {
        p_id: lesson,
        p_category: categoryId,
        p_slug: `core-edit-${lesson.slice(0, 8)}`,
        p_title: 'Core test',
        p_summary: null,
        p_product_name: null,
        p_vimeo_id: '76979871',
        p_duration_seconds: duration,
        p_is_core: true,
        p_region: 'AU',
        p_published: true,
      })
    expect((await publish(62)).code).toBe('CAA03')
    await ok('admin_save_quiz', { p_lesson: lesson, p_questions: quiz() })
    expect((await publish(null)).code).toBe('CAA03')
    expect((await publish(62)).code).toBeNull()
    // Leave it unpublished so other suites' "every core lesson" sets are unchanged.
    await admin.from('lessons').update({ published: false }).eq('id', lesson)
  })

  it("a lesson in use can't be deleted", async () => {
    const used = await newLesson(`used-${Date.now()}`)
    const someone = await learner('progress')
    await admin
      .from('lesson_progress')
      .insert({ user_id: someone.id, lesson_id: used, max_percent: 10 })
    expect((await call(boss.client, 'admin_delete_lesson', { p_id: used })).code).toBe('CAA02')
    const unused = await newLesson(`unused-${Date.now()}`)
    expect((await call(boss.client, 'admin_delete_lesson', { p_id: unused })).code).toBeNull()
  })
})

describe('learners', () => {
  it('moving a learner checks certification; revoke blocks it, reinstate restores it', async () => {
    const mover = await learner('cert-mover')
    await passAllCore(mover)
    const certifiedAtRobina = async () => {
      const { data } = await admin
        .from('store_status')
        .select('active_certified_staff')
        .eq('store_id', robinaId)
        .single()
      return data!.active_certified_staff as number
    }
    const before = await certifiedAtRobina()
    await ok('admin_set_learner_store', { p_user: mover.id, p_store: robinaId })
    const { data: cert } = await admin
      .from('certificates')
      .select('id')
      .eq('user_id', mover.id)
      .single()
    expect(cert).not.toBeNull()
    expect(await certifiedAtRobina()).toBe(before + 1)

    await boss.stepUp()
    await expectAudited('certificate_revoked', () =>
      ok('admin_revoke_certificate', { p_certificate: cert!.id, p_reason: 'Shared account' }),
    )
    expect(await certifiedAtRobina()).toBe(before)
    expect(
      (
        await call(boss.client, 'admin_revoke_certificate', {
          p_certificate: cert!.id,
          p_reason: 'Again',
        })
      ).code,
    ).toBe('CAA02')
    await expectAudited('certificate_reinstated', () =>
      ok('admin_reinstate_certificate', { p_certificate: cert!.id }),
    )
    expect(await certifiedAtRobina()).toBe(before + 1)
  })

  it('delete learner needs the exact name and removes everything', async () => {
    const goner = await learner('deleted', { store_code: ROBINA })
    await passAllCore(goner)
    await admin.rpc('issue_certificate_if_eligible', { p_user: goner.id })
    await boss.stepUp()
    expect(
      (
        await call(boss.client, 'admin_delete_learner', {
          p_user: goner.id,
          p_confirm_name: 'Someone',
        })
      ).code,
    ).toBe('22023')
    await expectAudited('learner_deleted', () =>
      ok('admin_delete_learner', { p_user: goner.id, p_confirm_name: '  admin DELETED ' }),
    )
    for (const table of ['profiles', 'quiz_attempts', 'certificates'] as const) {
      const column = table === 'profiles' ? 'id' : 'user_id'
      const { count } = await admin
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq(column, goner.id)
      expect([table, count]).toEqual([table, 0])
    }
    const [row] = (await auditRows('learner_deleted')).filter((r) => r.target_id === goner.id)
    expect(row!.details).toEqual({})
  })

  it('search escapes wildcards and needs 2 to 100 characters', async () => {
    expect((await call(boss.client, 'admin_search_learners', { p_query: 'a' })).code).toBe('22023')
    expect((await call(boss.client, 'admin_search_learners', { p_query: '%' })).code).toBe('22023')
    expect(await ok('admin_search_learners', { p_query: '%%' })).toEqual([])
    expect(await ok('admin_search_learners', { p_query: '__' })).toEqual([])
    const found = await ok<{ last_name: string }[]>('admin_search_learners', { p_query: 'boss' })
    expect(found.map((r) => r.last_name)).toContain('boss')
  })
})

describe('settings and reports', () => {
  it('settings: only known keys, within range, audited with old and new values', async () => {
    await boss.stepUp()
    for (const values of [
      { pass_mark_percent: 49 },
      { pass_mark_percent: '90' },
      { pass_mark_percent: 90.5 },
      { unknown_key: 1 },
      { warranty_registration_url: 'http://example.com' },
      { store_certification_threshold: 0 },
      { company_address: '   ' },
    ]) {
      expect((await call(boss.client, 'admin_save_settings', { p_values: values })).code).toBe(
        '22023',
      )
    }
    const { data: current } = await admin
      .from('settings')
      .select('value')
      .eq('key', 'pass_mark_percent')
      .single()
    await expectAudited('settings_changed', () =>
      ok('admin_save_settings', { p_values: { pass_mark_percent: 90 } }),
    )
    const [row] = await auditRows('settings_changed')
    expect(row!.details).toEqual({ pass_mark_percent: { from: current!.value, to: 90 } })
    await ok('admin_save_settings', { p_values: { pass_mark_percent: current!.value } })
  })

  it('reports return the documented columns and no email', async () => {
    const reports: [string, Record<string, unknown>, string[]][] = [
      [
        'admin_report_completions',
        {},
        [
          'category_name',
          'is_core',
          'lesson_id',
          'passed',
          'published',
          'started',
          'title',
          'watched',
        ],
      ],
      [
        'admin_report_certified_stores',
        {},
        [
          'certified_staff',
          'is_certified',
          'partner_name',
          'state',
          'store_id',
          'store_name',
          'suburb',
          'threshold',
        ],
      ],
      [
        'admin_report_certified_staff',
        {},
        [
          'certificate_number',
          'expires_at',
          'first_name',
          'issued_at',
          'last_name',
          'partner_name',
          'status',
          'store_name',
        ],
      ],
      [
        'admin_report_qr_scans',
        { p_from: '2026-01-01', p_to: '2026-12-31' },
        ['lesson_title', 'scans', 'slug', 'utm_source'],
      ],
    ]
    for (const [fn, args, keys] of reports) {
      const rows = await ok<Record<string, unknown>[]>(fn, args)
      expect(JSON.stringify(rows)).not.toContain('@example.com')
      if (rows[0]) expect(Object.keys(rows[0]).sort()).toEqual(keys)
    }
    expect(
      (
        await call(boss.client, 'admin_report_qr_scans', {
          p_from: '2026-02-01',
          p_to: '2026-01-01',
        })
      ).code,
    ).toBe('22023')
  })
})
