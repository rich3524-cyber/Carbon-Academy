import { notFound } from 'next/navigation'
import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { AdminTable, Cell } from '@/components/admin/AdminTable'
import { StepUpFields } from '@/components/admin/StepUpFields'
import { Field } from '@/components/forms/Field'
import { FormMessage } from '@/components/forms/FormMessage'
import { Button } from '@/components/ui/Button'
import { requireAdmin } from '@/lib/admin/access'
import { getMyFactors } from '@/lib/admin/factors'
import { defaultRange, REPORT_DEFINITIONS } from '@/lib/admin/reports'
import { DateInput, ReportName } from '@/lib/admin/validation'

export const instant = false

/** One report on screen, plus its CSV export behind step-up (decision 11, T-51). */
export default async function AdminReportPage({
  params,
  searchParams,
}: PageProps<'/admin/reports/[report]'>) {
  await requireAdmin()
  const report = ReportName.safeParse((await params).report)
  if (!report.success) notFound()
  const definition = REPORT_DEFINITIONS[report.data]
  const query = await searchParams
  const fallback = defaultRange()
  const from = DateInput.safeParse(query.from).data ?? fallback.from
  const to = DateInput.safeParse(query.to).data ?? fallback.to
  const [rows, factors] = await Promise.all([definition.load({ from, to }), getMyFactors()])
  const isQr = report.data === 'qr-scans'

  return (
    <AdminPage
      title={definition.title}
      back={{ href: '/admin/reports', label: 'Reports' }}
      intro={<p>{definition.intro}</p>}
    >
      {query.stepup === 'failed' && (
        <FormMessage tone="problem">
          That code didn&apos;t work or has expired. Enter a new code from your authenticator app
          and try again.
        </FormMessage>
      )}
      {isQr && (
        <form method="get" className="flex flex-wrap items-end gap-3 rounded-card bg-white p-5">
          <Field label="From" name="from" type="date" defaultValue={from} />
          <Field label="To" name="to" type="date" defaultValue={to} />
          <Button type="submit" variant="secondary">
            Show
          </Button>
        </form>
      )}
      <AdminTable
        caption={definition.title}
        headers={definition.columns.map((column) => column.header)}
        empty={rows.length === 0}
      >
        {rows.map((row, i) => (
          <tr key={i}>
            {definition.columns.map((column) => {
              const value = column.value(row)
              return (
                <Cell key={column.header}>
                  {value === null
                    ? ''
                    : typeof value === 'boolean'
                      ? value
                        ? 'Yes'
                        : 'No'
                      : value}
                </Cell>
              )
            })}
          </tr>
        ))}
      </AdminTable>
      <AdminSection title="Download as CSV">
        <p className="text-small">
          Downloads are recorded in the audit log. Keep the file on a work device and delete it when
          you&apos;re done.
        </p>
        <form
          method="post"
          action={`/admin/reports/${report.data}/export`}
          className="flex flex-col gap-5"
        >
          {isQr && (
            <>
              <input type="hidden" name="from" value={from} />
              <input type="hidden" name="to" value={to} />
            </>
          )}
          <StepUpFields factors={factors} />
          <div>
            <Button type="submit">Download CSV</Button>
          </div>
        </form>
      </AdminSection>
    </AdminPage>
  )
}
