import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

export default function NotFound() {
  return (
    <Container className="py-16">
      <h1 className="text-h1 md:text-h1-lg">Page not found</h1>
      <p className="mt-4 max-w-prose">That page doesn&apos;t exist yet, or it&apos;s moved.</p>
      <div className="mt-8">
        <ButtonLink href="/">Back to home</ButtonLink>
      </div>
    </Container>
  )
}
