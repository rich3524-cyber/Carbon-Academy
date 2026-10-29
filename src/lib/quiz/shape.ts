/** Pure mapping between the quiz functions and the UI. Copies named fields only (T-30, layer 4). */

export type QuizRow = {
  question_id: string
  prompt: string
  option_id: string
  option_text: string
}
export type QuizOption = { id: string; text: string }
export type QuizQuestion = { id: string; prompt: string; options: QuizOption[] }

export function groupQuestions(rows: readonly QuizRow[]): QuizQuestion[] {
  const byId = new Map<string, QuizQuestion>()
  for (const row of rows) {
    let question = byId.get(row.question_id)
    if (!question) {
      question = { id: row.question_id, prompt: row.prompt, options: [] }
      byId.set(row.question_id, question)
    }
    question.options.push({ id: row.option_id, text: row.option_text })
  }
  return [...byId.values()]
}

const STATES = ['unavailable', 'signed_out', 'locked', 'ready', 'passed'] as const
export type QuizState = (typeof STATES)[number]

export function toQuizState(value: unknown): QuizState {
  return STATES.find((s) => s === value) ?? 'unavailable'
}

export type QuizRefusal = 'signed_out' | 'locked' | 'limited' | 'invalid' | 'error'

const REFUSALS: Record<string, QuizRefusal> = {
  '42501': 'signed_out',
  CAQ01: 'locked',
  CAQ02: 'limited',
  '22023': 'invalid',
}

export function refusalFor(code: string | undefined): QuizRefusal {
  return (code && REFUSALS[code]) || 'error'
}
