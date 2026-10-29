import type { Metadata } from 'next'
import { SignOutButton } from '@/components/account/SignOutButton'
import { Container } from '@/components/ui/Container'
import { getCurrentUser } from '@/lib/auth/session'
import { JoinForm } from './JoinForm'
import { StoreCodeForm } from './StoreCodeForm'

export const metadata: Metadata = { title: 'Join the Academy', robots: { index: false } }

export default async function JoinPage() {
  const user = await getCurrentUser()
  if (user) {
    return (
      <Container className="max-w-xl py-10 md:py-14">
        <h1 className="text-h1 md:text-h1-lg">Change store</h1>
        <p className="mt-4">
          {user.storeName ? `You're with ${user.storeName}.` : "You're not linked to a store."}{' '}
          Enter your new store&apos;s code to move. Your progress comes with you.
        </p>
        <div className="mt-8">
          <StoreCodeForm label="New store code" />
        </div>
        <div className="mt-10 border-t-2 border-dust pt-6">
          <SignOutButton />
        </div>
      </Container>
    )
  }
  return (
    <Container className="max-w-xl py-10 md:py-14">
      <h1 className="text-h1 md:text-h1-lg">Join the Academy</h1>
      <section className="mt-8" aria-labelledby="staff">
        <h2 id="staff" className="text-h3">
          Work at a Carbon Offroad stockist?
        </h2>
        <p className="mt-2">Enter your store code to join your store&apos;s team.</p>
        <div className="mt-6">
          <StoreCodeForm />
        </div>
      </section>
      <section className="mt-12 border-t-2 border-dust pt-8" aria-labelledby="customer">
        <h2 id="customer" className="text-h3">
          No store code? Join as a customer
        </h2>
        <div className="mt-6">
          <JoinForm />
        </div>
      </section>
    </Container>
  )
}
