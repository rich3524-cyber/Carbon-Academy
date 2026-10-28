# Phase 2: Video Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use anthropic-skills:executing-plans (or anthropic-skills:subagent-driven-development) to carry out this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** anyone can browse and watch lessons, and QR links log a scan and land on the right lesson with UTMs intact.

**Architecture:**
- **Library pages** (`/lessons`, `/lessons/[category]`, `/lessons/[category]/[lesson]`) are server components. They read one cached, public, server-only library query and are prebuilt with `generateStaticParams`. They read params inside `<Suspense>`, as Next.js 16 Cache Components requires.
- **Video** is a click-to-play Vimeo iframe: a facade first, then the iframe. `@vimeo/player` attaches to the iframe for analytics events, so nothing loads from Vimeo until a visitor presses play.
- **QR scans** go through a `security definer` database function called with the publishable key. Anonymous users get no direct access to the QR tables, and Phase 2 still needs no secret key.

**Tech stack:** Next.js 16.4 (Cache Components on), React 19, Tailwind v4, Supabase (Postgres + RLS + one RPC), `@vimeo/player`, Zod, Vitest, Lighthouse.

**Spec:**
- `docs/BUILD_PLAN.md` Phase 2
- `docs/PRD.md` sections 5.1, 6.2 and 8
- `docs/BRAND.md`: hero and texture, video player, voice
- `docs/SECURITY.md` and the framework .docx, Tier C
- `CLAUDE.md`

Brand references (p.N) point to the local guidelines PDF. Security references (control NN) point to ITWM framework v3.1.

**Framework controls this phase touches:**
- 04: RLS on the new tables, plus the RPC
- 05: Zod on the route handler
- 06: parameterised RPC, no dynamic SQL
- 07: URL and Vimeo ID validation, no HTML injection
- 10: still no secret key
- 11: CSP `frame-src` for Vimeo
- 12: fixed outbound hosts, `/go` input validation and rate cap
- 14: `no-store` on `/go`, public-only `'use cache'`
- 15: generic errors
- 20: tag inventory, Vimeo `dnt=1`, load on click
- 22: abuse limits

---

## Decisions and flags (confirm before Task 1)

1. **Test video needed.** "A placeholder video plays" can't pass until there's a Vimeo video ID: any short Carbon Offroad clip uploaded to the Carbon Vimeo account (Phase 0, decision D9).
   - In Vimeo, set the video's embed allowlist to include `localhost`, `carbonoffroadacademy.netlify.app` and `*--carbonoffroadacademy.netlify.app` (deploy previews), plus `academy.carbonoffroad.com.au` later.
   - Until an ID exists, every lesson shows "Video coming soon".
2. **Copy drafts for Rich's approval** (brand p.69):
   - Hero H1: "Know your gear. Get home safe." ("get home safe" is approved vocabulary, p.17)
   - The Get Carbon Certified panel
   - The `/certified` page
   - The library intro
   - "Video coming soon"

   The full text is in Tasks 7–10.
3. **Click-to-play facade (recommended).** The lesson page shows a branded play button, and the Vimeo iframe loads only when a visitor presses it. Why:
   - It keeps Lighthouse mobile performance above 90.
   - Vimeo sees nothing until the visitor chooses to play (control 20, privacy).

   Trade-off: on iPhones, autoplay after the click can be blocked, so some visitors press play twice.
4. **"Register your winch" CTA scope.**
   - Default: show it only on lessons in the **Winches** category, and only once `warranty_registration_url` is set (D8, still to be confirmed).
   - The URL must be `https` on `carbonoffroad.com.au` (control 07).
5. **A new `/certified` page** (beyond the build plan). The nav already links to it, so this replaces a 404 with a short explanation of the programme. Its numbers come from `settings`.
6. **An unknown or malformed `/go` slug** redirects to `/lessons`, not a 404. A misprinted QR code still lands somewhere useful.
7. **Rate limiting `/go`** (controls 12, 22):
   - The database function records at most **60 scans per link per minute**. The redirect still works above that.
   - Rich can add a Netlify Traffic Rule in the UI for `/go/*` as an extra layer (Netlify Pro).
   - No IP addresses are stored (the data register says none).
8. **No cyan word in the hero headline.** Over the 60% overlaid texture, cyan text is about 2.1:1 on the lightest patches, which fails even the 3:1 large-text minimum (p.25). The hero uses white text and the cyan button.
9. **One slash per screen (p.32).** The hero texture is the home page's slash motif, so the home page's category heading drops its slash.
10. **Data model:** `qr_links` and `qr_scans` follow PRD section 8. The only addition is `qr_links.created_at`.
11. **No remote images:** there are no Vimeo thumbnails, so `images.remotePatterns` stays empty. That's stricter than the build plan's "exact Vimeo hosts".
12. **Analytics** goes through a wrapper only. GA4 isn't loaded (D6 still open), so events go nowhere until Rich approves GA4, at which point it's added to the tag inventory.
13. **QR counts can be inflated** by email link scanners and bots that open links ahead of the user. Accepted and recorded in the threat model.
14. **Soft 404s:** a lesson URL that doesn't exist renders the 404 page inside `<Suspense>` and may return HTTP 200. That's tested in Task 13 and accepted, because Next.js marks not-found pages `noindex`.
15. **`main` still has no branch protection.** The production migration must run before this PR merges (Task 14), the lesson from Phase 1.

---

## File structure

```
supabase/migrations/<ts>_qr_links.sql        qr_links, qr_scans, log_qr_scan(); RLS
supabase/seed.sql                             (modify) two QR links
tests/db/clients.ts                           shared local clients for DB tests
tests/db/rls.test.ts                          (modify) use the shared clients
tests/db/qr.test.ts                           QR RLS, RPC behaviour, rate cap
src/lib/validation/urls.ts (+ .test.ts)       safeHttpsUrl(), isVimeoId(), WARRANTY_HOSTS
src/lib/validation/utm.ts (+ .test.ts)        pickUtm(), UTM_KEYS
src/lib/validation/slug.ts (+ .test.ts)       QrSlug (Zod)
src/lib/analytics/track.ts (+ .test.ts)       track(): pushes to window.dataLayer if present
src/lib/analytics/milestones.ts (+ .test.ts)  dueMilestones(): start / 50% / complete, once each
src/lib/content/lesson-nav.ts (+ .test.ts)    neighbours(): previous and next lesson
src/lib/content/program-settings.ts (+ .test.ts)  toProgramSettings(): pure mapping
src/lib/content/lessons.ts                    server-only: library, category, lesson, params
src/lib/content/settings.ts                   server-only: getProgramSettings()
src/config/security-headers.ts (+ .test.ts)   (modify) frame-src https://player.vimeo.com
src/components/video/VimeoPlayer.tsx (+ .test.tsx)  facade + iframe + analytics
src/components/video/VideoPlaceholder.tsx
src/components/lessons/LessonCard.tsx
src/components/lessons/LessonNav.tsx
src/components/home/Hero.tsx
src/components/home/CertifiedPanel.tsx
src/app/page.tsx                              (modify) hero, categories, certified panel
src/app/lessons/page.tsx
src/app/lessons/[category]/page.tsx
src/app/lessons/[category]/[lesson]/page.tsx
src/app/go/[slug]/route.ts
src/app/certified/page.tsx
src/app/opengraph-image.jpg (+ opengraph-image.alt.txt)
docs/security/TAG_INVENTORY.md
docs/security/THREAT_MODEL.md
```

---

### Task 0: Branch and local stack

- [ ] **Step 1:** Run `git switch main && git pull --ff-only && git switch -c phase-2-video-library`
- [ ] **Step 2:** Start Docker Desktop, then run `npm run db:start` and `npm run db:reset`.
  Expected: `Finished supabase db reset`.
- [ ] **Step 3:** Run `npm test && npm run test:db`.
  Expected: 25 unit tests and 8 DB tests pass.
- [ ] **Step 4:** Install the new dependencies:
  - **zod**: schema validation, which the framework requires in every route handler and Server Action (control 05). Phase 3 needs it too.
  - **@vimeo/player**: Vimeo's official SDK, for playback events. It's only loaded after the visitor presses play.

  Run: `npm install zod@4.6.7 @vimeo/player@2.30.4`
  Both releases are more than two weeks old (checked 29 October 2026). Then commit:

  ```bash
  git add package.json package-lock.json
  git commit -m "chore: add zod and @vimeo/player"
  ```

---

### Task 1: URL, Vimeo ID, UTM and slug validation (TDD; controls 05, 07, 12)

