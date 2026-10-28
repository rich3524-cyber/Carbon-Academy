import Link from 'next/link'
import { Container } from '@/components/ui/Container'

/** Gunmetal footer, white text 13.2:1 (p.25). Company details from p.48. */
export function SiteFooter() {
  return (
    <footer data-surface="dark" className="bg-gunmetal text-white">
      <Container className="flex flex-col gap-4 py-8 text-small md:flex-row md:items-center md:justify-between">
        <p>
          Carbon Offroad | KPD Industries Pty Ltd | ABN 80 142 983 382 |{' '}
          <a className="link" href="tel:1300780141">
            1300 780 141
          </a>{' '}
          |{' '}
          <a className="link" href="https://carbonoffroad.com.au">
            carbonoffroad.com.au
          </a>
        </p>
        <nav aria-label="Footer">
          <Link className="link" href="/privacy">
            Privacy policy
          </Link>
        </nav>
      </Container>
    </footer>
  )
}
