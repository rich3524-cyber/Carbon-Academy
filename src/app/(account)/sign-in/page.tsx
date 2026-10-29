import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/ui/Container'
import { getCurrentUser } from '@/lib/auth/session'
import { SignInForm } from './SignInForm'

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } }

// Per-request page: navigations between account pages are checked separately from the layout's
// opt-out, so each page opts out of instant navigation too (Next.js 16 instant-navigation guide).
export const instant = false

export default async function SignInPage() {
  if (await getCurrentUser()) redirect('/dashboard')
  return (
    <Container className="max-w-xl py-10 md:py-14">
      <h1 className="text-h1 md:text-h1-lg">Sign in</h1>
      <p className="mt-4">
        Enter your email and we&apos;ll send you a sign-in link. No password needed.
      </p>
      <SignInForm />
    </Container>
  )
}