**Files:**
- Create: `src/lib/validation/urls.ts`, `urls.test.ts`, `utm.ts`, `utm.test.ts`, `slug.ts`, `slug.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/validation/urls.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { WARRANTY_HOSTS, isVimeoId, safeHttpsUrl } from './urls'

describe('safeHttpsUrl', () => {
  it('accepts https URLs on an allowed host', () => {
    expect(safeHttpsUrl('https://carbonoffroad.com.au/pages/warranty', WARRANTY_HOSTS)).toBe(
      'https://carbonoffroad.com.au/pages/warranty',
    )
  })

  it.each([
    ['javascript:alert(1)'],
    ['http://carbonoffroad.com.au/pages/warranty'],
    ['https://carbonoffroad.com.au.evil.example/warranty'],
    ['https://evil.example/https://carbonoffroad.com.au'],
    ['https://user:pass@carbonoffroad.com.au/warranty'],
    ['not a url'],
    [''],
  ])('rejects %s', (value) => {
    expect(safeHttpsUrl(value, WARRANTY_HOSTS)).toBeNull()
  })

  it('rejects non-strings and very long values', () => {
    expect(safeHttpsUrl(null, WARRANTY_HOSTS)).toBeNull()
    expect(safeHttpsUrl(42, WARRANTY_HOSTS)).toBeNull()
    expect(safeHttpsUrl(`https://carbonoffroad.com.au/${'a'.repeat(600)}`, WARRANTY_HOSTS)).toBeNull()
  })
})

describe('isVimeoId', () => {
  it('accepts numeric Vimeo IDs', () => {
    expect(isVimeoId('76979871')).toBe(true)
  })

  it.each([['abc'], ['123'], ['76979871?h=abc'], ['../../x'], [null], [76979871]])(
    'rejects %s',
    (value) => {
      expect(isVimeoId(value)).toBe(false)
    },
  )
})
```

`src/lib/validation/utm.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { pickUtm } from './utm'

const params = (query: string) => new URLSearchParams(query)

describe('pickUtm', () => {
  it('keeps the known UTM keys', () => {
    expect(
      pickUtm(params('utm_source=packaging&utm_medium=qr&utm_campaign=scout-pro&utm_content=box&utm_term=winch')),
    ).toEqual({
      utm_source: 'packaging',
      utm_medium: 'qr',
      utm_campaign: 'scout-pro',
      utm_content: 'box',
      utm_term: 'winch',
    })
  })

  it('drops unknown keys, including tracking IDs and personal data', () => {
    expect(pickUtm(params('utm_source=packaging&gclid=abc&email=a@b.com&fbclid=x'))).toEqual({
      utm_source: 'packaging',
    })
  })

  it('drops values with unexpected characters or over 100 characters', () => {
    expect(
      pickUtm(params(`utm_source=<script>&utm_medium=${'a'.repeat(101)}&utm_campaign=ok`)),
    ).toEqual({ utm_campaign: 'ok' })
  })

  it('trims whitespace and ignores empty values', () => {
    expect(pickUtm(params('utm_source=%20packaging%20&utm_medium='))).toEqual({
      utm_source: 'packaging',
    })
  })
})
```

`src/lib/validation/slug.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { QrSlug } from './slug'

describe('QrSlug', () => {
  it('accepts lowercase kebab-case slugs', () => {
    expect(QrSlug.safeParse('scout-pro-10k-v3').success).toBe(true)
  })

  it.each([['Scout-Pro'], ['scout pro'], ['../etc'], ["x';drop table qr_links;--"], ['-x'], ['a'.repeat(81)], ['']])(
    'rejects %s',
    (value) => {
      expect(QrSlug.safeParse(value).success).toBe(false)
    },
  )
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npm test -- src/lib/validation`
Expected: FAIL, because the modules can't be resolved.

- [ ] **Step 3: Implement**

`src/lib/validation/urls.ts`:

```ts
/** Hosts the warranty registration CTA may link to (security framework control 07). */
export const WARRANTY_HOSTS = ['carbonoffroad.com.au', 'www.carbonoffroad.com.au'] as const

/** Returns the URL if it is https on an allowed host with no credentials, otherwise null. */
export function safeHttpsUrl(value: unknown, allowedHosts: readonly string[]): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 500) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null
  if (!allowedHosts.includes(url.hostname)) return null
  return url.toString()
}

/** Vimeo video IDs are numeric. Anything else is treated as "no video" (control 07). */
export function isVimeoId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{6,12}$/.test(value)
}
```

`src/lib/validation/utm.ts`:

```ts
import { z } from 'zod'

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
export type UtmKey = (typeof UTM_KEYS)[number]
export type Utm = Partial<Record<UtmKey, string>>

const UtmValue = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9 ._~+-]+$/)

/** Keeps only the known UTM keys with safe values. Everything else is dropped (control 12). */
export function pickUtm(params: URLSearchParams): Utm {
  const utm: Utm = {}
  for (const key of UTM_KEYS) {
    const result = UtmValue.safeParse(params.get(key) ?? '')
    if (result.success) utm[key] = result.data
  }
  return utm
}
```

`src/lib/validation/slug.ts`:

```ts
import { z } from 'zod'

/** QR short-link slugs: lowercase kebab-case, at most 80 characters (control 05). */
export const QrSlug = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- src/lib/validation`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation
git commit -m "feat: add URL, Vimeo ID, UTM and QR slug validation"
```

---

### Task 2: Analytics wrapper and video milestones (TDD)

**Files:**
- Create: `src/lib/analytics/track.ts`, `track.test.ts`, `milestones.ts`, `milestones.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/analytics/track.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { track } from './track'

type DataLayerWindow = Window & { dataLayer?: Array<Record<string, string>> }

afterEach(() => {
  delete (window as DataLayerWindow).dataLayer
})

describe('track', () => {
  it('pushes the event to dataLayer when an analytics tool is loaded', () => {
    ;(window as DataLayerWindow).dataLayer = []
    track('video_start', { lesson_slug: 'scout-pro-10k-v3', category_slug: 'winches' })
    expect((window as DataLayerWindow).dataLayer).toEqual([
      { event: 'video_start', lesson_slug: 'scout-pro-10k-v3', category_slug: 'winches' },
    ])
  })

  it('does nothing when no analytics tool is loaded', () => {
    expect(() =>
      track('video_complete', { lesson_slug: 'scout-pro-10k-v3', category_slug: 'winches' }),
    ).not.toThrow()
    expect((window as DataLayerWindow).dataLayer).toBeUndefined()
  })
})
```

`src/lib/analytics/milestones.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { VideoEvent } from './track'
import { dueMilestones } from './milestones'

const fired = (...events: VideoEvent[]) => new Set<VideoEvent>(events)

describe('dueMilestones', () => {
  it('fires video_start on the first play', () => {
    expect(dueMilestones(fired(), { type: 'play' })).toEqual(['video_start'])
  })

  it('does not repeat an event already fired', () => {
    expect(dueMilestones(fired('video_start'), { type: 'play' })).toEqual([])
  })

  it('fires video_progress_50 once at or past halfway', () => {
    expect(dueMilestones(fired('video_start'), { type: 'progress', percent: 0.49 })).toEqual([])
    expect(dueMilestones(fired('video_start'), { type: 'progress', percent: 0.5 })).toEqual([
      'video_progress_50',
    ])
    expect(
      dueMilestones(fired('video_start', 'video_progress_50'), { type: 'progress', percent: 0.8 }),
    ).toEqual([])
  })

  it('fires any missed milestones in order when the video ends', () => {
    expect(dueMilestones(fired(), { type: 'ended' })).toEqual([
      'video_start',
      'video_progress_50',
      'video_complete',
    ])
  })
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npm test -- src/lib/analytics`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/lib/analytics/track.ts`:

```ts
/**
 * Analytics wrapper, so the tool can be swapped (PRD 6.7). Pushes to window.dataLayer only
 * when an approved tag (GA4, decision D6) has created it; otherwise a no-op.
 * Props are slugs only: never personal information (security framework control 20).
 */
export type VideoEvent = 'video_start' | 'video_progress_50' | 'video_complete'
export type EventProps = { lesson_slug: string; category_slug: string }

type DataLayerWindow = Window & { dataLayer?: Array<Record<string, string>> }

export function track(event: VideoEvent, props: EventProps): void {
  if (typeof window === 'undefined') return
  ;(window as DataLayerWindow).dataLayer?.push({ event, ...props })
}
```

`src/lib/analytics/milestones.ts`:

```ts
import type { VideoEvent } from './track'

export type PlayerSignal = { type: 'play' } | { type: 'progress'; percent: number } | { type: 'ended' }

