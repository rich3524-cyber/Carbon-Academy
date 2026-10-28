# Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use anthropic-skills:subagent-driven-development (recommended) or anthropic-skills:executing-plans to carry out this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A branded, deployed shell of Carbon Offroad Academy, with the content schema (categories, lessons, settings) protected by Row Level Security, the 15 placeholder lessons seeded, and a Netlify deploy preview live.

**Architecture:**
- Next.js App Router with TypeScript strict and server components by default. Tailwind CSS v4 theme tokens come from `docs/BRAND.md` and replace Tailwind's default palette and radii, so off-brand colours and rounded corners don't exist as utilities.
- Supabase Postgres, with schema changes only as SQL migrations. RLS allows public read of categories, published lessons and settings, and nothing else.
- The home page reads categories through a server-only client that uses the publishable key. This proves the schema, the seed and RLS end to end.

**Tech stack:** Next.js (current stable from `create-next-app@latest`), React, TypeScript, Tailwind CSS v4, ESLint, Prettier, Vitest + Testing Library, `@supabase/supabase-js`, Supabase CLI (as an npm dev dependency) with Docker for the local stack, Netlify.

**Spec:** `docs/BUILD_PLAN.md` Phase 1, `docs/PRD.md` sections 6.1, 8 and 9, `docs/BRAND.md`, `docs/SECURITY.md` and `CLAUDE.md`.
- Brand page references (p.N) point to the local guidelines PDF in `docs/brand/`.
- Security references (control NN, section N) point to the ITWM Custom Website Security Framework v3.1 in `docs/security/`. The Academy is **Tier C**.

**Framework controls this phase touches:**
- 04: RLS deny-by-default, and the data layer as server-only modules
- 06: query builders only
- 10: `server-only`, public-only `NEXT_PUBLIC_` values, a client-bundle secret scan
- 11: security headers and a Report-Only CSP
- 13: Dependabot, SHA-pinned CI, CodeQL, gitleaks, `npm audit`, branch protection
- 14: the staging database for previews, password-protected previews, no source maps
- 15: generic error pages
- 22: `security.txt`

---

## Decisions and flags (confirm before Task 1)

1. **Docker Desktop is needed for the local Supabase stack** (`supabase start`), which CLAUDE.md and the RLS tests rely on.
   - Docker Desktop is free for businesses with fewer than 250 employees **and** under US$10 million annual revenue; otherwise it's a paid subscription. Confirm KPD Industries qualifies.
   - *Alternative:* skip Docker and run migrations and RLS tests against the hosted project. This is not recommended, because tests would write to the real database.
2. **Node.js LTS** gets installed with winget. Its major version is pinned in `.nvmrc`, which Netlify reads.
3. **Fonts are Arial only in Phase 1.** No Eurostile licence yet (BRAND.md Typography), so headings are Arial Bold uppercase, as the p.28 fallback says. The font stack doesn't list Eurostile at all until licensed web fonts arrive, so a visitor's locally installed copy can't mix families on the page (p.28, p.65).
4. **No favicon yet.** The icon PNGs haven't been supplied and the logo must not be recreated (p.22). The Vercel `favicon.ico` that `create-next-app` adds is deleted.
5. **Product names in the seed are copied from PRD section 9.** Rich to check them against carbonoffroad.com.au before the remote seed (Task 12). Summaries are `[PLACEHOLDER]`, there are no specs, and `vimeo_id` is empty.
6. **The home page copy is a draft for Rich's approval** (p.69). See Task 10.
7. **Nav links (Lessons, Get certified, Sign in) and the footer Privacy link** go to routes built in Phases 2, 3 and 7. Until then they show the branded 404 page.
   - The nav is in sentence case ("Get certified", not "Get Certified"), because uppercase is only for headlines, taglines and buttons (p.16).
   - The route for the certification page is `/certified`. Rename it in Phase 2 if you prefer another.
8. **Contrast findings that shape the components:**
   - Cyan on Gunmetal is 4.47:1, which fails for text. Footer links are white with a cyan underline.
   - Cyan on white is 2.9:1, which fails the 3:1 focus-indicator rule. Focus rings are Carbon Black on light surfaces and white on dark ones.
9. **Deploy previews come from pull requests.** Work happens on branch `phase-1-foundation`, and the PR is opened on github.com. The GitHub CLI isn't installed.
10. **Remote database changes need Rich's go-ahead.** Pushing migrations and the seed to project `ljxjzvpdaeolytxakpog` happens only in Task 12, after Rich says go. Rich types the database password himself.
11. **Settings are publicly readable** (pass mark, thresholds, warranty URL, company address). Never store a secret in `settings`.
12. **The repo is still public.** Security decision S8 recommends making it private. CodeQL then needs paid GitHub Code Security, or a switch to Semgrep Community Edition. gitleaks needs a free licence key once the repo belongs to an organisation.
13. **Preview deploys use a separate staging Supabase project, never production** (control 14, section 4; decision S4). They're password-protected (decision S5).
14. **Branch protection needs a second GitHub identity** (control 13; decision S7). GitHub won't let the PR author approve their own PR. Until Claude Code has its own named account, Rich can't approve PRs pushed under his login.
15. **`security.txt` contact** defaults to `security@carbonoffroad.com.au` (decision S6). The mailbox must exist and be monitored before this merges.
16. **The public pages use `'unsafe-inline'` for scripts.** That's acceptable for an allowlist CSP on public, unauthenticated pages (control 11). Authenticated areas get a nonce-based CSP in Phase 3. The CSP is Report-Only in Phase 1, so `X-Frame-Options: DENY` enforces the framing block in the meantime.

## Brand measurements used in this plan

Both come from the master SVG `public/brand/logo-full-black-transparent.svg`, viewBox 2000 × 565.6.

- **Slash and badge angle (p.32):** the badge edge is `l64.5,-258.3`, which is 76.0° from horizontal (a 4:1 rise). In CSS that's `skewX(-14deg)`, leaning like `/`. In Tailwind it's `-skew-x-14`.
- **Clear space X (p.20–21)**, the height of the C in CARBON, is 134 of 2000 units. At the header width of 180 px, X ≈ 12 px. The SVG already has 9 px of built-in padding, so the header adds at least 4 px. At 144 px (mobile), the badge is 130 px wide, which is above the 120 px digital minimum (p.21).

## File structure

```
.nvmrc                              Node major version for local and Netlify
.prettierrc.json, .prettierignore   Formatting
netlify.toml                        Build settings (build + client-bundle secret scan)
next.config.ts                      poweredByHeader off, no browser source maps, security headers
.github/dependabot.yml              Weekly npm and GitHub Actions updates
.github/workflows/ci.yml            Lint, types, tests, RLS tests, audit, gitleaks, CodeQL (SHA-pinned)
scripts/check-client-bundle.mjs     Fails if a server secret appears in .next/static
public/.well-known/security.txt     Vulnerability disclosure contact (RFC 9116)
docs/security/EVIDENCE.md           (existing) control evidence register
vitest.config.mts                   Unit and brand tests (jsdom)
vitest.db.config.mts                RLS tests against the local Supabase stack (node)
.env.example                        (existing) public env var names
src/
  app/
    globals.css                     Brand tokens (@theme), base styles, link utility
    layout.tsx                      html lang, metadata, skip link, header, main, footer
    page.tsx                        Home: hero + category list from Supabase
    not-found.tsx                   Branded 404
    error.tsx                       Branded error boundary (client)
  components/
    layout/SiteHeader.tsx           Logo top left, main nav
    layout/SiteFooter.tsx           Gunmetal footer, company details, privacy link
    ui/Button.tsx                   buttonClasses(), Button, ButtonLink
    ui/Button.test.tsx
    ui/Container.tsx
    ui/Slash.tsx                    Single or double slash at the badge angle
    ui/SectionHeader.tsx            h1/h2 with an optional slash
    ui/Card.tsx
    ui/Badge.tsx
  config/
    security-headers.ts             securityHeaders(), contentSecurityPolicy()
    security-headers.test.ts
  lib/
    env.ts                          required() helper for env vars
    env.test.ts
    supabase/public.ts              Server-only client with the publishable key
    content/category-summary.ts     toCategorySummaries(), formatLessonCount() (pure)
    content/category-summary.test.ts
    content/categories.ts           getCategorySummaries() (server-only query)
  types/database.ts                 Generated by the Supabase CLI. Never hand-edit
tests/
  brand/guard.test.ts               Banned words, raw hex, rounded corners, brand-name spelling
  db/rls.test.ts                    RLS and seed checks (local stack only)
supabase/
  config.toml                       From `supabase init`
  migrations/<timestamp>_foundation_content_schema.sql
  seed.sql                          5 categories, 15 placeholder lessons
```

