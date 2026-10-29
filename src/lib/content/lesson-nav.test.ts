import { describe, expect, it } from 'vitest'
import { neighbours } from './lesson-nav'

const lessons = [
  { slug: 'a', title: 'A' },
  { slug: 'b', title: 'B' },
  { slug: 'c', title: 'C' },
]

describe('neighbours', () => {
  it('returns previous and next for a middle lesson', () => {
    expect(neighbours(lessons, 'b')).toEqual({
      current: lessons[1],
      previous: { slug: 'a', title: 'A' },
      next: { slug: 'c', title: 'C' },
    })
  })

  it('has no previous for the first lesson and no next for the last', () => {
    expect(neighbours(lessons, 'a')?.previous).toBeNull()
    expect(neighbours(lessons, 'c')?.next).toBeNull()
  })

  it('returns null for an unknown slug', () => {
    expect(neighbours(lessons, 'zzz')).toBeNull()
  })
})
