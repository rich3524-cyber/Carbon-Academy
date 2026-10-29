import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { LessonCard } from '@/components/lessons/LessonCard'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { getCategoryParams, getCategoryWithLessons } from '@/lib/content/lessons'

export async function generateStaticParams() {
  return getCategoryParams()
}

export async function generateMetadata(props: PageProps<'/lessons/[category]'>): Promise<Metadata> {
  const { category } = await props.params
  const data = await getCategoryWithLessons(category)
  return data
    ? { title: data.name, description: `${data.name} lessons from Carbon Offroad Academy.` }
    : { title: 'Category not found' }
}

// Next.js 16 Cache Components: params are read inside <Suspense> (ISR guide).
export default function CategoryPage(props: PageProps<'/lessons/[category]'>) {
  return (
    <Container className="py-10 md:py-14">
      <Suspense fallback={<p>Loading lessons…</p>}>
        <Category params={props.params} />
      </Suspense>
    </Container>
  )
}

async function Category({ params }: Pick<PageProps<'/lessons/[category]'>, 'params'>) {
  const { category } = await params
  const data = await getCategoryWithLessons(category)
  if (!data) notFound()

  return (
    <>
      <p className="text-small">
        <Link className="link" href="/lessons">
          All lessons
        </Link>
      </p>
      <div className="mt-4">
        <SectionHeader as="h1" title={data.name} slash intro={data.description ?? undefined} />
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.lessons.map((lesson) => (
          <li key={lesson.slug}>
            <LessonCard
              lesson={lesson}
              href={`/lessons/${data.slug}/${lesson.slug}`}
              heading="h2"
            />
          </li>
        ))}
      </ul>
    </>
  )
}
