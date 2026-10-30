import { AdminField, AdminForm, AdminTextarea } from '@/components/admin/AdminForm'
import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { MoveButtons } from '@/components/admin/MoveButtons'
import { requireAdmin } from '@/lib/admin/access'
import { moveCategory, saveCategory } from '@/lib/admin/actions/content'
import { readAdmin } from '@/lib/admin/call'

export const instant = false

type Category = { id: string; slug: string; name: string; description: string | null }

function CategoryFields({ category }: { category?: Category }) {
  return (
    <>
      <input type="hidden" name="id" value={category?.id ?? ''} />
      <AdminField label="Name" name="name" defaultValue={category?.name} maxLength={80} required />
      <AdminField
        label="Web address name"
        name="slug"
        defaultValue={category?.slug}
        maxLength={80}
        hint="Lower case letters, numbers and hyphens. Changing it breaks old links."
        required
      />
      <AdminTextarea
        label="Description"
        name="description"
        defaultValue={category?.description ?? ''}
        maxLength={300}
      />
    </>
  )
}

export default async function AdminCategoriesPage() {
  await requireAdmin()
  const categories = await readAdmin('admin_list_categories', {})

  return (
    <AdminPage title="Categories" back={{ href: '/admin/lessons', label: 'Lessons' }}>
      {categories.map((category) => (
        <AdminSection
          key={category.id}
          title={`${category.name} (${category.lesson_count} ${category.lesson_count === 1 ? 'lesson' : 'lessons'})`}
        >
          <MoveButtons id={category.id} label={category.name} action={moveCategory} />
          <AdminForm action={saveCategory} submitLabel="Save category">
            <CategoryFields category={category} />
          </AdminForm>
        </AdminSection>
      ))}
      <AdminSection title="New category">
        <AdminForm action={saveCategory} submitLabel="Create category">
          <CategoryFields />
        </AdminForm>
      </AdminSection>
    </AdminPage>
  )
}
