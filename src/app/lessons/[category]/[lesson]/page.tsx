import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { LessonNav } from '@/components/lessons/LessonNav'
import { Badge } from '@/components/ui/Badge'
import { buttonClasses } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { VideoPlaceholder } from '@/components/video/VideoPlaceholder'
import { VimeoPlayer } from '@/components/video/VimeoPlayer'
import { getLesson, getLessonParams } from '@/lib/content/lessons'
import { getProgramSettings } from '@/lib/content/settings'

type Props = PageProps<'/lessons/[category]/[lesson]'>

export async function generateStaticParams() {
  return getLessonParams()
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category, lesson } = await props.params
  const data = await getLesson(category, lesson)
  if (!data) return { title: 'Lesson not found' }
  return {
    title: data.title,
    description: data.summary ?? `${data.title}: a Carbon Offroad Academy lesson.`,
  }
}

// Next.js 16 Cache Components: params are read inside <Suspense> (ISR guide).
export default function LessonPage(props: Props) {
  return (
    <Container className="py-10 md:py-14">
      <Suspense fallback={<p>Loading lesson…</p>}>
        <Lesson params={props.params} />
      </Suspense>
    </Container>
  )
}

async function Lesson({ params }: Pick<Props, 'params'>) {
  const { category, lesson } = await params
  const [data, settings] = await Promise.all([getLesson(category, lesson), getProgramSettings()])
  if (!data) notFound()

  // Warranty CTA on winch lessons only, once a validated URL is set (control 07).
  const warrantyUrl = data.category.slug === 'winches' ? settings.warrantyUrl : null

  return (
    <article>
      <nav aria-label="Breadcrumb" className="text-small">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link className="link" href="/lessons">
              Lessons
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link className="link" href={`/lessons/${data.category.slug}`}>
              {data.category.name}
            </Link>
          </li>
        </ol>
      </nav>
      <h1 className="mt-4 text-h1 md:text-h1-lg">{data.title}</h1>
      {(data.productName || data.isCore) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-small">
          {data.productName && <p>Product: {data.productName}</p>}
          {data.isCore && <Badge tone="accent">Core lesson</Badge>}
        </div>
      )}
      <div className="mt-6 max-w-4xl">
        {data.vimeoId ? (
          <VimeoPlayer
            vimeoId={data.vimeoId}
            title={data.title}
            lessonSlug={data.slug}
            categorySlug={data.category.slug}
          />
        ) : (
          <VideoPlaceholder />
        )}
      </div>
      {data.summary && <p className="mt-6 max-w-prose">{data.summary}</p>}
      {warrantyUrl && (
        <p className="mt-8">
          <a className={buttonClasses({ variant: 'secondary' })} href={warrantyUrl} rel="noopener">
            Register your winch
          </a>
        </p>
      )}
      <LessonNav categorySlug={data.category.slug} previous={data.previous} next={data.next} />
    </article>
  )
}
