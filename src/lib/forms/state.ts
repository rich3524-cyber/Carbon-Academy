/** What a form's Server Action returns to useActionState. Echoes only the user's own input. */
export type FormState = {
  status: 'idle' | 'sent' | 'invalid' | 'error'
  fieldErrors?: Partial<Record<string, string>>
  values?: Partial<Record<string, string>>
}

export const initialFormState: FormState = { status: 'idle' }
