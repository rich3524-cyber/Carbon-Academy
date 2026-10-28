import Link from 'next/link'
import type { LessonLink } from '@/lib/content/lesson-nav'

export function LessonNav({
  categorySlug,
  previous,
  next,
}: {
  categorySlug: string
  previous: LessonLink | null
  next: LessonLink | null
}) {
  if (!previous && !next) return null
  return (
    <nav
      aria-label="Lesson navigation"
      className="mt-10 grid gap-4 border-t-2 border-dust pt-6 sm:grid-cols-2"
    >
      {previous ? (
        <Link className="block" href={`/lessons/${categorySlug}/${previous.slug}`}>
          <span className="block text-small">Previous lesson</span>
          <span className="link font-bold">{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link className="block sm:text-right" href={`/lessons/${categorySlug}/${next.slug}`}>
          <span className="block text-small">Next lesson</span>
          <span className="link font-bold">{next.title}</span>
        </Link>
      )}
    </nav>
  )
}
