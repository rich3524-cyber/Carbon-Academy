export type CategorySummary = { slug: string; name: string; lessonCount: number }

export type CategoryRow = { slug: string; name: string; lessons: { count: number }[] }

export function toCategorySummaries(rows: CategoryRow[]): CategorySummary[] {
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    lessonCount: row.lessons[0]?.count ?? 0,
  }))
}

export function formatLessonCount(count: number): string {
  return `${count} ${count === 1 ? 'lesson' : 'lessons'}`
}
