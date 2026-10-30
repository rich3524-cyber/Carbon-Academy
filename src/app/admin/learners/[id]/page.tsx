import { AdminField, AdminForm, AdminSelect } from '@/components/admin/AdminForm'
import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { AdminTable, Cell } from '@/components/admin/AdminTable'
import { StepUpFields } from '@/components/admin/StepUpFields'
import { requireAdmin } from '@/lib/admin/access'
import {
  deleteLearner,
  reinstateCertificate,
  resetMfa,
  revokeCertificate,
  setLearnerActive,
  setLearnerStore,
  setRole,
} from '@/lib/admin/actions/learners'
import { readAdmin } from '@/lib/admin/call'
import { getMyFactors } from '@/lib/admin/factors'
import { idParam } from '@/lib/admin/params'
import { displayDate } from '@/lib/certificates/format'

export const instant = false

type Learner = {
  id: string
  first_name: string
  last_name: string
  email: string
  role: 'learner' | 'admin'
  active: boolean
  created_at: string
  last_active_at: string
  is_self: boolean
  mfa_factors: number
  store: { id: string; name: string; partner_name: string } | null
  progress: { lesson_id: string; title: string; max_percent: number; updated_at: string }[]
  attempts: {
    lesson_title: string
    score: number
    total: number
    passed: boolean
    created_at: string
  }[]
  certificates: {
    id: string
    number: string
    store_name: string
    issued_at: string
    expires_at: string
    revoked_at: string | null
  }[]
}

function certificateStatus(cert: Learner['certificates'][number]): string {
  if (cert.revoked_at) return 'Revoked'
  return new Date(cert.expires_at) <= new Date() ? 'Expired' : 'Active'
}

