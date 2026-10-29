import type { Ref } from 'react'
import type { QuizQuestion as Question } from '@/lib/quiz/shape'

export function QuizQuestion({
  question,
  number,
  total,
  selected,
  onSelect,
  focusRef,
}: {
  question: Question
  number: number
  total: number
  selected: string | undefined
  onSelect: (optionId: string) => void
  focusRef: Ref<HTMLLegendElement>
}) {
  return (
    <fieldset>
      <legend ref={focusRef} tabIndex={-1} className="text-h3 font-semibold">
        <span className="block text-small font-normal">
          Question {number} of {total}
        </span>
        {question.prompt}
      </legend>
      <div className="mt-4 flex flex-col gap-3">
        {question.options.map((option) => (
          <label
            key={option.id}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-field border-2 border-concrete bg-white px-4 py-3 has-checked:border-carbon-black"
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option.id}
              checked={selected === option.id}
              onChange={() => onSelect(option.id)}
              className="h-5 w-5 shrink-0 accent-carbon-black"
            />
            <span>{option.text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
