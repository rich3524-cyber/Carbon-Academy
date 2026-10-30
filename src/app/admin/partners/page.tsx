import Link from 'next/link'
import { AdminPage, AdminSection } from '@/components/admin/AdminPage'
import { AdminTable, Cell } from '@/components/admin/AdminTable'
import { PartnerForm } from '@/components/admin/StoreForms'
import { requireAdmin } from '@/lib/admin/access'
import { readAdmin } from '@/lib/admin/call'

export const instant = false

export default async function AdminPartnersPage() {
  await requireAdmin()
  const partners = await readAdmin('admin_list_partners', {})
  return (
    <AdminPage title="Partners and stores">
      <AdminTable
        caption="Partners"
        headers={['Partner', 'Type', 'Parent group', 'Stores']}
        empty={partners.length === 0}
      >
        {partners.map((partner) => (
          <tr key={partner.id}>
            <Cell>
              <Link className="link font-bold" href={`/admin/partners/${partner.id}`}>
                {partner.name}
              </Link>
            </Cell>
            <Cell>{partner.type ?? ''}</Cell>
            <Cell>{partner.parent_group ?? ''}</Cell>
            <Cell>{partner.store_count}</Cell>
          </tr>
        ))}
      </AdminTable>
      <AdminSection title="New partner">
        <PartnerForm />
      </AdminSection>
    </AdminPage>
  )
}
