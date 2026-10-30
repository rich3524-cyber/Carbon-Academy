import { notFound } from 'next/navigation'
import { AdminField, AdminForm } from '@/components/admin/AdminForm'
import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { CopyButton } from '@/components/admin/CopyButton'
import { StepUpFields } from '@/components/admin/StepUpFields'
import { StoreForm } from '@/components/admin/StoreForms'
import { requireAdmin } from '@/lib/admin/access'
import { regenerateStoreCode } from '@/lib/admin/actions/stores'
import { readAdmin } from '@/lib/admin/call'
import { getMyFactors } from '@/lib/admin/factors'
import { idParam } from '@/lib/admin/params'

export const instant = false

export default async function AdminStorePage({ params }: PageProps<'/admin/stores/[id]'>) {
  await requireAdmin()
  const id = idParam((await params).id)
  const [stores, partners, factors] = await Promise.all([
    readAdmin('admin_list_stores', { p_partner: null }),
    readAdmin('admin_list_partners', {}),
    getMyFactors(),
  ])
  const store = stores.find((s) => s.id === id)
  if (!store) notFound()
  const [prefix = '', location = ''] = store.store_code.split('-')

  return (
    <AdminPage
      title={store.name}
      back={{ href: `/admin/partners/${store.partner_id}`, label: store.partner_name }}
    >
      <AdminSection title="Store code">
        <p>
          Staff join this store with{' '}
          <code className="font-bold tracking-wider">{store.store_code}</code>
        </p>
        <div>
          <CopyButton text={store.store_code} label="Copy code" />
        </div>
        <p className="text-small">
          {store.learners} {store.learners === 1 ? 'learner' : 'learners'}, {store.certified_staff}{' '}
          certified. {store.is_certified ? 'Carbon Certified Store.' : ''}
        </p>
      </AdminSection>
      <AdminSection title="Regenerate code">
        <p>
          The old code stops working straight away. Staff already in the store stay in it. Use this
          if the code has been shared outside the store.
        </p>
        <AdminForm action={regenerateStoreCode} submitLabel="Regenerate code" variant="secondary">
          <input type="hidden" name="id" value={store.id} />
          <AdminField
            label="Code prefix"
            name="prefix"
            defaultValue={prefix}
            maxLength={5}
            required
          />
          <AdminField
            label="Code location"
            name="location"
            defaultValue={location}
            maxLength={5}
            required
          />
          <StepUpFields factors={factors} />
        </AdminForm>
      </AdminSection>
      <AdminSection title="Store details">
        <StoreForm store={store} partners={partners} />
      </AdminSection>
    </AdminPage>
  )
}
