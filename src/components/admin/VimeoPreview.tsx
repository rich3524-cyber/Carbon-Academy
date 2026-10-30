import { isVimeoId } from '@/lib/validation/urls'

/**
 * Preview of the lesson's video on the admin form (decision 8). Same privacy settings as the
 * lesson page (dnt, captions), without autoplay. The admin lesson pages' CSP allows this frame.
 */
export function VimeoPreview({ vimeoId, title }: { vimeoId: string | null; title: string }) {
  if (!isVimeoId(vimeoId)) {
    return <p className="text-small">Add a Vimeo ID and save to see the video here.</p>
  }
  const params = new URLSearchParams({ dnt: '1', texttrack: 'en', title: '0', byline: '0' })
  return (
    <div className="aspect-video w-full max-w-xl overflow-hidden rounded-field bg-carbon-black">
      <iframe
        src={`https://player.vimeo.com/video/${vimeoId}?${params}`}
        title={`Video preview: ${title}`}
        className="h-full w-full"
        allow="fullscreen; picture-in-picture; encrypted-media"
      />
    </div>
  )
}
