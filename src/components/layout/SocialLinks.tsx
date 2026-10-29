import type { ReactNode } from 'react'

/**
 * Carbon Offroad's social accounts, as linked from carbonoffroad.com.au (theme settings, 29 Oct
 * 2026). Plain outbound links: no embeds, pixels or tracking (control 20). Simple line icons
 * drawn for the Academy (BRAND.md icons p.33), not taken from the website's theme.
 */
export const SOCIAL_LINKS: { label: string; href: string; icon: ReactNode }[] = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/CarbonOffroadAU',
    icon: (
      <path d="M14 21v-7h2.5l.5-3H14V9.2c0-.9.3-1.5 1.6-1.5H17V5.1a19 19 0 0 0-2.3-.1C12.5 5 11 6.4 11 8.8V11H8.5v3H11v7" />
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/carbonoffroad_australia',
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4.5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="16.8" cy="7.2" r="0.6" fill="currentColor" />
      </>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@carbonoffroad',
    icon: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="3.5" />
        <path d="M10.5 9.5v5l4.3-2.5z" fill="currentColor" />
      </>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@carbonoffroad_au',
    icon: <path d="M13 4v10.5a3 3 0 1 1-3-3M13 4c.4 2.3 1.9 3.8 4.5 4" />,
  },
]

export function SocialLinks({ className = '' }: { className?: string }) {
  return (
    <ul className={`flex items-center gap-1 ${className}`}>
      {SOCIAL_LINKS.map(({ label, href, icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Carbon Offroad on ${label}`}
            className="flex h-11 w-11 items-center justify-center rounded-pill hover:opacity-75"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {icon}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  )
}
