'use client'

import { useState } from 'react'
import { saveQuiz } from '@/lib/admin/actions/content'
import { AdminForm } from './AdminForm'

export type QuizDraft = { prompt: string; options: { text: string; correct: boolean }[] }[]

const MAX_QUESTIONS = 5
const MIN_OPTIONS = 3
const MAX_OPTIONS = 4

const blankQuestion = () => ({
  prompt: '',
  options: Array.from({ length: MIN_OPTIONS }, (_, i) => ({ text: '', correct: i === 0 })),
})

const control =
  'min-h-11 w-full rounded-field border-2 border-concrete bg-white px-4 py-3 text-body outline-offset-2 focus:outline-2 focus:outline-carbon-black'
const small =
  'min-h-11 rounded-pill border-2 border-carbon-black px-4 text-small font-bold uppercase hover:bg-carbon-black hover:text-white disabled:opacity-40'

/**
 * The whole quiz for one lesson (decision 8): 1 to 5 questions, 3 or 4 options each, exactly
 * one correct (a radio per question). Sent as JSON and checked again by the server and database.
 */
export function QuizEditor({ lessonId, initial }: { lessonId: string; initial: QuizDraft }) {
  const [questions, setQuestions] = useState<QuizDraft>(
    initial.length ? initial : [blankQuestion()],
  )

  const update = (q: number, change: (question: QuizDraft[number]) => QuizDraft[number]) =>
    setQuestions((all) => all.map((question, i) => (i === q ? change(question) : question)))

  return (
    <AdminForm action={saveQuiz} submitLabel="Save quiz">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />
      {questions.map((question, q) => (
        <fieldset key={q} className="flex flex-col gap-4 rounded-field border-2 border-dust p-4">
          <legend className="px-1 font-bold">Question {q + 1}</legend>
          <label className="flex flex-col gap-2">
            <span className="font-bold">Question</span>
            <input
              className={control}
              value={question.prompt}
              maxLength={300}
              onChange={(event) =>
                update(q, (current) => ({ ...current, prompt: event.target.value }))
              }
            />
          </label>
          <div className="flex flex-col gap-3">
            <p className="font-bold">Options (choose the correct one)</p>
            {question.options.map((option, o) => (
              <div key={o} className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`correct-${q}`}
                  checked={option.correct}
                  aria-label={`Option ${o + 1} is correct`}
                  className="h-6 w-6 shrink-0 accent-carbon-black"
                  onChange={() =>
                    update(q, (current) => ({
                      ...current,
                      options: current.options.map((item, i) => ({ ...item, correct: i === o })),
                    }))
                  }
                />
                <input
                  className={control}
                  value={option.text}
                  maxLength={200}
                  aria-label={`Question ${q + 1}, option ${o + 1}`}
                  onChange={(event) =>
                    update(q, (current) => ({
                      ...current,
                      options: current.options.map((item, i) =>
                        i === o ? { ...item, text: event.target.value } : item,
                      ),
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={small}
              disabled={question.options.length >= MAX_OPTIONS}
              onClick={() =>
                update(q, (current) => ({
                  ...current,
                  options: [...current.options, { text: '', correct: false }],
                }))
              }
            >
              Add option
            </button>
            <button
              type="button"
              className={small}
              disabled={question.options.length <= MIN_OPTIONS}
              onClick={() =>
                update(q, (current) => {
                  const options = current.options.slice(0, -1)
                  // Keep exactly one correct option if the last one was it.
                  return {
                    ...current,
                    options: options.some((item) => item.correct)
                      ? options
                      : options.map((item, i) => ({ ...item, correct: i === 0 })),
                  }
                })
              }
            >
              Remove last option
            </button>
            <button
              type="button"
              className={small}
              disabled={questions.length <= 1}
              onClick={() => setQuestions((all) => all.filter((_, i) => i !== q))}
            >
              Remove question
            </button>
          </div>
        </fieldset>
      ))}
      <div>
        <button
          type="button"
          className={small}
          disabled={questions.length >= MAX_QUESTIONS}
          onClick={() => setQuestions((all) => [...all, blankQuestion()])}
        >
          Add question
        </button>
      </div>
    </AdminForm>
  )
}
