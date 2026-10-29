import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { NAV_LINKS, SALES_EMAIL, SHOP_URL } from './nav'
import { SocialLinks } from './SocialLinks'

/**
 * Cyan footer, matching carbonoffroad.com.au (BRAND.md Website style). Text is black: white on
 * cyan is only 2.9:1, black on cyan is 6.4:1 (p.25). Company and contact details as on the website
 * footer and BRAND.md (p.48, p.69). The white-on-black logo badge is approved on cyan (p.21).
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 bg-carbon-cyan text-carbon-black">
      <Container className="grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Image
            src="/brand/logo-full-white-on-black.svg"
            alt="Carbon Offroad"
            width={180}
            height={51}
            className="h-auto w-40"
            unoptimized
          />
          <p className="mt-4">
            KPD Industries Pty Ltd
            <br />
            ABN 80 142 983 382
          </p>
          <SocialLinks className="mt-4 -ml-3" />
        </div>
        <nav aria-label="Footer">
          <h2 className="text-h3 font-extrabold tracking-normal">Academy</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link className="hover:underline" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a className="hover:underline" href={SHOP_URL}>
                Shop carbonoffroad.com.au
              </a>
            </li>
            <li>
              <Link className="hover:underline" href="/privacy">
                Privacy policy
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="text-h3 font-extrabold tracking-normal">Contact us</h2>
          <address className="mt-3 flex flex-col gap-2 not-italic">
            <span>Unit 1a, 1 Waterway Drive, Coomera QLD 4209</span>
            <a className="hover:underline" href={`mailto:${SALES_EMAIL}`}>
              {SALES_EMAIL}
            </a>
            <a className="hover:underline" href="tel:1300780141">
              1300 780 141
            </a>
            <span>Mon–Fri, 9am–5pm (AEST)</span>
          </address>
        </div>
      </Container>
    </footer>
  )
}
