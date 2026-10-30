/** Up and down buttons for sort order: two tiny forms, no drag-and-drop library (decision 8). */
export function MoveButtons({
  id,
  label,
  action,
}: {
  id: string
  label: string
  action: (formData: FormData) => Promise<void>
}) {
  const button =
    'inline-flex h-11 w-11 items-center justify-center rounded-field border-2 border-concrete bg-white font-bold hover:border-carbon-black'
  return (
    <div className="flex gap-1">
      {(['-1', '1'] as const).map((direction) => (
        <form key={direction} action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="direction" value={direction} />
          <button type="submit" className={button}>
            <span aria-hidden="true">{direction === '-1' ? '↑' : '↓'}</span>
            <span className="sr-only">
              Move {label} {direction === '-1' ? 'up' : 'down'}
            </span>
          </button>
        </form>
      ))}
    </div>
  )
}
