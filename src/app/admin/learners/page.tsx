import { AdminPage } from '@/components/admin/AdminPage'
import { LearnerSearch } from '@/components/admin/LearnerSearch'
import { FormMessage } from '@/components/forms/FormMessage'
import { requireAdmin } from '@/lib/admin/access'

export const instant = false

export default async function AdminLearnersPage({ searchParams }: PageProps<'/admin/learners'>) {
  await requireAdmin()
  const { deleted } = await searchParams
  return (
    <AdminPage title="Learners">
      {deleted === '1' && (
        <FormMessage tone="success">The learner and their records were deleted.</FormMessage>
      )}
      <LearnerSearch />
    </AdminPage>
  )
}
