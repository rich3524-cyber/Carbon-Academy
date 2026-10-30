import { AdminPage } from '@/components/admin/AdminPage'
import { FormMessage } from '@/components/forms/FormMessage'
import { Card } from '@/components/ui/Card'
import { requireAdmin } from '@/lib/admin/access'
import { readAdmin } from '@/lib/admin/call'

export const instant = false

type Overview = {
  learners: number
  active_certificates: number
  certified_stores: number
  published_lessons: number
  core_lessons_without_quiz: number
}

export default async function AdminOverviewPage() {
  await requireAdmin()
  const overview = (await readAdmin('admin_overview', {})) as Overview
  const tiles = [
    { label: 'Learners', value: overview.learners, href: '/admin/learners' },
    {
      label: 'Active certificates',
      value: overview.active_certificates,
      href: '/admin/reports/certified-staff',
    },
    {
      label: 'Certified stores',
      value: overview.certified_stores,
      href: '/admin/reports/certified-stores',
    },
    { label: 'Published lessons', value: overview.published_lessons, href: '/admin/lessons' },
  ]

  return (
    <AdminPage title="Academy admin">
      {overview.core_lessons_without_quiz > 0 && (
        <FormMessage tone="problem">
          Nobody can be certified until every published core lesson has a quiz.{' '}
          {overview.core_lessons_without_quiz === 1
            ? '1 core lesson has no quiz yet.'
            : `${overview.core_lessons_without_quiz} core lessons have no quiz yet.`}
        </FormMessage>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Card href={tile.href}>
              <p className="text-small font-bold">{tile.label}</p>
              <p className="mt-2 text-h1">{tile.value}</p>
            </Card>
          </li>
        ))}
      </ul>
    </AdminPage>
  )
}
