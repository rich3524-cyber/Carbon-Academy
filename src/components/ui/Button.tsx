import Link from 'next/link'
import type { ComponentProps } from 'react'

type ButtonStyle = {
  variant?: 'primary' | 'secondary'
  onDark?: boolean
}

/** Pill buttons, matching carbonoffroad.com.au (BRAND.md Website style). At least 44 px high. */
const base =
  'inline-flex min-h-11 items-center justify-center rounded-pill px-6 py-3 text-button font-extrabold uppercase transition-colors'

const styles = {
  primary: 'bg-carbon-cyan text-carbon-black hover:bg-carbon-black hover:text-carbon-cyan',
  secondary:
    'border-2 border-carbon-black text-carbon-black hover:bg-carbon-black hover:text-white',
  secondaryOnDark: 'border-2 border-white text-white hover:bg-white hover:text-carbon-black',
}

export function buttonClasses({ variant = 'primary', onDark = false }: ButtonStyle = {}) {
  const key = variant === 'secondary' && onDark ? 'secondaryOnDark' : variant
  return `${base} ${styles[key]}`
}

type ButtonProps = ButtonStyle & Omit<ComponentProps<'button'>, 'className'>

export function Button({ variant, onDark, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, onDark })} {...props} />
}

type ButtonLinkProps = ButtonStyle & Omit<ComponentProps<typeof Link>, 'className'>

export function ButtonLink({ variant, onDark, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, onDark })} {...props} />
}