---

### Task 0: Tools and branch

**Files:** none

- [ ] **Step 1: Install Node.js LTS**

Run: `winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements`
Then open a new shell. Run `node -v` and `npm -v`.
Expected: Node prints `v<major>.x.x`, where `<major>` is an even LTS number. Note `<major>` for Task 1.

- [ ] **Step 2: Install Docker Desktop** (only after decision 1 is confirmed)

Run: `winget install --id Docker.DockerDesktop -e --source winget --accept-source-agreements --accept-package-agreements`
Start Docker Desktop once, accept its terms in the app (Rich does this himself), and wait for "Engine running". Then run `docker version`.
Expected: both Client and Server sections print.

- [ ] **Step 3: Create the branch**

Run: `git switch -c phase-1-foundation`
Expected: `Switched to a new branch 'phase-1-foundation'`

---

### Task 1: Scaffold Next.js into the existing repo

`create-next-app` refuses a folder that already has `README.md`, `CLAUDE.md` and `public/`. So scaffold into a sibling folder and copy across only what's needed.

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/*` (from the scaffold), `.nvmrc`
- Modify: `.gitignore`

- [ ] **Step 1: Scaffold into a sibling folder**

Run from the repo root:

```bash
npx create-next-app@latest ../ca-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --yes
```

Expected: `Success! Created ca-scaffold`. If it asks anything not covered by the flags, accept the default.

- [ ] **Step 2: Copy the scaffold files across**

```bash
Copy-Item ../ca-scaffold/package.json, ../ca-scaffold/package-lock.json, ../ca-scaffold/tsconfig.json, ../ca-scaffold/next.config.ts, ../ca-scaffold/eslint.config.mjs, ../ca-scaffold/postcss.config.mjs -Destination .
Copy-Item ../ca-scaffold/src -Destination . -Recurse
Remove-Item src/app/favicon.ico
```

Don't copy the scaffold's `README.md`, `.gitignore` or `public/*.svg`. The repo's own versions stay.

- [ ] **Step 3: Rename the package and add the scripts**

In `package.json`, set `"name": "carbon-offroad-academy"` and `"private": true`. Replace `"scripts"` with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:db": "vitest run --config vitest.db.config.mts",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "db:start": "supabase start",
  "db:reset": "supabase db reset",
  "db:types": "supabase gen types typescript --local > src/types/database.ts"
}
```

- [ ] **Step 4: Tighten TypeScript**

In `tsconfig.json` `compilerOptions`, confirm `"strict": true` is present, then add `"noUncheckedIndexedAccess": true`.

- [ ] **Step 5: Pin Node for Netlify**

Create `.nvmrc` containing only the major version from Task 0 Step 1, for example:

```
24
```

- [ ] **Step 6: Extend `.gitignore`**

Append to `.gitignore`:

```
# TypeScript and Next.js generated
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 7: Install and build**

Run: `npm install`, then `npm run build`.
Expected: the build completes and lists route `/`.

- [ ] **Step 8: Remove the scaffold folder and commit**

```bash
Remove-Item ../ca-scaffold -Recurse -Force
git add -A
git commit -m "chore: scaffold Next.js app with TypeScript strict and Tailwind"
```

---

### Task 2: Formatting, tests and the env helper (first TDD loop)

**Files:**
- Create: `.prettierrc.json`, `.prettierignore`, `vitest.config.mts`, `src/lib/env.ts`, `src/lib/env.test.ts`

New dev dependencies:
- **prettier**: consistent formatting.
- **vitest**: test runner.
- **@vitejs/plugin-react**: lets Vitest compile JSX.
- **vite-tsconfig-paths**: resolves the `@/` import alias in tests.
- **jsdom**: a browser-like DOM for component tests.
- **@testing-library/react** and **@testing-library/dom**: render components and query them the way a user would.

These are the minimum set Next.js documents for Vitest.

- [ ] **Step 1: Install the dev dependencies**

Run: `npm install -D prettier vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/dom`

- [ ] **Step 2: Add the Prettier config**

`.prettierrc.json`:

```json
{
  "singleQuote": true,
  "semi": false,
  "printWidth": 100
}
```

`.prettierignore`:

```
.next
node_modules
package-lock.json
src/types/database.ts
supabase/.temp
docs
```

- [ ] **Step 3: Add the Vitest config**

`vitest.config.mts`:

```ts
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/brand/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Write the failing test**

`src/lib/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { required } from './env'

describe('required', () => {
  it('returns the value when it is set', () => {
    expect(required('https://example.supabase.co', 'NEXT_PUBLIC_SUPABASE_URL')).toBe(
      'https://example.supabase.co',
    )
  })

  it('throws a message naming the missing variable', () => {
    expect(() => required(undefined, 'NEXT_PUBLIC_SUPABASE_URL')).toThrow(
      'Missing environment variable NEXT_PUBLIC_SUPABASE_URL. See .env.example.',
    )
  })

  it('treats an empty string as missing', () => {
    expect(() => required('', 'NEXT_PUBLIC_SUPABASE_URL')).toThrow('NEXT_PUBLIC_SUPABASE_URL')
  })
})
```

- [ ] **Step 5: Run it and confirm it fails**

Run: `npm test -- src/lib/env.test.ts`
Expected: FAIL, because `./env` can't be resolved.

- [ ] **Step 6: Implement**

`src/lib/env.ts`:

```ts
/**
 * Returns an environment variable's value, or throws if it is missing.
 * Pass `process.env.NAME` directly so Next.js can inline NEXT_PUBLIC_ values.
 */
export function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`)
  }
  return value
}
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `npm test -- src/lib/env.test.ts`
Expected: 3 passed.

- [ ] **Step 8: Format and commit**

```bash
npm run format
git add -A
git commit -m "chore: add Prettier, Vitest and env helper"
```

---

### Task 3: Brand guard test

This guard catches brand-rule breaches in code and seed copy that review might miss.

**Files:**
- Create: `tests/brand/guard.test.ts`

- [ ] **Step 1: Write the guard**

`tests/brand/guard.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function filesIn(dir: string, extensions: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return filesIn(path, extensions)
    return extensions.some((ext) => name.endsWith(ext)) ? [path] : []
  })
}

const sourceFiles = filesIn(join(root, 'src'), ['.ts', '.tsx']).filter(
  (path) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx') && !path.includes('types'),
)
const copyFiles = [...sourceFiles, join(root, 'supabase', 'seed.sql')]

function offenders(files: string[], pattern: RegExp): string[] {
  return files.flatMap((file) => {
    let text: string
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      return []
    }
    return text
      .split('\n')
      .flatMap((line, i) => (pattern.test(line) ? [`${relative(root, file)}:${i + 1}: ${line.trim()}`] : []))
  })
}

