export type LessonLink = { slug: string; title: string }

/** The lesson with this slug plus its previous and next lessons, in list order. */
export function neighbours<T extends LessonLink>(
  lessons: readonly T[],
  slug: string,
): { current: T; previous: LessonLink | null; next: LessonLink | null } | null {
  const index = lessons.findIndex((lesson) => lesson.slug === slug)
  if (index === -1) return null
  const link = (lesson: T | undefined) =>
    lesson ? { slug: lesson.slug, title: lesson.title } : null
  return {
    current: lessons[index]!,
    previous: link(lessons[index - 1]),
    next: link(lessons[index + 1]),
  }
}
