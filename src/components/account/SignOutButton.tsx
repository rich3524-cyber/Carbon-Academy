import { Button } from '@/components/ui/Button'
import { signOut, signOutEverywhere } from '@/lib/auth/actions'

/**
 * POST-only sign-out (control 08). Shown on every signed-in page (ASVS 7.4.4). Shared store
 * devices make this matter (T-21).
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary">
        Sign out
      </Button>
    </form>
  )
}

/** Ends every session for this learner, for example after using a shared or lost device. */
export function SignOutEverywhereButton() {
  return (
    <form action={signOutEverywhere}>
      <button type="submit" className="link min-h-11 text-small">
        Sign out on all devices
      </button>
    </form>
  )
}
