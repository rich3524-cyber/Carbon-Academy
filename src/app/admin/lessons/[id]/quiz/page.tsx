import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { type QuizDraft, QuizEditor } from '@/components/admin/QuizEditor'
import { requireAdmin } from '@/lib/admin/access'
import { readAdmin } from '@/lib/admin/call'
import { idParam } from '@/lib/admin/params'

export const instant = false

export default async function AdminQuizPage({ params }: PageProps<'/admin/lessons/[id]/quiz'>) {
  await requireAdmin()
  const id = idParam((await params).id)
  const [lesson, quiz] = await Promise.all([
    readAdmin('admin_get_lesson', { p_id: id }) as Promise<{ id: string; title: string }>,
    readAdmin('admin_get_quiz', { p_lesson: id }) as Promise<QuizDraft>,
  ])

  return (
    <AdminPage
      title={`Quiz: ${lesson.title}`}
      back={{ href: `/admin/lessons/${lesson.id}`, label: lesson.title }}
      intro={
        <p>
          Saving replaces this quiz. Anyone taking it right now will be asked to reload. The pass
          mark is in Settings.
        </p>
      }
    >
      <AdminSection title="Questions">
        <QuizEditor lessonId={lesson.id} initial={quiz} />
      </AdminSection>
    </AdminPage>
  )
}
