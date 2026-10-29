import { Button } from '@/components/ui/Button'
import { QUIZ_COPY } from './copy'

export function QuizResult({
  score,
  total,
  passed,
  canRetry,
  onRetry,
}: {
  score: number
  total: number
  passed: boolean
  canRetry: boolean
  onRetry: () => void
}) {
  return (
    <div>
      <p className="text-h3 font-extrabold">
        {passed ? QUIZ_COPY.pass : QUIZ_COPY.fail(score, total)}
      </p>
      {!passed && canRetry && (
        <div className="mt-6">
          <Button onClick={onRetry}>Try again</Button>
        </div>
      )}
      {!passed && !canRetry && <p className="mt-4">{QUIZ_COPY.limited}</p>}
    </div>
  )
}
