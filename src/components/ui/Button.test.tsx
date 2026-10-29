import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Button, ButtonLink, buttonClasses } from './Button'

afterEach(cleanup)

const tokens = (classes: string) => classes.split(/\s+/)

describe('buttonClasses', () => {
  it('makes primary buttons cyan with black uppercase text, at least 44 px high', () => {
    const t = tokens(buttonClasses({ variant: 'primary' }))
    expect(t).toEqual(
      expect.arrayContaining(['bg-carbon-cyan', 'text-carbon-black', 'uppercase', 'min-h-11']),
    )
  })

  it('makes secondary buttons a black outline with black text', () => {
    const t = tokens(buttonClasses({ variant: 'secondary' }))
    expect(t).toEqual(
      expect.arrayContaining(['border-2', 'border-carbon-black', 'text-carbon-black']),
    )
  })

  it('uses white outline and text for secondary buttons on dark surfaces', () => {
    const t = tokens(buttonClasses({ variant: 'secondary', onDark: true }))
    expect(t).toEqual(expect.arrayContaining(['border-white', 'text-white']))
  })

  it('draws every button as a pill, like the website (BRAND.md Website style)', () => {
    for (const variant of ['primary', 'secondary'] as const) {
      expect(tokens(buttonClasses({ variant }))).toContain('rounded-pill')
    }
  })
})

describe('Button and ButtonLink', () => {
  it('renders a button element with type="button" by default', () => {
    render(<Button>Take the quiz</Button>)
    expect(screen.getByRole('button', { name: 'Take the quiz' }).getAttribute('type')).toBe(
      'button',
    )
  })

  it('renders a link with the given href', () => {
    render(<ButtonLink href="/lessons">Browse lessons</ButtonLink>)
    expect(screen.getByRole('link', { name: 'Browse lessons' }).getAttribute('href')).toBe(
      '/lessons',
    )
  })
})
