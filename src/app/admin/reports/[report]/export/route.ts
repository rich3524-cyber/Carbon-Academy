import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { requireAdmin } from '@/lib/admin/access'
import { callAdmin } from '@/lib/admin/call'
import { toCsv } from '@/lib/admin/csv'
import { reportFilename } from '@/lib/admin/files'
import { defaultRange, REPORT_DEFINITIONS } from '@/lib/admin/reports'
import { isSameOrigin } from '@/lib/admin/same-origin'
import { verifyStepUp } from '@/lib/admin/step-up'
import { DateInput, ReportName } from '@/lib/admin/validation'
import { logSecurityEvent } from '@/lib/log'

/**
 * CSV export (decision 11; T-50, T-51, T-54). A POST from our own origin, by an admin, with a
 * fresh code. admin_log_export checks the step-up in the database and records the export.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<'/admin/reports/[report]/export'>,
) {
  await connection()
  // Cross-site posts never reach the data (T-54). Same 404 as everything else.
  if (!isSameOrigin(request)) notFound()
  await requireAdmin()
  const report = ReportName.safeParse((await params).report)
  if (!report.success) notFound()

  const formData = await request.formData()
  if (!(await verifyStepUp(formData))) {
    return backToReport(report.data)
  }
  const fallback = defaultRange()
  const from = DateInput.safeParse(formData.get('from')).data ?? fallback.from
  const to = DateInput.safeParse(formData.get('to')).data ?? fallback.to

  const definition = REPORT_DEFINITIONS[report.data]
  const rows = await definition.load({ from, to })
  const logged = await callAdmin('admin_log_export', { p_report: report.data, p_rows: rows.length })
  if (!logged.ok) {
    return backToReport(report.data)
  }
  logSecurityEvent('admin_export', { action: report.data, rows: rows.length })

  return new Response(toCsv(rows, definition.columns), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${reportFilename(definition.fileName)}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

/** A relative redirect, so a preview stays on the preview (Netlify's request.url can differ). */
function backToReport(report: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/admin/reports/${report}?stepup=failed`,
      'Cache-Control': 'private, no-store',
    },
  })
}
