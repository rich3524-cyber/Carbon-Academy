'use client'

import { useActionState, useEffect, useSyncExternalStore } from 'react'
import { FormMessage } from '@/components/forms/FormMessage'
import { Button, ButtonLink } from '@/components/ui/Button'
import { confirmSignIn } from '@/lib/auth/actions'
import { initialFormState } from '@/lib/forms/state'

// The token arrives in the URL fragment, which only the browser can read. It's captured once,
// so clearing it from the address bar (below) doesn't lose it on the next render.
let capturedToken: string | undefined

function readToken(): string {
  const fromHash = new URLSearchParams(window.location.hash.slice(1)).get('token_hash')
  if (fromHash) capturedToken = fromHash.slice(0, 200)
  return capturedToken ?? ''
}

const subscribe = () => () => {}

export function ConfirmForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(confirmSignIn, initialFormState)
  // undefined on the server (no fragment there); '' in the browser when the link has no token.
  const tokenHash = useSyncExternalStore(subscribe, readToken, () => undefined)

  useEffect(() => {
    // Clear the token from the address bar and history (T-12).
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  if (tokenHash === undefined) return <p className="mt-8">Checking your link…</p>

  if (!tokenHash || state.status === 'invalid') {
    return (
      <div className="mt-8 flex flex-col gap-6">
        <FormMessage tone="problem">
          That link has expired or has already been used. Links work once, for 10 minutes.
        </FormMessage>
        <div>
          <ButtonLink href="/sign-in">Get a new link</ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="mt-8">
      <input type="hidden" name="tokenHash" value={tokenHash} />
      <input type="hidden" name="next" value={next} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Continue to the Academy'}
      </Button>
    </form>
  )
}
