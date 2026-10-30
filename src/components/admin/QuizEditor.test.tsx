import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/admin/actions/content', () => ({ saveQuiz: vi.fn() }))
const { QuizEditor } = await import('./QuizEditor')

afterEach(cleanup)

const LESSON = '2b1f0d5e-3c4a-4b6d-9e8f-0a1b2c3d4e5f'
const sent = (container: HTMLElement) =>
  JSON.parse((container.querySelector('input[name="questions"]') as HTMLInputElement).value) as {
    prompt: string
    options: { text: string; correct: boolean }[]
  }[]

describe('QuizEditor (decision 8)', () => {
  it('shows the saved quiz, with its correct option chosen', () => {
    render(
      <QuizEditor
        lessonId={LESSON}
        initial={[
          {
            prompt: 'Which bolt?',
            options: [
              { text: 'M8', correct: false },
              { text: 'M10', correct: true },
              { text: 'M12', correct: false },
            ],
          },
        ]}
      />,
    )
    expect(screen.getByDisplayValue('Which bolt?')).toBeTruthy()
    expect((screen.getByLabelText('Option 2 is correct') as HTMLInputElement).checked).toBe(true)
  })

  it('starts a new quiz with one question of three options, one correct', () => {
    const { container } = render(<QuizEditor lessonId={LESSON} initial={[]} />)
    const [question] = sent(container)
    expect(question?.options).toHaveLength(3)
    expect(question?.options.filter((o) => o.correct)).toHaveLength(1)
  })

  it('keeps exactly one correct option and stays within 3 to 4 options', () => {
    const { container } = render(<QuizEditor lessonId={LESSON} initial={[]} />)
    fireEvent.click(screen.getByLabelText('Option 3 is correct'))
    expect(sent(container)[0]?.options.map((o) => o.correct)).toEqual([false, false, true])
    fireEvent.click(screen.getByText('Add option'))
    expect((screen.getByText('Add option') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByText('Remove last option'))
    fireEvent.click(screen.getByText('Remove last option'))
    expect(sent(container)[0]?.options).toHaveLength(3)
    // Removing the correct option moves "correct" to the first one.
    expect(sent(container)[0]?.options.filter((o) => o.correct)).toHaveLength(1)
  })

  it('allows 1 to 5 questions', () => {
    const { container } = render(<QuizEditor lessonId={LESSON} initial={[]} />)
    for (let i = 0; i < 6; i++) fireEvent.click(screen.getByText('Add question'))
    expect(sent(container)).toHaveLength(5)
  })
})
