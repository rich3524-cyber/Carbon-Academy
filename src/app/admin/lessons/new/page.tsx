import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { LessonForm } from '@/components/admin/LessonForm'
import { requireAdmin } from '@/lib/admin/access'
import { readAdmin } from '@/lib/admin/call'

export const instant = false

export default async function AdminNewLessonPage() {
  await requireAdmin()
  const categories = await readAdmin('admin_list_categories', {})
  return (
    <AdminPage title="New lesson" back={{ href: '/admin/lessons', label: 'Lessons' }}>
      <AdminSection title="Lesson">
        <LessonForm categories={categories} />
      </AdminSection>
    </AdminPage>
  )
}