describe('brand guard', () => {
  it('uses no banned words (BRAND.md writing rules, p.17)', () => {
    const banned =
      /\b(mate|cheap|budget|unbreakable|indestructible|bulletproof|game-changer|revolutionary|next-level|send it|full send|yolo)\b/i
    expect(offenders(copyFiles, banned)).toEqual([])
  })

  it('never says "Australian made" (p.4)', () => {
    expect(offenders(copyFiles, /australian[\s-]+made/i)).toEqual([])
  })

  it('spells the brand name as two words (p.16)', () => {
    expect(offenders(copyFiles, /CarbonOffroad|Carbon Off[\s-]Road/)).toEqual([])
  })

  it('uses colour tokens, not raw hex values, in components', () => {
    expect(offenders(sourceFiles, /#[0-9a-fA-F]{3,8}\b/)).toEqual([])
  })

  it('uses no rounded corners (p.32, p.45)', () => {
    expect(offenders(sourceFiles, /\brounded(-[a-z0-9]+)?\b/)).toEqual([])
  })
})
```

- [ ] **Step 2: Run it**

Run: `npm test -- tests/brand`
Expected: the "no rounded corners" and "no raw hex" checks may FAIL on the scaffold's `src/app/page.tsx`. That's correct: it's the guard working. `seed.sql` doesn't exist yet and is skipped.

- [ ] **Step 3: Replace the scaffold home page with a temporary stub**

`src/app/page.tsx`:

```tsx
export default function HomePage() {
  return <h1>Carbon Offroad Academy</h1>
}
```

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: add brand guard for banned words, hex values and rounded corners"
```

---

### Task 4: Brand tokens and base styles (p.24–25, p.29, p.45)

**Files:**
- Modify (replace): `src/app/globals.css`

- [ ] **Step 1: Replace `src/app/globals.css`**

```css
@import 'tailwindcss';

/*
 * Carbon Offroad brand tokens. Source: docs/BRAND.md (guidelines p.24-29).
 * Default Tailwind colours, radii and fonts are removed so only brand values exist.
 */
@theme {
  --color-*: initial;
  --color-carbon-black: #111111;
  --color-white: #ffffff;
  --color-carbon-cyan: #00a4c7;
  --color-gunmetal: #303030;
  --color-concrete: #909090;
  --color-dust: #e6e6e6;
  --color-logo-black: #000000;
  --color-error-red: #c62828;

  --radius-*: initial;

  /* Arial only until licensed Eurostile web fonts are installed (BRAND.md Typography) */
  --font-*: initial;
  --font-sans: Arial, sans-serif;

  /* Web type scale (p.29). Mobile size first, -lg for md and up */
  --text-*: initial;
  --text-small: 0.875rem;
  --text-small--line-height: 1.5;
  --text-body: 1rem;
  --text-body--line-height: 1.5;
  --text-body-lg: 1.0625rem;
  --text-body-lg--line-height: 1.5;
  --text-button: 0.9375rem;
  --text-button--line-height: 1.2;
  --text-button--letter-spacing: 0.05em;
  --text-h3: 1.125rem;
  --text-h3--line-height: 1.25;
  --text-h3-lg: 1.375rem;
  --text-h3-lg--line-height: 1.25;
  --text-h2: 1.625rem;
  --text-h2--line-height: 1.15;
  --text-h2-lg: 2rem;
  --text-h2-lg--line-height: 1.15;
  --text-h1: 2rem;
  --text-h1--line-height: 1.1;
  --text-h1-lg: 3rem;
  --text-h1-lg--line-height: 1.1;
}

@layer base {
  html {
    background-color: var(--color-white);
    color: var(--color-carbon-black);
  }

  body {
    font-family: var(--font-sans);
    font-size: var(--text-body);
    line-height: 1.5;
  }

  /* H1 and H2 are uppercase (p.29). Typed in sentence case so screen readers read words, not letters */
  h1,
  h2 {
    font-weight: 700;
    text-transform: uppercase;
  }

  h3 {
    font-weight: 700;
  }

  /* Cyan on white fails 3:1 for focus indicators, so focus is black on light and white on dark */
  :focus-visible {
    outline: 2px solid var(--color-carbon-black);
    outline-offset: 2px;
  }

  [data-surface='dark'] :focus-visible {
    outline-color: var(--color-white);
  }
}

/* Links: text keeps its colour, underline is cyan (cyan text on white fails contrast, p.25) */
@utility link {
  text-decoration-line: underline;
  text-decoration-color: var(--color-carbon-cyan);
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;

  &:hover {
    text-decoration-thickness: 3px;
  }
}
```

- [ ] **Step 2: Check the build still passes**

Run: `npm run build`
Expected: success. Then run `npm test`. Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add brand colour, type and focus tokens"
```

---

### Task 5: Button (TDD)

Buttons: primary is cyan fill with Carbon Black uppercase text; secondary is a black outline; minimum height 44 px; square or angled only (p.45).
- Hover swaps to black with cyan text (6.4:1, p.25), so no cyan tint is needed.
- The angled variant is a parallelogram at the badge angle (p.32). The shape is drawn on a skewed `::before`, so the element's focus outline isn't clipped.

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Button.test.tsx`

- [ ] **Step 1: Write the failing tests**

`src/components/ui/Button.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Button, ButtonLink, buttonClasses } from './Button'

afterEach(cleanup)

const tokens = (classes: string) => classes.split(/\s+/)

describe('buttonClasses', () => {
  it('makes primary buttons cyan with black uppercase text, at least 44 px high', () => {
    const t = tokens(buttonClasses({ variant: 'primary' }))
    expect(t).toEqual(expect.arrayContaining(['bg-carbon-cyan', 'text-carbon-black', 'uppercase', 'min-h-11']))
  })

  it('makes secondary buttons a black outline with black text', () => {
    const t = tokens(buttonClasses({ variant: 'secondary' }))
    expect(t).toEqual(expect.arrayContaining(['border-2', 'border-carbon-black', 'text-carbon-black']))
  })

  it('uses white outline and text for secondary buttons on dark surfaces', () => {
    const t = tokens(buttonClasses({ variant: 'secondary', onDark: true }))
    expect(t).toEqual(expect.arrayContaining(['border-white', 'text-white']))
  })

  it('draws angled buttons as a parallelogram at the badge angle', () => {
    const t = tokens(buttonClasses({ variant: 'primary', shape: 'angled' }))
    expect(t).toEqual(expect.arrayContaining(['before:-skew-x-14', 'before:bg-carbon-cyan']))
    expect(t).not.toContain('bg-carbon-cyan')
  })
})

describe('Button and ButtonLink', () => {
  it('renders a button element with type="button" by default', () => {
    render(<Button>Take the quiz</Button>)
    expect(screen.getByRole('button', { name: 'Take the quiz' }).getAttribute('type')).toBe('button')
  })

  it('renders a link with the given href', () => {
    render(<ButtonLink href="/lessons">Browse lessons</ButtonLink>)
    expect(screen.getByRole('link', { name: 'Browse lessons' }).getAttribute('href')).toBe('/lessons')
  })
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npm test -- src/components/ui/Button.test.tsx`
Expected: FAIL, because `./Button` can't be resolved.

- [ ] **Step 3: Implement**

`src/components/ui/Button.tsx`:

```tsx
import Link from 'next/link'
import type { ComponentProps } from 'react'

type ButtonStyle = {
  variant?: 'primary' | 'secondary'
  /** Angled = parallelogram matching the logo badge (p.32). Never mix with other corner styles. */
  shape?: 'square' | 'angled'
  onDark?: boolean
}

const base =
  'relative isolate inline-flex min-h-11 items-center justify-center px-6 py-3 text-button font-bold uppercase transition-colors'

const square = {
  primary: 'bg-carbon-cyan text-carbon-black hover:bg-carbon-black hover:text-carbon-cyan',
  secondary: 'border-2 border-carbon-black text-carbon-black hover:bg-carbon-black hover:text-white',
  secondaryOnDark: 'border-2 border-white text-white hover:bg-white hover:text-carbon-black',
}

const angledBase = 'before:absolute before:inset-0 before:-z-10 before:-skew-x-14'

const angled = {
  primary:
    'before:bg-carbon-cyan text-carbon-black hover:before:bg-carbon-black hover:text-carbon-cyan',
  secondary:
    'before:border-2 before:border-carbon-black text-carbon-black hover:before:bg-carbon-black hover:text-white',
  secondaryOnDark:
    'before:border-2 before:border-white text-white hover:before:bg-white hover:text-carbon-black',
}

export function buttonClasses({ variant = 'primary', shape = 'square', onDark = false }: ButtonStyle = {}) {
  const key = variant === 'secondary' && onDark ? 'secondaryOnDark' : variant
  return shape === 'angled'
    ? `${base} ${angledBase} ${angled[key]}`
    : `${base} ${square[key]}`
}

type ButtonProps = ButtonStyle & Omit<ComponentProps<'button'>, 'className'>

export function Button({ variant, shape, onDark, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, shape, onDark })} {...props} />
}

type ButtonLinkProps = ButtonStyle & Omit<ComponentProps<typeof Link>, 'className'>

export function ButtonLink({ variant, shape, onDark, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, shape, onDark })} {...props} />
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- src/components/ui/Button.test.tsx`
Expected: 6 passed. Then run `npm test`. Expected: all pass, including the brand guard.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Button.tsx src/components/ui/Button.test.tsx
git commit -m "feat: add brand Button and ButtonLink"
```

---

### Task 6: Layout primitives

**Files:**
- Create: `src/components/ui/Container.tsx`, `src/components/ui/Slash.tsx`, `src/components/ui/SectionHeader.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/Badge.tsx`

These are presentational only, with no logic to unit-test. The brand guard covers them, and Task 13 checks them visually.

- [ ] **Step 1: Container**

`src/components/ui/Container.tsx`:

```tsx
import type { ReactNode } from 'react'

/** Page-width wrapper. 16 px side gutter on phones, 24 px from md. */
export function Container({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 md:px-6 ${className}`}>{children}</div>
}
```

- [ ] **Step 2: Slash**

`src/components/ui/Slash.tsx`:

```tsx
/**
 * The brand slash (p.32): leans like the logo badge (76 degrees, skewX(-14deg)).
 * Double = cyan + black (cyan + white on dark), gap = half a bar width.
 * One slash motif per screen. Never behind or through the logo. The parent sets the height.
 */
export function Slash({
  double = false,
  onDark = false,
  className = '',
}: {
  double?: boolean
  onDark?: boolean
  className?: string
}) {
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 gap-1 ${className}`}>
      <span className="block w-2 -skew-x-14 bg-carbon-cyan" />
      {double && (
        <span className={`block w-2 -skew-x-14 ${onDark ? 'bg-white' : 'bg-carbon-black'}`} />
      )}
    </span>
  )
}
```

- [ ] **Step 3: SectionHeader**

`src/components/ui/SectionHeader.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Slash } from './Slash'

