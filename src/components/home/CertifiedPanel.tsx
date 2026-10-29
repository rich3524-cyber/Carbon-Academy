import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

// Draft copy, awaiting Rich's approval (brand p.69).
export function CertifiedPanel({ storeThreshold }: { storeThreshold: number }) {
  return (
    <section data-surface="dark" className="bg-gunmetal text-white">
      <Container className="py-12 md:py-16">
        <h2 className="text-h2 md:text-h2-lg">Get Carbon Certified</h2>
        <p className="mt-4 max-w-prose">
          Store staff who pass every core lesson become Carbon Certified. Stores with{' '}
          {storeThreshold} or more certified staff become Carbon Certified Stores.
        </p>
        <div className="mt-8">
          <ButtonLink href="/certified" variant="secondary" onDark>
            How it works
          </ButtonLink>
        </div>
      </Container>
    </section>
  )
}
