import type { ComponentProps } from 'react'

type Props = { label: string; name: string; error?: string; hint?: string } & Omit<
  ComponentProps<'input'>,
  'name' | 'id' | 'className'
>

/**
 * Brand form field (p.49): Dust background, square corners, visible focus. Errors use
 * error-red text on white below the field with a 2 px border and an icon, so colour is
 * never the only signal (BRAND.md form errors, WCAG 1.4.1).
 */
export function Field({ label, name, error, hint, ...input }: Props) {
  const id = `field-${name}`
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-small">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`min-h-11 bg-dust px-4 py-3 text-body outline-offset-2 focus:outline-2 focus:outline-carbon-black ${
          error ? 'border-2 border-error-red' : 'border-2 border-dust'
        }`}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-2 text-small text-error-red">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0"
            fill="currentColor"
          >
            <path d="M12 2 1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
