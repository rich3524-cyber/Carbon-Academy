/** Shown until a lesson has a valid Vimeo ID. */
export function VideoPlaceholder() {
  return (
    <div
      data-surface="dark"
      className="flex aspect-video w-full items-center rounded-card justify-center bg-gunmetal text-white"
    >
      <p className="font-bold">Video coming soon.</p>
    </div>
  )
}
