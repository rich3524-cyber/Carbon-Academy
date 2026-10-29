/** Sent by the video player after a progress save, so the quiz can unlock without a reload. */
export const PROGRESS_SAVED = 'academy:progress-saved'
export type ProgressSavedDetail = { lessonId: string; percent: number }
