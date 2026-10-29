import { describe, expect, it } from 'vitest'
import { type ProgressRow, summariseProgress } from './summary'

const row = (over: Partial<ProgressRow>): ProgressRow => ({
  maxPercent: 50,
  completedAt: null,
  lesson: { slug: 'l1', title: 'Lesson 1', isCore: true, categorySlug: 'winches' },
  ...over,
})

describe('summariseProgress', () => {
  it('splits in-progress from completed and counts core lessons done', () => {
    const result = summariseProgress(
      [
        row({}),
        row({
          maxPercent: 95,
          completedAt: '2026-10-29T00:00:00Z',
          lesson: { slug: 'l2', title: 'Lesson 2', isCore: true, categorySlug: 'winches' },
        }),
        row({
          maxPercent: 100,
          completedAt: '2026-10-29T00:00:00Z',
          lesson: { slug: 'l3', title: 'Lesson 3', isCore: false, categorySlug: 'recovery' },
        }),
      ],
      8,
    )
    expect(result.inProgress.map((l) => l.href)).toEqual(['/lessons/winches/l1'])
    expect(result.completed.map((l) => l.href)).toEqual([
      '/lessons/winches/l2',
      '/lessons/recovery/l3',
    ])
    expect(result.core).toEqual({ done: 1, total: 8 })
  })

  it('skips rows whose lesson is no longer published (RLS returns null)', () => {
    expect(summariseProgress([row({ lesson: null })], 3).inProgress).toEqual([])
  })
})
