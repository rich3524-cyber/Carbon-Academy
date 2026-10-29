import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field } from './Field'

/** Text of every element the input's aria-describedby points at, in order. */
function describedBy(input: HTMLElement): string {
  return (input.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
}

describe('Field', () => {
  it('labels the input and links the error to it (WCAG 1.3.1, 3.3.1)', () => {
    render(<Field label="Email" name="email" type="email" error="Enter a valid email address." />)
    const input = screen.getByLabelText('Email')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(describedBy(input)).toBe('Enter a valid email address.')
  })

  it('links the hint too, and is not marked invalid without an error', () => {
    render(<Field label="Store code" name="code" hint="It looks like BCF-ROB-7K2Q9MXH." />)
    const input = screen.getByLabelText('Store code')
    expect(input.hasAttribute('aria-invalid')).toBe(false)
    expect(describedBy(input)).toBe('It looks like BCF-ROB-7K2Q9MXH.')
  })
})
