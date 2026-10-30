import { saveLesson } from '@/lib/admin/actions/content'
import { AdminCheckbox, AdminField, AdminForm, AdminSelect, AdminTextarea } from './AdminForm'

export type LessonFormValues = {
  id: string
  category_id: string
  slug: string
  title: string
  summary: string | null
  product_name: string | null
  vimeo_id: string | null
  duration_seconds: number | null
  is_core: boolean
  region: string
  published: boolean
}

/** Create or edit a lesson (decision 8). New lessons start as drafts. */
export function LessonForm({
  lesson,
  categories,
}: {
  lesson?: LessonFormValues
  categories: { id: string; name: string }[]
}) {
  return (
    <AdminForm action={saveLesson} submitLabel={lesson ? 'Save lesson' : 'Create lesson'}>
      <input type="hidden" name="id" value={lesson?.id ?? ''} />
      <AdminSelect
        label="Category"
        name="category"
        defaultValue={lesson?.category_id}
        options={categories.map((category) => ({ value: category.id, label: category.name }))}
      />
      <AdminField
        label="Title"
        name="title"
        defaultValue={lesson?.title}
        maxLength={120}
        required
      />
      <AdminField
        label="Web address name"
        name="slug"
        defaultValue={lesson?.slug}
        maxLength={80}
        hint="Lower case letters, numbers and hyphens, for example winch-fitting. Changing it breaks old links."
        required
      />
      <AdminField
        label="Product name"
        name="productName"
        defaultValue={lesson?.product_name ?? ''}
        maxLength={120}
        hint="Exactly as on the website, including the version."
      />
      <AdminTextarea
        label="Summary"
        name="summary"
        defaultValue={lesson?.summary ?? ''}
        maxLength={500}
      />
      <AdminField
        label="Vimeo ID"
        name="vimeoId"
        defaultValue={lesson?.vimeo_id ?? ''}
        inputMode="numeric"
        maxLength={12}
        hint="The number at the end of the Vimeo address."
      />
      <AdminField
        label="Video length (seconds)"
        name="duration"
        defaultValue={lesson?.duration_seconds?.toString() ?? ''}
        inputMode="numeric"
        maxLength={5}
        hint="Leave blank to look it up from Vimeo. The quiz unlocks only when this is set."
      />
      <AdminSelect
        label="Region"
        name="region"
        defaultValue={lesson?.region ?? 'AU'}
        options={[
          { value: 'AU', label: 'Australia' },
          { value: 'US', label: 'United States' },
          { value: 'ALL', label: 'All regions' },
        ]}
      />
      <AdminCheckbox
        label="Core lesson"
        name="isCore"
        defaultChecked={lesson?.is_core}
        hint="Staff must pass every published core lesson to be Carbon Certified."
      />
      <AdminCheckbox
        label="Published"
        name="published"
        defaultChecked={lesson?.published}
        hint="A core lesson needs a quiz and a video length before it can be published."
      />
    </AdminForm>
  )
}
