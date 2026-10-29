export type ProgressRow = {
  maxPercent: number
  completedAt: string | null
  lesson: { slug: string; title: string; isCore: boolean; categorySlug: string } | null
}

export type DashboardLesson = { href: string; title: string; percent: number; isCore: boolean }

export type Dashboard = {
  inProgress: DashboardLesson[]
  completed: DashboardLesson[]
  core: { done: number; total: number }
}

/** Phase 3: "complete" means 90% watched (decision 11). Phase 4 changes it to "quiz passed". */
export function summariseProgress(rows: ProgressRow[], totalCore: number): Dashboard {
  const visible = rows.filter(
    (r): r is ProgressRow & { lesson: NonNullable<ProgressRow['lesson']> } => r.lesson !== null,
  )
  const toLesson = (r: (typeof visible)[number]): DashboardLesson => ({
    href: `/lessons/${r.lesson.categorySlug}/${r.lesson.slug}`,
    title: r.lesson.title,
    percent: r.maxPercent,
    isCore: r.lesson.isCore,
  })
  const completed = visible.filter((r) => r.completedAt)
  return {
    inProgress: visible.filter((r) => !r.completedAt).map(toLesson),
    completed: completed.map(toLesson),
    core: { done: completed.filter((r) => r.lesson.isCore).length, total: totalCore },
  }
}
