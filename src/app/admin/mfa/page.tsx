import { redirect } from 'next/navigation'
import { AdminField, AdminForm, AdminSelect } from '@/components/admin/AdminForm'
import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { EnrolPanel } from '@/components/admin/EnrolPanel'
import { requireAdminForMfa } from '@/lib/admin/access'
import { verifySession } from '@/lib/admin/actions/mfa'
import { getMyFactors } from '@/lib/admin/factors'

export const instant = false

/** Decision 2: an admin sets up or uses their authenticator before anything else. */
export default async function AdminMfaPage() {
  const access = await requireAdminForMfa()
  if (access === 'ok') redirect('/admin')

  if (access === 'enrol') {
    return (
      <AdminPage
        title="Set up your authenticator app"
        nav={false}
        intro={
          <p>
            Admin accounts need a code from an authenticator app as well as the sign-in link.
            You&apos;ll enter a code each time you sign in, and again before high-risk changes.
          </p>
        }
      >
        <AdminSection title="Authenticator app">
          <EnrolPanel startLabel="Set up authenticator" />
        </AdminSection>
      </AdminPage>
    )
  }

  const factors = (await getMyFactors()).filter((factor) => factor.verified)
  return (
    <AdminPage title="Enter the 6-digit code from your authenticator app" nav={false}>
      <AdminSection title="Authenticator code">
        <AdminForm action={verifySession} submitLabel="Continue">
          {factors.length > 1 ? (
            <AdminSelect
              label="Authenticator"
              name="factorId"
              options={factors.map((factor) => ({ value: factor.id, label: factor.name }))}
            />
          ) : (
            <input type="hidden" name="factorId" value={factors[0]?.id ?? ''} />
          )}
          <AdminField
            label="6-digit code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
          />
        </AdminForm>
        <p className="text-small">
          Lost your authenticator? Ask another admin to reset it for you.
        </p>
      </AdminSection>
    </AdminPage>
  )
}
