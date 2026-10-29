'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_LINKS } from './nav'

/**
 * Phone menu (BRAND.md Website style). A native <details> disclosure, so it works with the
 * keyboard and without extra script. Keyed on the path, so it closes after each navigation.
 */
export function MobileMenu() {
  const pathname = usePathname()
  return (
    <details key={pathname} className="group md:hidden">
      <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-pill [&::-webkit-details-marker]:hidden">
        <span className="sr-only">Menu</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path className="group-open:hidden" d="M4 7h16M4 12h16M4 17h16" />
          <path className="hidden group-open:block" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </summary>
      <nav
        aria-label="Main"
        className="absolute inset-x-0 top-full border-t-2 border-carbon-black/10 bg-carbon-cyan shadow-md"
      >
        <ul className="mx-auto flex max-w-6xl flex-col px-4 py-2">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="block py-3 font-extrabold uppercase">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  )
}
