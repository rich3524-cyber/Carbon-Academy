import type { Metadata } from 'next'
import { SignOutButton } from '@/components/account/SignOutButton'
import { redirect } from 'next/navigation'
import { Container } from '@/components/ui/Container'
import { getCurrentUser } from '@/lib/auth/session'
import { lookupStore } from '@/lib/stores/lookup'
import { StoreCode } from '@/lib/validation/account'
import { ChangeStoreForm } from '../ChangeStoreForm'
import { JoinForm } from '../JoinForm'
import { StoreCodeForm } from '../StoreCodeForm'

export const metadata: Metadata = { title: 'Join your store', robots: { index: false } }

// Per-request page: navigations between account pages are checked separately from the layout's
// opt-out, so each page opts out of instant navigation too (Next.js 16 instant-navigation guide).
export const instant = false

export default async function JoinStorePage({ params }: PageProps<'/join/[code]'>) {
  const parsed = StoreCode.safeParse((await params).code)
  const store = parsed.success ? await lookupStore(parsed.data) : null

  if (!parsed.success || !store) {
    return (
      <Container className="max-w-xl py-10 md:py-14">
        <h1 className="text-h1 md:text-h1-lg">We couldn&apos;t find that store</h1>
        <p className="mt-4">Check the code with your manager, then enter it again.</p>
        <div className="mt-8">
          <StoreCodeForm />
        </div>
      </Container>
    )
  }

  const user = await getCurrentUser()
  if (user && user.storeName === store.storeName) redirect('/dashboard')

  return (
    <Container className="max-w-xl py-10 md:py-14">
      <h1 className="text-h1 md:text-h1-lg">
        {user ? `Move to ${store.storeName}?` : `You're joining ${store.storeName}`}
      </h1>
      <p className="mt-4">
        {store.partnerName}
        {store.suburb ? `, ${store.suburb}` : ''}
        {store.state ? ` ${store.state}` : ''}
      </p>
      <div className="mt-8">
        {user ? (
          <>
            <ChangeStoreForm code={parsed.data} storeName={store.storeName} />
            <div className="mt-10 border-t-2 border-dust pt-6">
              <SignOutButton />
            </div>
          </>
        ) : (
          <>
            <p className="mb-6">Enter your details and we&apos;ll email you a sign-in link.</p>
            <JoinForm code={parsed.data} />
          </>
        )}
      </div>
    </Container>
  )
}
