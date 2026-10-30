import { AdminPage } from '@/components/admin/AdminPage'
import { Card } from '@/components/ui/Card'
import { requireAdmin } from '@/lib/admin/access'
import { REPORT_DEFINITIONS } from '@/lib/admin/reports'
import { REPORTS } from '@/lib/admin/validation'

export const instant = false

export default async function AdminReportsPage() {
  await requireAdmin()
  return (
    <AdminPage
      title="Reports"
      intro={<p>Each report can be downloaded as a CSV file that opens in Excel.</p>}
    >
      <ul className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((report) => (
          <li key={report}>
            <Card href={`/admin/reports/${report}`}>
              <p className="font-bold">{REPORT_DEFINITIONS[report].title}</p>
              <p className="mt-2 text-small">{REPORT_DEFINITIONS[report].intro}</p>
            </Card>
          </li>
        ))}
      </ul>
    </AdminPage>
  )
}
