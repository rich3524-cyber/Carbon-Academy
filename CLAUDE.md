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
- **Brand check before any UI, copy, email, certificate or video work is called done:** check it against the relevant pages of the guidelines PDF (not just BRAND.md) and cite the pages you checked in your summary. Flag anything the guidelines don't cover rather than guessing.

## Stack

- Next.js (current stable, App Router) with TypeScript in strict mode
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
- Buttons: square or angled corners. **No pills, no rounded corners.** Min height 44 px. Primary = cyan fill with black uppercase text.
- One slash motif per screen, at the badge angle.
- Logo from master SVG files only, never recreated. Top left in the header.
- Eurostile with Arial fallback. Do not commit any Eurostile font files until licensed web fonts are supplied.

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
- **Ask before:** adding a paid service, changing the data model beyond the PRD, touching auth or RLS policies outside the current phase, or deleting data.

## Commands

Fill in once scaffolded:

```
npm run dev          # local dev server
npm run build        # production build
npm run lint
npm run typecheck
npm run test
supabase start       # local Supabase stack
supabase db push     # apply migrations to the linked project
supabase gen types typescript --local > src/types/database.ts
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
