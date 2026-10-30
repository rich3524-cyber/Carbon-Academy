'use client'

import {
  type ComponentProps,
  createContext,
  type FormEvent,
  type ReactNode,
  startTransition,
  useActionState,
  useContext,
} from 'react'
import { Field } from '@/components/forms/Field'
import { FormMessage } from '@/components/forms/FormMessage'
import { Button } from '@/components/ui/Button'
import { type AdminFormState, initialAdminState } from '@/lib/admin/form'

type Action = (state: AdminFormState, formData: FormData) => Promise<AdminFormState>

const FormStateContext = createContext<AdminFormState>(initialAdminState)

/**
 * One admin form (decision 14: plain, same components). Shows the action's message and lets
 * fields read their errors. Submits without React's automatic reset, so a refused save keeps
 * what was typed; only the step-up code is cleared, since each code works once.
 */
export function AdminForm({
  action,
  submitLabel,
  variant = 'primary',
  children,
  after,
}: {
  action: Action
  submitLabel: string
  variant?: 'primary' | 'secondary'
  children?: ReactNode
  /** Rendered under the button once the action returns a payload or a message. */
  after?: (state: AdminFormState) => ReactNode
}) {
  const [state, formAction, pending] = useActionState(action, initialAdminState)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const code = form.elements.namedItem('stepUpCode')
    if (code instanceof HTMLInputElement) code.value = ''
    startTransition(() => formAction(data))
  }

  return (
    <FormStateContext value={state}>
      <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        {state.status === 'error' && state.message && (
          <FormMessage tone="problem">{state.message}</FormMessage>
        )}
        {state.status === 'saved' && state.message && (
          <FormMessage tone="success">{state.message}</FormMessage>
        )}
        {children}
        <div>
          <Button type="submit" variant={variant} disabled={pending}>
            {pending ? 'Working…' : submitLabel}
          </Button>
        </div>
      </form>
      {after?.(state)}
    </FormStateContext>
  )
}

/** A text field that shows its error from the surrounding AdminForm. */
export function AdminField(props: Omit<ComponentProps<typeof Field>, 'error'>) {
  const state = useContext(FormStateContext)
  return <Field {...props} error={state.fieldErrors?.[props.name]} />
}

const control =
  'min-h-11 w-full rounded-field border-2 border-concrete bg-white px-4 py-3 text-body outline-offset-2 focus:outline-2 focus:outline-carbon-black'

export function AdminSelect({
  label,
  name,
  options,
  defaultValue,
  hint,
}: {
  label: string
  name: string
  options: { value: string; label: string }[]
  defaultValue?: string
  hint?: string
}) {
  const state = useContext(FormStateContext)
  const id = `field-${name}`
  const error = state.fieldErrors?.[name]
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {hint && <p className="text-small">{hint}</p>}
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className={control}
        aria-invalid={error ? true : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-small text-error-red">{error}</p>}
    </div>
  )
}

export function AdminTextarea({
  label,
  name,
  defaultValue,
  maxLength,
  hint,
}: {
  label: string
  name: string
  defaultValue?: string
  maxLength: number
  hint?: string
}) {
  const state = useContext(FormStateContext)
  const id = `field-${name}`
  const error = state.fieldErrors?.[name]
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {hint && <p className="text-small">{hint}</p>}
      <textarea
        id={id}
        name={name}
        rows={3}
        maxLength={maxLength}
        defaultValue={defaultValue}
        className={control}
        aria-invalid={error ? true : undefined}
      />
      {error && <p className="text-small text-error-red">{error}</p>}
    </div>
  )
}

export function AdminCheckbox({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string
  name: string
  defaultChecked?: boolean
  hint?: string
}) {
  const id = `field-${name}`
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="checkbox"
          name={name}
          value="on"
          defaultChecked={defaultChecked}
          className="h-6 w-6 accent-carbon-black"
        />
        <label htmlFor={id} className="font-bold">
          {label}
        </label>
      </div>
      {hint && <p className="text-small">{hint}</p>}
    </div>
  )
}
