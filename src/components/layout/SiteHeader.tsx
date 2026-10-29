import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'

const navLinks = [
  { href: '/lessons', label: 'Lessons' },
  { href: '/certified', label: 'Get certified' },
  // Static header (Phase 3 decision 12): /dashboard sends signed-out visitors to /sign-in.
  { href: '/dashboard', label: 'My Academy' },
]

/**
 * Full logo, black on transparent, top left, linked to home (p.21, p.45).
 * 144 px on phones, 180 px from md: above the 120 px minimum. Padding keeps clear space X.
 */
export function SiteHeader() {
  return (
    <header className="border-b-2 border-dust bg-white">
      <Container className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-3">
        <Link href="/" className="shrink-0 p-1">
          <Image
            src="/brand/logo-full-black-transparent.svg"
            alt="Carbon Offroad Academy home"
            width={180}
            height={51}
            className="h-auto w-36 md:w-45"
            unoptimized
            priority
          />
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-block py-3 font-bold hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </header>
  )
}
