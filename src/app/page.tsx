import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { getCategorySummaries } from '@/lib/content/categories'
import { formatLessonCount } from '@/lib/content/category-summary'

// Draft copy, awaiting Rich's approval (brand guidelines p.69).
// Next.js 16 Cache Components: no `revalidate` export. Caching lives in getCategorySummaries().
export default async function HomePage() {
  const categories = await getCategorySummaries()

  return (
    <>
      <section>
        <Container className="py-12 md:py-20">
          <h1 className="max-w-3xl text-h1 md:text-h1-lg">Carbon Offroad Academy</h1>
          <p className="mt-4 max-w-prose md:text-body-lg">
            Short videos on fitting, using and looking after your Carbon Offroad gear. Watch for
            free. Store staff who pass the core lesson quizzes become Carbon Certified.
          </p>
          <div className="mt-8">
            <ButtonLink href="/lessons">Browse lessons</ButtonLink>
          </div>
        </Container>
      </section>

      <section className="bg-dust">
        <Container className="py-12 md:py-16">
          <SectionHeader title="Lesson categories" slash />
          {categories.length === 0 ? (
            <p className="mt-6">No lessons yet. Check back soon.</p>
          ) : (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Card href={`/lessons/${category.slug}`}>
                    <h3 className="text-h3 md:text-h3-lg">{category.name}</h3>
                    <p className="mt-1 text-small">{formatLessonCount(category.lessonCount)}</p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>
    </>
  )
}