/** The video events due for this signal that haven't fired yet, in order. */
export function dueMilestones(fired: ReadonlySet<VideoEvent>, signal: PlayerSignal): VideoEvent[] {
  const due: VideoEvent[] = []
  const add = (event: VideoEvent) => {
    if (!fired.has(event) && !due.includes(event)) due.push(event)
  }
  if (signal.type === 'play') add('video_start')
  if (signal.type === 'progress') {
    if (signal.percent > 0) add('video_start')
    if (signal.percent >= 0.5) add('video_progress_50')
  }
  if (signal.type === 'ended') {
    add('video_start')
    add('video_progress_50')
    add('video_complete')
  }
  return due
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- src/lib/analytics`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics
git commit -m "feat: add analytics wrapper and video milestones"
```

---

### Task 3: QR schema, RPC and DB tests (TDD; controls 04, 06, 12, 22)

**Files:**
- Create: `tests/db/clients.ts`, `tests/db/qr.test.ts`, `supabase/migrations/<ts>_qr_links.sql`
- Modify: `tests/db/rls.test.ts`, `supabase/seed.sql`, `src/types/database.ts` (regenerated)

- [ ] **Step 1: Extract the shared DB test clients**

`tests/db/clients.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

function localEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is missing from .env.test.local`)
  return value
}

const url = localEnv('SUPABASE_TEST_URL')
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  throw new Error('DB tests only run against the local Supabase stack, never a hosted project')
}

const options = { auth: { persistSession: false } }
export const admin = createClient(url, localEnv('SUPABASE_TEST_SECRET_KEY'), options)
export const publicClient = createClient(url, localEnv('SUPABASE_TEST_PUBLISHABLE_KEY'), options)
```

In `tests/db/rls.test.ts`, replace everything from `function localEnv` through the `const publicClient = …` line with:

```ts
import { admin, publicClient } from './clients'
```

Also remove the now-unused `createClient` import. Then run `npm run test:db`. Expected: 8 passed.

- [ ] **Step 2: Write the failing QR tests**

`tests/db/qr.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { admin, publicClient } from './clients'

let draftLessonId: string | undefined
let draftLinkId: string | undefined
let capLinkId: string | undefined

beforeAll(async () => {
  const { data: winches, error: categoryError } = await admin
    .from('categories')
    .select('id')
    .eq('slug', 'winches')
    .single()
  if (categoryError) throw categoryError
  const { data: lesson } = await admin
    .from('lessons')
    .insert({ category_id: winches.id, slug: 'qr-test-draft', title: '[TEST] Draft', published: false })
    .select('id')
    .single()
  draftLessonId = lesson!.id
  const { data: draftLink } = await admin
    .from('qr_links')
    .insert({ slug: 'qr-test-draft', lesson_id: draftLessonId })
    .select('id')
    .single()
  draftLinkId = draftLink!.id
  const { data: published } = await admin
    .from('lessons')
    .select('id')
    .eq('slug', 'scout-pro-10k-v3')
    .single()
  const { data: capLink } = await admin
    .from('qr_links')
    .insert({ slug: 'qr-test-cap', lesson_id: published!.id })
    .select('id')
    .single()
  capLinkId = capLink!.id
})

afterAll(async () => {
  for (const id of [draftLinkId, capLinkId]) if (id) await admin.from('qr_links').delete().eq('id', id)
  if (draftLessonId) await admin.from('lessons').delete().eq('id', draftLessonId)
})

describe('QR tables (control 04)', () => {
  it('are not readable with the publishable key', async () => {
    expect((await publicClient.from('qr_links').select('slug')).error).not.toBeNull()
    expect((await publicClient.from('qr_scans').select('id')).error).not.toBeNull()
  })

  it('are not writable with the publishable key', async () => {
    const { error } = await publicClient.from('qr_links').insert({ slug: 'x', lesson_id: draftLessonId! })
    expect(error).not.toBeNull()
  })
})

describe('log_qr_scan', () => {
  it('returns the lesson target and records the scan with its UTMs', async () => {
    const before = await admin.from('qr_links').select('scan_count').eq('slug', 'test-slug').single()
    const { data, error } = await publicClient
      .rpc('log_qr_scan', { p_slug: 'test-slug', p_utm_source: 'packaging', p_utm_medium: 'qr' })
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toEqual({ category_slug: 'winches', lesson_slug: 'scout-pro-10k-v3' })
    const after = await admin.from('qr_links').select('id, scan_count').eq('slug', 'test-slug').single()
    expect(after.data!.scan_count).toBe(before.data!.scan_count + 1)
    const scan = await admin
      .from('qr_scans')
      .select('utm_source, utm_medium, utm_campaign')
      .eq('qr_link_id', after.data!.id)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .single()
    expect(scan.data).toEqual({ utm_source: 'packaging', utm_medium: 'qr', utm_campaign: null })
  })

  it.each([['no-such-slug'], ['Bad Slug'], ["x';drop table lessons;--"]])(
    'returns nothing for %s',
    async (slug) => {
      const { data, error } = await publicClient.rpc('log_qr_scan', { p_slug: slug }).maybeSingle()
      expect(error).toBeNull()
      expect(data).toBeNull()
    },
  )

  it('returns nothing for a link to an unpublished lesson', async () => {
    const { data } = await publicClient.rpc('log_qr_scan', { p_slug: 'qr-test-draft' }).maybeSingle()
    expect(data).toBeNull()
  })

  it('truncates UTM values to 100 characters', async () => {
    await publicClient.rpc('log_qr_scan', { p_slug: 'qr-test-cap', p_utm_campaign: 'a'.repeat(300) })
    const scan = await admin
      .from('qr_scans')
      .select('utm_campaign')
      .eq('qr_link_id', capLinkId!)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .single()
    expect(scan.data!.utm_campaign).toHaveLength(100)
  })

  it('records at most 60 scans per link per minute but still returns the target (control 22)', async () => {
    for (let i = 0; i < 65; i++) await publicClient.rpc('log_qr_scan', { p_slug: 'qr-test-cap' })
    const { count } = await admin
      .from('qr_scans')
      .select('id', { count: 'exact', head: true })
      .eq('qr_link_id', capLinkId!)
    expect(count).toBe(60)
    const { data } = await publicClient.rpc('log_qr_scan', { p_slug: 'qr-test-cap' }).maybeSingle()
    expect(data).toEqual({ category_slug: 'winches', lesson_slug: 'scout-pro-10k-v3' })
  })
})
```

Run: `npm run test:db`
Expected: `qr.test.ts` fails, because relation `qr_links` doesn't exist.

- [ ] **Step 3: Create and write the migration**

Run: `npx supabase migration new qr_links`

Write this to the new file:

```sql
-- Phase 2: QR short links (PRD 5.1, 6.6, 8). Security framework controls 04, 06, 12, 22.
-- Anonymous users get no direct table access. Scans are recorded only through
-- log_qr_scan(), which validates input, stores no personal information and caps recording
-- at 60 scans per link per minute.

create table public.qr_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  lesson_id uuid not null references public.lessons (id) on delete restrict,
  scan_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.qr_scans (
  id uuid primary key default gen_random_uuid(),
  qr_link_id uuid not null references public.qr_links (id) on delete cascade,
  utm_source text check (length(utm_source) <= 100),
  utm_medium text check (length(utm_medium) <= 100),
  utm_campaign text check (length(utm_campaign) <= 100),
  scanned_at timestamptz not null default now()
);

create index qr_scans_link_time_idx on public.qr_scans (qr_link_id, scanned_at desc);

alter table public.qr_links enable row level security;
alter table public.qr_scans enable row level security;
revoke all on public.qr_links, public.qr_scans from anon, authenticated;

