import { WARRANTY_HOSTS, safeHttpsUrl } from '@/lib/validation/urls'

export type ProgramSettings = {
  warrantyUrl: string | null
  certificateValidityMonths: number
  storeThreshold: number
  /** Head office, for email footers (BRAND.md Email: from settings, never hard-coded). */
  companyAddress: string
}

type SettingRow = { key: string; value: unknown }

const text = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const positiveInt = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback

/** Maps public settings rows. Defaults are PRD section 11 (D2, D3). */
export function toProgramSettings(rows: readonly SettingRow[]): ProgramSettings {
  const value = (key: string) => rows.find((row) => row.key === key)?.value
  return {
    warrantyUrl: safeHttpsUrl(value('warranty_registration_url'), WARRANTY_HOSTS),
    certificateValidityMonths: positiveInt(value('certificate_validity_months'), 12),
    storeThreshold: positiveInt(value('store_certification_threshold'), 2),
    companyAddress: text(value('company_address'), 'Unit 1a, 1 Waterway Drive, Coomera QLD 4209'),
  }
}
