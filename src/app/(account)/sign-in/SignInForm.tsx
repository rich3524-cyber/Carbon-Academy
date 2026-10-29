'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Field } from '@/components/forms/Field'
import { FormMessage } from '@/components/forms/FormMessage'
import { Honeypot } from '@/components/forms/Honeypot'
import { Button } from '@/components/ui/Button'
import { requestSignInLink } from '@/lib/auth/actions'
import { initialFormState } from '@/lib/forms/state'

export function SignInForm() {
  const [state, action, pending] = useActionState(requestSignInLink, initialFormState)

  if (state.status === 'sent') {
    return (
      <div className="mt-8">
        <FormMessage tone="success">
          <p className="font-bold">Check your email.</p>
          <p className="mt-2">
            If there&apos;s an Academy account for that address, we&apos;ve sent a sign-in link. It
            works once and expires in 10 minutes.
          </p>
        </FormMessage>
        <p className="mt-6">
          New to the Academy?{' '}
          <Link className="link" href="/join">
            Create an account
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="relative mt-8 flex flex-col gap-6" noValidate>
      {state.status === 'error' && (
        <FormMessage tone="problem">
          Something went wrong on our end. Give it another go in a minute.
        </FormMessage>
      )}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <Honeypot />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send sign-in link'}
        </Button>
      </div>
      <p>
        New to the Academy?{' '}
        <Link className="link" href="/join">
          Create an account
        </Link>
      </p>
    </form>
  )
}
