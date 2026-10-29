import { describe, expect, it } from 'vitest'
import { groupQuestions, refusalFor, toQuizState } from './shape'

describe('groupQuestions', () => {
  it('groups rows in order and copies only the named fields', () => {
    const rows = [
      { question_id: 'q1', prompt: 'P1', option_id: 'a', option_text: 'A', is_correct: true },
      { question_id: 'q1', prompt: 'P1', option_id: 'b', option_text: 'B' },
      { question_id: 'q2', prompt: 'P2', option_id: 'c', option_text: 'C' },
    ]
    const questions = groupQuestions(rows)
    expect(questions).toEqual([
      {
        id: 'q1',
        prompt: 'P1',
        options: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
      },
      { id: 'q2', prompt: 'P2', options: [{ id: 'c', text: 'C' }] },
    ])
    // Even if the database ever sent extra columns, they would not be passed on (layer 4).
    expect(JSON.stringify(questions)).not.toContain('is_correct')
  })
})

describe('toQuizState', () => {
  it.each(['unavailable', 'signed_out', 'locked', 'ready', 'passed'])('keeps %s', (s) => {
    expect(toQuizState(s)).toBe(s)
  })
  it('treats anything else as unavailable', () => {
    expect(toQuizState('open sesame')).toBe('unavailable')
    expect(toQuizState(undefined)).toBe('unavailable')
  })
})

describe('refusalFor', () => {
  it.each([
    ['42501', 'signed_out'],
    ['CAQ01', 'locked'],
    ['CAQ02', 'limited'],
    ['22023', 'invalid'],
    ['XX000', 'error'],
    [undefined, 'error'],
  ])('maps %s to %s', (code, reason) => {
    expect(refusalFor(code)).toBe(reason)
  })
})
