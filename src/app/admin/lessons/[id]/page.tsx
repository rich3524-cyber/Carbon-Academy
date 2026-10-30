import { AdminForm } from '@/components/admin/AdminForm'
import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { type LessonFormValues, LessonForm } from '@/components/admin/LessonForm'
import { VimeoPreview } from '@/components/admin/VimeoPreview'
import { ButtonLink } from '@/components/ui/Button'
import { requireAdmin } from '@/lib/admin/access'
import { deleteLesson } from '@/lib/admin/actions/content'
import { readAdmin } from '@/lib/admin/call'
import { idParam } from '@/lib/admin/params'

export const instant = false

type Lesson = LessonFormValues & { quiz_ready: boolean; in_use: boolean }

export default async function AdminLessonPage({ params }: PageProps<'/admin/lessons/[id]'>) {
  await requireAdmin()
  const id = idParam((await params).id)
  const [lesson, categories] = await Promise.all([
    readAdmin('admin_get_lesson', { p_id: id }) as Promise<Lesson>,
    readAdmin('admin_list_categories', {}),
  ])

  return (
    <AdminPage title={lesson.title} back={{ href: '/admin/lessons', label: 'Lessons' }}>
      <AdminSection title="Video">
        <VimeoPreview vimeoId={lesson.vimeo_id} title={lesson.title} />
      </AdminSection>
      <AdminSection title="Quiz">
        <p>
          {lesson.quiz_ready
            ? 'This lesson has a quiz.'
            : 'No quiz yet. Learners see no quiz on this lesson.'}
        </p>
        <div>
          <ButtonLink href={`/admin/lessons/${lesson.id}/quiz`} variant="secondary">
            {lesson.quiz_ready ? 'Edit quiz' : 'Add quiz'}
          </ButtonLink>
        </div>
      </AdminSection>
      <AdminSection title="Lesson details">
        <LessonForm lesson={lesson} categories={categories} />
      </AdminSection>
      {!lesson.in_use && (
        <AdminSection title="Delete">
          <p>Nobody has started this lesson, so it can be deleted. This can&apos;t be undone.</p>
          <AdminForm action={deleteLesson} submitLabel="Delete lesson" variant="secondary">
            <input type="hidden" name="id" value={lesson.id} />
          </AdminForm>
        </AdminSection>
      )}
    </AdminPage>
  )
}
