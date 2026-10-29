'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Field } from '@/components/forms/Field'
import { FormMessage } from '@/components/forms/FormMessage'
import { Honeypot } from '@/components/forms/Honeypot'
import { Button } from '@/components/ui/Button'
import { requestJoinLink } from '@/lib/auth/actions'
import { initialFormState } from '@/lib/forms/state'

export function JoinForm({ code }: { code?: string }) {
  const [state, action, pending] = useActionState(requestJoinLink, initialFormState)

  if (state.status === 'sent') {
    return (
      <FormMessage tone="success">
        <p className="font-bold">Check your email.</p>
        <p className="mt-2">
          We&apos;ve sent you a sign-in link. It works once and expires in 10 minutes.
        </p>
      </FormMessage>
    )
  }

  return (
    <form action={action} className="relative flex flex-col gap-6" noValidate>
      {state.status === 'error' && (
        <FormMessage tone="problem">
          Something went wrong on our end. Give it another go in a minute.
        </FormMessage>
      )}
      {code && <input type="hidden" name="code" value={code} />}
      {state.fieldErrors?.code && (
        <FormMessage tone="problem">{state.fieldErrors.code}</FormMessage>
      )}
      <Field
        label="First name"
        name="firstName"
        autoComplete="given-name"
        required
        defaultValue={state.values?.firstName}
        error={state.fieldErrors?.firstName}
      />
      <Field
        label="Last name"
        name="lastName"
        autoComplete="family-name"
        required
        defaultValue={state.values?.lastName}
        error={state.fieldErrors?.lastName}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />

      {/* Spam Act 2003: separate, unticked, optional. Account emails are transactional only. */}
      <div className="flex items-start gap-3">
        <input
          id="field-marketingOptIn"
          name="marketingOptIn"
          type="checkbox"
          className="mt-1 h-5 w-5 accent-carbon-black"
        />
        <label htmlFor="field-marketingOptIn">
          Send me news and product updates from Carbon Offroad. Optional. You can unsubscribe at any
          time.
        </label>
      </div>

      {/* APP 5 collection notice, at the point of collection (control 19). */}
      <p className="text-small">
        Carbon Offroad (KPD Industries Pty Ltd) collects your name, email and store to set up your
        Academy account, track your training and recognise Carbon Certified staff. Carbon Offroad
        can see your progress and certification. Your details are stored in Sydney, Australia, and
        our website host processes them in the United States when you use the site. Read our{' '}
        <Link className="link" href="/privacy">
          privacy policy
        </Link>{' '}
        to find out how to access or correct your information.
      </p>

      <Honeypot />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Email me a sign-in link'}
        </Button>
      </div>
    </form>
  )
}
