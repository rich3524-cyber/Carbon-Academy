import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { MobileMenu } from './MobileMenu'
import { NAV_LINKS, SALES_EMAIL, SHOP_URL } from './nav'
import { SocialLinks } from './SocialLinks'

/**
 * Matches carbonoffroad.com.au (BRAND.md Website style): a black top bar with social links,
 * the sales email and one announcement, then a sticky full-width cyan bar. The white-on-black
 * logo badge is approved on cyan (p.21) and links home. Menu text is black on cyan (6.4:1, p.25).
 */
export function SiteHeader() {
  return (
    <>
      <div data-surface="dark" className="bg-carbon-black text-white">
        <Container className="grid grid-cols-1 items-center py-1 text-small md:grid-cols-3">
          <div className="hidden items-center gap-2 md:flex">
            <SocialLinks className="-ml-3" />
            <a className="hover:underline" href={`mailto:${SALES_EMAIL}`}>
              {SALES_EMAIL}
            </a>
          </div>
          <p className="py-2 text-center font-extrabold uppercase md:py-0">
            {/* Draft copy, awaiting Rich's approval (brand p.69) */}
            <Link href="/certified" className="hover:underline">
              Get Carbon Certified
            </Link>
          </p>
        </Container>
      </div>
      <header className="sticky top-0 z-40 bg-carbon-cyan text-carbon-black shadow-md">
        <Container className="relative flex min-h-16 items-center justify-between gap-4">
          <MobileMenu />
          <Link
            href="/"
            className="shrink-0 py-2 max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2"
          >
            <Image
              src="/brand/logo-full-white-on-black.svg"
              alt="Carbon Offroad Academy home"
              width={150}
              height={42}
              className="h-auto w-32 md:w-38"
              unoptimized
              priority
            />
          </Link>
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block py-3 font-extrabold uppercase hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center">
            <a
              href={SHOP_URL}
              className="hidden py-3 pr-2 font-extrabold uppercase hover:underline md:inline-block"
            >
              Shop
            </a>
            <Link
              href="/dashboard"
              className="flex h-11 w-11 items-center justify-center rounded-pill hover:bg-carbon-black/10"
            >
              <span className="sr-only">My Academy</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            </Link>
          </div>
        </Container>
      </header>
    </>
  )
}
