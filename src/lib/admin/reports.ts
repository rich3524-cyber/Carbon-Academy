import 'server-only'
import { readAdmin } from './call'
import type { Column } from './csv'
import type { Report } from './validation'

// Decision 11: each report's rows and columns, shared by the page and the CSV export, so the
// file always matches the screen. No report carries an email address.

type Cell = string | number | boolean | null
type Row = Record<string, Cell>
export type ReportDefinition = {
  title: string
  fileName: string
  intro: string
  columns: Column<Row>[]
  load: (range: { from: string; to: string }) => Promise<Row[]>
}

const TZ = 'Australia/Brisbane'
/** 2026-10-30 in Brisbane time: sorts correctly and Excel reads it as a date. */
export function isoDay(value: string | null): string {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(value))
}
function isoTime(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    dateStyle: 'short',
    timeStyle: 'short',
    hourCycle: 'h23',
  }).format(new Date(value))
}

const yes = (value: Cell) => (value ? 'Yes' : 'No')
const col = (header: string, key: string, format?: (value: Cell) => Cell): Column<Row> => ({
  header,
  value: (row) => (format ? format(row[key] ?? null) : (row[key] ?? null)),
})

export const REPORT_DEFINITIONS: Record<Report, ReportDefinition> = {
  completions: {
    title: 'Completions by lesson',
    fileName: 'Completions',
    intro: 'Learners who started each lesson, watched at least 90% of it, and passed its quiz.',
    columns: [
      col('Category', 'category_name'),
      col('Lesson', 'title'),
      col('Core', 'is_core', yes),
      col('Published', 'published', yes),
      col('Started', 'started'),
      col('Watched 90%', 'watched'),
      col('Passed quiz', 'passed'),
    ],
    load: async () => (await readAdmin('admin_report_completions', {})) as Row[],
  },
  'certified-stores': {
    title: 'Certified stores',
    fileName: 'CertifiedStores',
    intro:
      'Every active store, its staff with active certificates, and whether it meets the threshold.',
    columns: [
      col('Partner', 'partner_name'),
      col('Store', 'store_name'),
      col('Suburb', 'suburb'),
      col('State', 'state'),
      col('Certified staff', 'certified_staff'),
      col('Threshold', 'threshold'),
      col('Certified store', 'is_certified', yes),
    ],
    load: async () => (await readAdmin('admin_report_certified_stores', {})) as Row[],
  },
  'certified-staff': {
    title: 'Certified staff by store and partner',
    fileName: 'CertifiedStaff',
    intro: 'Every certificate, with the learner’s current store. No email addresses.',
    columns: [
      col('Partner', 'partner_name'),
      col('Store', 'store_name'),
      col('First name', 'first_name'),
      col('Last name', 'last_name'),
      col('Certificate', 'certificate_number'),
      col('Issued', 'issued_at', (v) => isoDay(v as string | null)),
      col('Expires', 'expires_at', (v) => isoDay(v as string | null)),
      col('Status', 'status'),
    ],
    load: async () => (await readAdmin('admin_report_certified_staff', {})) as Row[],
  },
  'qr-scans': {
    title: 'QR scans by link and UTM source',
    fileName: 'QrScans',
    intro: 'Scans in the date range, grouped by link and UTM source.',
    columns: [
      col('Link', 'slug', (v) => `/go/${v}`),
      col('Lesson', 'lesson_title'),
      col('UTM source', 'utm_source'),
      col('Scans', 'scans'),
    ],
    load: async ({ from, to }) =>
      (await readAdmin('admin_report_qr_scans', { p_from: from, p_to: to })) as Row[],
  },
  audit: {
    title: 'Audit log',
    fileName: 'AuditLog',
    intro: 'Every admin change, newest first, for the last 12 months.',
    columns: [
      col('Time (Brisbane)', 'at', (v) => isoTime(v as string)),
      col('Operator', 'actor_name'),
      col('Action', 'action'),
      col('Target type', 'target_type'),
      col('Target', 'target_id'),
      col('Details', 'details'),
    ],
    load: async () => {
      // Every page of the log, up to 10,000 rows.
      const rows: Row[] = []
      let before: number | null = null
      for (let page = 0; page < 100; page++) {
        const batch: { id: number; details: unknown }[] = await readAdmin('admin_list_audit', {
          p_action: null,
          p_before: before,
        })
        rows.push(...batch.map((r) => ({ ...r, details: JSON.stringify(r.details) }) as Row))
        if (batch.length < 100) break
        before = batch.at(-1)!.id
      }
      return rows
    },
  },
}

/** Last 90 days up to today (Brisbane), the QR report's default range. */
export function defaultRange(now = new Date()): { from: string; to: string } {
  const to = isoDay(now.toISOString())
  const from = isoDay(new Date(now.getTime() - 89 * 86_400_000).toISOString())
  return { from, to }
}
