import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/ui/Container'
import { getCurrentUser } from '@/lib/auth/session'
import { SignInForm } from './SignInForm'

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } }

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
