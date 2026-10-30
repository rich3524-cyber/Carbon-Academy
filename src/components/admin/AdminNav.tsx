import Link from 'next/link'

export const ADMIN_LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/lessons', label: 'Lessons' },
  { href: '/admin/partners', label: 'Partners and stores' },
  { href: '/admin/learners', label: 'Learners' },
  { href: '/admin/qr', label: 'QR links' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/audit', label: 'Audit log' },
  { href: '/admin/security', label: 'Your security' },
] as const

/** Admin sections (decision 14). A sideways-scrolling row on phones. */
export function AdminNav() {
  return (
    <nav aria-label="Admin" className="border-b-2 border-dust bg-white">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 md:px-6">
        {ADMIN_LINKS.map((link) => (
          <li key={link.href} className="shrink-0">
            <Link
              href={link.href}
              className="inline-flex min-h-11 items-center px-3 font-bold hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
