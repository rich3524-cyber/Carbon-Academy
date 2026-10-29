import { connection } from 'next/server'

// Account pages render per request so every script carries the proxy's nonce (control 11,
// Task 2 spike). They never enter a shared cache (control 14).
export const instant = false

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await connection()
  return children
}
