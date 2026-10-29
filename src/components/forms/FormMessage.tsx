/** Result message after a form submits. "status" for success, "alert" for problems. */
export function FormMessage({
  tone,
  children,
}: {
  tone: 'success' | 'problem'
  children: React.ReactNode
}) {
  return (
    <div
      role={tone === 'success' ? 'status' : 'alert'}
      className={`rounded-field border-l-4 bg-white p-4 ${tone === 'success' ? 'border-carbon-cyan' : 'border-error-red'}`}
    >
      {children}
    </div>
  )
}
