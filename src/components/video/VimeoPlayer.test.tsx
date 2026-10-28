import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VimeoPlayer, vimeoEmbedUrl } from './VimeoPlayer'

vi.mock('@vimeo/player', () => ({
  default: class {
    on() {}
    off() {}
  },
}))

afterEach(cleanup)

const props = {
  vimeoId: '76979871',
  title: 'Scout Pro 10K V3',
  lessonSlug: 'scout-pro-10k-v3',
  categorySlug: 'winches',
}

describe('vimeoEmbedUrl', () => {
  it('uses the brand player colour, no tracking and captions on', () => {
    const url = new URL(vimeoEmbedUrl('76979871'))
    expect(url.origin + url.pathname).toBe('https://player.vimeo.com/video/76979871')
    expect(url.searchParams.get('color')).toBe('00a4c7')
    expect(url.searchParams.get('dnt')).toBe('1')
    expect(url.searchParams.get('texttrack')).toBe('en')
  })
})

describe('VimeoPlayer', () => {
  it('shows an accessible play button and loads nothing from Vimeo until pressed', () => {
    render(<VimeoPlayer {...props} />)
    expect(screen.getByRole('button', { name: 'Play video: Scout Pro 10K V3' })).toBeDefined()
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('loads the titled Vimeo iframe when play is pressed', () => {
    render(<VimeoPlayer {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play video: Scout Pro 10K V3' }))
    const frame = screen.getByTitle('Video: Scout Pro 10K V3')
    expect(frame.getAttribute('src')).toBe(vimeoEmbedUrl('76979871'))
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin')
  })
})
