'use client'

import type VimeoPlayerSdk from '@vimeo/player'
import { useEffect, useRef, useState } from 'react'
import { type PlayerSignal, dueMilestones } from '@/lib/analytics/milestones'
import { type EventProps, type VideoEvent, track } from '@/lib/analytics/track'
import { getResumePoint, saveProgress } from '@/lib/progress/actions'
import { type PlayerEvent, nextSave, resumeFrom } from '@/lib/progress/throttle'

/** Carbon Cyan without the hash, as Vimeo expects (BRAND.md video player). */
const PLAYER_COLOUR = '00a4c7'

/** Vimeo embed: brand colour, no tracking cookies (dnt), English captions on (PRD 6.2). */
export function vimeoEmbedUrl(vimeoId: string): string {
  const params = new URLSearchParams({
    color: PLAYER_COLOUR,
    dnt: '1',
    texttrack: 'en',
    title: '0',
    byline: '0',
    portrait: '0',
    autoplay: '1',
  })
  return `https://player.vimeo.com/video/${vimeoId}?${params}`
}

type Props = {
  vimeoId: string
  title: string
  lessonId: string
  lessonSlug: string
  categorySlug: string
}

/**
 * Click-to-play: nothing loads from Vimeo until the visitor presses play (security framework
 * control 20). @vimeo/player then attaches to the iframe for analytics milestones. Signed-in
 * learners get resume and progress saves through Server Actions (PRD 5.3), so the lesson page
 * itself stays static.
 */
export function VimeoPlayer({ vimeoId, title, lessonId, lessonSlug, categorySlug }: Props) {
  const [started, setStarted] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const fired = useRef(new Set<VideoEvent>())

  useEffect(() => {
    if (!started || !frame.current) return
    frame.current.focus()
    const eventProps: EventProps = { lesson_slug: lessonSlug, category_slug: categorySlug }
    const emit = (signal: PlayerSignal) => {
      for (const event of dueMilestones(fired.current, signal)) {
        fired.current.add(event)
        track(event, eventProps)
      }
    }
    let player: VimeoPlayerSdk | undefined
    let cancelled = false
    // Progress is tracked only for signed-in learners. getResumePoint says which this is.
    const progress = { tracking: false, step: -1 }
    type Timing = { percent: number; seconds: number }
    const save = (event: PlayerEvent, data: Timing) => {
      if (!progress.tracking) return
      const next = nextSave(progress.step, event, data.percent)
      progress.step = next.step
      if (!next.save) return
      const percent = event === 'ended' ? 100 : Math.round(data.percent * 100)
      void saveProgress({ lessonId, percent, seconds: Math.floor(data.seconds) }).then((result) => {
        if (!result.saved) progress.tracking = false
      })
    }

    import('@vimeo/player').then(({ default: Player }) => {
      if (cancelled || !frame.current) return
      const instance = new Player(frame.current)
      player = instance
      instance.on('play', () => emit({ type: 'play' }))
      instance.on('timeupdate', (data: Timing) => {
        emit({ type: 'progress', percent: data.percent })
        save('timeupdate', data)
      })
      instance.on('pause', (data: Timing) => save('pause', data))
      instance.on('ended', (data: Timing) => {
        emit({ type: 'ended' })
        save('ended', data)
      })
      getResumePoint(lessonId)
        .then(async ({ signedIn, seconds }) => {
          if (cancelled || !signedIn) return
          progress.tracking = true
          const from = resumeFrom(seconds, await instance.getDuration())
          if (from > 0) await instance.setCurrentTime(from)
        })
        .catch(() => {
          // Progress is a nice-to-have; playback carries on without it.
        })
    })
    return () => {
      cancelled = true
      for (const event of ['play', 'timeupdate', 'pause', 'ended'] as const) player?.off(event)
    }
  }, [started, lessonId, lessonSlug, categorySlug])

  if (!started) {
    return (
      <button
        type="button"
        onClick={() => setStarted(true)}
        className="group relative flex aspect-video w-full items-center justify-center bg-carbon-black text-white"
      >
        <span className="sr-only">Play video: {title}</span>
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center bg-carbon-cyan text-carbon-black transition-colors group-hover:bg-white"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </button>
    )
  }

  return (
    <div className="relative aspect-video w-full bg-carbon-black">
      <iframe
        ref={frame}
        src={vimeoEmbedUrl(vimeoId)}
        title={`Video: ${title}`}
        className="absolute inset-0 h-full w-full"
        allow="autoplay; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  )
}
