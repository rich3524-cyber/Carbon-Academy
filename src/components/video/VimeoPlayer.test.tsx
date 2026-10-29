import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PROGRESS_SAVED } from '@/lib/progress/events'
import { VimeoPlayer, vimeoEmbedUrl } from './VimeoPlayer'

const mocks = vi.hoisted(() => ({
  handlers: {} as Record<string, (data: unknown) => void>,
  setCurrentTime: vi.fn<(seconds: number) => Promise<void>>(() => Promise.resolve()),
  getResumePoint: vi.fn(),
  saveProgress: vi.fn(),
}))

vi.mock('@vimeo/player', () => ({
  default: class {
    on(event: string, handler: (data: unknown) => void) {
      mocks.handlers[event] = handler
    }
    off() {}
    getDuration() {
      return Promise.resolve(300)
    }
    setCurrentTime(seconds: number) {
      return mocks.setCurrentTime(seconds)
    }
  },
}))

// Server Actions: in the app Next.js replaces these with network calls; here they're stubs.
vi.mock('@/lib/progress/actions', () => ({
  getResumePoint: mocks.getResumePoint,
  saveProgress: mocks.saveProgress,
}))

beforeEach(() => {
  for (const key of Object.keys(mocks.handlers)) delete mocks.handlers[key]
  mocks.setCurrentTime.mockClear()
  mocks.getResumePoint.mockReset()
  mocks.saveProgress.mockReset().mockResolvedValue({ saved: true })
})
afterEach(cleanup)

const LESSON_ID = '3f9a1c2e-4b5d-4e6f-8a7b-9c0d1e2f3a4b'
const props = {
  vimeoId: '76979871',
  title: 'Scout Pro 10K V3',
  lessonId: LESSON_ID,
  lessonSlug: 'scout-pro-10k-v3',
  categorySlug: 'winches',
}

async function pressPlay() {
  render(<VimeoPlayer {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Play video: Scout Pro 10K V3' }))
  await vi.waitFor(() => expect(mocks.getResumePoint).toHaveBeenCalledWith(LESSON_ID))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('VimeoPlayer progress (PRD 5.3)', () => {
  it('never saves progress for a signed-out viewer', async () => {
    mocks.getResumePoint.mockResolvedValue({ signedIn: false, seconds: 0 })
    await pressPlay()
    mocks.handlers.timeupdate?.({ percent: 0.5, seconds: 150 })
    mocks.handlers.pause?.({ percent: 0.5, seconds: 150 })
    expect(mocks.saveProgress).not.toHaveBeenCalled()
    expect(mocks.setCurrentTime).not.toHaveBeenCalled()
  })

  it('resumes a signed-in learner and saves at each new 10% step', async () => {
    mocks.getResumePoint.mockResolvedValue({ signedIn: true, seconds: 42 })
    await pressPlay()
    await vi.waitFor(() => expect(mocks.setCurrentTime).toHaveBeenCalledWith(42))
    mocks.handlers.timeupdate?.({ percent: 0.35, seconds: 105.7 })
    mocks.handlers.timeupdate?.({ percent: 0.36, seconds: 108 }) // same 10% step: no save
    expect(mocks.saveProgress).toHaveBeenCalledTimes(1)
    expect(mocks.saveProgress).toHaveBeenCalledWith({
      lessonId: LESSON_ID,
      percent: 35,
      seconds: 105,
    })
  })

  it('announces each saved step so the quiz can unlock without a reload', async () => {
    mocks.getResumePoint.mockResolvedValue({ signedIn: true, seconds: 0 })
    const heard: unknown[] = []
    const listener = (event: Event) => heard.push((event as CustomEvent).detail)
    window.addEventListener(PROGRESS_SAVED, listener)
    await pressPlay()
    mocks.handlers.ended?.({ percent: 1, seconds: 300 })
    await vi.waitFor(() => expect(heard).toEqual([{ lessonId: LESSON_ID, percent: 100 }]))
    window.removeEventListener(PROGRESS_SAVED, listener)
  })

  it('announces nothing when a save fails', async () => {
    mocks.getResumePoint.mockResolvedValue({ signedIn: true, seconds: 0 })
    mocks.saveProgress.mockResolvedValue({ saved: false })
    const heard: unknown[] = []
    const listener = (event: Event) => heard.push((event as CustomEvent).detail)
    window.addEventListener(PROGRESS_SAVED, listener)
    await pressPlay()
    mocks.handlers.ended?.({ percent: 1, seconds: 300 })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(heard).toEqual([])
    window.removeEventListener(PROGRESS_SAVED, listener)
  })
})

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

  it('lets the player use encrypted media, or Vimeo fails before playing (no progress events)', () => {
    render(<VimeoPlayer {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play video: Scout Pro 10K V3' }))
    const allow = screen.getByTitle('Video: Scout Pro 10K V3').getAttribute('allow') ?? ''
    expect(allow.split(';').map((s) => s.trim())).toEqual(
      expect.arrayContaining(['autoplay', 'fullscreen', 'picture-in-picture', 'encrypted-media']),
    )
  })
})
