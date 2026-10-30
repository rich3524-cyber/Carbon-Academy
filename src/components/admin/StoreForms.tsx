import { savePartner, saveStore } from '@/lib/admin/actions/stores'
import { AdminCheckbox, AdminField, AdminForm, AdminSelect } from './AdminForm'

const PARTNER_TYPES = [
  { value: '', label: 'Not set' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'big box', label: 'Big box' },
]

export function PartnerForm({
  partner,
}: {
  partner?: { id: string; name: string; type: string | null; parent_group: string | null }
}) {
  return (
    <AdminForm action={savePartner} submitLabel={partner ? 'Save partner' : 'Create partner'}>
      <input type="hidden" name="id" value={partner?.id ?? ''} />
      <AdminField label="Name" name="name" defaultValue={partner?.name} maxLength={120} required />
      <AdminSelect
        label="Type"
        name="type"
        defaultValue={partner?.type ?? ''}
        options={PARTNER_TYPES}
      />
      <AdminField
        label="Parent group"
        name="parentGroup"
        defaultValue={partner?.parent_group ?? ''}
        maxLength={120}
        hint="For example, Super Retail Group for BCF."
      />
    </AdminForm>
  )
}

export type StoreValues = {
  id: string
  partner_id: string
  name: string
  suburb: string | null
  state: string | null
  country: string
  active: boolean
}

/** New stores get a code made from the prefix and location (decision 6); edits keep the code. */
export function StoreForm({
  store,
  partners,
  partnerId,
  suggested,
}: {
  store?: StoreValues
  partners: { id: string; name: string }[]
  partnerId?: string
  suggested?: { prefix: string }
}) {
  return (
    <AdminForm action={saveStore} submitLabel={store ? 'Save store' : 'Create store'}>
      <input type="hidden" name="id" value={store?.id ?? ''} />
      <AdminSelect
        label="Partner"
        name="partner"
        defaultValue={store?.partner_id ?? partnerId}
        options={partners.map((partner) => ({ value: partner.id, label: partner.name }))}
      />
      <AdminField
        label="Store name"
        name="name"
        defaultValue={store?.name}
        maxLength={120}
        required
      />
      <AdminField label="Suburb" name="suburb" defaultValue={store?.suburb ?? ''} maxLength={80} />
      <AdminField label="State" name="state" defaultValue={store?.state ?? ''} maxLength={40} />
      <AdminSelect
        label="Country"
        name="country"
        defaultValue={store?.country ?? 'AU'}
        options={[
          { value: 'AU', label: 'Australia' },
          { value: 'NZ', label: 'New Zealand' },
          { value: 'US', label: 'United States' },
        ]}
      />
      {!store && (
        <>
          <AdminField
            label="Code prefix"
            name="prefix"
            defaultValue={suggested?.prefix}
            maxLength={5}
            hint="2 to 5 letters for the partner, for example BCF."
            required
          />
          <AdminField
            label="Code location"
            name="location"
            maxLength={5}
            hint="2 to 5 letters for the store, for example ROB for Robina. The rest of the code is random."
            required
          />
        </>
      )}
      <AdminCheckbox
        label="Active"
        name="active"
        defaultChecked={store?.active ?? true}
        hint="An inactive store's code stops working and it leaves the certified stores list. Its staff keep their certificates."
      />
    </AdminForm>
  )
}
