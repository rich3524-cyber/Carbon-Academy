# Carbon Offroad Academy

Online product training portal for Carbon Offroad customers and retail partners. Short video lessons with 2–3 question quizzes. Retail staff who pass the core lessons become **Carbon Certified**; stores with enough certified staff become **Carbon Certified Stores**.

- Domain: academy.carbonoffroad.com.au
- Owner: Rich, Sales and Marketing Manager, Carbon Offroad
- Built and maintained by Rich with Claude Code
- All accounts (GitHub, Supabase, Netlify, Vimeo, domain) belong to Carbon Offroad (KPD Industries Pty Ltd)

## Read these first

- `docs/PRD.md`: what we're building, flows, data model, open decisions
- `docs/BUILD_PLAN.md`: phases, current status, acceptance criteria
- `docs/BRAND.md`: design tokens and brand rules. Non-negotiable. Page references point to the full guidelines PDF, kept locally in `docs/brand/` and git-ignored. Check it when BRAND.md doesn't cover something, and never commit it.
- `docs/SECURITY.md`: how the **ITWM Custom Website Security Framework v3.1** (`docs/security/ITWM_Custom_Website_Security_Framework_v3.1.docx`) applies here. **The Academy is Tier C (ASVS 5.0.0 Level 2).** Non-negotiable, and the framework wins over the extract.
- **Security check before any work is called done:** list the framework controls the change touches, re-read them in the framework document itself, and confirm their verification procedures. Record evidence in `docs/security/EVIDENCE.md` and cite the control numbers (for example "controls 04, 10") in the PR description. Flag anything the framework requires that isn't done yet.
- **Brand check before any UI, copy, email, certificate or video work is called done:** check it against the relevant pages of the guidelines PDF (not just BRAND.md) and cite the pages you checked in your summary. Flag anything the guidelines don't cover rather than guessing.

## Stack

- Next.js 16 (App Router) with TypeScript in strict mode and **Cache Components on**. This version has breaking changes (see `AGENTS.md`), so read the bundled docs in `node_modules/next/dist/docs/` before writing Next.js code. In particular:
  - `revalidate` and `dynamic` route config are gone: use `'use cache'` and `cacheLife`.
  - Error boundaries get `retry()`.
  - Middleware is `proxy.ts`.
  - **Never put user-specific data inside `'use cache'`.** It's a shared cache (control 14). Read cookies outside cached scopes.
- Tailwind CSS, configured with the tokens in `docs/BRAND.md`
- Supabase: Postgres, Auth (email magic link only), Row Level Security on every table, `pg_cron` for scheduled jobs
- Vimeo for video, `@vimeo/player` for playback events
- Netlify hosting
- Server-side PDF generation for certificates
- Transactional email through Supabase Auth custom SMTP (provider TBC, see PRD D5)

## Principles

- **Managed services only.** No servers, VPSs or self-hosted anything. If a feature seems to need infrastructure beyond Supabase, Netlify and Vimeo, stop and ask.
- **Keep it boring.** Fewer dependencies. One person must be able to maintain this. Explain any new dependency before adding it.
- Server components by default. Client components only for the video player, quiz, and interactive forms.
- All data access through Supabase with RLS. The secret / service role key is server-only and used only where needed (admin actions, certificate issuing, scheduled jobs). Never import it into client code.
- **Quiz answers never reach the browser.** `answer_options.is_correct` is not selectable by learners. Grading runs in a server action or database function.
- **Every Server Action and Route Handler is a public endpoint** (framework control 04, section 4). Each one authenticates, authorises and validates with Zod itself. Middleware/proxy is never the only access check. Database access lives in `server-only` modules that return minimal DTOs.
- **Preview deploys never touch production data.** They use the staging Supabase project and test data (control 14).
- Schema changes only through SQL migrations in `supabase/migrations/`. Never edit the database by hand. Regenerate TypeScript types after every migration.
- Mobile first. Most learners are store staff on phones.

## Copy rules (summary; full rules in docs/BRAND.md)

- Australian English.
- "Carbon Offroad", two words. Product names exactly as on the website, including version.
- Never "Australian made". Use "Australian engineered, field tested".
- **Never invent specs, prices, capacities or warranty terms.** Use `[SPEC TBC]` placeholders and list them in your summary.
- No pricing and no competitor names anywhere.
- Banned words: mate, cheap, budget, unbreakable, indestructible, bulletproof, game-changer, revolutionary, next-level, send it.
- No humour in safety or how-to copy. No exclamation marks in headlines.

## Design rules (summary)

- Colours: Carbon Black `#111111`, White, Carbon Cyan `#00A4C7` (accent, about 10%), Gunmetal `#303030`, Concrete `#909090`, Dust `#E6E6E6`.
- Cyan is never used for text on white.
- **Online, the Academy matches carbonoffroad.com.au** (BRAND.md "Website style", approved 29 Oct 2026): pill buttons, rounded cards and fields using only the named radius tokens, a cyan header and footer with black text, and a `#EEEEEE` page. Min height 44 px. Primary = cyan fill with black bold uppercase text.
- One slash motif per screen, at the badge angle.
- Logo from master SVG files only, never recreated. Top left in the header.
- Saira (self-hosted with `next/font`) with an Arial fallback, matching the website. Email, print and certificates keep the guideline fonts. Never commit Eurostile font files.

## Accessibility and privacy

- WCAG 2.1 AA. Body 16 px minimum. Visible focus states. Alt text on all images. Captions on all videos.
- Collect only first name, last name, email, store and consent flags.
- Marketing opt-in is a separate, unticked checkbox (Spam Act 2003). Account emails are transactional only.
- Privacy policy linked in the footer.

## How to work in this repo

- Work one phase at a time from `docs/BUILD_PLAN.md`.
- At the start of each phase, write a task-level plan (use the writing-plans skill if available) and confirm it with Rich before writing code.
- Small commits with conventional commit messages.
- Before calling a task done: lint, typecheck and tests pass, and you've checked the UI at 375 px and 1280 px wide.
- At the end of each session, update the Status section of `docs/BUILD_PLAN.md`.
- **Ask before:** granting a security exception (it needs a justification, compensating controls, an expiry date and Rich's written approval, framework section 1), adding a vendor that receives personal data (vendor assessment, section 5), adding a paid service, changing the data model beyond the PRD, touching auth or RLS policies outside the current phase, or deleting data.

## Commands

```
npm run dev            # local dev server (http://localhost:3000)
npm run build          # production build
npm run lint
npm run typecheck
npm test               # unit and brand guard tests
npm run test:db        # RLS tests, local Supabase only
npm run format         # Prettier
npm run check:bundle   # fail if a server secret is in .next/static (after a build)
npm run db:start       # start the local Supabase stack (needs Docker)
npm run db:reset       # re-apply migrations and seed locally
npm run db:types       # regenerate src/types/database.ts after every migration
npx supabase db push   # apply migrations to the linked hosted project (ask Rich first)
```

## Environment variables

```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # anon / publishable key
SUPABASE_SECRET_KEY=                    # service role / secret key. Server only.
VIMEO_ACCESS_TOKEN=                     # server only, read access for video metadata
NEXT_PUBLIC_GA_MEASUREMENT_ID=          # if GA4 is confirmed
```

Never commit `.env*` files other than `.env.example`.
