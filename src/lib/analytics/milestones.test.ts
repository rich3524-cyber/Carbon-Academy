import { describe, expect, it } from 'vitest'
import type { VideoEvent } from './track'
import { dueMilestones } from './milestones'

const fired = (...events: VideoEvent[]) => new Set<VideoEvent>(events)

describe('dueMilestones', () => {
  it('fires video_start on the first play', () => {
    expect(dueMilestones(fired(), { type: 'play' })).toEqual(['video_start'])
  })

  it('does not repeat an event already fired', () => {
    expect(dueMilestones(fired('video_start'), { type: 'play' })).toEqual([])
  })

  it('fires video_progress_50 once at or past halfway', () => {
    expect(dueMilestones(fired('video_start'), { type: 'progress', percent: 0.49 })).toEqual([])
    expect(dueMilestones(fired('video_start'), { type: 'progress', percent: 0.5 })).toEqual([
      'video_progress_50',
    ])
    expect(
      dueMilestones(fired('video_start', 'video_progress_50'), { type: 'progress', percent: 0.8 }),
    ).toEqual([])
  })

  it('fires any missed milestones in order when the video ends', () => {
    expect(dueMilestones(fired(), { type: 'ended' })).toEqual([
      'video_start',
      'video_progress_50',
      'video_complete',
    ])
  })
})
