'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Field } from '@/components/forms/Field'
import { Button } from '@/components/ui/Button'
import { searchLearners, type SearchState } from '@/lib/admin/actions/learners'
import { AdminTable, Cell } from './AdminTable'

const STATUS: Record<string, string> = {
  active: 'Certified',
  expired: 'Expired',
  revoked: 'Revoked',
}

export function LearnerSearch() {
  const [state, search, pending] = useActionState<SearchState, FormData>(searchLearners, {
    rows: null,
  })
  return (
    <>
      <form action={search} className="flex flex-wrap items-end gap-3 rounded-card bg-white p-5">
        <div className="min-w-64 flex-1">
          <Field
            label="Search by name, email or store"
            name="q"
            maxLength={100}
            error={state.error}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Searching…' : 'Search'}
        </Button>
      </form>
      {state.rows && (
        <AdminTable
          caption="Search results"
          headers={['Name', 'Email', 'Store', 'Role', 'Account', 'Certificate']}
          empty={state.rows.length === 0}
        >
          {state.rows.map((learner) => (
            <tr key={learner.id}>
              <Cell>
                <Link className="link font-bold" href={`/admin/learners/${learner.id}`}>
                  {learner.name}
                </Link>
              </Cell>
              <Cell>{learner.email}</Cell>
              <Cell>{learner.store ?? 'Customer'}</Cell>
              <Cell>{learner.role === 'admin' ? 'Admin' : 'Learner'}</Cell>
              <Cell>{learner.active ? 'Active' : 'Deactivated'}</Cell>
              <Cell>{STATUS[learner.certificate ?? ''] ?? ''}</Cell>
            </tr>
          ))}
        </AdminTable>
      )}
      {state.rows?.length === 50 && (
        <p className="text-small">Showing the first 50. Narrow the search.</p>
      )}
    </>
  )
}
