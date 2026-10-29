import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { admin, publicClient } from './clients'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createTestUser, deleteTestUser, type TestUser } from './users'

// Security framework controls 04, 05 and 22; threat model T-20 and T-30 to T-36.
// "Done when": is_correct can't be retrieved by a learner through any API route, and the
// quiz stays locked until 90% watched.

const DURATION = 100 // seconds; the watch-time check needs 45 s since the first save
let alice: TestUser | undefined
let bob: TestUser | undefined
let lessonId: string
let unpublishedId: string
const correct: Record<string, string> = {} // question id -> correct option id
const wrong: Record<string, string> = {} // question id -> a wrong option id

async function makeLesson(published: boolean, duration: number | null) {
  const { data: category } = await admin.from('categories').select('id').limit(1).single()
  const { data, error } = await admin
    .from('lessons')
    .insert({
      category_id: category!.id,
      slug: `quiz-test-${crypto.randomUUID().slice(0, 8)}`,
      title: 'Quiz test lesson',
      duration_seconds: duration,
      published,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

async function addQuestion(lesson: string, sortOrder: number, optionCount = 3) {
  const { data: q, error } = await admin
    .from('questions')
    .insert({ lesson_id: lesson, prompt: `Question ${sortOrder}`, sort_order: sortOrder })
    .select('id')
    .single()
  if (error) throw error
  const options = Array.from({ length: optionCount }, (_, i) => ({
    question_id: q.id,
    text: `Option ${i + 1}`,
    is_correct: i === 0,
  }))
  const { data: opts, error: optError } = await admin
    .from('answer_options')
    .insert(options)
    .select('id, is_correct')
  if (optError) throw optError
  return {
    questionId: q.id as string,
    correctId: opts.find((o) => o.is_correct)!.id as string,
    wrongId: opts.find((o) => !o.is_correct)!.id as string,
  }
}

/** Saves progress as the learner, then backdates the first save by `ageSeconds`. */
async function watch(user: TestUser, lesson: string, percent: number, ageSeconds: number) {
  const { error } = await user.client.rpc('save_lesson_progress', {
    p_lesson_id: lesson,
    p_percent: percent,
    p_position_seconds: 10,
  })
  if (error) throw error
  await admin
    .from('lesson_progress')
    .update({
      max_percent: percent,
      first_progress_at: new Date(Date.now() - ageSeconds * 1000).toISOString(),
    })
    .eq('user_id', user.id)
    .eq('lesson_id', lesson)
}

type Status = { state: string; attempts_left: number }
async function statusOf(client: SupabaseClient, lesson = lessonId): Promise<Status | null> {
  const { data } = await client.rpc('quiz_status', { p_lesson_id: lesson }).single()
  return data as Status | null
}

const submit = (user: TestUser, answers: unknown, lesson = lessonId) =>
  user.client.rpc('submit_quiz', { p_lesson_id: lesson, p_answers: answers }).single()

beforeAll(async () => {
  alice = await createTestUser('quiz-alice')
  bob = await createTestUser('quiz-bob')
  lessonId = await makeLesson(true, DURATION)
  for (const n of [1, 2]) {
    const q = await addQuestion(lessonId, n)
    correct[q.questionId] = q.correctId
    wrong[q.questionId] = q.wrongId
  }
  unpublishedId = await makeLesson(false, DURATION)
  await addQuestion(unpublishedId, 1)
})

afterAll(async () => {
  await admin.from('lessons').delete().in('id', [lessonId, unpublishedId])
  await deleteTestUser(alice)
  await deleteTestUser(bob)
})

describe('is_correct is unreachable (T-30)', () => {
  it.each([
    ['answer_options', '*'],
    ['answer_options', 'is_correct'],
    ['answer_options', 'id, text'],
    ['questions', '*'],
  ])('a learner cannot select %s (%s)', async (table, columns) => {
    const { data, error } = await alice!.client.from(table).select(columns)
    expect(data).toBeNull()
    expect(error?.code).toBe('42501')
  })

  it('anon cannot select answer_options either', async () => {
    const { data, error } = await publicClient.from('answer_options').select('is_correct')
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('cannot be reached by embedding from lessons', async () => {
    const { data, error } = await alice!.client
      .from('lessons')
      .select('id, questions(id, answer_options(is_correct))')
      .eq('id', lessonId)
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('is not exposed through GraphQL', async () => {
    const token = (await alice!.client.auth.getSession()).data.session!.access_token
    const res = await fetch(`${process.env.SUPABASE_TEST_URL}/graphql/v1`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_TEST_PUBLISHABLE_KEY!,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ answerOptionsCollection { edges { node { isCorrect } } } }',
      }),
    })
    const body = await res.text()
    expect(body).not.toMatch(/"isCorrect"\s*:\s*(true|false)/)
  })

  it.each([
    ['quiz_ready', { p_lesson_id: 'LESSON' }],
    ['quiz_unlocked', { p_user: 'USER', p_lesson_id: 'LESSON' }],
    ['setting_int', { p_key: 'pass_mark_percent', p_default: 1, p_min: 1, p_max: 100 }],
  ])('helper %s is not callable by a learner', async (fn, args) => {
    const filled = JSON.parse(
      JSON.stringify(args).replace('LESSON', lessonId).replace('USER', alice!.id),
    )
    const { error } = await alice!.client.rpc(fn, filled)
    expect(error).not.toBeNull()
  })

  it('get_quiz returns exactly four columns and no answer data', async () => {
    await watch(alice!, lessonId, 95, 60)
    const { data, error } = await alice!.client.rpc('get_quiz', { p_lesson_id: lessonId })
    expect(error).toBeNull()
    expect(data).toHaveLength(6)
    for (const row of data!) {
      expect(Object.keys(row).sort()).toEqual(['option_id', 'option_text', 'prompt', 'question_id'])
    }
    expect(JSON.stringify(data)).not.toContain('is_correct')
  })

  it('submit_quiz returns only score, total and passed', async () => {
    const { data, error } = await submit(alice!, wrong)
    expect(error).toBeNull()
    expect(Object.keys(data!).sort()).toEqual(['passed', 'score', 'total'])
  })
})

describe('unlocking (T-20, T-35)', () => {
  it('is locked with no progress', async () => {
    const data = await statusOf(bob!.client, lessonId)
    expect(data).toEqual({ state: 'locked', attempts_left: 0 })
    const { data: rows } = await bob!.client.rpc('get_quiz', { p_lesson_id: lessonId })
    expect(rows).toEqual([])
    expect((await submit(bob!, correct)).error?.code).toBe('CAQ01')
  })

  it('stays locked below 90% watched', async () => {
    await watch(bob!, lessonId, 89, 600)
    const data = await statusOf(bob!.client, lessonId)
    expect(data!.state).toBe('locked')
  })

  it('stays locked when 100% is reported faster than the video can play', async () => {
    await watch(bob!, lessonId, 100, 10) // 10 s after the first save; 45 s are needed
    const data = await statusOf(bob!.client, lessonId)
    expect(data!.state).toBe('locked')
  })

  it('unlocks at 90% once enough time has passed', async () => {
    await watch(bob!, lessonId, 90, 46)
    const data = await statusOf(bob!.client, lessonId)
    expect(data).toEqual({ state: 'ready', attempts_left: 10 })
  })

  it('stays locked when the lesson has no known duration', async () => {
    await admin.from('lessons').update({ duration_seconds: null }).eq('id', lessonId)
    const data = await statusOf(bob!.client, lessonId)
    expect(data!.state).toBe('locked')
    await admin.from('lessons').update({ duration_seconds: DURATION }).eq('id', lessonId)
  })

  it('reports unavailable for an unpublished lesson, even with progress', async () => {
    await admin.from('lesson_progress').insert({
      user_id: bob!.id,
      lesson_id: unpublishedId,
      max_percent: 100,
      first_progress_at: '2020-01-01T00:00:00Z',
    })
    const data = await statusOf(bob!.client, unpublishedId)
    expect(data!.state).toBe('unavailable')
    const { data: rows } = await bob!.client.rpc('get_quiz', { p_lesson_id: unpublishedId })
    expect(rows).toEqual([])
  })

  it('tells anon only that a quiz exists', async () => {
    const data = await statusOf(publicClient, lessonId)
    expect(data).toEqual({ state: 'signed_out', attempts_left: 0 })
    const { error } = await publicClient.rpc('get_quiz', { p_lesson_id: lessonId })
    expect(error).not.toBeNull()
  })
})

describe('grading (PRD 5.2, D4)', () => {
  it('passes with every answer correct, and records the attempt', async () => {
    const { data } = await submit(bob!, correct)
    expect(data).toEqual({ score: 2, total: 2, passed: true })
    const status = await statusOf(bob!.client, lessonId)
    expect(status!.state).toBe('passed')
  })

  it('fails with one wrong and keeps the earlier pass (decision 4)', async () => {
    const q1 = Object.keys(correct)[0]!
    const { data } = await submit(bob!, { ...correct, [q1]: wrong[q1] })
    expect(data).toEqual({ score: 1, total: 2, passed: false })
    const status = await statusOf(bob!.client, lessonId)
    expect(status!.state).toBe('passed')
  })
})

describe('answer validation (T-33)', () => {
  it.each([
    ['a missing question', () => ({ [Object.keys(correct)[0]!]: Object.values(correct)[0]! })],
    ['an extra key', () => ({ ...correct, [crypto.randomUUID()]: crypto.randomUUID() })],
    [
      "another question's option",
      () => {
        const [a, b] = Object.keys(correct) as [string, string]
        return { [a]: correct[b], [b]: correct[a] }
      },
    ],
    ['an array', () => Object.values(correct)],
    ['a string', () => 'all of them'],
    ['a non-uuid value', () => Object.fromEntries(Object.keys(correct).map((k) => [k, 42]))],
  ])('rejects %s with 22023 and logs nothing', async (_, build) => {
    const before = await admin
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', bob!.id)
    const { error } = await submit(bob!, build())
    expect(error?.code).toBe('22023')
    const after = await admin
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', bob!.id)
    expect(after.count).toBe(before.count)
  })
})

describe('attempt limit (T-31, T-32)', () => {
  it('refuses the 11th attempt in an hour, for that learner only', async () => {
    await admin.from('quiz_attempts').delete().eq('user_id', alice!.id)
    const rows = Array.from({ length: 10 }, () => ({
      user_id: alice!.id,
      lesson_id: lessonId,
      answers: {},
      score: 0,
      total: 2,
      passed: false,
    }))
    await admin.from('quiz_attempts').insert(rows)
    expect((await submit(alice!, correct)).error?.code).toBe('CAQ02')
    const data = await statusOf(alice!.client, lessonId)
    expect(data!.attempts_left).toBe(0)
    // Bob has his own allowance.
    expect((await submit(bob!, correct)).error).toBeNull()
  })

  it('counts only the last hour', async () => {
    await admin
      .from('quiz_attempts')
      .update({ created_at: new Date(Date.now() - 61 * 60 * 1000).toISOString() })
      .eq('user_id', alice!.id)
    expect((await submit(alice!, correct)).error).toBeNull()
  })
})

describe('quiz_attempts access (T-34)', () => {
  it('a learner reads only their own results, without answers', async () => {
    const { data, error } = await bob!.client
      .from('quiz_attempts')
      .select('user_id, lesson_id, score, total, passed')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
    expect(data!.every((r) => r.user_id === bob!.id)).toBe(true)
  })

  it('cannot read the answers column', async () => {
    const { error } = await bob!.client.from('quiz_attempts').select('answers')
    expect(error?.code).toBe('42501')
  })

  it('cannot insert, update or delete attempts directly', async () => {
    const insert = await bob!.client.from('quiz_attempts').insert({
      user_id: bob!.id,
      lesson_id: lessonId,
      answers: {},
      score: 2,
      total: 2,
      passed: true,
    })
    expect(insert.error).not.toBeNull()
    const update = await bob!.client
      .from('quiz_attempts')
      .update({ passed: true })
      .eq('user_id', bob!.id)
    expect(update.error).not.toBeNull()
    const del = await bob!.client.from('quiz_attempts').delete().eq('user_id', bob!.id)
    expect(del.error).not.toBeNull()
  })
})

describe('quiz validity (decision 13)', () => {
  it('hides a quiz with a question that has only two options', async () => {
    const broken = await makeLesson(true, DURATION)
    await addQuestion(broken, 1, 2)
    const data = await statusOf(bob!.client, broken)
    expect(data!.state).toBe('unavailable')
    await admin.from('lessons').delete().eq('id', broken)
  })

  it('refuses a second correct option on one question', async () => {
    const q1 = Object.keys(correct)[0]!
    const { error } = await admin
      .from('answer_options')
      .insert({ question_id: q1, text: 'Also right', is_correct: true })
    expect(error?.code).toBe('23505')
  })

  it('lists lessons with a ready quiz for the dashboard', async () => {
    const { data, error } = await bob!.client.rpc('lessons_with_quiz')
    expect(error).toBeNull()
    expect((data as { lesson_id: string }[]).map((r) => r.lesson_id)).toContain(lessonId)
    expect((data as { lesson_id: string }[]).map((r) => r.lesson_id)).not.toContain(unpublishedId)
  })
})
