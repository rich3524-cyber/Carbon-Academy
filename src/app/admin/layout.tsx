import type { Metadata } from 'next'
import { connection } from 'next/server'

// Per request, never cached (control 14), with the proxy's nonce CSP. The access check is in
// every page and action (requireAdmin), not here: layouts don't re-run on every navigation.
// Nothing visible lives here either: a refused visitor gets the site's normal 404 page, so
// the admin navigation is drawn by AdminPage after the check.
export const instant = false

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection()
  return children
}