create function public.log_qr_scan(
  p_slug text,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null
)
returns table (category_slug text, lesson_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link_id uuid;
  v_recent integer;
begin
  if p_slug is null or length(p_slug) > 80 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    return;
  end if;

  select q.id into v_link_id
  from public.qr_links q
  join public.lessons l on l.id = q.lesson_id
  where q.slug = p_slug and l.published;

  if v_link_id is null then
    return;
  end if;

  select count(*) into v_recent
  from public.qr_scans s
  where s.qr_link_id = v_link_id and s.scanned_at > now() - interval '1 minute';

  if v_recent < 60 then
    insert into public.qr_scans (qr_link_id, utm_source, utm_medium, utm_campaign)
    values (v_link_id, left(p_utm_source, 100), left(p_utm_medium, 100), left(p_utm_campaign, 100));
    update public.qr_links set scan_count = scan_count + 1 where id = v_link_id;
  end if;

  return query
    select c.slug, l.slug
    from public.qr_links q
    join public.lessons l on l.id = q.lesson_id
    join public.categories c on c.id = l.category_id
    where q.id = v_link_id;
end;
$$;

revoke all on function public.log_qr_scan(text, text, text, text) from public;
grant execute on function public.log_qr_scan(text, text, text, text) to anon, authenticated;
```

- [ ] **Step 4: Seed the QR links**

Append to `supabase/seed.sql`:

```sql
-- QR links. scout-pro-10k-v3 matches the PRD 5.1 example; test-slug is for the Phase 2 check.
insert into public.qr_links (slug, lesson_id)
select v.slug, l.id
from (values ('scout-pro-10k-v3'), ('test-slug')) as v (slug)
join public.lessons l on l.slug = 'scout-pro-10k-v3';
```

- [ ] **Step 5: Reset, test and generate types**

Run: `npm run db:reset && npm run test:db`
Expected: all DB tests pass (the 8 existing plus the new QR tests).

Run: `npm run db:types`, then `npm run typecheck`
Expected: passes. `log_qr_scan` now appears under `Functions` in `src/types/database.ts`.

- [ ] **Step 6: Mutation check** (proves the cap test can fail)

In the new migration file, temporarily change `if v_recent < 60 then` to `if true then`. Then run `npm run db:reset && npm run test:db`.
Expected: `records at most 60 scans per link per minute…` fails, because 66 scans are recorded.

Restore the line to `if v_recent < 60 then`. Don't rely on `git checkout`: the migration isn't committed yet, so checkout restores nothing (found during the build, 29 October 2026). Confirm with `Select-String` that the line is back, then run `npm run db:reset && npm run test:db`.
Expected: all pass. Record the result for the control 22 evidence.

- [ ] **Step 7: Commit**

```bash
git add supabase tests/db src/types/database.ts
git commit -m "feat: add QR links with a validated, rate-capped scan logging function"
```

---

### Task 4: Library data layer (TDD for the pure parts)

**Files:**
- Create: `src/lib/content/lesson-nav.ts`, `lesson-nav.test.ts`, `program-settings.ts`, `program-settings.test.ts`, `lessons.ts`, `settings.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/content/lesson-nav.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { neighbours } from './lesson-nav'

const lessons = [
  { slug: 'a', title: 'A' },
  { slug: 'b', title: 'B' },
  { slug: 'c', title: 'C' },
]

describe('neighbours', () => {
  it('returns previous and next for a middle lesson', () => {
    expect(neighbours(lessons, 'b')).toEqual({
      current: lessons[1],
      previous: { slug: 'a', title: 'A' },
      next: { slug: 'c', title: 'C' },
    })
  })

  it('has no previous for the first lesson and no next for the last', () => {
    expect(neighbours(lessons, 'a')?.previous).toBeNull()
    expect(neighbours(lessons, 'c')?.next).toBeNull()
  })

  it('returns null for an unknown slug', () => {
    expect(neighbours(lessons, 'zzz')).toBeNull()
  })
})
```

`src/lib/content/program-settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { toProgramSettings } from './program-settings'

describe('toProgramSettings', () => {
  it('maps settings rows and validates the warranty URL', () => {
    expect(
      toProgramSettings([
        { key: 'warranty_registration_url', value: 'https://carbonoffroad.com.au/pages/warranty' },
        { key: 'certificate_validity_months', value: 12 },
        { key: 'store_certification_threshold', value: 2 },
      ]),
    ).toEqual({
      warrantyUrl: 'https://carbonoffroad.com.au/pages/warranty',
      certificateValidityMonths: 12,
      storeThreshold: 2,
    })
  })

  it('drops an unsafe warranty URL and falls back to PRD defaults', () => {
    expect(
      toProgramSettings([{ key: 'warranty_registration_url', value: 'javascript:alert(1)' }]),
    ).toEqual({ warrantyUrl: null, certificateValidityMonths: 12, storeThreshold: 2 })
  })
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npm test -- src/lib/content`
Expected: the new tests fail.

- [ ] **Step 3: Implement the pure modules**

`src/lib/content/lesson-nav.ts`:

```ts
export type LessonLink = { slug: string; title: string }

/** The lesson with this slug plus its previous and next lessons, in list order. */
export function neighbours<T extends LessonLink>(
  lessons: readonly T[],
  slug: string,
): { current: T; previous: LessonLink | null; next: LessonLink | null } | null {
  const index = lessons.findIndex((lesson) => lesson.slug === slug)
  if (index === -1) return null
  const link = (lesson: T | undefined) => (lesson ? { slug: lesson.slug, title: lesson.title } : null)
  return { current: lessons[index]!, previous: link(lessons[index - 1]), next: link(lessons[index + 1]) }
}
```

`src/lib/content/program-settings.ts`:

```ts
import { WARRANTY_HOSTS, safeHttpsUrl } from '@/lib/validation/urls'

export type ProgramSettings = {
  warrantyUrl: string | null
  certificateValidityMonths: number
  storeThreshold: number
}

type SettingRow = { key: string; value: unknown }

const positiveInt = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback

/** Maps public settings rows. Defaults are PRD section 11 (D2, D3). */
export function toProgramSettings(rows: readonly SettingRow[]): ProgramSettings {
  const value = (key: string) => rows.find((row) => row.key === key)?.value
  return {
    warrantyUrl: safeHttpsUrl(value('warranty_registration_url'), WARRANTY_HOSTS),
    certificateValidityMonths: positiveInt(value('certificate_validity_months'), 12),
    storeThreshold: positiveInt(value('store_certification_threshold'), 2),
  }
}
```

- [ ] **Step 4: Implement the server-only queries**

`src/lib/content/lessons.ts`:

```ts
import 'server-only'
import { cacheLife } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { isVimeoId } from '@/lib/validation/urls'
import { type LessonLink, neighbours } from './lesson-nav'

export type LessonCardData = {
  slug: string
  title: string
  productName: string | null
  isCore: boolean
}
export type LibraryCategory = {
  slug: string
  name: string
  description: string | null
  lessons: LessonCardData[]
}
export type LessonDetail = LessonCardData & {
  summary: string | null
  vimeoId: string | null
  category: { slug: string; name: string }
  previous: LessonLink | null
  next: LessonLink | null
}

type LessonRecord = LessonCardData & { summary: string | null; vimeoId: string | null }
type CategoryRecord = Omit<LibraryCategory, 'lessons'> & { lessons: LessonRecord[] }

/**
 * Every category with its published lessons (RLS filters drafts), in display order.
 * Public content only, so it's safe in the shared 'use cache' scope (control 14).
 */
async function loadLibrary(): Promise<CategoryRecord[]> {
  'use cache'
  cacheLife('minutes')
  const { data, error } = await createPublicClient()
    .from('categories')
    .select(
      'slug, name, description, sort_order, lessons(slug, title, summary, product_name, vimeo_id, is_core, sort_order)',
    )
    .order('sort_order')
    .order('sort_order', { referencedTable: 'lessons' })
  if (error) throw new Error(`Could not load lessons: ${error.message}`)
  return data.map((category) => ({
    slug: category.slug,
    name: category.name,
    description: category.description,
    lessons: category.lessons.map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      productName: lesson.product_name,
      isCore: lesson.is_core,
      summary: lesson.summary,
      vimeoId: isVimeoId(lesson.vimeo_id) ? lesson.vimeo_id : null,
    })),
  }))
}

const toCard = ({ slug, title, productName, isCore }: LessonRecord): LessonCardData => ({
  slug,
  title,
  productName,
  isCore,
})

export async function getLibrary(): Promise<LibraryCategory[]> {
  return (await loadLibrary()).map((category) => ({ ...category, lessons: category.lessons.map(toCard) }))
}

export async function getCategoryWithLessons(slug: string): Promise<LibraryCategory | null> {
  return (await getLibrary()).find((category) => category.slug === slug) ?? null
}

export async function getLesson(categorySlug: string, lessonSlug: string): Promise<LessonDetail | null> {
  const category = (await loadLibrary()).find((c) => c.slug === categorySlug)
  if (!category) return null
  const found = neighbours(category.lessons, lessonSlug)
  if (!found) return null
  return {
    ...found.current,
    category: { slug: category.slug, name: category.name },
    previous: found.previous,
    next: found.next,
  }
}

export async function getCategoryParams(): Promise<{ category: string }[]> {
  return (await loadLibrary()).map((category) => ({ category: category.slug }))
}

export async function getLessonParams(): Promise<{ category: string; lesson: string }[]> {
  return (await loadLibrary()).flatMap((category) =>
    category.lessons.map((lesson) => ({ category: category.slug, lesson: lesson.slug })),
  )
}
```

`src/lib/content/settings.ts`:

```ts
import 'server-only'
import { cacheLife } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { type ProgramSettings, toProgramSettings } from './program-settings'

