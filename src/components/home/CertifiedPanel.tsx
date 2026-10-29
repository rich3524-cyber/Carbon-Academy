import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

// Draft copy, awaiting Rich's approval (brand p.69).
export function CertifiedPanel({ storeThreshold }: { storeThreshold: number }) {
  return (
    <Container>
      <section
        data-surface="dark"
        className="rounded-card bg-gunmetal px-6 py-10 text-white md:px-12 md:py-14"
      >
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
      </section>
    </Container>
  )
}
