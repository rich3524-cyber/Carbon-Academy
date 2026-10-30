import { AdminField, AdminForm } from '@/components/admin/AdminForm'
import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { StepUpFields } from '@/components/admin/StepUpFields'
import { requireAdmin } from '@/lib/admin/access'
import { saveSettings } from '@/lib/admin/actions/settings'
import { readAdmin } from '@/lib/admin/call'
import { getMyFactors } from '@/lib/admin/factors'

export const instant = false

export default async function AdminSettingsPage() {
  await requireAdmin()
  const [rows, factors] = await Promise.all([readAdmin('admin_get_settings', {}), getMyFactors()])
  const value = (key: string) => {
    const found = rows.find((row) => row.key === key)?.value
    return found === null || found === undefined ? '' : String(found)
  }

  return (
    <AdminPage
      title="Settings"
      intro={
        <p>
          Changes apply straight away and are recorded in the audit log. These settings are public,
          so never put a password or key here.
        </p>
      }
    >
      <AdminSection title="Programme settings">
        <AdminForm action={saveSettings} submitLabel="Save settings">
          <AdminField
            label="Quiz pass mark (%)"
            name="passMark"
            defaultValue={value('pass_mark_percent')}
            inputMode="numeric"
            hint="50 to 100. 100 means every answer must be right."
            required
          />
          <AdminField
            label="Certified staff needed for a Carbon Certified Store"
            name="threshold"
            defaultValue={value('store_certification_threshold')}
            inputMode="numeric"
            hint="1 to 20. Stores are re-checked straight away."
            required
          />
          <AdminField
            label="Certificate validity (months)"
            name="validityMonths"
            defaultValue={value('certificate_validity_months')}
            inputMode="numeric"
            hint="1 to 36. Applies to certificates issued from now on."
            required
          />
          <AdminField
            label="Renewal window (days before expiry)"
            name="renewalDays"
            defaultValue={value('certificate_renewal_window_days')}
            inputMode="numeric"
            hint="1 to 90."
            required
          />
          <AdminField
            label="Quiz attempts per hour"
            name="attemptsPerHour"
            defaultValue={value('quiz_attempts_per_hour')}
            inputMode="numeric"
            hint="1 to 20."
            required
          />
          <AdminField
            label="Warranty registration link"
            name="warrantyUrl"
            defaultValue={value('warranty_registration_url')}
            type="url"
            hint="An https link on carbonoffroad.com.au, or leave blank."
          />
          <AdminField
            label="Company address (email footer)"
            name="companyAddress"
            defaultValue={value('company_address')}
            maxLength={200}
            required
          />
          <StepUpFields factors={factors} />
        </AdminForm>
      </AdminSection>
    </AdminPage>
  )
}
