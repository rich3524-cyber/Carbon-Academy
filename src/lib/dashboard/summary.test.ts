import { describe, expect, it } from 'vitest'
import { summariseProgress } from './summary'

const lesson = (slug: string, isCore = true) => ({ slug, title: slug, isCore, categorySlug: 'c' })
const row = (id: string, maxPercent: number, completedAt: string | null, isCore = true) => ({
  lessonId: id,
  maxPercent,
  completedAt,
  lesson: lesson(id, isCore),
})

describe('summariseProgress (decision 8)', () => {
  const quiz = { passed: new Set(['passed']), withQuiz: new Set(['passed', 'watched-quiz']) }

  it('a lesson with a quiz is complete only when passed', () => {
    const d = summariseProgress(
      [row('passed', 100, 'x'), row('watched-quiz', 100, 'x'), row('no-quiz', 95, 'x')],
      5,
      quiz,
    )
    expect(d.completed.map((l) => [l.title, l.passed])).toEqual([
      ['passed', true],
      ['no-quiz', false],
    ])
    expect(d.inProgress.map((l) => l.title)).toEqual(['watched-quiz'])
    expect(d.core).toEqual({ done: 2, total: 5 })
  })

  it('a lesson with no quiz still completes at 90% watched', () => {
    const d = summariseProgress([row('no-quiz', 50, null)], 1, quiz)
    expect(d.inProgress).toHaveLength(1)
    expect(d.core.done).toBe(0)
  })

  it('skips rows whose lesson is no longer published (RLS returns null)', () => {
    const d = summariseProgress([{ ...row('gone', 50, null), lesson: null }], 3, quiz)
    expect(d.inProgress).toEqual([])
    expect(d.completed).toEqual([])
  })
})
