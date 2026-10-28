import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { getProgramSettings } from '@/lib/content/settings'

export const metadata: Metadata = {
  title: 'Get Carbon Certified',
  description: 'How retail staff and stores become Carbon Certified.',
}

// Draft copy, awaiting Rich's approval (brand p.69).
export default async function CertifiedPage() {
  const { certificateValidityMonths, storeThreshold } = await getProgramSettings()

  return (
    <Container className="py-10 md:py-14">
      <SectionHeader as="h1" title="Get Carbon Certified" slash />
      <div className="mt-6 max-w-prose space-y-6">
        <p>Carbon Certified is for staff at stores that sell Carbon Offroad gear.</p>
        <ol className="list-decimal space-y-3 pl-6">
          <li>
            Join with your store&apos;s code. Your store manager or Carbon Offroad will send you a
            joining link.
          </li>
          <li>Watch each core lesson and pass its short quiz.</li>
          <li>
            Pass them all and you&apos;re Carbon Certified. Your certificate lasts{' '}
            {certificateValidityMonths} months.
          </li>
        </ol>
        <p>
          When {storeThreshold} or more staff at a store hold active certificates, the store becomes
          a Carbon Certified Store.
        </p>
        <p className="font-bold">Sign-up opens soon.</p>
      </div>
      <div className="mt-8">
        <ButtonLink href="/lessons" variant="secondary">
          Browse lessons
        </ButtonLink>
      </div>
    </Container>
  )
}
