export type ProgressRow = {
  lessonId: string
  maxPercent: number
  completedAt: string | null
  lesson: { slug: string; title: string; isCore: boolean; categorySlug: string } | null
}

export type DashboardLesson = {
  href: string
  title: string
  percent: number
  isCore: boolean
  passed: boolean
}

export type QuizResults = { passed: ReadonlySet<string>; withQuiz: ReadonlySet<string> }

export type Dashboard = {
  inProgress: DashboardLesson[]
  completed: DashboardLesson[]
  core: { done: number; total: number }
}

/**
 * Complete means the lesson's quiz is passed (decision 8). A lesson with no quiz yet still
 * completes at 90% watched (Phase 3 decision 11), so nothing goes backwards while questions
 * are written.
 */
export function summariseProgress(
  rows: ProgressRow[],
  totalCore: number,
  quiz: QuizResults,
): Dashboard {
  const visible = rows.filter(
    (r): r is ProgressRow & { lesson: NonNullable<ProgressRow['lesson']> } => r.lesson !== null,
  )
  const isComplete = (r: (typeof visible)[number]) =>
    quiz.withQuiz.has(r.lessonId) ? quiz.passed.has(r.lessonId) : r.completedAt !== null
  const toLesson = (r: (typeof visible)[number]): DashboardLesson => ({
    href: `/lessons/${r.lesson.categorySlug}/${r.lesson.slug}`,
    title: r.lesson.title,
    percent: r.maxPercent,
    isCore: r.lesson.isCore,
    passed: quiz.passed.has(r.lessonId),
  })
  const completed = visible.filter(isComplete)
  return {
    inProgress: visible.filter((r) => !isComplete(r)).map(toLesson),
    completed: completed.map(toLesson),
    core: { done: completed.filter((r) => r.lesson.isCore).length, total: totalCore },
  }
}
