export type PlayerEvent = 'timeupdate' | 'pause' | 'ended'

/**
 * Whether to save progress now. `step` is the highest 10% step saved so far (-1 = none);
 * `percent` is Vimeo's 0–1 value. Saves about every 10%, plus every pause and the end.
 */
export function nextSave(step: number, event: PlayerEvent, percent: number) {
  if (event === 'ended') return { save: true, step: 10 }
  const current = Math.min(10, Math.max(0, Math.floor(percent * 10)))
  if (event === 'pause') return { save: true, step: Math.max(step, current) }
  return current > step ? { save: true, step: current } : { save: false, step }
}

/** Where to restart a video: the saved position, unless it's in the first 5 or last 10 seconds. */
export function resumeFrom(savedSeconds: number, durationSeconds: number): number {
  return savedSeconds >= 5 && savedSeconds < durationSeconds - 10 ? savedSeconds : 0
}
