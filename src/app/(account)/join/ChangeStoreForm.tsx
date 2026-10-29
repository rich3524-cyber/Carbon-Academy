'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { FormMessage } from '@/components/forms/FormMessage'
import { Button } from '@/components/ui/Button'
import { initialFormState } from '@/lib/forms/state'
import { changeStore } from '@/lib/stores/actions'

export function ChangeStoreForm({ code, storeName }: { code: string; storeName: string }) {
  const [state, action, pending] = useActionState(changeStore, initialFormState)
  return (
    <form action={action} className="flex flex-col gap-6">
      {state.status === 'invalid' && (
        <FormMessage tone="problem">{state.fieldErrors?.code}</FormMessage>
      )}
      {state.status === 'error' && (
        <FormMessage tone="problem">
          Something went wrong on our end. Give it another go in a minute.
        </FormMessage>
      )}
      <p>Your lesson progress and any certificate stay with you.</p>
      <input type="hidden" name="code" value={code} />
      <div className="flex flex-wrap items-center gap-6">
        <Button type="submit" disabled={pending}>
          Move to {storeName}
        </Button>
        <Link className="link" href="/dashboard">
          Stay where I am
        </Link>
      </div>
    </form>
  )
}