const sizes = {
  h1: 'text-h1 md:text-h1-lg',
  h2: 'text-h2 md:text-h2-lg',
}

export function SectionHeader({
  as: Heading = 'h2',
  title,
  intro,
  slash = false,
}: {
  as?: 'h1' | 'h2'
  title: string
  intro?: ReactNode
  /** Only one slash motif per screen (p.32) */
  slash?: boolean
}) {
  return (
    <div className="flex items-stretch gap-4">
      {slash && <Slash className="min-h-8" />}
      <div>
        <Heading className={sizes[Heading]}>{title}</Heading>
        {intro && <p className="mt-2 max-w-prose">{intro}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Card**

`src/components/ui/Card.tsx`:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'

const card = 'block h-full border-2 border-dust bg-white p-5'

export function Card({ href, children }: { href?: string; children: ReactNode }) {
  if (href) {
    return (
      <Link href={href} className={`${card} transition-colors hover:border-carbon-black`}>
        {children}
      </Link>
    )
  }
  return <div className={card}>{children}</div>
}
```

- [ ] **Step 5: Badge**

`src/components/ui/Badge.tsx`:

```tsx
import type { ReactNode } from 'react'

/** Small label. Cyan is allowed for badges (p.45); black on cyan is 6.4:1 (p.25). */
const tones = {
  accent: 'bg-carbon-cyan text-carbon-black',
  neutral: 'bg-dust text-carbon-black',
  dark: 'bg-carbon-black text-white',
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: keyof typeof tones
  children: ReactNode
}) {
  return (
    <span className={`inline-block px-2 py-0.5 text-small font-bold uppercase ${tones[tone]}`}>
      {children}
    </span>
  )
}
```

- [ ] **Step 6: Check and commit**

Run: `npm run typecheck && npm test`
Expected: no type errors; all tests pass.

```bash
git add src/components/ui
git commit -m "feat: add Container, Slash, SectionHeader, Card and Badge"
```

---

### Task 7: Site header, footer, layout, 404 and error pages (p.21, p.45, p.48)

**Files:**
- Create: `src/components/layout/SiteHeader.tsx`, `src/components/layout/SiteFooter.tsx`, `src/app/not-found.tsx`, `src/app/error.tsx`
- Modify (replace): `src/app/layout.tsx`

- [ ] **Step 1: SiteHeader**

The full logo, black on transparent on a white header, top left, linked to home (p.21, p.45). It's 144 px wide on phones and 180 px from md, above the 120 px minimum. Padding keeps clear space X.

`src/components/layout/SiteHeader.tsx`:

```tsx
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'

const navLinks = [
  { href: '/lessons', label: 'Lessons' },
  { href: '/certified', label: 'Get certified' },
  { href: '/sign-in', label: 'Sign in' },
]

export function SiteHeader() {
  return (
    <header className="border-b-2 border-dust bg-white">
      <Container className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-3">
        <Link href="/" className="shrink-0 p-1">
          <Image
            src="/brand/logo-full-black-transparent.svg"
            alt="Carbon Offroad Academy home"
            width={180}
            height={51}
            className="h-auto w-36 md:w-45"
            unoptimized
            priority
          />
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-block py-3 font-bold hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </header>
  )
}
```

- [ ] **Step 2: SiteFooter**

A Gunmetal footer with white text (13.2:1, p.25). The company details line is from p.48.

`src/components/layout/SiteFooter.tsx`:

```tsx
import Link from 'next/link'
import { Container } from '@/components/ui/Container'

export function SiteFooter() {
  return (
    <footer data-surface="dark" className="bg-gunmetal text-white">
      <Container className="flex flex-col gap-4 py-8 text-small md:flex-row md:items-center md:justify-between">
        <p>
          Carbon Offroad | KPD Industries Pty Ltd | ABN 80 142 983 382 |{' '}
          <a className="link" href="tel:1300780141">
            1300 780 141
          </a>{' '}
          |{' '}
          <a className="link" href="https://carbonoffroad.com.au">
            carbonoffroad.com.au
          </a>
        </p>
        <nav aria-label="Footer">
          <Link className="link" href="/privacy">
            Privacy policy
          </Link>
        </nav>
      </Container>
    </footer>
  )
}
```

- [ ] **Step 3: Root layout**

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Carbon Offroad Academy',
    template: '%s | Carbon Offroad Academy',
  },
  description:
    'Product training from Carbon Offroad. Short videos on fitting, using and looking after your gear.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-AU">
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only bg-carbon-cyan px-4 py-3 font-bold text-carbon-black focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: 404 page**

`src/app/not-found.tsx`:

```tsx
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

export default function NotFound() {
  return (
    <Container className="py-16">
      <h1 className="text-h1 md:text-h1-lg">Page not found</h1>
      <p className="mt-4 max-w-prose">That page doesn&apos;t exist yet, or it&apos;s moved.</p>
      <div className="mt-8">
        <ButtonLink href="/">Back to home</ButtonLink>
      </div>
    </Container>
  )
}
```

- [ ] **Step 5: Error boundary**

The copy is from BRAND.md Voice and microcopy.

`src/app/error.tsx`:

```tsx
'use client'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Container className="py-16">
      <h1 className="text-h1 md:text-h1-lg">Something went wrong</h1>
      <p className="mt-4 max-w-prose">
        Something went wrong on our end. Give it another go in a minute.
      </p>
      <div className="mt-8">
        <Button onClick={reset}>Try again</Button>
      </div>
    </Container>
  )
}
```

- [ ] **Step 6: Check and commit**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all pass.

```bash
git add -A
git commit -m "feat: add branded header, footer, 404 and error pages"
```

---

### Task 8: Supabase local stack and the RLS tests (TDD: tests first)

New dev dependency: **supabase**, the Supabase CLI as an npm package, so nobody installs it globally.
New dependency: **@supabase/supabase-js**, the official client, used by the app and the tests.

**Files:**
- Create: `supabase/config.toml` (from `supabase init`), `vitest.db.config.mts`, `tests/db/rls.test.ts`, `.env.test.local` (git-ignored, never committed)

- [ ] **Step 1: Install**

Run: `npm install @supabase/supabase-js` and `npm install -D supabase`

- [ ] **Step 2: Initialise and start**

Run: `npx supabase init`. Say **No** to the VS Code and Deno settings prompts.
Run: `npm run db:start`
Expected: the first run downloads images, then prints the API URL `http://127.0.0.1:54321` plus a publishable (or anon) key and a secret (or service_role) key.

