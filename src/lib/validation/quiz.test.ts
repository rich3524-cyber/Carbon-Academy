import { describe, expect, it } from 'vitest'
import { QuizSubmission } from './quiz'

const L = '3f9a1c2e-4b5d-4e6f-8a7b-9c0d1e2f3a4b'
const Q = '0b8e5a52-1c4d-4f0e-9b1a-2c3d4e5f6a7b'
const O = '7c6d5e4f-3a2b-4c1d-8e9f-0a1b2c3d4e5f'

describe('QuizSubmission (control 05)', () => {
  it('accepts a lesson ID and an answer map, lower-casing the IDs', () => {
    const parsed = QuizSubmission.parse({
      lessonId: L.toUpperCase(),
      answers: { [Q.toUpperCase()]: O },
    })
    expect(parsed).toEqual({ lessonId: L, answers: { [Q]: O } })
  })

  it.each([
    { lessonId: 'nope', answers: { [Q]: O } },
    { lessonId: L, answers: {} },
    { lessonId: L, answers: { [Q]: 'not-a-uuid' } },
    { lessonId: L, answers: { 'not-a-uuid': O } },
    {
      lessonId: L,
      answers: Object.fromEntries(Array.from({ length: 11 }, () => [crypto.randomUUID(), O])),
    },
    { lessonId: L, answers: [O] },
    'nonsense',
  ])('rejects %j', (input) => {
    expect(QuizSubmission.safeParse(input).success).toBe(false)
  })
})
