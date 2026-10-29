import { describe, expect, it } from 'vitest'
import { nextSave, resumeFrom } from './throttle'

describe('nextSave (PRD 5.3: about every 10%, on pause, on end)', () => {
  it('saves when playback reaches a new 10% step, and not again within it', () => {
    expect(nextSave(-1, 'timeupdate', 0.01)).toEqual({ save: true, step: 0 })
    expect(nextSave(0, 'timeupdate', 0.05)).toEqual({ save: false, step: 0 })
    expect(nextSave(0, 'timeupdate', 0.1)).toEqual({ save: true, step: 1 })
    expect(nextSave(1, 'timeupdate', 0.35)).toEqual({ save: true, step: 3 })
  })

  it('does not save when the viewer seeks backwards', () => {
    expect(nextSave(5, 'timeupdate', 0.2)).toEqual({ save: false, step: 5 })
  })

  it('always saves on pause and end', () => {
    expect(nextSave(5, 'pause', 0.2)).toEqual({ save: true, step: 5 })
    expect(nextSave(3, 'ended', 0.99)).toEqual({ save: true, step: 10 })
  })
})

describe('resumeFrom', () => {
  it('resumes from the saved position', () => {
    expect(resumeFrom(42, 300)).toBe(42)
  })
  it('starts from the beginning when barely started or nearly finished', () => {
    expect(resumeFrom(3, 300)).toBe(0)
    expect(resumeFrom(295, 300)).toBe(0)
  })
})