- [ ] **Step 3: Store the local keys for tests**

Create `.env.test.local`. It's git-ignored by `.env.*`. These are local stack keys only.

```
SUPABASE_TEST_URL=http://127.0.0.1:54321
SUPABASE_TEST_PUBLISHABLE_KEY=<"Publishable key" or "anon key" from npx supabase status>
SUPABASE_TEST_SECRET_KEY=<"Secret key" or "service_role key" from npx supabase status>
```

- [ ] **Step 4: Add the DB test config**

`vitest.db.config.mts`:

```ts
import { defineConfig } from 'vitest/config'

try {
  process.loadEnvFile('.env.test.local')
} catch {
  throw new Error('Create .env.test.local with the local Supabase keys (see docs/superpowers/plans, Task 8).')
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    testTimeout: 20_000,
    fileParallelism: false,
  },
})
```

- [ ] **Step 5: Write the failing RLS tests**

`tests/db/rls.test.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

function localEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is missing from .env.test.local`)
  return value
}

const url = localEnv('SUPABASE_TEST_URL')
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  throw new Error('RLS tests only run against the local Supabase stack, never a hosted project')
}

const options = { auth: { persistSession: false } }
const admin = createClient(url, localEnv('SUPABASE_TEST_SECRET_KEY'), options)
const publicClient = createClient(url, localEnv('SUPABASE_TEST_PUBLISHABLE_KEY'), options)

let draftLessonId: string | undefined

beforeAll(async () => {
  const { data: category, error: categoryError } = await admin
    .from('categories')
    .select('id')
    .eq('slug', 'winches')
    .single()
  if (categoryError) throw categoryError

  const { data, error } = await admin
    .from('lessons')
    .insert({
      category_id: category.id,
      slug: 'rls-test-draft',
      title: '[TEST] Draft lesson',
      published: false,
    })
    .select('id')
    .single()
  if (error) throw error
  draftLessonId = data.id
})

afterAll(async () => {
  if (draftLessonId) await admin.from('lessons').delete().eq('id', draftLessonId)
})

describe('lessons', () => {
  it('hides unpublished lessons from the publishable key', async () => {
    const { data, error } = await publicClient.from('lessons').select('id').eq('id', draftLessonId!)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('shows published lessons to the publishable key', async () => {
    const { data, error } = await publicClient
      .from('lessons')
      .select('slug')
      .eq('slug', 'scout-pro-10k-v3')
    expect(error).toBeNull()
    expect(data).toEqual([{ slug: 'scout-pro-10k-v3' }])
  })

  it('leaves unpublished lessons out of embedded counts', async () => {
    const { data, error } = await publicClient
      .from('categories')
      .select('slug, lessons(count)')
      .eq('slug', 'winches')
      .single()
    expect(error).toBeNull()
    expect(data?.lessons).toEqual([{ count: 7 }])
  })
})

describe('seed', () => {
  it('has 5 categories and 15 published placeholder lessons', async () => {
    const categories = await publicClient.from('categories').select('slug')
    const lessons = await publicClient.from('lessons').select('slug, is_core')
    expect(categories.data).toHaveLength(5)
    expect(lessons.data).toHaveLength(15)
    expect(lessons.data?.filter((lesson) => lesson.is_core)).toHaveLength(9)
  })
})

describe('write protection for the publishable key', () => {
  it('cannot insert categories', async () => {
    const { error } = await publicClient.from('categories').insert({ slug: 'rls-test', name: 'RLS test' })
    expect(error).not.toBeNull()
  })

  it('cannot update lessons', async () => {
    const { error } = await publicClient
      .from('lessons')
      .update({ title: 'Changed' })
      .eq('slug', 'scout-pro-10k-v3')
    expect(error).not.toBeNull()
  })

  it('cannot change settings', async () => {
    const { error } = await publicClient
      .from('settings')
      .update({ value: 0 })
      .eq('key', 'pass_mark_percent')
    expect(error).not.toBeNull()
  })

  it('can read settings', async () => {
    const { data, error } = await publicClient
      .from('settings')
      .select('value')
      .eq('key', 'store_certification_threshold')
      .single()
    expect(error).toBeNull()
    expect(data?.value).toBe(2)
  })
})
```

- [ ] **Step 6: Run them and confirm they fail**

Run: `npm run test:db`
Expected: FAIL in `beforeAll`, because relation `public.categories` doesn't exist.

- [ ] **Step 7: Commit the failing tests**

```bash
git add supabase vitest.db.config.mts tests/db package.json package-lock.json
git status --short   # confirm .env.test.local is NOT listed
git commit -m "test: add RLS tests for content tables (failing until migration)"
```

---

### Task 9: Content schema migration and seed

**Files:**
- Create: `supabase/migrations/<timestamp>_foundation_content_schema.sql`, `supabase/seed.sql`
- Create (generated): `src/types/database.ts`

- [ ] **Step 1: Create the migration file**

Run: `npx supabase migration new foundation_content_schema`
Expected: `Created new migration at supabase/migrations/<timestamp>_foundation_content_schema.sql`

- [ ] **Step 2: Write the migration**

Replace the file's contents with:

```sql
-- Phase 1: content schema (PRD section 6.1 and 8).
-- RLS: everyone can read categories, published lessons and settings. Nobody can write
-- with the publishable key. Admin writes come in Phase 6 through server actions.

create type public.region as enum ('AU', 'US', 'ALL');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text,
  product_name text,
  vimeo_id text,
  duration_seconds integer check (duration_seconds > 0),
  is_core boolean not null default false,
  region public.region not null default 'AU',
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (category_id, slug)
);

create index lessons_category_id_idx on public.lessons (category_id);

-- Never store secrets here: settings are publicly readable.
create table public.settings (
  key text primary key,
  value jsonb not null,
  description text not null,
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.lessons enable row level security;
alter table public.settings enable row level security;

revoke insert, update, delete, truncate on public.categories, public.lessons, public.settings
  from anon, authenticated;
grant select on public.categories, public.lessons, public.settings to anon, authenticated;

create policy "Categories are readable by everyone"
  on public.categories for select to anon, authenticated
  using (true);

create policy "Published lessons are readable by everyone"
  on public.lessons for select to anon, authenticated
  using (published);

create policy "Settings are readable by everyone"
  on public.settings for select to anon, authenticated
  using (true);

-- Defaults from PRD section 11 (D2, D3, D4, D8). Company address from guidelines p.69.
insert into public.settings (key, value, description) values
  ('pass_mark_percent', '100', 'Quiz pass mark as a percentage (D4: all questions correct)'),
  ('store_certification_threshold', '2', 'Staff with active certificates needed for a Carbon Certified Store (D2)'),
  ('certificate_validity_months', '12', 'Months a certificate stays active (D3)'),
  ('quiz_attempts_per_hour', '10', 'Quiz attempts allowed per lesson per hour'),
  ('warranty_registration_url', 'null', 'Warranty registration page (D8, to be confirmed)'),
  ('company_address', '"Unit 1a, 1 Waterway Drive, Coomera QLD 4209"', 'Head office address for email footers. Moves to 11 Blanck Street, Ormeau QLD 4208 in February 2027');
```

- [ ] **Step 3: Write the seed**

The titles and product names come from PRD section 9. **Rich checks the product names against carbonoffroad.com.au before Task 12.** There are no specs and no video IDs.

`supabase/seed.sql`:

```sql
-- Local and launch placeholder content. Remove every [PLACEHOLDER] before launch (Phase 7).
insert into public.categories (slug, name, sort_order) values
  ('recovery-basics', 'Recovery basics', 1),
  ('winches', 'Winches', 2),
  ('ropes', 'Ropes', 3),
  ('recovery-gear', 'Recovery gear', 4),
  ('parts-and-accessories', 'Parts and accessories', 5);

insert into public.lessons (category_id, slug, title, product_name, summary, is_core, sort_order, published)
select c.id, l.slug, l.title, l.product_name, '[PLACEHOLDER] Summary to come.', l.is_core, l.sort_order, true
from (values
  ('recovery-basics', 'winch-safety-and-recovery-fundamentals', 'Winch safety and recovery fundamentals', null, true, 1),
  ('recovery-basics', 'winch-maintenance-and-servicing', 'Winch maintenance and servicing', null, true, 2),
  ('winches', 'carbon-12k-v3x', 'Carbon 12K V3X', 'Carbon 12K V3X', true, 1),
  ('winches', 'scout-pro-10k-v3', 'Scout Pro 10K V3', 'Scout Pro 10K V3', true, 2),
  ('winches', 'scout-pro-15k-v3', 'Scout Pro 15K V3', 'Scout Pro 15K V3', true, 3),
  ('winches', 'rs9-series', 'RS9 series', 'RS9', true, 4),
  ('winches', 'scout-pro-20k', 'Scout Pro 20K (12 V / 24 V)', 'Scout Pro 20K', false, 5),
  ('winches', '48v-brushless-range', '48 V brushless range', null, false, 6),
  ('winches', 'sxs-and-atv-winches', 'SXS and ATV winches (3K, 6K, 6K Long Drum)', null, false, 7),
  ('ropes', 'synthetic-winch-rope-care-and-inspection', 'Synthetic winch rope: care and inspection', null, true, 1),
  ('ropes', 'replacing-and-spooling-winch-rope', 'Replacing and spooling winch rope', null, false, 2),
  ('ropes', 'kinetic-recovery-ropes', 'Kinetic recovery ropes', null, true, 3),
  ('recovery-gear', 'soft-shackles', 'Soft shackles', null, true, 1),
  ('recovery-gear', 'megapro-hook', 'MegaPro hook', 'MegaPro hook', false, 2),
  ('parts-and-accessories', 'remotes-and-control-boxes', 'Remotes and control boxes', null, false, 1)
) as l (category_slug, slug, title, product_name, is_core, sort_order)
join public.categories c on c.slug = l.category_slug;
```

The test expectations come from this list: 9 core lessons and 7 winches.

- [ ] **Step 4: Apply it to a fresh local database**

Run: `npm run db:reset`
Expected: `Applying migration <timestamp>_foundation_content_schema.sql...`, then `Seeding data from supabase/seed.sql...`, then `Finished supabase db reset`.

- [ ] **Step 5: Run the RLS tests and confirm they pass**

Run: `npm run test:db`
Expected: 8 passed.

- [ ] **Step 6: Generate the TypeScript types**

Run: `npm run db:types`
Expected: `src/types/database.ts` now contains `categories`, `lessons`, `settings` and the `region` enum.

- [ ] **Step 7: Run everything and commit**

Run: `npm run lint && npm run typecheck && npm test`
Expected: all pass. The brand guard now also scans `seed.sql`.

```bash
git add supabase src/types/database.ts
git commit -m "feat: add content schema with RLS, settings defaults and placeholder seed"
```

---

### Task 10: Home page reading from Supabase (TDD for the data mapping)

The pure mapping functions live in their own file, so unit tests never import the server-only Supabase client.

New dependency: **server-only**, a zero-code marker package from the React team. The build fails if a file that imports it ends up in browser code. It guards the Supabase client.

**Files:**
- Create: `src/lib/supabase/public.ts`, `src/lib/content/category-summary.ts`, `src/lib/content/category-summary.test.ts`, `src/lib/content/categories.ts`
- Modify (replace): `src/app/page.tsx`
- Create (git-ignored): `.env.local`

- [ ] **Step 1: Write the failing tests**

`src/lib/content/category-summary.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatLessonCount, toCategorySummaries } from './category-summary'

describe('toCategorySummaries', () => {
  it('maps embedded lesson counts and keeps order', () => {
    expect(
      toCategorySummaries([
        { slug: 'recovery-basics', name: 'Recovery basics', lessons: [{ count: 2 }] },
        { slug: 'winches', name: 'Winches', lessons: [{ count: 7 }] },
      ]),
    ).toEqual([
      { slug: 'recovery-basics', name: 'Recovery basics', lessonCount: 2 },
      { slug: 'winches', name: 'Winches', lessonCount: 7 },
    ])
  })

  it('treats a missing count as zero', () => {
    expect(toCategorySummaries([{ slug: 'ropes', name: 'Ropes', lessons: [] }])).toEqual([
      { slug: 'ropes', name: 'Ropes', lessonCount: 0 },
    ])
  })
})

describe('formatLessonCount', () => {
  it('uses figures and the right plural', () => {
    expect(formatLessonCount(0)).toBe('0 lessons')
    expect(formatLessonCount(1)).toBe('1 lesson')
    expect(formatLessonCount(7)).toBe('7 lessons')
  })
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npm test -- src/lib/content`
Expected: FAIL, because `./category-summary` can't be resolved.

- [ ] **Step 3: Implement the mapping**

`src/lib/content/category-summary.ts`:

```ts
export type CategorySummary = { slug: string; name: string; lessonCount: number }

export type CategoryRow = { slug: string; name: string; lessons: { count: number }[] }

export function toCategorySummaries(rows: CategoryRow[]): CategorySummary[] {
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    lessonCount: row.lessons[0]?.count ?? 0,
  }))
}

