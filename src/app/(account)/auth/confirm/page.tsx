import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { ConfirmForm } from './ConfirmForm'

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } }

const first = (value: string | string[] | undefined) => (typeof value === 'string' ? value : '')

/**
 * The token is in the fragment, so the server never sees it (ConfirmForm reads it). Only the
 * `next` path comes through the query. proxy.ts sets no-referrer and no-store here (T-12).
 */
export default async function ConfirmPage({ searchParams }: PageProps<'/auth/confirm'>) {
  const query = await searchParams
  return (
    <Container className="max-w-xl py-10 md:py-14">
      <h1 className="text-h1 md:text-h1-lg">Sign in to the Academy</h1>
      <p className="mt-4">Tap the button to finish signing in on this device.</p>
      <ConfirmForm next={first(query.next).slice(0, 500)} />
    </Container>
  )
}
