'use client'

import { useActionState } from 'react'
import { Field } from '@/components/forms/Field'
import { Button } from '@/components/ui/Button'
import { initialFormState } from '@/lib/forms/state'
import { goToStore } from '@/lib/stores/actions'

export function StoreCodeForm({ label = 'Store code' }: { label?: string }) {
  const [state, action, pending] = useActionState(goToStore, initialFormState)
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field
        label={label}
        name="code"
        autoComplete="off"
        autoCapitalize="characters"
        hint="Your manager or Carbon Offroad rep can give you this. It looks like BCF-ROB-7K2Q9MXH."
        defaultValue={state.values?.code}
        error={state.fieldErrors?.code}
      />
      <div>
        <Button type="submit" disabled={pending}>
          Continue
        </Button>
      </div>
    </form>
  )
}