export function formatLessonCount(count: number): string {
  return `${count} ${count === 1 ? 'lesson' : 'lessons'}`
}
```

Run: `npm test -- src/lib/content`
Expected: 3 passed.

- [ ] **Step 4: Add the public Supabase client**

Run: `npm install server-only`

`src/lib/supabase/public.ts`:

```ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { required } from '@/lib/env'
import type { Database } from '@/types/database'

/** Read-only, anonymous access to public content. RLS decides what is visible. */
export function createPublicClient() {
  return createClient<Database>(
    required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    required(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { persistSession: false } },
  )
}
```

- [ ] **Step 5: Implement the categories query**

`src/lib/content/categories.ts`:

```ts
import 'server-only'
import { createPublicClient } from '@/lib/supabase/public'
import { type CategorySummary, toCategorySummaries } from './category-summary'

/** Categories in display order, with counts of published lessons only (RLS). */
export async function getCategorySummaries(): Promise<CategorySummary[]> {
  const { data, error } = await createPublicClient()
    .from('categories')
    .select('slug, name, lessons(count)')
    .order('sort_order')
  if (error) throw new Error(`Could not load categories: ${error.message}`)
  return toCategorySummaries(data)
}
```

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Write the home page**

The copy is a **draft for Rich's approval** (p.69). There's one H1, one action, and one slash on the screen (p.32, p.33). The concrete hero comes in Phase 2.

`src/app/page.tsx`:

```tsx
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { getCategorySummaries } from '@/lib/content/categories'
import { formatLessonCount } from '@/lib/content/category-summary'

export const revalidate = 60

export default async function HomePage() {
  const categories = await getCategorySummaries()

  return (
    <>
      <section>
        <Container className="py-12 md:py-20">
          <h1 className="max-w-3xl text-h1 md:text-h1-lg">Carbon Offroad Academy</h1>
          <p className="mt-4 max-w-prose md:text-body-lg">
            Short videos on fitting, using and looking after your Carbon Offroad gear. Watch for
            free. Store staff who pass the core lesson quizzes become Carbon Certified.
          </p>
          <div className="mt-8">
            <ButtonLink href="/lessons">Browse lessons</ButtonLink>
          </div>
        </Container>
      </section>

      <section className="bg-dust">
        <Container className="py-12 md:py-16">
          <SectionHeader title="Lesson categories" slash />
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
    </>
  )
}
```

- [ ] **Step 7: Point the dev server at the local stack**

Create `.env.local` (git-ignored):

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<same publishable key as .env.test.local>
```

Run: `npm run dev`, then open http://localhost:3000.
Expected: the header logo, the hero, five category cards (Recovery basics 2 lessons, Winches 7, Ropes 3, Recovery gear 2, Parts and accessories 1), and the footer.