/** Public programme settings. Never store secrets in `settings` (it's publicly readable). */
export async function getProgramSettings(): Promise<ProgramSettings> {
  'use cache'
  cacheLife('minutes')
  const { data, error } = await createPublicClient()
    .from('settings')
    .select('key, value')
    .in('key', ['warranty_registration_url', 'certificate_validity_months', 'store_certification_threshold'])
  if (error) throw new Error(`Could not load settings: ${error.message}`)
  return toProgramSettings(data)
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test -- src/lib/content && npm run typecheck`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content
git commit -m "feat: add library, lesson and programme settings data layer"
```

---

### Task 5: CSP allows Vimeo frames only (TDD; control 11)

**Files:**
- Modify: `src/config/security-headers.ts`, `src/config/security-headers.test.ts`

- [ ] **Step 1: Add the failing test**

Add this inside `describe('contentSecurityPolicy', …)` in `src/config/security-headers.test.ts`:

```ts
it('allows frames from the Vimeo player only', () => {
  const csp = contentSecurityPolicy(false)
  expect(csp).toContain('frame-src https://player.vimeo.com;')
  expect(csp).not.toContain("frame-src 'none'")
})
```

Run: `npm test -- src/config`
Expected: 1 failed.

- [ ] **Step 2: Implement**

In `src/config/security-headers.ts`, replace `'frame-src': ["'none'"],` with:

```ts
    // Lesson videos only (BUILD_PLAN Phase 2, tag inventory). No other third-party frames.
    'frame-src': ['https://player.vimeo.com'],
```

Run: `npm test -- src/config`
Expected: 7 passed.

- [ ] **Step 3: Commit**

```bash
git add src/config
git commit -m "feat(security): allow Vimeo player frames in the CSP"
```

---

### Task 6: Video player with click-to-play facade (TDD; controls 07, 20)

**Files:**
- Create: `src/components/video/VimeoPlayer.tsx`, `src/components/video/VimeoPlayer.test.tsx`, `src/components/video/VideoPlaceholder.tsx`

- [ ] **Step 1: Write the failing tests**

`src/components/video/VimeoPlayer.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VimeoPlayer, vimeoEmbedUrl } from './VimeoPlayer'

vi.mock('@vimeo/player', () => ({
  default: class {
    on() {}
    off() {}
  },
}))

afterEach(cleanup)

const props = {
  vimeoId: '76979871',
  title: 'Scout Pro 10K V3',
  lessonSlug: 'scout-pro-10k-v3',
  categorySlug: 'winches',
}

describe('vimeoEmbedUrl', () => {
  it('uses the brand player colour, no tracking and captions on', () => {
    const url = new URL(vimeoEmbedUrl('76979871'))
    expect(url.origin + url.pathname).toBe('https://player.vimeo.com/video/76979871')
    expect(url.searchParams.get('color')).toBe('00a4c7')
    expect(url.searchParams.get('dnt')).toBe('1')
    expect(url.searchParams.get('texttrack')).toBe('en')
  })
})

describe('VimeoPlayer', () => {
  it('shows an accessible play button and loads nothing from Vimeo until pressed', () => {
    render(<VimeoPlayer {...props} />)
    expect(screen.getByRole('button', { name: 'Play video: Scout Pro 10K V3' })).toBeDefined()
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('loads the titled Vimeo iframe when play is pressed', () => {
    render(<VimeoPlayer {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play video: Scout Pro 10K V3' }))
    const frame = screen.getByTitle('Video: Scout Pro 10K V3')
    expect(frame.getAttribute('src')).toBe(vimeoEmbedUrl('76979871'))
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin')
  })
})
```

Run: `npm test -- src/components/video`
Expected: FAIL.

- [ ] **Step 2: Implement**

`src/components/video/VimeoPlayer.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { type PlayerSignal, dueMilestones } from '@/lib/analytics/milestones'
import { type EventProps, type VideoEvent, track } from '@/lib/analytics/track'

/** Carbon Cyan without the hash, as Vimeo expects (BRAND.md video player). */
const PLAYER_COLOUR = '00a4c7'

/** Vimeo embed: brand colour, no tracking cookies (dnt), English captions on (PRD 6.2). */
export function vimeoEmbedUrl(vimeoId: string): string {
  const params = new URLSearchParams({
    color: PLAYER_COLOUR,
    dnt: '1',
    texttrack: 'en',
    title: '0',
    byline: '0',
    portrait: '0',
    autoplay: '1',
  })
  return `https://player.vimeo.com/video/${vimeoId}?${params}`
}

type Props = { vimeoId: string; title: string; lessonSlug: string; categorySlug: string }

/**
 * Click-to-play: nothing loads from Vimeo until the visitor presses play (security framework
 * control 20). @vimeo/player then attaches to the iframe for analytics milestones.
 */
