/**
 * The brand slash (p.32): leans like the logo badge (76 degrees, skewX(-14deg)).
 * Double = cyan + black (cyan + white on dark), gap = half a bar width.
 * One slash motif per screen. Never behind or through the logo. The parent sets the height.
 */
export function Slash({
  double = false,
  onDark = false,
  className = '',
}: {
  double?: boolean
  onDark?: boolean
  className?: string
}) {
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 gap-1 ${className}`}>
      <span className="block w-2 -skew-x-14 bg-carbon-cyan" />
      {double && (
        <span className={`block w-2 -skew-x-14 ${onDark ? 'bg-white' : 'bg-carbon-black'}`} />
      )}
    </span>
  )
}