- [ ] **Step 8: Run everything and commit**

Run: `npm run lint && npm run typecheck && npm test && npm run test:db && npm run build`
Expected: all pass.

```bash
git add -A
git commit -m "feat: home page lists lesson categories from Supabase"
```

---

### Task 10A: Security baseline (framework controls 10, 11, 13, 14, 22; section 4)

**Files:**
- Create: `src/config/security-headers.ts`, `src/config/security-headers.test.ts`, `scripts/check-client-bundle.mjs`, `public/.well-known/security.txt`, `.github/dependabot.yml`, `.github/workflows/ci.yml`
- Modify (replace): `next.config.ts`

- [ ] **Step 1: Write the failing header tests**

`src/config/security-headers.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, securityHeaders } from './security-headers'

const header = (name: string, dev = false) =>
  securityHeaders(dev).find((h) => h.key === name)?.value

describe('securityHeaders (control 11)', () => {
  it('sets every baseline header', () => {
    expect(securityHeaders(false).map((h) => h.key)).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy-Report-Only',
        'Strict-Transport-Security',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'X-Frame-Options',
        'Permissions-Policy',
      ]),
    )
  })

  it('uses the framework values', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff')
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(header('X-Frame-Options')).toBe('DENY')
  })

  it('applies HSTS without includeSubDomains until the domain is confirmed (control 01)', () => {
    expect(header('Strict-Transport-Security')).toBe('max-age=31536000')
  })
})

describe('contentSecurityPolicy', () => {
  it('locks down objects, base URI, forms and framing', () => {
    const csp = contentSecurityPolicy(false)
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("default-src 'self'")
  })

  it("never allows 'unsafe-eval' in production", () => {
    expect(contentSecurityPolicy(false)).not.toContain('unsafe-eval')
  })

  it("allows 'unsafe-eval' only in development, for fast refresh", () => {
    expect(contentSecurityPolicy(true)).toContain("'unsafe-eval'")
  })
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npm test -- src/config`
Expected: FAIL, because `./security-headers` can't be resolved.

- [ ] **Step 3: Implement**

`src/config/security-headers.ts`:

```ts
/**
 * Baseline browser security headers (ITWM framework control 11, section 4).
 * Public pages use an allowlist CSP in Report-Only mode. Authenticated areas get a
 * nonce-based CSP in Phase 3. X-Frame-Options enforces the framing block while the
 * CSP is report-only.
 */
export function contentSecurityPolicy(dev: boolean): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...(dev ? ['ws:'] : [])],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  }
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ')
}

export function securityHeaders(dev: boolean) {
  return [
    { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy(dev) },
    { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    },
  ]
}
```

Run: `npm test -- src/config`
Expected: 6 passed.

- [ ] **Step 4: Apply them in `next.config.ts`**

Replace `next.config.ts`:

```ts
import type { NextConfig } from 'next'
import { securityHeaders } from './src/config/security-headers'

// Framework section 4, "Build and release configuration"
const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders(process.env.NODE_ENV === 'development'),
      },
    ]
  },
}

export default nextConfig
```

Run: `npm run build`, then `npm run start`. In another shell, run `curl -sI http://localhost:3000`.
Expected: all six headers are present, and there's no `X-Powered-By` header. Stop the server.

- [ ] **Step 5: Add the client-bundle secret scan (control 10 verification)**

`scripts/check-client-bundle.mjs`:

```js
// Fails the build if a server-only secret appears in browser JavaScript (framework control 10).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const serverOnlyNames = ['SUPABASE_SECRET_KEY', 'VIMEO_ACCESS_TOKEN']
const needles = [
  ...serverOnlyNames.map((name) => process.env[name]).filter((value) => value && value.length >= 12),
  'sb_secret_',
]

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

const hits = files('.next/static').filter((file) => {
  const text = readFileSync(file, 'utf8')
  return needles.some((needle) => text.includes(needle))
})

if (hits.length > 0) {
  console.error('Server secret found in client bundle:\n' + hits.join('\n'))
  process.exit(1)
}
console.log(`No server secrets found in ${files('.next/static').length} client files.`)
```

Add to `package.json` scripts: `"check:bundle": "node scripts/check-client-bundle.mjs"`.
Run: `npm run check:bundle`
Expected: `No server secrets found in <n> client files.`

- [ ] **Step 6: Add `security.txt` (control 22, RFC 9116)**

`public/.well-known/security.txt`:

```
Contact: mailto:security@carbonoffroad.com.au
Expires: 2027-10-28T23:59:59.000Z
Preferred-Languages: en
Canonical: https://academy.carbonoffroad.com.au/.well-known/security.txt
Canonical: https://carbonoffroadacademy.netlify.app/.well-known/security.txt
```

Renew `Expires` before it lapses. Add a reminder to the maintenance calendar.

- [ ] **Step 7: Add Dependabot (control 13)**

`.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
    groups:
      minor-and-patch:
        update-types: [minor, patch]
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] **Step 8: Add CI (control 13)**

Actions are pinned to commit SHAs of releases at least two weeks old (checked 29 October 2026). Default permissions are read-only.

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - name: Dependency audit (production, high and above)
        run: npm audit --omit=dev --audit-level=high
      - name: Dependency audit (all, critical)
        run: npm audit --audit-level=critical

  database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npx supabase start
      - name: Write local test keys
        run: |
          npx supabase status -o env > supabase.env
          set -a; . ./supabase.env; set +a
          {
            echo "SUPABASE_TEST_URL=$API_URL"
            echo "SUPABASE_TEST_PUBLISHABLE_KEY=$ANON_KEY"
            echo "SUPABASE_TEST_SECRET_KEY=$SERVICE_ROLE_KEY"
          } > .env.test.local
      - run: npm run test:db

  secrets:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: gitleaks/gitleaks-action@e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e # v3.0.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Free licence key, needed only once the repo is owned by a GitHub organisation
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}

  codeql:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: github/codeql-action/init@24c54180a607b1449ed407dd24f251e4e9147c8d # v4.38.3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@24c54180a607b1449ed407dd24f251e4e9147c8d # v4.38.3
```

If the repo goes private without GitHub Code Security (decision S8), replace the `codeql` job with Semgrep Community Edition before merging.

- [ ] **Step 9: Run everything and commit**

Run: `npm run lint && npm run typecheck && npm test`
Expected: all pass.

```bash
git add -A
git commit -m "feat(security): add headers, security.txt, bundle secret scan, Dependabot and CI"
```

---

### Task 11: Netlify config and docs

**Files:**
- Create: `netlify.toml`
- Modify: `README.md` (Getting started), `CLAUDE.md` (Commands), `docs/BUILD_PLAN.md` (Status)

- [ ] **Step 1: Netlify config**

`netlify.toml`:

```toml
[build]
  command = "npm run build && npm run check:bundle"
  publish = ".next"
```

Netlify detects Next.js and applies its adapter. The Node version comes from `.nvmrc`. The bundle check runs on Netlify, where the real server-only values exist, so it can look for them exactly (control 10).

- [ ] **Step 2: README "Getting started"**

Replace the "Getting started" section of `README.md` with:

````markdown
## Getting started

Needs Node.js LTS (version in `.nvmrc`) and Docker Desktop running.

```bash
npm install
npm run db:start          # local Supabase; prints the local keys
npm run db:reset          # apply migrations and seed
```

1. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and the local publishable key.
2. Create `.env.test.local` with `SUPABASE_TEST_URL`, `SUPABASE_TEST_PUBLISHABLE_KEY` and `SUPABASE_TEST_SECRET_KEY`, all from `npx supabase status`.
3. `npm run dev` and open http://localhost:3000.

Before calling anything done: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:db`, then check the page at 375 px and 1280 px.
````

- [ ] **Step 3: CLAUDE.md "Commands"**

Replace the code block under `## Commands` in `CLAUDE.md` with:

```
npm run dev          # local dev server (http://localhost:3000)
npm run build        # production build
npm run lint
npm run typecheck
npm test             # unit and brand guard tests
npm run test:db      # RLS tests, local Supabase only
npm run db:start     # start the local Supabase stack (needs Docker)
npm run db:reset     # re-apply migrations and seed locally
npm run db:types     # regenerate src/types/database.ts after every migration
npx supabase db push # apply migrations to the linked hosted project (ask Rich first)
```

