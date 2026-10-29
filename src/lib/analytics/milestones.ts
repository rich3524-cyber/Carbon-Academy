import type { VideoEvent } from './track'

export type PlayerSignal =
  { type: 'play' } | { type: 'progress'; percent: number } | { type: 'ended' }

/** The video events due for this signal that haven't fired yet, in order. */
export function dueMilestones(fired: ReadonlySet<VideoEvent>, signal: PlayerSignal): VideoEvent[] {
  const due: VideoEvent[] = []
  const add = (event: VideoEvent) => {
    if (!fired.has(event) && !due.includes(event)) due.push(event)
  }
  if (signal.type === 'play') add('video_start')
  if (signal.type === 'progress') {
    if (signal.percent > 0) add('video_start')
    if (signal.percent >= 0.5) add('video_progress_50')
  }
  if (signal.type === 'ended') {
    add('video_start')
    add('video_progress_50')
    add('video_complete')
  }
  return due
}
