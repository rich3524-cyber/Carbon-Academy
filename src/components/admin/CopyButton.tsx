'use client'

import { useState } from 'react'

/** Copies a store code for pasting into an email to the store. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="min-h-11 rounded-pill border-2 border-carbon-black px-4 text-small font-bold uppercase hover:bg-carbon-black hover:text-white"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
        } catch {
          setCopied(false)
        }
      }}
    >
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  )
}
