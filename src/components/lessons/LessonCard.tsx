import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { LessonCardData } from '@/lib/content/lessons'

export function LessonCard({
  lesson,
  href,
  heading: Heading,
}: {
  lesson: LessonCardData
  href: string
  heading: 'h2' | 'h3'
}) {
  return (
    <Card href={href}>
      <Heading className="text-h3 md:text-h3-lg">{lesson.title}</Heading>
      {(lesson.productName || lesson.isCore) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-small">
          {lesson.productName && <span>{lesson.productName}</span>}
          {lesson.isCore && <Badge tone="accent">Core</Badge>}
        </div>
      )}
    </Card>
  )
}
