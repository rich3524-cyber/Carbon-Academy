/**
 * Analytics wrapper, so the tool can be swapped (PRD 6.7). Pushes to window.dataLayer only
 * when an approved tag (GA4, decision D6) has created it; otherwise a no-op.
 * Props are slugs only: never personal information (security framework control 20).
 */
export type VideoEvent = 'video_start' | 'video_progress_50' | 'video_complete'
export type EventProps = { lesson_slug: string; category_slug: string }

type DataLayerWindow = Window & { dataLayer?: Array<Record<string, string>> }

export function track(event: VideoEvent, props: EventProps): void {
  if (typeof window === 'undefined') return
  ;(window as DataLayerWindow).dataLayer?.push({ event, ...props })
}
