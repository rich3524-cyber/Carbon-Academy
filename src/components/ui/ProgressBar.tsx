/** BRAND.md progress: cyan for done, Concrete for still to do. Pill ends, as on the website. */
export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className="h-3 w-full overflow-hidden rounded-pill bg-concrete"
    >
      <div className="h-full bg-carbon-cyan" style={{ width: `${value}%` }} />
    </div>
  )
}
