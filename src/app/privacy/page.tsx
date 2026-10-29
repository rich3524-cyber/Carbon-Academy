import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'

export const metadata: Metadata = { title: 'Privacy policy' }

/**
 * Holding page until Carbon Offroad supplies the Academy privacy policy (decision 7).
 * The text must cover APP 1 and APP 5 matters: what we collect, why, who sees it, where
 * it's stored (Supabase region, decision S9) and how to access or correct it.
 */
export default function PrivacyPage() {
  return (
    <Container className="py-10 md:py-14">
      <h1 className="text-h1 md:text-h1-lg">Privacy policy</h1>
      <p className="mt-6 max-w-prose">[PRIVACY POLICY TEXT TBC: supplied by Carbon Offroad]</p>
    </Container>
  )
}
