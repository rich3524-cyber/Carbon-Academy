import { AdminForm } from '@/components/admin/AdminForm'
import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { EnrolPanel } from '@/components/admin/EnrolPanel'
import { StepUpFields } from '@/components/admin/StepUpFields'
import { FormMessage } from '@/components/forms/FormMessage'
import { requireAdmin } from '@/lib/admin/access'
import { removeFactor } from '@/lib/admin/actions/mfa'
import { getMyFactors } from '@/lib/admin/factors'
import { displayDate } from '@/lib/certificates/format'

export const instant = false

/** Your own authenticators (decision 3): add a backup, remove one with step-up. */
export default async function AdminSecurityPage({ searchParams }: PageProps<'/admin/security'>) {
  await requireAdmin()
  const { backup } = await searchParams
  const factors = (await getMyFactors()).filter((factor) => factor.verified)

  return (
    <AdminPage title="Your security">
      {backup === '1' && factors.length === 1 && (
        <FormMessage tone="success">
          <p className="font-bold">Your authenticator is set up.</p>
          <p className="mt-2">
            Add a backup authenticator on a different device. If you lose your only one, you&apos;ll
            need another admin to reset it.
          </p>
        </FormMessage>
      )}
      <AdminSection title="Your authenticators">
        <ul className="flex flex-col gap-6">
          {factors.map((factor) => (
            <li key={factor.id} className="flex flex-col gap-3 border-b border-dust pb-6">
              <p>
                <span className="font-bold">{factor.name}</span>, added{' '}
                {displayDate(factor.createdAt)}
              </p>
              {factors.length > 1 && (
                <AdminForm action={removeFactor} submitLabel="Remove" variant="secondary">
                  <input type="hidden" name="factorId" value={factor.id} />
                  <StepUpFields factors={factors} />
                </AdminForm>
              )}
            </li>
          ))}
        </ul>
      </AdminSection>
      <AdminSection title="Add a backup authenticator">
        <p>
          Use a different phone or app from your first one, so losing one device doesn&apos;t lock
          you out.
        </p>
        <EnrolPanel startLabel="Add backup authenticator" factors={factors} />
      </AdminSection>
    </AdminPage>
  )
}
