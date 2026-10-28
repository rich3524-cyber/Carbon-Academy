import Link from 'next/link'
import type { ReactNode } from 'react'

const card = 'block h-full border-2 border-dust bg-white p-5'

export function Card({ href, children }: { href?: string; children: ReactNode }) {
  if (href) {
    return (
      <Link href={href} className={`${card} transition-colors hover:border-carbon-black`}>
        {children}
      </Link>
    )
  }
  return <div className={card}>{children}</div>
}
