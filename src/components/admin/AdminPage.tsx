import Link from 'next/link'
import type { ReactNode } from 'react'
import { Container } from '@/components/ui/Container'
import { AdminNav } from './AdminNav'

/**
 * The admin page frame: navigation, an optional back link, the heading. Pages render it only
 * after requireAdmin(), so a refused visitor never sees any of it.
 */
export function AdminPage({
  title,
  back,
  intro,
  nav = true,
  children,
}: {
  title: string
  back?: { href: string; label: string }
  intro?: ReactNode
  nav?: boolean
  children: ReactNode
}) {
  return (
    <>
      {nav && <AdminNav />}
      <Container className="py-8 md:py-10">
        {back && (
          <p className="mb-4">
            <Link className="link" href={back.href}>
              ← {back.label}
            </Link>
          </p>
        )}
        <h1 className="text-h2 md:text-h2-lg">{title}</h1>
        {intro && <div className="mt-3 max-w-prose">{intro}</div>}
        <div className="mt-6 flex flex-col gap-8">{children}</div>
      </Container>
    </>
  )
}

/** A titled white block inside an admin page. */
export function AdminSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card bg-white p-5 md:p-6">
      <h2 className="text-h3 md:text-h3-lg">{title}</h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  )
}