export default async function AdminLearnerPage({ params }: PageProps<'/admin/learners/[id]'>) {
  await requireAdmin()
  const id = idParam((await params).id)
  const [learner, stores, factors] = await Promise.all([
    readAdmin('admin_get_learner', { p_user: id }) as Promise<Learner>,
    readAdmin('admin_list_stores', { p_partner: null }),
    getMyFactors(),
  ])
  const name = `${learner.first_name} ${learner.last_name}`
  const storeOptions = [
    { value: '', label: 'No store (customer)' },
    ...stores
      .filter((store) => store.active)
      .map((store) => ({ value: store.id, label: `${store.partner_name}: ${store.name}` })),
  ]

  return (
    <AdminPage title={name} back={{ href: '/admin/learners', label: 'Learners' }}>
      <AdminSection title="Account">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
          <dt className="font-bold">Email</dt>
          <dd className="break-all">{learner.email}</dd>
          <dt className="font-bold">Role</dt>
          <dd>{learner.role === 'admin' ? 'Admin' : 'Learner'}</dd>
          <dt className="font-bold">Account</dt>
          <dd>{learner.active ? 'Active' : 'Deactivated'}</dd>
          <dt className="font-bold">Joined</dt>
          <dd>{displayDate(learner.created_at)}</dd>
          <dt className="font-bold">Last active</dt>
          <dd>{displayDate(learner.last_active_at)}</dd>
          <dt className="font-bold">Store</dt>
          <dd>
            {learner.store ? `${learner.store.partner_name}: ${learner.store.name}` : 'Customer'}
          </dd>
        </dl>
        {learner.is_self && <p className="text-small">This is your own account.</p>}
      </AdminSection>

      <AdminSection title="Store">
        <AdminForm action={setLearnerStore} submitLabel="Change store">
          <input type="hidden" name="id" value={learner.id} />
          <AdminSelect
            label="Store"
            name="store"
            defaultValue={learner.store?.id ?? ''}
            options={storeOptions}
            hint="Moving a learner who has passed every core lesson into a store certifies them."
          />
        </AdminForm>
      </AdminSection>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3 md:text-h3-lg">Certificates</h2>
        {learner.certificates.length === 0 && <p>No certificates.</p>}
        {learner.certificates.map((cert) => (
          <div key={cert.id} className="flex flex-col gap-4 rounded-card bg-white p-5">
            <p>
              <span className="font-bold">{cert.number}</span>: {certificateStatus(cert)}. Issued{' '}
              {displayDate(cert.issued_at)} at {cert.store_name}, expires{' '}
              {displayDate(cert.expires_at)}.
            </p>
            {cert.revoked_at ? (
              <AdminForm action={reinstateCertificate} submitLabel="Reinstate" variant="secondary">
                <input type="hidden" name="certificate" value={cert.id} />
                <input type="hidden" name="learner" value={learner.id} />
                <StepUpFields factors={factors} />
              </AdminForm>
            ) : (
              <AdminForm action={revokeCertificate} submitLabel="Revoke" variant="secondary">
                <input type="hidden" name="certificate" value={cert.id} />
                <input type="hidden" name="learner" value={learner.id} />
                <AdminField
                  label="Reason"
                  name="reason"
                  maxLength={300}
                  hint="Recorded in the audit log, for example: account shared with another person."
                  required
                />
                <StepUpFields factors={factors} />
              </AdminForm>
            )}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3 md:text-h3-lg">Progress</h2>
        <AdminTable
          caption="Lesson progress"
          headers={['Lesson', 'Watched', 'Last watched']}
          empty={learner.progress.length === 0}
        >
          {learner.progress.map((row) => (
            <tr key={row.lesson_id}>
              <Cell>{row.title}</Cell>
              <Cell>{row.max_percent}%</Cell>
              <Cell>{displayDate(row.updated_at)}</Cell>
            </tr>
          ))}
        </AdminTable>
        <AdminTable
          caption="Quiz attempts"
          headers={['Lesson', 'Score', 'Result', 'Date']}
          empty={learner.attempts.length === 0}
        >
          {learner.attempts.map((row, i) => (
            <tr key={i}>
              <Cell>{row.lesson_title}</Cell>
              <Cell>
                {row.score} of {row.total}
              </Cell>
              <Cell>{row.passed ? 'Passed' : 'Not passed'}</Cell>
              <Cell>{displayDate(row.created_at)}</Cell>
            </tr>
          ))}
        </AdminTable>
      </section>

      {!learner.is_self && (
        <>
          {!(learner.role === 'admin' && learner.active) && (
            <AdminSection title={learner.active ? 'Deactivate' : 'Reactivate'}>
              <p>
                {learner.active
                  ? 'Signs them out everywhere straight away. They can’t sign in until reactivated.'
                  : 'Lets them sign in again.'}
              </p>
              <AdminForm
                action={setLearnerActive}
                submitLabel={learner.active ? 'Deactivate account' : 'Reactivate account'}
                variant="secondary"
              >
                <input type="hidden" name="id" value={learner.id} />
                <input type="hidden" name="active" value={learner.active ? 'false' : 'true'} />
              </AdminForm>
            </AdminSection>
          )}

          {learner.active && (
            <AdminSection title="Admin role">
              <p>
                {learner.role === 'admin'
                  ? 'They can manage the Academy. Removing the role takes effect straight away.'
                  : 'Admins can change everything in the Academy, including other accounts.'}
              </p>
              <AdminForm
                action={setRole}
                submitLabel={learner.role === 'admin' ? 'Remove admin role' : 'Make admin'}
                variant="secondary"
              >
                <input type="hidden" name="id" value={learner.id} />
                <input
                  type="hidden"
                  name="role"
                  value={learner.role === 'admin' ? 'learner' : 'admin'}
                />
                <StepUpFields factors={factors} />
              </AdminForm>
            </AdminSection>
          )}

          {learner.role === 'admin' && learner.mfa_factors > 0 && (
            <AdminSection title="Reset authenticator">
              <p>
                For an admin who has lost every authenticator. Check who you&apos;re speaking to
                first (the lost authenticator runbook). Removes all their authenticators and signs
                them out.
              </p>
              <AdminForm action={resetMfa} submitLabel="Reset authenticator" variant="secondary">
                <input type="hidden" name="id" value={learner.id} />
                <StepUpFields factors={factors} />
              </AdminForm>
            </AdminSection>
          )}

          {learner.role !== 'admin' && (
            <AdminSection title="Delete learner">
              <p>
                This permanently deletes {name}&apos;s account, progress and certificates. It
                can&apos;t be undone. Use it for privacy requests.
              </p>
              <AdminForm action={deleteLearner} submitLabel="Delete learner" variant="secondary">
                <input type="hidden" name="id" value={learner.id} />
                <AdminField
                  label={`Type ${name} to confirm`}
                  name="confirmName"
                  maxLength={110}
                  autoComplete="off"
                  required
                />
                <StepUpFields factors={factors} />
              </AdminForm>
            </AdminSection>
          )}
        </>
      )}
    </AdminPage>
  )
}
