import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PROGRESS_SAVED } from '@/lib/progress/events'

const getQuizStatus = vi.fn()
const startQuiz = vi.fn()
const submitQuiz = vi.fn()
vi.mock('@/lib/quiz/actions', () => ({
  getQuizStatus: (...args: unknown[]) => getQuizStatus(...args),
  startQuiz: (...args: unknown[]) => startQuiz(...args),
  submitQuiz: (...args: unknown[]) => submitQuiz(...args),
}))
const track = vi.fn()
vi.mock('@/lib/analytics/track', () => ({ track: (...args: unknown[]) => track(...args) }))

const { QuizPanel } = await import('./QuizPanel')

const LESSON = 'lesson-1'
const analytics = { lesson_slug: 'x', category_slug: 'winches' }
const questions = [
  {
    id: 'q1',
    prompt: 'First question?',
    options: [
      { id: 'a', text: 'Alpha' },
      { id: 'b', text: 'Bravo' },
    ],
  },
  {
    id: 'q2',
    prompt: 'Second question?',
    options: [
      { id: 'c', text: 'Charlie' },
      { id: 'd', text: 'Delta' },
    ],
  },
]

async function renderPanel() {
  const view = render(
    <QuizPanel lessonId={LESSON} lessonPath="/lessons/winches/x" analytics={analytics} />,
  )
  await act(async () => {}) // let the status request settle
  return view
}

async function click(name: string | RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }))
  })
}

afterEach(cleanup)
beforeEach(() => {
  getQuizStatus.mockReset().mockResolvedValue({ state: 'ready', attemptsLeft: 10 })
  startQuiz.mockReset().mockResolvedValue({ ok: true, questions })
  submitQuiz.mockReset()
  track.mockReset()
})

describe('QuizPanel', () => {
  it('renders nothing when the lesson has no quiz', async () => {
    getQuizStatus.mockResolvedValue({ state: 'unavailable', attemptsLeft: 0 })
    const { container } = await renderPanel()
    expect(container.innerHTML).toBe('')
  })

  it('asks signed-out visitors to sign in, coming back to this lesson (decision 15)', async () => {
    getQuizStatus.mockResolvedValue({ state: 'signed_out', attemptsLeft: 0 })
    await renderPanel()
    expect(screen.getByText('Want to test your knowledge? Sign in to take the quiz.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe(
      '/sign-in?next=%2Flessons%2Fwinches%2Fx',
    )
  })

  it('stays locked, then checks again when the player saves 90% for this lesson only', async () => {
    getQuizStatus.mockResolvedValue({ state: 'locked', attemptsLeft: 0 })
    await renderPanel()
    expect(screen.getByText('Watch the video to unlock the quiz.')).toBeTruthy()
    expect(getQuizStatus).toHaveBeenCalledTimes(1)

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(PROGRESS_SAVED, { detail: { lessonId: 'other', percent: 100 } }),
      )
    })
    expect(getQuizStatus).toHaveBeenCalledTimes(1)

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(PROGRESS_SAVED, { detail: { lessonId: LESSON, percent: 90 } }),
      )
    })
    expect(getQuizStatus).toHaveBeenCalledTimes(2)
  })

  describe('after a 90% save the server still says locked (watch-time rule, decision 1)', () => {
    const saved90 = async () => {
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent(PROGRESS_SAVED, { detail: { lessonId: LESSON, percent: 100 } }),
        )
      })
    }

    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('says the quiz is nearly there and re-checks every 15 seconds until it unlocks', async () => {
      getQuizStatus.mockResolvedValue({ state: 'locked', attemptsLeft: 0 })
      await renderPanel()
      await saved90()
      expect(
        screen.getByText('Nearly there. Keep this page open and the quiz will unlock shortly.'),
      ).toBeTruthy()
      expect(getQuizStatus).toHaveBeenCalledTimes(2)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000)
      })
      expect(getQuizStatus).toHaveBeenCalledTimes(3)

      getQuizStatus.mockResolvedValue({ state: 'ready', attemptsLeft: 10 })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000)
      })
      expect(screen.getByRole('button', { name: 'Take the quiz' })).toBeTruthy()

      // Unlocked: no more checks.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000)
      })
      expect(getQuizStatus).toHaveBeenCalledTimes(4)
    })

    it('stops re-checking after 5 minutes', async () => {
      getQuizStatus.mockResolvedValue({ state: 'locked', attemptsLeft: 0 })
      await renderPanel()
      await saved90()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10 * 60_000)
      })
      // 1 on load + 1 after the save + 20 re-checks (5 minutes at 15 s).
      expect(getQuizStatus).toHaveBeenCalledTimes(22)
    })

    it('keeps the plain locked message until a 90% save arrives', async () => {
      getQuizStatus.mockResolvedValue({ state: 'locked', attemptsLeft: 0 })
      await renderPanel()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000)
      })
      expect(screen.getByText('Watch the video to unlock the quiz.')).toBeTruthy()
      expect(getQuizStatus).toHaveBeenCalledTimes(1)
    })
  })

  it('shows one question at a time and submits every answer', async () => {
    submitQuiz.mockResolvedValue({ ok: true, score: 2, total: 2, passed: true })
    await renderPanel()
    await click('Take the quiz')
    expect(track).toHaveBeenCalledWith('quiz_start', analytics)
    expect(screen.getByText('Question 1 of 2')).toBeTruthy()
    expect(screen.queryByText('Second question?')).toBeNull()

    const next = screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement
    expect(next.disabled).toBe(true)
    fireEvent.click(screen.getByLabelText('Bravo'))
    expect(next.disabled).toBe(false)
    await click('Next')

    expect(screen.getByText('Question 2 of 2')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Charlie'))
    await click('Submit answers')

    expect(submitQuiz).toHaveBeenCalledWith({ lessonId: LESSON, answers: { q1: 'b', q2: 'c' } })
  })

  it('shows the count on a fail, never which answers were wrong, and offers a retry', async () => {
    submitQuiz.mockResolvedValue({ ok: true, score: 1, total: 2, passed: false })
    await renderPanel()
    await click('Take the quiz')
    fireEvent.click(screen.getByLabelText('Alpha'))
    await click('Next')
    fireEvent.click(screen.getByLabelText('Delta'))
    await click('Submit answers')

    expect(
      screen.getByText('1 of 2 correct. Have another look at the video and try again.'),
    ).toBeTruthy()
    expect(screen.queryByText('Alpha')).toBeNull()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(track).toHaveBeenCalledWith('quiz_fail', analytics)
  })

  it('celebrates a pass with the BRAND.md line', async () => {
    submitQuiz.mockResolvedValue({ ok: true, score: 2, total: 2, passed: true })
    await renderPanel()
    await click('Take the quiz')
    fireEvent.click(screen.getByLabelText('Alpha'))
    await click('Next')
    fireEvent.click(screen.getByLabelText('Charlie'))
    await click('Submit answers')

    expect(screen.getByText("Nailed it. That's one more lesson done.")).toBeTruthy()
    expect(track).toHaveBeenCalledWith('quiz_pass', analytics)
  })

  it('explains the attempt limit and offers no button', async () => {
    startQuiz.mockResolvedValue({ ok: false, reason: 'limited' })
    await renderPanel()
    await click('Take the quiz')
    expect(
      screen.getByText(
        "That's 10 goes in the last hour. Have another look at the video and try again later.",
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows the limit instead of the start button when no attempts are left', async () => {
    getQuizStatus.mockResolvedValue({ state: 'ready', attemptsLeft: 0 })
    await renderPanel()
    expect(screen.queryByRole('button', { name: 'Take the quiz' })).toBeNull()
  })
})
