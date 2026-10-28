import { describe, expect, it } from 'vitest'
import { formatLessonCount, toCategorySummaries } from './category-summary'

describe('toCategorySummaries', () => {
  it('maps embedded lesson counts and keeps order', () => {
    expect(
      toCategorySummaries([
        { slug: 'recovery-basics', name: 'Recovery basics', lessons: [{ count: 2 }] },
        { slug: 'winches', name: 'Winches', lessons: [{ count: 7 }] },
      ]),
    ).toEqual([
      { slug: 'recovery-basics', name: 'Recovery basics', lessonCount: 2 },
      { slug: 'winches', name: 'Winches', lessonCount: 7 },
    ])
  })

  it('treats a missing count as zero', () => {
    expect(toCategorySummaries([{ slug: 'ropes', name: 'Ropes', lessons: [] }])).toEqual([
      { slug: 'ropes', name: 'Ropes', lessonCount: 0 },
    ])
  })
})

describe('formatLessonCount', () => {
  it('uses figures and the right plural', () => {
    expect(formatLessonCount(0)).toBe('0 lessons')
    expect(formatLessonCount(1)).toBe('1 lesson')
    expect(formatLessonCount(7)).toBe('7 lessons')
  })
})
