/** BRAND.md progress: cyan for done, Concrete for still to do. Square ends. */
export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className="h-3 w-full bg-concrete"
    >
      <div className="h-full bg-carbon-cyan" style={{ width: `${value}%` }} />
    </div>
  )
}
