import type { AdminError, AdminResult } from './call'

/** What an admin form's Server Action returns to useActionState. */
export type AdminFormState = {
  status: 'idle' | 'saved' | 'error'
  message?: string
  fieldErrors?: Partial<Record<string, string>>
  /** Extra data for the form to show, e.g. an MFA setup QR code. Never secrets of other users. */
  payload?: Record<string, string>
}

export const initialAdminState: AdminFormState = { status: 'idle' }

/** Plain messages for each database refusal (draft copy, for Rich's approval). */
export const ADMIN_MESSAGES: Record<AdminError, string> = {
  step_up:
    "That code didn't work or has expired. Enter a new code from your authenticator app and try again.",
  refused: "That can't be done.",
  blocked_publish: 'Add a quiz and the video length before publishing a core lesson.',
  invalid: 'Check the form. Something is missing or too long.',
  duplicate: "That's already in use. Choose another.",
  failed: 'Something went wrong on our end. Give it another go in a minute.',
}

export const STEP_UP_FAILED: AdminFormState = { status: 'error', message: ADMIN_MESSAGES.step_up }

/** The form state for a failed admin call. `refused` can carry the guard's own explanation. */
export function failure(error: AdminError, refused?: string): AdminFormState {
  return {
    status: 'error',
    message: error === 'refused' && refused ? refused : ADMIN_MESSAGES[error],
  }
}

export function saved(message = 'Saved.'): AdminFormState {
  return { status: 'saved', message }
}

/** Saved, or the failure message. */
export function stateOf<T>(
  result: AdminResult<T>,
  refused?: string,
  done?: string,
): AdminFormState {
  return result.ok ? saved(done) : failure(result.error, refused)
}

/** Form fields as plain strings (FormData values can be files). Missing fields are ''. */
export function fields(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') values[key] = value
  }
  return values
}

/** Zod issues as one message per field. */
export function fieldErrorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Partial<Record<string, string>> = {}
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form')
    errors[key] ??= issue.message
  }
  return errors
}

export function invalid(issues: { path: PropertyKey[]; message: string }[]): AdminFormState {
  return { status: 'error', message: ADMIN_MESSAGES.invalid, fieldErrors: fieldErrorsOf(issues) }
}
