import type { Metadata } from 'next'
import { LessonCard } from '@/components/lessons/LessonCard'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { getLibrary } from '@/lib/content/lessons'

export const metadata: Metadata = {
  title: 'Lessons',
  description: 'Short videos on fitting, using and looking after Carbon Offroad gear.',
}

// Draft intro copy, awaiting Rich's approval (brand p.69).
export default async function LessonsPage() {
  const library = await getLibrary()

  return (
    <Container className="py-10 md:py-14">
      <SectionHeader
        as="h1"
        title="Lessons"
        slash
        intro="Short videos on Carbon Offroad gear, grouped by category. Core lessons count towards Carbon Certified."
      />
      {library.map((category) => (
        <section key={category.slug} className="mt-12" aria-labelledby={`cat-${category.slug}`}>
          <h2 id={`cat-${category.slug}`} className="text-h2 md:text-h2-lg">
            {category.name}
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {category.lessons.map((lesson) => (
              <li key={lesson.slug}>
                <LessonCard
                  lesson={lesson}
                  href={`/lessons/${category.slug}/${lesson.slug}`}
                  heading="h3"
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Container>
  )
}