export function VimeoPlayer({ vimeoId, title, lessonSlug, categorySlug }: Props) {
  const [started, setStarted] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const fired = useRef(new Set<VideoEvent>())

  useEffect(() => {
    if (!started || !frame.current) return
    frame.current.focus()
    const eventProps: EventProps = { lesson_slug: lessonSlug, category_slug: categorySlug }
    const emit = (signal: PlayerSignal) => {
      for (const event of dueMilestones(fired.current, signal)) {
        fired.current.add(event)
        track(event, eventProps)
      }
    }
    let player: { on: (e: string, cb: (data: { percent: number }) => void) => void; off: (e: string) => void } | undefined
    let cancelled = false
    import('@vimeo/player').then(({ default: Player }) => {
      if (cancelled || !frame.current) return
      player = new Player(frame.current)
      player.on('play', () => emit({ type: 'play' }))
      player.on('timeupdate', (data) => emit({ type: 'progress', percent: data.percent }))
      player.on('ended', () => emit({ type: 'ended' }))
    })
    return () => {
      cancelled = true
      for (const event of ['play', 'timeupdate', 'ended']) player?.off(event)
    }
  }, [started, lessonSlug, categorySlug])

  if (!started) {
    return (
      <button
        type="button"
        onClick={() => setStarted(true)}
        className="group relative flex aspect-video w-full items-center justify-center bg-carbon-black text-white"
      >
        <span className="sr-only">Play video: {title}</span>
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center bg-carbon-cyan text-carbon-black transition-colors group-hover:bg-white"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </button>
    )
  }

  return (
    <div className="relative aspect-video w-full bg-carbon-black">
      <iframe
        ref={frame}
        src={vimeoEmbedUrl(vimeoId)}
        title={`Video: ${title}`}
        className="absolute inset-0 h-full w-full"
        allow="autoplay; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  )
}
```

`src/components/video/VideoPlaceholder.tsx`:

```tsx
/** Shown until a lesson has a valid Vimeo ID. */
export function VideoPlaceholder() {
  return (
    <div
      data-surface="dark"
      className="flex aspect-video w-full items-center justify-center bg-gunmetal text-white"
    >
      <p className="font-bold">Video coming soon.</p>
    </div>
  )
}
```

Run: `npm test -- src/components/video && npm run typecheck`
Expected: 3 passed, and no type errors. If `@vimeo/player`'s types reject the `player` shape, type it as `import('@vimeo/player').default` instead.

- [ ] **Step 3: Commit**

```bash
git add src/components/video
git commit -m "feat: add click-to-play Vimeo player with analytics milestones"
```

---

### Task 7: Home page hero and certified panel (brand p.21, p.25, p.32, p.45)

**Files:**
- Create: `src/components/home/Hero.tsx`, `src/components/home/CertifiedPanel.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: The hero**

The concrete texture is the master wrap artwork with a **60% Carbon Black** overlay, so white body text stays at 6.1:1 or better. It's this screen's one slash motif. There's no logo on the texture and no cyan text (decision 8).

`src/components/home/Hero.tsx`:

```tsx
import Image from 'next/image'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import texture from '../../../public/brand/concrete-texture.jpg'

// Draft copy, awaiting Rich's approval (brand p.69).
export function Hero() {
  return (
    <section data-surface="dark" className="relative isolate overflow-hidden bg-carbon-black text-white">
      <Image
        src={texture}
        alt=""
        fill
        priority
        sizes="100vw"
        placeholder="blur"
        className="-z-20 object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-carbon-black/60" />
      <Container className="py-16 md:py-28">
        <h1 className="max-w-3xl text-h1 md:text-h1-lg">Know your gear. Get home safe.</h1>
        <p className="mt-4 max-w-prose md:text-body-lg">
          Short videos on fitting, using and looking after your Carbon Offroad gear. Watch for
          free. Store staff who pass the core lesson quizzes become Carbon Certified.
        </p>
        <div className="mt-8">
          <ButtonLink href="/lessons">Browse lessons</ButtonLink>
        </div>
      </Container>
    </section>
  )
}
```

- [ ] **Step 2: The certified panel**

`src/components/home/CertifiedPanel.tsx`:

```tsx
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

// Draft copy, awaiting Rich's approval (brand p.69).
export function CertifiedPanel({ storeThreshold }: { storeThreshold: number }) {
  return (
    <section data-surface="dark" className="bg-gunmetal text-white">
      <Container className="py-12 md:py-16">
        <h2 className="text-h2 md:text-h2-lg">Get Carbon Certified</h2>
        <p className="mt-4 max-w-prose">
          Store staff who pass every core lesson become Carbon Certified. Stores with{' '}
          {storeThreshold} or more certified staff become Carbon Certified Stores.
        </p>
        <div className="mt-8">
          <ButtonLink href="/certified" variant="secondary" onDark>
            How it works
          </ButtonLink>
        </div>
      </Container>
    </section>
  )
}
```

- [ ] **Step 3: The home page**

Replace `src/app/page.tsx`:

```tsx
import { CertifiedPanel } from '@/components/home/CertifiedPanel'
import { Hero } from '@/components/home/Hero'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { getCategorySummaries } from '@/lib/content/categories'
import { formatLessonCount } from '@/lib/content/category-summary'
import { getProgramSettings } from '@/lib/content/settings'

// One slash motif per screen (p.32): the hero texture is it, so no slash on the section header.
export default async function HomePage() {
  const [categories, settings] = await Promise.all([getCategorySummaries(), getProgramSettings()])

  return (
    <>
      <Hero />
      <section className="bg-dust">
        <Container className="py-12 md:py-16">
          <SectionHeader title="Lesson categories" />
          {categories.length === 0 ? (
            <p className="mt-6">No lessons yet. Check back soon.</p>
          ) : (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Card href={`/lessons/${category.slug}`}>
                    <h3 className="text-h3 md:text-h3-lg">{category.name}</h3>
                    <p className="mt-1 text-small">{formatLessonCount(category.lessonCount)}</p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>
      <CertifiedPanel storeThreshold={settings.storeThreshold} />
    </>
  )
}
```

- [ ] **Step 4: Check and commit**

Run: `npm run lint && npm run typecheck && npm test`
Expected: all pass, including the brand guard.

```bash
git add src/components/home src/app/page.tsx
git commit -m "feat: add home hero on the concrete texture and certified panel"
```

---

### Task 8: Library and category pages

**Files:**
- Create: `src/components/lessons/LessonCard.tsx`, `src/app/lessons/page.tsx`, `src/app/lessons/[category]/page.tsx`

- [ ] **Step 1: The lesson card**

`src/components/lessons/LessonCard.tsx`:

```tsx
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { LessonCardData } from '@/lib/content/lessons'

export function LessonCard({
  lesson,
  href,
  heading: Heading,
}: {
  lesson: LessonCardData
  href: string
  heading: 'h2' | 'h3'
}) {
  return (
    <Card href={href}>
      <Heading className="text-h3 md:text-h3-lg">{lesson.title}</Heading>
      {(lesson.productName || lesson.isCore) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-small">
          {lesson.productName && <span>{lesson.productName}</span>}
          {lesson.isCore && <Badge tone="accent">Core</Badge>}
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: The library page** (`/lessons`). There's one slash, on the H1.

`src/app/lessons/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { LessonCard } from '@/components/lessons/LessonCard'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { getLibrary } from '@/lib/content/lessons'

export const metadata: Metadata = {
  title: 'Lessons',
  description: 'Short videos on fitting, using and looking after Carbon Offroad gear.',
}

// Draft intro copy, awaiting Rich's approval (brand p.69).
export default async function LessonsPage() {
  const library = await getLibrary()

  return (
    <Container className="py-10 md:py-14">
      <SectionHeader
        as="h1"
        title="Lessons"
        slash
        intro="Short videos on Carbon Offroad gear, grouped by category. Core lessons count towards Carbon Certified."
      />
      {library.map((category) => (
        <section key={category.slug} className="mt-12" aria-labelledby={`cat-${category.slug}`}>
          <h2 id={`cat-${category.slug}`} className="text-h2 md:text-h2-lg">
            {category.name}
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {category.lessons.map((lesson) => (
              <li key={lesson.slug}>
                <LessonCard
                  lesson={lesson}
                  href={`/lessons/${category.slug}/${lesson.slug}`}
                  heading="h3"
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Container>
  )
}
```

- [ ] **Step 3: The category page** (`/lessons/[category]`). Params are read inside `<Suspense>` (Next.js 16 Cache Components, ISR guide).

`src/app/lessons/[category]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { LessonCard } from '@/components/lessons/LessonCard'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { getCategoryParams, getCategoryWithLessons } from '@/lib/content/lessons'

export async function generateStaticParams() {
  return getCategoryParams()
}

export async function generateMetadata(props: PageProps<'/lessons/[category]'>): Promise<Metadata> {
  const { category } = await props.params
  const data = await getCategoryWithLessons(category)
  return data
    ? { title: data.name, description: `${data.name} lessons from Carbon Offroad Academy.` }
    : { title: 'Category not found' }
}

export default function CategoryPage(props: PageProps<'/lessons/[category]'>) {
  return (
    <Container className="py-10 md:py-14">
      <Suspense fallback={<p>Loading lessons…</p>}>
        <Category params={props.params} />
      </Suspense>
    </Container>
  )
}

async function Category({ params }: Pick<PageProps<'/lessons/[category]'>, 'params'>) {
  const { category } = await params
  const data = await getCategoryWithLessons(category)
  if (!data) notFound()

  return (
    <>
      <p className="text-small">
        <Link className="link" href="/lessons">
          All lessons
        </Link>
      </p>
      <div className="mt-4">
        <SectionHeader as="h1" title={data.name} slash intro={data.description ?? undefined} />
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.lessons.map((lesson) => (
          <li key={lesson.slug}>
            <LessonCard lesson={lesson} href={`/lessons/${data.slug}/${lesson.slug}`} heading="h2" />
          </li>
        ))}
      </ul>
    </>
  )
}
```

- [ ] **Step 4: Check and commit**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all pass. The build lists `/lessons` and the five prebuilt `/lessons/[category]` paths.

```bash
git add src/components/lessons/LessonCard.tsx src/app/lessons/page.tsx "src/app/lessons/[category]/page.tsx"
git commit -m "feat: add lesson library and category pages"
```

---

### Task 9: Lesson page

**Files:**
- Create: `src/components/lessons/LessonNav.tsx`, `src/app/lessons/[category]/[lesson]/page.tsx`

- [ ] **Step 1: Previous and next navigation**

`src/components/lessons/LessonNav.tsx`:

```tsx
import Link from 'next/link'
import type { LessonLink } from '@/lib/content/lesson-nav'

export function LessonNav({
  categorySlug,
  previous,
  next,
}: {
  categorySlug: string
  previous: LessonLink | null
  next: LessonLink | null
}) {
  if (!previous && !next) return null
  return (
    <nav aria-label="Lesson navigation" className="mt-10 grid gap-4 border-t-2 border-dust pt-6 sm:grid-cols-2">
      {previous ? (
        <Link className="block" href={`/lessons/${categorySlug}/${previous.slug}`}>
          <span className="block text-small">Previous lesson</span>
          <span className="link font-bold">{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link className="block sm:text-right" href={`/lessons/${categorySlug}/${next.slug}`}>
          <span className="block text-small">Next lesson</span>
          <span className="link font-bold">{next.title}</span>
        </Link>
      )}
    </nav>
  )
}
```

- [ ] **Step 2: The lesson page**

`src/app/lessons/[category]/[lesson]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { LessonNav } from '@/components/lessons/LessonNav'
import { Badge } from '@/components/ui/Badge'
import { buttonClasses } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { VideoPlaceholder } from '@/components/video/VideoPlaceholder'
import { VimeoPlayer } from '@/components/video/VimeoPlayer'
import { getLesson, getLessonParams } from '@/lib/content/lessons'
import { getProgramSettings } from '@/lib/content/settings'

type Props = PageProps<'/lessons/[category]/[lesson]'>

export async function generateStaticParams() {
  return getLessonParams()
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category, lesson } = await props.params
  const data = await getLesson(category, lesson)
  if (!data) return { title: 'Lesson not found' }
  return {
    title: data.title,
    description: data.summary ?? `${data.title}: a Carbon Offroad Academy lesson.`,
  }
}

export default function LessonPage(props: Props) {
  return (
    <Container className="py-10 md:py-14">
      <Suspense fallback={<p>Loading lesson…</p>}>
        <Lesson params={props.params} />
      </Suspense>
    </Container>
  )
}

async function Lesson({ params }: Pick<Props, 'params'>) {
  const { category, lesson } = await params
  const [data, settings] = await Promise.all([getLesson(category, lesson), getProgramSettings()])
  if (!data) notFound()

  // Decision 4: warranty CTA on winch lessons only, once a validated URL is set (control 07).
  const warrantyUrl = data.category.slug === 'winches' ? settings.warrantyUrl : null

  return (
    <article>
      <nav aria-label="Breadcrumb" className="text-small">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link className="link" href="/lessons">
              Lessons
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link className="link" href={`/lessons/${data.category.slug}`}>
              {data.category.name}
            </Link>
          </li>
        </ol>
      </nav>
      <h1 className="mt-4 text-h1 md:text-h1-lg">{data.title}</h1>
      {(data.productName || data.isCore) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-small">
          {data.productName && <p>Product: {data.productName}</p>}
          {data.isCore && <Badge tone="accent">Core lesson</Badge>}
        </div>
      )}
      <div className="mt-6 max-w-4xl">
        {data.vimeoId ? (
          <VimeoPlayer
            vimeoId={data.vimeoId}
            title={data.title}
            lessonSlug={data.slug}
            categorySlug={data.category.slug}
          />
        ) : (
          <VideoPlaceholder />
        )}
      </div>
      {data.summary && <p className="mt-6 max-w-prose">{data.summary}</p>}
      {warrantyUrl && (
        <p className="mt-8">
          <a className={buttonClasses({ variant: 'secondary' })} href={warrantyUrl} rel="noopener">
            Register your winch
          </a>
        </p>
      )}
      <LessonNav categorySlug={data.category.slug} previous={data.previous} next={data.next} />
    </article>
  )
}
```

- [ ] **Step 3: Check and commit**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all pass. The build prerenders the 15 lesson paths.

```bash
git add src/components/lessons/LessonNav.tsx "src/app/lessons/[category]/[lesson]/page.tsx"
git commit -m "feat: add lesson page with video, warranty CTA and lesson navigation"
```

---

### Task 10: `/go/[slug]` and `/certified` (controls 05, 12, 14)

**Files:**
- Create: `src/app/go/[slug]/route.ts`, `src/app/certified/page.tsx`

- [ ] **Step 1: The QR redirect handler**

This is a public endpoint, so it validates everything itself. The redirect target is built only from database slugs on the same origin, so it can't be used as an open redirect.

`src/app/go/[slug]/route.ts`:

```ts
import { type NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { QrSlug } from '@/lib/validation/slug'
import { pickUtm } from '@/lib/validation/utm'

/** QR short link: log the scan, keep known UTMs, redirect to the lesson (PRD 5.1). */
export async function GET(request: NextRequest, ctx: RouteContext<'/go/[slug]'>) {
  const fallback = new URL('/lessons', request.url)
  const slug = QrSlug.safeParse((await ctx.params).slug)
  if (!slug.success) return redirect(fallback)

  const utm = pickUtm(request.nextUrl.searchParams)
  const { data, error } = await createPublicClient()
    .rpc('log_qr_scan', {
      p_slug: slug.data,
      p_utm_source: utm.utm_source,
      p_utm_medium: utm.utm_medium,
      p_utm_campaign: utm.utm_campaign,
    })
    .maybeSingle()
  if (error || !data) return redirect(fallback)

  const target = new URL(`/lessons/${data.category_slug}/${data.lesson_slug}`, request.url)
  for (const [key, value] of Object.entries(utm)) target.searchParams.set(key, value)
  return redirect(target)
}

function redirect(url: URL) {
  const response = NextResponse.redirect(url, 302)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
```

- [ ] **Step 2: The certified page** (draft copy for approval; numbers from `settings`)

`src/app/certified/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { getProgramSettings } from '@/lib/content/settings'

export const metadata: Metadata = {
  title: 'Get Carbon Certified',
  description: 'How retail staff and stores become Carbon Certified.',
}

// Draft copy, awaiting Rich's approval (brand p.69).
export default async function CertifiedPage() {
  const { certificateValidityMonths, storeThreshold } = await getProgramSettings()

  return (
    <Container className="py-10 md:py-14">
      <SectionHeader as="h1" title="Get Carbon Certified" slash />
      <div className="mt-6 max-w-prose space-y-6">
        <p>Carbon Certified is for staff at stores that sell Carbon Offroad gear.</p>
        <ol className="list-decimal space-y-3 pl-6">
          <li>Join with your store&apos;s code. Your store manager or Carbon Offroad will send you a joining link.</li>
          <li>Watch each core lesson and pass its short quiz.</li>
          <li>
            Pass them all and you&apos;re Carbon Certified. Your certificate lasts{' '}
            {certificateValidityMonths} months.
          </li>
        </ol>
        <p>
          When {storeThreshold} or more staff at a store hold active certificates, the store becomes
          a Carbon Certified Store.
        </p>
        <p className="font-bold">Sign-up opens soon.</p>
      </div>
      <div className="mt-8">
        <ButtonLink href="/lessons" variant="secondary">
          Browse lessons
        </ButtonLink>
      </div>
    </Container>
  )
}
```

- [ ] **Step 3: Check the done-when criterion locally**

Run: `npm run build && npm run start -- -p 3100`. In another shell:

```bash
curl -sI "http://localhost:3100/go/test-slug?utm_source=packaging&gclid=abc"
```

Expected:
- `HTTP/1.1 302`
- `location: http://localhost:3100/lessons/winches/scout-pro-10k-v3?utm_source=packaging` (no `gclid`)
- `cache-control: no-store`

Then:

```bash
curl -sI "http://localhost:3100/go/Not%20A%20Slug"
```

Expected: `302` to `/lessons`.

Confirm the scan was logged:

```bash
docker exec supabase_db_Carbon-Academy psql -U postgres -tc "select utm_source from qr_scans order by scanned_at desc limit 1"
```

Expected: `packaging`.

- [ ] **Step 4: Commit**

```bash
git add src/app/go src/app/certified
git commit -m "feat: add QR redirect route and certified information page"
```

---

### Task 11: Open Graph image (brand p.21, p.32)

**Files:**
- Create: `src/app/opengraph-image.jpg`, `src/app/opengraph-image.alt.txt`

The image is the master texture with a 60% Carbon Black overlay and the white-on-black badge logo centred at 400 px wide (about 33%, p.22). It has no text, so it doesn't need a font.

- [ ] **Step 1: Generate it**

Run this with PowerShell. It's a one-off and isn't committed.

```powershell
Add-Type -AssemblyName System.Drawing
$tex = [System.Drawing.Image]::FromFile((Resolve-Path public\brand\concrete-texture.jpg))
$logo = [System.Drawing.Image]::FromFile((Resolve-Path public\brand\logo-full-white-on-black-transparent-2000.png))
$bmp = New-Object System.Drawing.Bitmap 1200, 630
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = 'HighQualityBicubic'
$scale = [Math]::Max(1200 / $tex.Width, 630 / $tex.Height)
$w = [int]($tex.Width * $scale); $h = [int]($tex.Height * $scale)
$g.DrawImage($tex, [int]((1200 - $w) / 2), [int]((630 - $h) / 2), $w, $h)
$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(153, 17, 17, 17))), 0, 0, 1200, 630)
$lw = 400; $lh = [int]($logo.Height * $lw / $logo.Width)
$g.DrawImage($logo, [int]((1200 - $lw) / 2), [int]((630 - $lh) / 2), $lw, $lh)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]85)
$bmp.Save((Join-Path (Get-Location) 'src\app\opengraph-image.jpg'), $codec, $ep)
$g.Dispose(); $bmp.Dispose(); $tex.Dispose(); $logo.Dispose()
```

Set `src/app/opengraph-image.alt.txt` to `Carbon Offroad Academy`.

- [ ] **Step 2: View it**

Read `src/app/opengraph-image.jpg` and confirm: the logo is unaltered and centred, the texture is subtle behind it, and there's nothing else on the image. Then run `npm run build`. Expected: the build output lists the `/opengraph-image.jpg` route.

- [ ] **Step 3: Commit**

```bash
git add src/app/opengraph-image.jpg src/app/opengraph-image.alt.txt
git commit -m "feat: add Open Graph image from the master texture and logo"
```

---

### Task 12: Security records (controls 20, section 5)

**Files:**
- Create: `docs/security/TAG_INVENTORY.md`, `docs/security/THREAT_MODEL.md`
- Modify: `docs/SECURITY.md`

- [ ] **Step 1: The tag inventory**

`docs/security/TAG_INVENTORY.md`:

```markdown
# Tag inventory (security framework control 20)

Every third-party script, frame, pixel or tag on the Academy, what it receives and who owns it. Review at every phase and quarterly after launch.

| Tag | Where | Loads | Purpose | Data it receives | Owner | Vendor assessment |
|---|---|---|---|---|---|---|
| Vimeo player (iframe from `player.vimeo.com`, plus `@vimeo/player` SDK bundled in our JS) | Lesson pages | Only after the visitor presses play | Lesson video playback | The visitor's IP address and user agent; the referrer origin (`strict-origin-when-cross-origin`). `dnt=1` disables Vimeo session tracking. No personal information from us | Rich | Due before Phase 7 (Vimeo processes in the US: APP 8 disclosure) |
| GA4 | Not loaded | — | Analytics (decision D6, not yet approved) | Nothing yet. When added: slugs only, never personal information or form values; not on `/join`, `/dashboard` or `/admin` | Rich | Due before it's added |
```

- [ ] **Step 2: The threat model**

The framework requires a full Tier C model before Phase 3. This starts it with Phase 2's entry points.

`docs/security/THREAT_MODEL.md`:

```markdown
# Threat model (STRIDE, security framework section 5)

Tier C: documented and independently reviewed before Phase 3 (accounts). Phase 2 entries below. A threat closes when its control is implemented **and** verified.

## Entry points (Phase 2)

| Entry point | Who | Data |
|---|---|---|
| Public pages (`/`, `/lessons`, `/lessons/*`, `/certified`) | Anyone | Public content only (read through RLS with the publishable key) |
| `/go/[slug]` | Anyone (QR codes) | Writes one scan row (slug, up to three UTM values, time) through `log_qr_scan()` |
| Vimeo iframe | Anyone who presses play | Third-party frame, `player.vimeo.com` only |

## Threats

| ID | Asset / flow | Threat / abuse case | STRIDE | Control | Status |
|---|---|---|---|---|---|
| T-01 | `/go` → `log_qr_scan` | SQL injection through slug or UTM values | Tampering, EoP | Zod slug validation; UTM allowlist and charset; parameterised plpgsql; `search_path = ''`; function owner-only DDL | Verified (DB tests) |
| T-02 | `/go` | Scan flooding to inflate counts or grow the table | DoS | 60 scans per link per minute cap in the function; optional Netlify Traffic Rule; 24-month retention (data register) | Verified (cap test); Netlify rule pending |
| T-03 | `/go` | Open redirect to another site | Spoofing | Redirect built only from DB slugs on the same origin | Verified (route check) |
| T-04 | `qr_links`, `qr_scans` | Reading or editing QR data with the publishable key | Information disclosure, Tampering | RLS on, all privileges revoked from anon and authenticated | Verified (DB tests) |
| T-05 | `/go` | Personal data in URLs reaching our database (for example `?email=`) | Information disclosure | Only five known UTM keys pass; only three are stored; no IP stored | Verified (unit tests) |
| T-06 | Lesson page | Malicious `vimeo_id` or warranty URL rendered into `src` or `href` | Tampering (XSS) | `isVimeoId`, `safeHttpsUrl` with a host allowlist; CSP `frame-src` Vimeo only | Verified (unit tests) |
| T-07 | Vimeo iframe | Third-party tracking of visitors | Information disclosure | Click-to-play; `dnt=1`; tag inventory; APP 8 disclosure | Implemented |
| T-08 | QR counts | Link scanners and bots open QR links ahead of the user, inflating counts | Repudiation (data quality) | Accepted: counts are indicative, not billing data | Accepted (29 Oct 2026) |
```

- [ ] **Step 3: Add the RPC rule to `docs/SECURITY.md`**

In section 3, under **Queries (control 06)**, add this bullet:

```markdown
- Database functions callable by the publishable key are `security definer` only when they must write on the visitor's behalf (like `log_qr_scan`). Each sets `search_path = ''`, validates every argument, writes only explicit columns, has `execute` granted to the roles that need it and revoked from `public`, and is covered by DB tests.
```

- [ ] **Step 4: Commit**

```bash
git add docs/security docs/SECURITY.md
git commit -m "docs(security): add tag inventory and threat model for Phase 2"
```

---

### Task 13: Verification, brand and security checks

- [ ] **Step 1: Run all the checks**

Run: `npm run lint && npm run typecheck && npm test && npm run format:check && npm run test:db && npm run build && npm run check:bundle`
Expected: all pass.

- [ ] **Step 2: Test video** (decision 1)

With Rich's test video ID, run this against the **local** database only:

```bash
docker exec supabase_db_Carbon-Academy psql -U postgres -c "update lessons set vimeo_id = '<ID>' where slug = 'scout-pro-10k-v3'"
```

Restart `npm run start -- -p 3100`. In the browser pane at 1280 px and at 375 px:
- open `/lessons/winches/scout-pro-10k-v3`
- press play: the video plays, captions are available, and the controls are cyan
- check the network panel: nothing loads from `vimeo.com` before play

Run `npm run db:reset` afterwards.

- [ ] **Step 3: Check every page at 375 px and 1280 px**

Pages: `/`, `/lessons`, `/lessons/winches`, `/lessons/winches/scout-pro-10k-v3`, `/certified`, plus a missing lesson URL.

Check:
- no horizontal scroll
- one H1 per page
- one slash per screen
- the white-on-black hero text is readable
- keyboard: the play button and links all get the visible focus ring
- the missing lesson shows the 404 page. Record its status code (decision 14).

- [ ] **Step 4: Lighthouse on the lesson page** (done-when criterion)

```bash
npx --yes lighthouse@13.6.0 http://localhost:3100/lessons/winches/scout-pro-10k-v3 --only-categories=performance,accessibility --output=json --output-path=../_tools/lh-lesson.json --quiet --chrome-flags="--headless=new"
node -e "const r=require('../_tools/lh-lesson.json');for(const [k,v] of Object.entries(r.categories))console.log(k,Math.round(v.score*100))"
```

Expected: performance ≥ 90 and accessibility = 100. This is mobile emulation, Lighthouse's default. Fix any failing audit before continuing.

- [ ] **Step 5: Brand check against the PDF**

Re-read p.21–22, p.24–25, p.29, p.32, p.45 and p.58 and confirm:
- the hero overlay is 60%, the texture is the only slash, there's no logo on the texture, and there's no cyan text on the texture
- buttons are square; one primary CTA on the hero
- the player colour is `#00A4C7`
- copy is in Australian English with no banned words (the brand guard checks this)
- the Open Graph image uses the master logo, unaltered

Cite the pages checked in the PR.

- [ ] **Step 6: Security check against the framework .docx**

Re-read controls 04, 05, 06, 07, 11, 12, 14, 20 and 22 and run their verification procedures:
- **04/06:** the DB tests, including the mutation check from Task 3.
- **05/12:** the `curl` checks from Task 10. Also confirm `/go/x?utm_source=%3Cscript%3E` drops the value.
- **07:** the unit tests, plus manually setting a `javascript:` warranty URL in the local database shows no CTA.
- **11:** the production build's CSP includes `frame-src https://player.vimeo.com`.
- **14:** `/go` responses have `Cache-Control: no-store`, and `'use cache'` holds public data only.
- **20:** the tag inventory matches what actually loads (network panel).
- **22:** the cap test passes.

Update `docs/security/EVIDENCE.md`, and cite the controls in the PR.

- [ ] **Step 7: Update the build plan**

Set the Phase 2 row in `docs/BUILD_PLAN.md` to `In review` with the PR link. Commit and push.

---

### Task 14: Staging, PR, production migration, merge (needs Rich)

- [ ] **Step 1: Migrate staging**

Apply the `qr_links` migration to staging (`naxngnrzjpdqvuphgbht`) with the Supabase connector's `apply_migration`. Then:
- set its `supabase_migrations.schema_migrations.version` to match the repo filename (the Phase 1 lesson)
- insert the two seed QR rows with `execute_sql`
- run the security advisor; expected: no issues
- probe with the publishable key: `qr_links` select is refused, and `rpc/log_qr_scan` with `test-slug` returns the target

- [ ] **Step 2: Push and open the PR**

Push the branch. Rich opens the PR "Phase 2: Video library" with the description (written to the session folder), which cites the brand pages and security controls.

Expected:
- CI shows all four jobs green
- the Netlify preview lists the Next.js Server Handler function (`plugin_state: success`)

- [ ] **Step 3: Check the preview through Netlify**

The preview needs a team login, so check what can be checked without one:
- the deploy summary
- that the preview returns 401 without a login

Rich spot-checks the preview in his own signed-in browser.

- [ ] **Step 4: Migrate production BEFORE the merge**

With Rich's go-ahead, apply the same migration and seed rows to `ljxjzvpdaeolytxakpog`. Align the version, run the advisor and the probes. Only then does Rich merge.

- [ ] **Step 5: Verify production after the merge**

Check:
- `/`, `/lessons`, a lesson page and `/certified` return 200
- `curl -sI "https://carbonoffroadacademy.netlify.app/go/test-slug?utm_source=packaging"` → 302 to the lesson with `utm_source`, and `no-store`
- the CSP header includes `frame-src https://player.vimeo.com`
- the scan appears in production `qr_scans`

Record the evidence, and set the Phase 2 row to `Done`.

---

## Phase 2 "Done when" → where it's covered

| Criterion | Covered by |
|---|---|
| A placeholder video plays on mobile and desktop | Task 6, Task 9; checked in Task 13 Step 2 (needs decision 1's test video) |
| `/go/test-slug?utm_source=packaging` logs a scan and lands on the right lesson with UTMs intact | Task 3 (RPC + tests), Task 10 (route + curl), Task 14 Step 5 (production) |
| Lighthouse mobile: Performance 90+, Accessibility 100 on the lesson page | Task 13 Step 4 |
| Security: slug validation, known UTMs only, validated warranty URL and Vimeo IDs, exact remote hosts, tag inventory, Vimeo-only CSP, rate limit | Tasks 1, 3, 5, 6, 10, 12; checked in Task 13 Step 6 |
