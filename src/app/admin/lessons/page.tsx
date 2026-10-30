import Link from 'next/link'
import { AdminPage } from '@/components/admin/AdminPage'
import { AdminTable, Cell } from '@/components/admin/AdminTable'
import { MoveButtons } from '@/components/admin/MoveButtons'
import { ButtonLink } from '@/components/ui/Button'
import { requireAdmin } from '@/lib/admin/access'
import { moveLesson } from '@/lib/admin/actions/content'
import { readAdmin } from '@/lib/admin/call'

export const instant = false

export default async function AdminLessonsPage() {
  await requireAdmin()
  const lessons = await readAdmin('admin_list_lessons', {})
  const categories = [...new Set(lessons.map((lesson) => lesson.category_name))]

  return (
    <AdminPage title="Lessons">
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/admin/lessons/new">New lesson</ButtonLink>
        <ButtonLink href="/admin/categories" variant="secondary">
          Categories
        </ButtonLink>
      </div>
      {categories.map((category) => {
        const rows = lessons.filter((lesson) => lesson.category_name === category)
        return (
          <section key={category} className="flex flex-col gap-3">
            <h2 className="text-h3 md:text-h3-lg">{category}</h2>
            <AdminTable
              caption={`Lessons in ${category}`}
              headers={['Lesson', 'Core', 'Region', 'Published', 'Quiz', 'Started', 'Order']}
            >
              {rows.map((lesson) => (
                <tr key={lesson.id}>
                  <Cell>
                    <Link className="link font-bold" href={`/admin/lessons/${lesson.id}`}>
                      {lesson.title}
                    </Link>
                  </Cell>
                  <Cell>{lesson.is_core ? 'Core' : ''}</Cell>
                  <Cell>{lesson.region}</Cell>
                  <Cell>{lesson.published ? 'Published' : 'Draft'}</Cell>
                  <Cell>
                    {lesson.quiz_ready ? (
                      'Ready'
                    ) : (
                      <Link className="link" href={`/admin/lessons/${lesson.id}/quiz`}>
                        Add quiz
                      </Link>
                    )}
                  </Cell>
                  <Cell>{lesson.learners_started}</Cell>
                  <Cell>
                    <MoveButtons id={lesson.id} label={lesson.title} action={moveLesson} />
                  </Cell>
                </tr>
              ))}
            </AdminTable>
          </section>
        )
      })}
      {lessons.length === 0 && <p>No lessons yet.</p>}
    </AdminPage>
  )
}
