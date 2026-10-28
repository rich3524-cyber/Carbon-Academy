import Link from 'next/link'
import type { ComponentProps } from 'react'

type ButtonStyle = {
  variant?: 'primary' | 'secondary'
  /** Angled = parallelogram matching the logo badge (p.32). Never mix with other corner styles. */
  shape?: 'square' | 'angled'
  onDark?: boolean
}

const base =
  'relative isolate inline-flex min-h-11 items-center justify-center px-6 py-3 text-button font-bold uppercase transition-colors'

const square = {
  primary: 'bg-carbon-cyan text-carbon-black hover:bg-carbon-black hover:text-carbon-cyan',
  secondary:
    'border-2 border-carbon-black text-carbon-black hover:bg-carbon-black hover:text-white',
  secondaryOnDark: 'border-2 border-white text-white hover:bg-white hover:text-carbon-black',
}

const angledBase = 'before:absolute before:inset-0 before:-z-10 before:-skew-x-14'

const angled = {
  primary:
    'before:bg-carbon-cyan text-carbon-black hover:before:bg-carbon-black hover:text-carbon-cyan',
  secondary:
    'before:border-2 before:border-carbon-black text-carbon-black hover:before:bg-carbon-black hover:text-white',
  secondaryOnDark:
    'before:border-2 before:border-white text-white hover:before:bg-white hover:text-carbon-black',
}

export function buttonClasses({
  variant = 'primary',
  shape = 'square',
  onDark = false,
}: ButtonStyle = {}) {
  const key = variant === 'secondary' && onDark ? 'secondaryOnDark' : variant
  return shape === 'angled' ? `${base} ${angledBase} ${angled[key]}` : `${base} ${square[key]}`
}

type ButtonProps = ButtonStyle & Omit<ComponentProps<'button'>, 'className'>

export function Button({ variant, shape, onDark, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, shape, onDark })} {...props} />
}

type ButtonLinkProps = ButtonStyle & Omit<ComponentProps<typeof Link>, 'className'>

export function ButtonLink({ variant, shape, onDark, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, shape, onDark })} {...props} />
}
