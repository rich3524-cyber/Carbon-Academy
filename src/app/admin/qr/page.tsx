import Link from 'next/link'
import { AdminField, AdminForm, AdminSelect } from '@/components/admin/AdminForm'
import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { AdminTable, Cell } from '@/components/admin/AdminTable'
import { requireAdmin } from '@/lib/admin/access'
import { saveQrLink } from '@/lib/admin/actions/qr'
import { readAdmin } from '@/lib/admin/call'

export const instant = false

export default async function AdminQrPage() {
  await requireAdmin()
  const [links, lessons] = await Promise.all([
    readAdmin('admin_list_qr_links', {}),
    readAdmin('admin_list_lessons', {}),
  ])

  return (
    <AdminPage
      title="QR links"
      intro={<p>Each QR code opens /go/ and the link&apos;s name, then goes to its lesson.</p>}
    >
      <AdminTable
        caption="QR links"
        headers={['Link', 'Lesson', 'Scans']}
        empty={links.length === 0}
      >
        {links.map((link) => (
          <tr key={link.id}>
            <Cell>
              <Link className="link font-bold" href={`/admin/qr/${link.id}`}>
                /go/{link.slug}
              </Link>
            </Cell>
            <Cell>{link.lesson_title}</Cell>
            <Cell>{link.scan_count}</Cell>
          </tr>
        ))}
      </AdminTable>
      <AdminSection title="New QR link">
        <AdminForm action={saveQrLink} submitLabel="Create QR link">
          <input type="hidden" name="id" value="" />
          <AdminField
            label="Link name"
            name="slug"
            maxLength={80}
            hint="Lower case letters, numbers and hyphens, for example winch-fitting. It can't be changed once codes are printed."
            required
          />
          <AdminSelect
            label="Lesson"
            name="lesson"
            options={lessons.map((lesson) => ({
              value: lesson.id,
              label: `${lesson.title}${lesson.published ? '' : ' (draft)'}`,
            }))}
          />
        </AdminForm>
      </AdminSection>
    </AdminPage>
  )
}
