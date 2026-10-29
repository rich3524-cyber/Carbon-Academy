import type { Metadata } from 'next'
import Link from 'next/link'
import { SignOutButton, SignOutEverywhereButton } from '@/components/account/SignOutButton'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { requireUser } from '@/lib/auth/session'
import { getDashboard } from '@/lib/dashboard/data'

export const metadata: Metadata = { title: 'My Academy', robots: { index: false } }

// Per-request page: navigations between account pages are checked separately from the layout's
// opt-out, so each page opts out of instant navigation too (Next.js 16 instant-navigation guide).
export const instant = false

export default async function DashboardPage() {
  const user = await requireUser()
  const { inProgress, completed, core } = await getDashboard()
  const corePercent = core.total ? (core.done / core.total) * 100 : 0

  return (
    <Container className="py-10 md:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 md:text-h1-lg">Welcome, {user.firstName}</h1>
          {/* EX-02 compensating control: shows whose account this is, on shared devices too. */}
          <p className="mt-2 text-small">Signed in as {user.email}</p>
          <p className="mt-2">
            {user.storeName ? <>Store: {user.storeName}. </> : <>Customer account. </>}
            <Link className="link" href="/join">
              {user.storeName ? 'Change store' : 'Have a store code? Join your store'}
            </Link>
          </p>
        </div>
        <div className="flex flex-col items-start gap-1">
          <SignOutButton />
          <SignOutEverywhereButton />
        </div>
      </div>

      <section
        aria-labelledby="certified"
        data-surface="dark"
        className="mt-10 rounded-card bg-carbon-black p-6 text-white md:p-8"
      >
        <h2 id="certified" className="text-h2">
          Carbon Certified progress
        </h2>
        <p className="mt-3">
          <span className="text-h2 font-bold text-carbon-cyan">{core.done}</span> of {core.total}{' '}
          core lessons watched
        </p>
        <div className="mt-4">
          <ProgressBar percent={corePercent} label="Core lessons watched" />
        </div>
        <p className="mt-4 text-small">
          Watch every core lesson and pass its quiz to become Carbon Certified. Quizzes are on the
          way.
        </p>
      </section>

      <section aria-labelledby="in-progress" className="mt-10">
        <h2 id="in-progress" className="text-h2">
          In progress
        </h2>
        {inProgress.length === 0 && completed.length === 0 ? (
          <div className="mt-4">
            <p>No lessons started yet. Pick one from the library and get going.</p>
            <div className="mt-6">
              <ButtonLink href="/lessons">Browse lessons</ButtonLink>
            </div>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {inProgress.map((lesson) => (
              <li key={lesson.href} className="rounded-card bg-white p-5">
                <Link className="link font-bold" href={lesson.href}>
                  {lesson.title}
                </Link>
                <div className="mt-3">
                  <ProgressBar
                    percent={lesson.percent}
                    label={`${lesson.title}: ${lesson.percent}% watched`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {completed.length > 0 && (
        <section aria-labelledby="completed" className="mt-10">
          <h2 id="completed" className="text-h2">
            Completed
          </h2>
          <ul className="mt-4 flex flex-col gap-3 rounded-card bg-white p-5">
            {completed.map((lesson) => (
              <li key={lesson.href} className="flex items-center gap-3">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0 text-carbon-black"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                >
                  <path d="M4 12l5 5L20 6" />
                </svg>
                <Link className="link" href={lesson.href}>
                  {lesson.title}
                </Link>
                {lesson.isCore && <span className="text-small">(core)</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  )
}