Also delete the line `Fill in once scaffolded:`.

- [ ] **Step 4: Commit**

```bash
git add netlify.toml README.md CLAUDE.md
git commit -m "docs: add setup steps, commands and Netlify config"
```

---

### Task 12: Hosted database and deploy preview (checkpoint: needs Rich's go-ahead)

**Stop and confirm with Rich before Step 3:** it changes hosted Supabase projects.

Deploy previews use the **staging** project, never production (control 14, section 4). The production project is only migrated just before the PR merges (Step 8).

- [ ] **Step 1: Rich confirms the product names in `supabase/seed.sql`** against carbonoffroad.com.au. Fix any names that differ, rerun `npm run db:reset && npm run test:db`, and commit.

- [ ] **Step 2: Create the staging project** (decision S4; Rich, in the Supabase dashboard of the Carbon Offroad organisation)

- Name: `Carbon-Academy-Staging`
- Region: Sydney (ap-southeast-2)
- Plan: Free
- Database password: generated and stored in the password manager (control 17)

Record its project ref in `docs/BUILD_PLAN.md` Phase 0.

- [ ] **Step 3: Link and push to staging** (Rich runs this in a terminal tab and types the database password himself)

```bash
npx supabase login
npx supabase link --project-ref <staging project ref>
npx supabase db push --include-seed
```

Expected: `Applying migration <timestamp>_foundation_content_schema.sql...`, then `Seeding data...`, then `Finished supabase db push.`

- [ ] **Step 4: Verify the hosted RLS on staging**

Use the Supabase MCP `execute_sql` (read-only) on the staging project:

```sql
select relname, relrowsecurity from pg_class
where relname in ('categories', 'lessons', 'settings') and relnamespace = 'public'::regnamespace;
select count(*) filter (where published) as published, count(*) as total from public.lessons;
```

Expected: `relrowsecurity = true` for all three tables, and `published = 15, total = 15`. Also run the Supabase security advisor (`get_advisors`, type `security`). Expected: no RLS warnings for these tables.

- [ ] **Step 5: Netlify environment variables, scoped by deploy context** (control 10; Rich sets them in the Netlify UI, or approves setting them through the Netlify MCP)

| Variable | Production context | Deploy previews and branch deploys |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://carbonoffroadacademy.netlify.app` | `https://carbonoffroadacademy.netlify.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ljxjzvpdaeolytxakpog.supabase.co` | the staging project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the production publishable key | the staging publishable key |

No secret key is needed in Phase 1, so none is set in any context.

- [ ] **Step 6: Protect non-production deploys** (control 14; decision S5)

Netlify: Site configuration → Access and security → Password protection, applied to non-production deploys only. Store the password in the password manager.

- [ ] **Step 7: Push the branch, open the PR and protect `main`** (control 13)

```bash
git push -u origin phase-1-foundation
```

Open https://github.com/rich3524-cyber/Carbon-Academy/compare/main...phase-1-foundation and create the PR "Phase 1: Foundation". The description lists the framework controls touched, with evidence links.

Expected:
- CI shows `checks`, `database`, `secrets` and `codeql` all green.
- Netlify comments with a password-protected deploy preview URL.

Rich then adds the branch protection rule for `main` (GitHub → Settings → Branches):
- Require a pull request before merging, with 1 approval.
- Require the status checks `checks`, `database`, `secrets` and `codeql`.
- Block force pushes and deletions.

Also turn on Dependabot alerts and security updates (Settings → Code security). If decision S7 isn't in place yet, record the missing independent approval as a time-limited exception in `docs/security/EVIDENCE.md`, with Rich's written approval (section 1).

- [ ] **Step 8: Migrate production, then merge** (only after the PR is approved)

```bash
npx supabase link --project-ref ljxjzvpdaeolytxakpog
npx supabase db push --include-seed
```

Repeat the Step 4 checks on project `ljxjzvpdaeolytxakpog`, then merge the PR. Netlify deploys `main` to production.

---

### Task 13: Verification and brand check

- [ ] **Step 1: Run all the checks**

Run: `npm run lint && npm run typecheck && npm test && npm run test:db && npm run build`
Expected: all pass.

- [ ] **Step 2: Check the layout at 375 px and 1280 px** on the deploy preview, in the browser pane

At both widths, check:
- No horizontal scroll.
- The logo is at least 144 px wide (mobile) and 180 px (desktop), with visible clear space.
- The nav wraps under the logo on mobile.
- Each category card is fully tappable.
- The footer text wraps cleanly.
- Keyboard: Tab shows the skip link first, then a visible focus ring on every link and button, black on light and white on the footer.

- [ ] **Step 3: Brand check against the guidelines PDF** (CLAUDE.md rule)

Render and read the PDF pages again, then confirm each item:
- p.21–22, logo: master SVG, top left, black on white, at least 120 px, clear space, one logo, no effects.
- p.24–25, colour: only token colours; cyan for the button, slash and link underlines only; about 10% cyan; no cyan text on white.
- p.29, type: one H1, uppercase H1 and H2, body 16 px with line height 1.5, Arial only.
- p.32, slash and corners: exactly one slash on the home page, at the badge angle; no rounded corners.
- p.45, website: header, Gunmetal footer, button spec, body text at least 16 px.
- p.48, footer: company details string exact.

List any gaps in the PR description, with the page numbers checked.

- [ ] **Step 4: Security check against the framework document** (CLAUDE.md rule)

Re-read controls 04, 06, 10, 11, 13, 14, 15 and 22 and section 4 in `docs/security/ITWM_Custom_Website_Security_Framework_v3.1.docx`. Then run each verification procedure:

- **04:** RLS tests pass in CI. Anonymous inserts, updates and deletes fail. Unpublished lessons stay hidden.
- **06:** `grep -rn "rpc(\|\.sql\|execute(" src` shows no string-built queries.
- **10:** `npm run check:bundle` passes on Netlify. No secret uses a `NEXT_PUBLIC_` name. `git log -p | grep -i "sb_secret_"` is empty. gitleaks is green.
- **11:** Capture the deploy preview's response headers (browser pane, network request for `/`). All six headers are present, there's no `X-Powered-By`, and the console shows no CSP report for the home page.
- **13:** Dependabot is enabled. All actions are SHA-pinned. CodeQL and `npm audit` are clean, or findings are triaged.
- **14:** The preview asks for a password and uses the staging database. There are no source maps in `.next/static`: `find .next/static -name "*.map"` is empty.
- **15:** Visit a broken route and force an error. Users see only generic copy.
- **22:** `/.well-known/security.txt` resolves on the preview and the mailbox is monitored.

Record each result in `docs/security/EVIDENCE.md` (owner, evidence link, result `Verified` or `Implemented`, date). Cite the controls in the PR description.

- [ ] **Step 5: Update the build plan status**

In `docs/BUILD_PLAN.md`, set the Phase 1 row to `Done (pending merge)`, with notes: "Deploy preview: <url>. Home copy awaiting approval." Update "Last updated". Then commit and push:

```bash
git add docs/BUILD_PLAN.md docs/security/EVIDENCE.md
git commit -m "docs: mark Phase 1 complete and record security evidence"
git push
```

---

## Phase 1 "Done when" (from BUILD_PLAN.md) → where it's covered

| Criterion | Covered by |
|---|---|
| Home page renders with brand styling at 375 px and 1280 px | Tasks 4–7, 10; checked in Task 13 Steps 2–3 |
| Migrations apply cleanly to a fresh database | Task 9 Step 4 (`db:reset`), Task 12 Steps 3 and 8 |
| Unpublished lessons are not readable with the publishable key | Task 8 tests, passing after Task 9, and in CI; hosted check in Task 12 Step 4 |
| Lint, typecheck and tests pass; deploy preview is live | Task 13 Step 1, Task 12 Step 7 |
| Security headers on the preview; CI scans green; evidence for controls 04, 10, 11, 13, 14, 15 and 22 | Task 10A; Task 12 Steps 5–7; Task 13 Step 4 |
