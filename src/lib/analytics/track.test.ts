import { afterEach, describe, expect, it } from 'vitest'
import { track } from './track'

type DataLayerWindow = Window & { dataLayer?: Array<Record<string, string>> }

afterEach(() => {
  delete (window as DataLayerWindow).dataLayer
})

describe('track', () => {
  it('pushes the event to dataLayer when an analytics tool is loaded', () => {
    ;(window as DataLayerWindow).dataLayer = []
    track('video_start', { lesson_slug: 'scout-pro-10k-v3', category_slug: 'winches' })
    expect((window as DataLayerWindow).dataLayer).toEqual([
      { event: 'video_start', lesson_slug: 'scout-pro-10k-v3', category_slug: 'winches' },
    ])
  })

  it('pushes quiz events with slugs only', () => {
    ;(window as DataLayerWindow).dataLayer = []
    track('quiz_pass', { lesson_slug: 'soft-shackles', category_slug: 'recovery-gear' })
    expect((window as DataLayerWindow).dataLayer).toEqual([
      { event: 'quiz_pass', lesson_slug: 'soft-shackles', category_slug: 'recovery-gear' },
    ])
  })

  it('does nothing when no analytics tool is loaded', () => {
    expect(() =>
      track('video_complete', { lesson_slug: 'scout-pro-10k-v3', category_slug: 'winches' }),
    ).not.toThrow()
    expect((window as DataLayerWindow).dataLayer).toBeUndefined()
  })
})
