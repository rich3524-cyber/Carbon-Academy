import { Button, ButtonLink } from '@/components/ui/Button'
import { QUIZ_COPY } from './copy'

export function QuizResult({
  score,
  total,
  passed,
  certified,
  canRetry,
  onRetry,
}: {
  score: number
  total: number
  passed: boolean
  /** This pass completed every core lesson and issued a certificate (Phase 5, decision 1). */
  certified: boolean
  canRetry: boolean
  onRetry: () => void
}) {
  return (
    <div>
      <p className="text-h3 font-extrabold">
        {passed ? QUIZ_COPY.pass : QUIZ_COPY.fail(score, total)}
      </p>
      {certified && (
        <div className="mt-6">
          <p className="font-bold">{QUIZ_COPY.certified}</p>
          <div className="mt-4">
            <ButtonLink href="/dashboard">View your certificate</ButtonLink>
          </div>
        </div>
      )}
      {!passed && canRetry && (
        <div className="mt-6">
          <Button onClick={onRetry}>Try again</Button>
        </div>
      )}
      {!passed && !canRetry && <p className="mt-4">{QUIZ_COPY.limited}</p>}
    </div>
  )
}
