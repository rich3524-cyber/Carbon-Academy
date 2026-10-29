import Link from 'next/link'
import type { ReactNode } from 'react'

/** White card with the website's corner radius (BRAND.md Website style), on the light grey page colour. */
const card = 'block h-full rounded-card bg-white p-5 md:p-6'

export function Card({ href, children }: { href?: string; children: ReactNode }) {
  if (href) {
    return (
      <Link href={href} className={`${card} transition-shadow hover:shadow-lg`}>
        {children}
      </Link>
    )
  }
  return <div className={card}>{children}</div>
}
