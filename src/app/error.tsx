'use client'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

/**
 * Generic error page: no error details reach the user (framework control 15).
 * Next.js 16 passes `retry`, which re-fetches and re-renders the failed segment.
 */
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Container className="py-16">
      <h1 className="text-h1 md:text-h1-lg">Something went wrong</h1>
      <p className="mt-4 max-w-prose">
        Something went wrong on our end. Give it another go in a minute.
      </p>
      <div className="mt-8">
        <Button onClick={() => retry()}>Try again</Button>
      </div>
    </Container>
  )
}
