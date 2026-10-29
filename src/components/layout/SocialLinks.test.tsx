import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SOCIAL_LINKS, SocialLinks } from './SocialLinks'

afterEach(cleanup)

describe('SocialLinks', () => {
  it('links to the four Carbon Offroad accounts from the website, over HTTPS', () => {
    expect(SOCIAL_LINKS.map((link) => link.href)).toEqual([
      'https://www.facebook.com/CarbonOffroadAU',
      'https://www.instagram.com/carbonoffroad_australia',
      'https://www.youtube.com/@carbonoffroad',
      'https://www.tiktok.com/@carbonoffroad_au',
    ])
  })

  it('gives every icon a name and opens it safely in a new tab', () => {
    render(<SocialLinks />)
    for (const { label } of SOCIAL_LINKS) {
      const link = screen.getByRole('link', { name: `Carbon Offroad on ${label}` })
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    }
  })
})
