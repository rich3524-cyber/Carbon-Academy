import { notFound } from 'next/navigation'
import { AdminForm, AdminSelect } from '@/components/admin/AdminForm'
import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { Field } from '@/components/forms/Field'
import { FormMessage } from '@/components/forms/FormMessage'
import { Button } from '@/components/ui/Button'
import { requireAdmin } from '@/lib/admin/access'
import { saveQrLink } from '@/lib/admin/actions/qr'
import { readAdmin } from '@/lib/admin/call'
import { idParam } from '@/lib/admin/params'

export const instant = false

export default async function AdminQrLinkPage({ params }: PageProps<'/admin/qr/[id]'>) {
  await requireAdmin()
  const id = idParam((await params).id)
  const [links, lessons] = await Promise.all([
    readAdmin('admin_list_qr_links', {}),
    readAdmin('admin_list_lessons', {}),
  ])
  const link = links.find((l) => l.id === id)
  if (!link) notFound()

  return (
    <AdminPage title={`/go/${link.slug}`} back={{ href: '/admin/qr', label: 'QR links' }}>
      <p>
        {link.scan_count} {link.scan_count === 1 ? 'scan' : 'scans'}. Scans by UTM source are in
        Reports.
      </p>
      <AdminSection title="Download the QR code">
        <FormMessage tone="problem">
          Printed codes can&apos;t be changed. Don&apos;t print until academy.carbonoffroad.com.au
          is live.
        </FormMessage>
        <p className="text-small">
          The code opens this link with UTM tracking (medium: qr). Use lower case letters, numbers
          and hyphens.
        </p>
        {/* A plain GET form: the download is a file, not a change. */}
        <form method="get" action={`/admin/qr/${link.id}/svg`} className="flex flex-col gap-5">
          <Field
            label="UTM source"
            name="source"
            defaultValue="packaging"
            maxLength={40}
            required
          />
          <Field
            label="UTM campaign"
            name="campaign"
            defaultValue="launch"
            maxLength={40}
            required
          />
          <div>
            <Button type="submit">Download SVG</Button>
          </div>
        </form>
      </AdminSection>
      <AdminSection title="Lesson">
        <AdminForm action={saveQrLink} submitLabel="Save">
          <input type="hidden" name="id" value={link.id} />
          <input type="hidden" name="slug" value={link.slug} />
          <AdminSelect
            label="Opens this lesson"
            name="lesson"
            defaultValue={link.lesson_id}
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
