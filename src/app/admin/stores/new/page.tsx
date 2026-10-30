import { z } from 'zod'
import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { StoreForm } from '@/components/admin/StoreForms'
import { requireAdmin } from '@/lib/admin/access'
import { readAdmin } from '@/lib/admin/call'
import { suggestPrefix } from '@/lib/admin/store-code'

export const instant = false

export default async function AdminNewStorePage({ searchParams }: PageProps<'/admin/stores/new'>) {
  await requireAdmin()
  const requested = z.uuid().safeParse((await searchParams).partner)
  const partners = await readAdmin('admin_list_partners', {})
  const partner = partners.find((p) => requested.success && p.id === requested.data)

  return (
    <AdminPage
      title="New store"
      back={
        partner
          ? { href: `/admin/partners/${partner.id}`, label: partner.name }
          : { href: '/admin/partners', label: 'Partners and stores' }
      }
    >
      <AdminSection title="Store">
        {partners.length === 0 ? (
          <p>Add a partner first.</p>
        ) : (
          <StoreForm
            partners={partners}
            partnerId={partner?.id}
            suggested={{ prefix: suggestPrefix(partner?.name ?? '') }}
          />
        )}
      </AdminSection>
    </AdminPage>
  )
}
