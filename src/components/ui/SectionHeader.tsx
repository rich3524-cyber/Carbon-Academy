import type { ReactNode } from 'react'
import { Slash } from './Slash'

const sizes = {
  h1: 'text-h1 md:text-h1-lg',
  h2: 'text-h2 md:text-h2-lg',
}

export function SectionHeader({
  as: Heading = 'h2',
  title,
  intro,
  slash = false,
}: {
  as?: 'h1' | 'h2'
  title: string
  intro?: ReactNode
  /** Only one slash motif per screen (p.32) */
  slash?: boolean
}) {
  return (
    <div className="flex items-stretch gap-4">
      {slash && <Slash className="min-h-8" />}
      <div>
        <Heading className={sizes[Heading]}>{title}</Heading>
        {intro && <p className="mt-2 max-w-prose">{intro}</p>}
      </div>
    </div>
  )
}
