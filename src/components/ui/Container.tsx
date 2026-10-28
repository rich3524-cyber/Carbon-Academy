import type { ReactNode } from 'react'

/** Page-width wrapper. 16 px side gutter on phones, 24 px from md. */
export function Container({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={`mx-auto w-full max-w-6xl px-4 md:px-6 ${className}`}>{children}</div>
}
