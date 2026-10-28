import type { ReactNode } from 'react'

/** Small label. Cyan is allowed for badges (p.45); black on cyan is 6.4:1 (p.25). */
const tones = {
  accent: 'bg-carbon-cyan text-carbon-black',
  neutral: 'bg-dust text-carbon-black',
  dark: 'bg-carbon-black text-white',
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: keyof typeof tones
  children: ReactNode
}) {
  return (
    <span className={`inline-block px-2 py-0.5 text-small font-bold uppercase ${tones[tone]}`}>
      {children}
    </span>
  )
}
