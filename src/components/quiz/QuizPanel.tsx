'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { type EventProps, track } from '@/lib/analytics/track'
import { PROGRESS_SAVED, type ProgressSavedDetail } from '@/lib/progress/events'
import { type QuizStatus, getQuizStatus, startQuiz, submitQuiz } from '@/lib/quiz/actions'
import type { QuizQuestion as Question, QuizRefusal } from '@/lib/quiz/shape'
import { QUIZ_COPY } from './copy'
import { QuizQuestion } from './QuizQuestion'
import { QuizResult } from './QuizResult'

type View =
  | { kind: 'loading' }
  | { kind: 'status'; status: QuizStatus }
  | {
      kind: 'taking'
      questions: Question[]
      step: number
      answers: Record<string, string>
      sending: boolean
    }
  | { kind: 'result'; score: number; total: number; passed: boolean; attemptsLeft: number }
  | { kind: 'refused'; reason: QuizRefusal }

type Props = { lessonId: string; lessonPath: string; analytics: EventProps }

export function QuizPanel({ lessonId, lessonPath, analytics }: Props) {
  const [view, setView] = useState<View>({ kind: 'loading' })
  const focusTarget = useRef<HTMLElement | null>(null)
  const signInHref = `/sign-in?next=${encodeURIComponent(lessonPath)}`

  const refresh = useCallback(() => {
    void getQuizStatus(lessonId).then((status) => setView({ kind: 'status', status }))
  }, [lessonId])

  useEffect(refresh, [refresh])

  // Unlock without a reload when the player saves 90% (decision 1 still applies on the server).
  const locked = view.kind === 'status' && view.status.state === 'locked'
  useEffect(() => {
    if (!locked) return
    const onSaved = (event: Event) => {
      const detail = (event as CustomEvent<ProgressSavedDetail>).detail
      if (detail?.lessonId === lessonId && detail.percent >= 90) refresh()
    }
    window.addEventListener(PROGRESS_SAVED, onSaved)
    return () => window.removeEventListener(PROGRESS_SAVED, onSaved)
  }, [locked, lessonId, refresh])

  const stepKey = view.kind === 'taking' ? view.step : view.kind
  useEffect(() => {
    if (view.kind === 'taking' || view.kind === 'result') focusTarget.current?.focus()
  }, [stepKey, view.kind])

  async function begin() {
    const result = await startQuiz(lessonId)
    if (!result.ok) return setView({ kind: 'refused', reason: result.reason })
    track('quiz_start', analytics)
    setView({ kind: 'taking', questions: result.questions, step: 0, answers: {}, sending: false })
  }

  async function send(answers: Record<string, string>) {
    setView((v) => (v.kind === 'taking' ? { ...v, sending: true } : v))
    const result = await submitQuiz({ lessonId, answers })
    if (!result.ok) return setView({ kind: 'refused', reason: result.reason })
    track(result.passed ? 'quiz_pass' : 'quiz_fail', analytics)
    const status = await getQuizStatus(lessonId)
    setView({
      kind: 'result',
      score: result.score,
      total: result.total,
      passed: result.passed,
      attemptsLeft: status.attemptsLeft,
    })
  }

  const current = view.kind === 'taking' ? view.questions[view.step] : undefined

  if (view.kind === 'loading') return null
  if (view.kind === 'status' && view.status.state === 'unavailable') return null

  return (
    <section
      aria-labelledby={`quiz-${lessonId}`}
      className="mt-10 max-w-2xl rounded-card bg-white p-6 md:p-8"
    >
      <h2 id={`quiz-${lessonId}`} className="text-h2">
        Quiz
      </h2>
      <div aria-live="polite" className="mt-4">
        {view.kind === 'status' && (
          <StatusBody status={view.status} signInHref={signInHref} onStart={begin} />
        )}
        {view.kind === 'taking' && current && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const last = view.step === view.questions.length - 1
              if (last) void send(view.answers)
              else setView({ ...view, step: view.step + 1 })
            }}
          >
            <QuizQuestion
              question={current}
              number={view.step + 1}
              total={view.questions.length}
              selected={view.answers[current.id]}
              onSelect={(optionId) =>
                setView({
                  ...view,
                  answers: { ...view.answers, [current.id]: optionId },
                })
              }
              focusRef={(el) => {
                focusTarget.current = el
              }}
            />
            <div className="mt-6 flex flex-wrap gap-3">
              {view.step > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setView({ ...view, step: view.step - 1 })}
                >
                  Back
                </Button>
              )}
              <Button type="submit" disabled={!view.answers[current.id] || view.sending}>
                {view.step === view.questions.length - 1 ? 'Submit answers' : 'Next'}
              </Button>
            </div>
          </form>
        )}
        {view.kind === 'result' && (
          <div
            ref={(el) => {
              focusTarget.current = el
            }}
            tabIndex={-1}
          >
            <QuizResult
              score={view.score}
              total={view.total}
              passed={view.passed}
              canRetry={view.attemptsLeft > 0}
              onRetry={begin}
            />
          </div>
        )}
        {view.kind === 'refused' && (
          <RefusedBody reason={view.reason} signInHref={signInHref} onRetry={begin} />
        )}
      </div>
    </section>
  )
}

function StatusBody({
  status,
  signInHref,
  onStart,
}: {
  status: QuizStatus
  signInHref: string
  onStart: () => void
}) {
  if (status.state === 'signed_out') {
    return (
      <>
        <p>{QUIZ_COPY.signedOut}</p>
        <div className="mt-6">
          <ButtonLink href={signInHref} variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </>
    )
  }
  if (status.state === 'locked') return <p>{QUIZ_COPY.locked}</p>
  return (
    <>
      {status.state === 'passed' && (
        <p className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Passed</Badge>
          {QUIZ_COPY.passedBefore}
        </p>
      )}
      {status.attemptsLeft > 0 ? (
        <>
          <p className={status.state === 'passed' ? 'mt-3' : ''}>{QUIZ_COPY.ready}</p>
          <div className="mt-6">
            <Button onClick={onStart}>Take the quiz</Button>
          </div>
        </>
      ) : (
        <p className="mt-3">{QUIZ_COPY.limited}</p>
      )}
    </>
  )
}

function RefusedBody({
  reason,
  signInHref,
  onRetry,
}: {
  reason: QuizRefusal
  signInHref: string
  onRetry: () => void
}) {
  if (reason === 'signed_out') {
    return (
      <>
        <p>{QUIZ_COPY.sessionEnded}</p>
        <div className="mt-6">
          <ButtonLink href={signInHref} variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </>
    )
  }
  if (reason === 'locked') return <p>{QUIZ_COPY.locked}</p>
  if (reason === 'limited') return <p>{QUIZ_COPY.limited}</p>
  return (
    <>
      <p>{QUIZ_COPY.error}</p>
      <div className="mt-6">
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </>
  )
}
