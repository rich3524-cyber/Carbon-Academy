import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { AdminTable, Cell } from '@/components/admin/AdminTable'
import { PartnerForm } from '@/components/admin/StoreForms'
import { ButtonLink } from '@/components/ui/Button'
import { requireAdmin } from '@/lib/admin/access'
import { readAdmin } from '@/lib/admin/call'
import { idParam } from '@/lib/admin/params'

export const instant = false

export default async function AdminPartnerPage({ params }: PageProps<'/admin/partners/[id]'>) {
  await requireAdmin()
  const id = idParam((await params).id)
  const [partners, stores] = await Promise.all([
    readAdmin('admin_list_partners', {}),
    readAdmin('admin_list_stores', { p_partner: id }),
  ])
  const partner = partners.find((p) => p.id === id)
  if (!partner) notFound()

  return (
    <AdminPage
      title={partner.name}
      back={{ href: '/admin/partners', label: 'Partners and stores' }}
    >
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h3 md:text-h3-lg">Stores</h2>
          <ButtonLink href={`/admin/stores/new?partner=${partner.id}`}>New store</ButtonLink>
        </div>
        <AdminTable
          caption={`Stores for ${partner.name}`}
          headers={[
            'Store',
            'Suburb',
            'State',
            'Active',
            'Learners',
            'Certified staff',
            'Certified',
          ]}
          empty={stores.length === 0}
        >
          {stores.map((store) => (
            <tr key={store.id}>
              <Cell>
                <Link className="link font-bold" href={`/admin/stores/${store.id}`}>
                  {store.name}
                </Link>
              </Cell>
              <Cell>{store.suburb ?? ''}</Cell>
              <Cell>{store.state ?? ''}</Cell>
              <Cell>{store.active ? 'Active' : 'Inactive'}</Cell>
              <Cell>{store.learners}</Cell>
              <Cell>{store.certified_staff}</Cell>
              <Cell>{store.is_certified ? 'Certified' : ''}</Cell>
            </tr>
          ))}
        </AdminTable>
      </section>
      <AdminSection title="Partner details">
        <PartnerForm partner={partner} />
      </AdminSection>
    </AdminPage>
  )
}
