import { CertifiedPanel } from '@/components/home/CertifiedPanel'
import { Hero } from '@/components/home/Hero'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { getCategorySummaries } from '@/lib/content/categories'
import { formatLessonCount } from '@/lib/content/category-summary'
import { getProgramSettings } from '@/lib/content/settings'

// One slash motif per screen (p.32): the hero texture is it, so no slash on the section header.
export default async function HomePage() {
  const [categories, settings] = await Promise.all([getCategorySummaries(), getProgramSettings()])

  return (
    <>
      <Hero />
      <section>
        <Container className="py-12 md:py-16">
          <SectionHeader title="Lesson categories" />
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
      <CertifiedPanel storeThreshold={settings.storeThreshold} />
    </>
  )
}
