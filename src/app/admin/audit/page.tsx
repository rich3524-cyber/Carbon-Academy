import Link from 'next/link'
import { z } from 'zod'
import { AdminPage } from '@/components/admin/AdminPage'
import { AdminTable, Cell } from '@/components/admin/AdminTable'
import { Button, ButtonLink } from '@/components/ui/Button'
import { requireAdmin } from '@/lib/admin/access'
import { readAdmin } from '@/lib/admin/call'

export const instant = false

/** Plain words for each audit action (decision 5). */
const ACTIONS: Record<string, string> = {
  category_saved: 'Category saved',
  category_moved: 'Category moved',
  lesson_saved: 'Lesson saved',
  lesson_moved: 'Lesson moved',
  lesson_deleted: 'Lesson deleted',
  quiz_saved: 'Quiz saved',
  partner_saved: 'Partner saved',
  store_saved: 'Store saved',
  store_code_regenerated: 'Store code regenerated',
  learner_store_changed: 'Learner store changed',
  learner_activated: 'Account reactivated',
  learner_deactivated: 'Account deactivated',
  role_changed: 'Role changed',
  mfa_reset: 'Authenticator reset',
  mfa_factor_added: 'Authenticator added',
  mfa_factor_removed: 'Authenticator removed',
  certificate_revoked: 'Certificate revoked',
  certificate_reinstated: 'Certificate reinstated',
  learner_deleted: 'Learner deleted',
  qr_link_saved: 'QR link saved',
  settings_changed: 'Settings changed',
  report_exported: 'Report downloaded',
}

const Query = z.object({
  action: z
    .enum(Object.keys(ACTIONS) as [string, ...string[]])
    .optional()
    .catch(undefined),
  before: z.coerce.number().int().positive().optional().catch(undefined),
})

const when = (iso: string) =>
  new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Australia/Brisbane',
  }).format(new Date(iso))

function targetHref(type: string, id: string | null): string | null {
  if (!id) return null
  const base: Record<string, string> = {
    lesson: '/admin/lessons/',
    partner: '/admin/partners/',
    store: '/admin/stores/',
    learner: '/admin/learners/',
    qr_link: '/admin/qr/',
  }
  return base[type] ? `${base[type]}${id}` : null
}

export default async function AdminAuditPage({ searchParams }: PageProps<'/admin/audit'>) {
  await requireAdmin()
  const query = Query.parse(await searchParams)
  const rows = await readAdmin('admin_list_audit', {
    p_action: query.action ?? null,
    p_before: query.before ?? null,
  })
  const older = rows.length === 100 ? rows.at(-1)?.id : undefined

  return (
    <AdminPage
      title="Audit log"
      intro={<p>Every admin change, newest first. Kept for 12 months.</p>}
    >
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-card bg-white p-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="field-action" className="font-bold">
            Action
          </label>
          <select
            id="field-action"
            name="action"
            defaultValue={query.action ?? ''}
            className="min-h-11 rounded-field border-2 border-concrete bg-white px-4 py-3"
          >
            <option value="">All actions</option>
            {Object.entries(ACTIONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Show
        </Button>
        <ButtonLink href="/admin/reports/audit" variant="secondary">
          Download CSV
        </ButtonLink>
      </form>
      <AdminTable
        caption="Audit log"
        headers={['When', 'Operator', 'Action', 'Target', 'Details']}
        empty={rows.length === 0}
      >
        {rows.map((row) => {
          const href = targetHref(row.target_type, row.target_id)
          return (
            <tr key={row.id}>
              <Cell>{when(row.at)}</Cell>
              <Cell>{row.actor_name}</Cell>
              <Cell>{ACTIONS[row.action] ?? row.action}</Cell>
              <Cell>
                {href ? (
                  <Link className="link" href={href}>
                    {row.target_type}
                  </Link>
                ) : (
                  (row.target_id ?? row.target_type)
                )}
              </Cell>
              <Cell>
                <code className="text-small break-all">
                  {JSON.stringify(row.details) === '{}' ? '' : JSON.stringify(row.details)}
                </code>
              </Cell>
            </tr>
          )
        })}
      </AdminTable>
      {older && (
        <div>
          <ButtonLink
            href={`/admin/audit?${new URLSearchParams({ ...(query.action ? { action: query.action } : {}), before: String(older) })}`}
            variant="secondary"
          >
            Older
          </ButtonLink>
        </div>
      )}
    </AdminPage>
  )
}
