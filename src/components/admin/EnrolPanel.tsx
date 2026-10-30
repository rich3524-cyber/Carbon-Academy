'use client'

import { useActionState } from 'react'
import { FormMessage } from '@/components/forms/FormMessage'
import { Button } from '@/components/ui/Button'
import { confirmEnrol, startEnrol } from '@/lib/admin/actions/mfa'
import type { Factor } from '@/lib/admin/factors'
import { initialAdminState } from '@/lib/admin/form'
import { AdminField, AdminForm } from './AdminForm'
import { StepUpFields } from './StepUpFields'

/**
 * Sets up an authenticator app (decision 2). The QR code is SVG made on the server from the
 * otpauth address Supabase returns, so no image host or CSP change is needed. Adding a backup
 * changes the MFA factors, so it needs a code from an existing one first (control 03).
 */
export function EnrolPanel({ startLabel, factors }: { startLabel: string; factors?: Factor[] }) {
  const [state, start, starting] = useActionState(startEnrol, initialAdminState)
  const setup = state.payload

  if (!setup?.factorId || !setup.qr || !setup.secret) {
    return (
      <form action={start} className="flex flex-col gap-4">
        {state.status === 'error' && state.message && (
          <FormMessage tone="problem">{state.message}</FormMessage>
        )}
        {factors && <StepUpFields factors={factors} />}
        <div>
          <Button type="submit" disabled={starting}>
            {starting ? 'Working…' : startLabel}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <ol className="list-decimal flex flex-col gap-2 pl-5">
        <li>Open an authenticator app on your phone, such as Google Authenticator.</li>
        <li>Scan this code with the app, or type in the setup key.</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      <div
        role="img"
        aria-label="QR code for your authenticator app"
        className="w-56 max-w-full rounded-field border-2 border-dust bg-white"
        // Our own SVG, generated on the server from the otpauth address (qrSvg).
        dangerouslySetInnerHTML={{ __html: setup.qr }}
      />
      <p>
        Can&apos;t scan it? Setup key:{' '}
        <code className="break-all font-bold tracking-wider">{setup.secret}</code>
      </p>
      <AdminForm action={confirmEnrol} submitLabel="Confirm">
        <input type="hidden" name="factorId" value={setup.factorId} />
        <AdminField
          label="6-digit code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
        />
      </AdminForm>
    </div>
  )
}
