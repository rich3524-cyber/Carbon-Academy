# Carbon Offroad Academy: Build Plan

Phased plan for building the Academy with Claude Code. Each phase ends with something working and deployed to a Netlify preview. No hard deadline. Finish and check each phase before starting the next.

At the start of each phase, paste the kick-off prompt into Claude Code. Claude Code should write a task-level plan and confirm it before coding.

**Security:** every phase follows the ITWM Custom Website Security Framework v3.1. The Academy is **Tier C** (see `docs/SECURITY.md`). Each phase plan lists the framework controls it touches, and its PR records evidence in `docs/security/EVIDENCE.md`. The phase-to-control map is in `docs/SECURITY.md` section 4.

---

## Status

| Phase | Status | Notes |
|---|---|---|
| 0. Accounts and assets | In progress | Rich. Supabase, Netlify, logo SVGs and brand guidelines done |
| 1. Foundation | Done | Live at https://carbonoffroadacademy.netlify.app (PR #1, fix PR #8). Open before Phase 2: home copy and product names approval, security@ mailbox, branch protection on main, Dependabot PR triage |
| 2. Video library | Done | Live 29 Oct 2026 (PRs #10, #11). Lighthouse mobile lesson page 100/100. Open: a Carbon test video ID and Vimeo embed allowlist (the "video plays" criterion was verified only with Vimeo's public demo video locally), copy approval |
| 3. Accounts and progress | Not started | |
| 4. Quizzes | Not started | |
| 5. Certification | Not started | |
| 6. Admin | Not started | |
| 7. Launch readiness | Not started | |
| 8. Integrations (post-launch) | Not started | |

Last updated: 29 October 2026

---

## Phase 0: Accounts and assets (Rich, not Claude Code)

Everything in Carbon Offroad's name, using a shared Carbon email (e.g. `admin@carbonoffroad.com.au`) as the owner, with Rich as a member.

- [ ] GitHub organisation for Carbon Offroad, private repo `carbon-offroad-academy`
- [x] Supabase organisation and project (Sydney region). Free tier for build, Pro at launch for daily backups
  - Project `Carbon-Academy`, ref `ljxjzvpdaeolytxakpog`, region ap-southeast-2, created 28 October 2026
  - URL: `https://ljxjzvpdaeolytxakpog.supabase.co` (goes in `NEXT_PUBLIC_SUPABASE_URL`)
- [x] Netlify team and site, connected to the repo
  - Site `carbonoffroadacademy` (Pro team), https://carbonoffroadacademy.netlify.app, deploys from `main`
  - Returns 404 until Phase 1 adds the Next.js app (the repo has no build output yet)
- [ ] Vimeo plan that supports: domain-restricted embeds, hiding videos from vimeo.com, player colour customisation. Confirm before buying
- [ ] DNS access for carbonoffroad.com.au to add the `academy` subdomain (find out who manages DNS)
- [ ] Transactional email sender, e.g. `academy@carbonoffroad.com.au`, plus SMTP credentials (Google Workspace SMTP or a provider such as Resend)
- [ ] Eurostile web font licence for Extended Black, Bold and Regular, from an authorised foundry. Check the licence also covers PDF embedding for certificates
  - Asset folder fonts checked 28 October 2026: conversions and old desktop fonts, none web-licensed. Not committed; see BRAND.md Typography
- [ ] From the asset library: full logo SVGs (black on transparent, white on black), compact logo white on black, icon, favicon files, concrete texture / wrap artwork
  - [x] Full and compact logo SVGs, all three colourways, in `public/brand/` (28 October 2026)
  - [x] Brand Guidelines v1.0 read in full; `docs/BRAND.md` updated against it. The PDF stays local in `docs/brand/` and is git-ignored
  - [ ] Still needed (names as in guidelines p.68): icon PNGs (`carbon compact logo no text.png`, `...inverted.png`) and a vector icon if one exists; `qr codes / carbonoffroad QR.svg`
  - [x] Full logo PNG master in `public/brand/`, plus transparent exports for the black email header
  - [x] Concrete texture: `public/brand/concrete-texture.jpg` (2400 px, web-optimised from the wrap artwork master, 28 October 2026)
- [x] Brand open questions answered (28 October 2026; see the end of `docs/BRAND.md`). The vector icon master is still TBA
- [ ] Warranty registration page URL
- [ ] 2–3 short test videos uploaded to Vimeo as placeholders (any existing Carbon footage is fine)
- [ ] Confirm the launch lesson list and core flags in PRD section 9

**Security (framework controls 03, 14 and 17; `docs/SECURITY.md` section 8):**
- [x] Security framework v3.1 added to the repo; `docs/SECURITY.md` written (29 October 2026)
- [ ] Decide security decisions S1–S9 in `docs/SECURITY.md`
- [ ] MFA, preferably passkeys, on every account: GitHub, Netlify, Supabase, Vimeo, the domain registrar, DNS, Google Workspace and the email provider. Record each in the access register
- [ ] Access register (who has access to what, at what role) kept in the business password manager or a restricted document, not in this repo
- [ ] Business password manager with a Carbon Offroad vault. Credentials shared only through it
- [x] Second Supabase project for staging and deploy previews (Sydney region)
  - `Carbon-Academy-Staging`, ref `naxngnrzjpdqvuphgbht`, URL `https://naxngnrzjpdqvuphgbht.supabase.co`, created 29 October 2026. Schema and seed applied; RLS and security advisor verified
  - In the Into The Wild Marketing organisation for now (US$10/month), under security exception EX-01 in `docs/security/EVIDENCE.md`
- [ ] Carbon Offroad Supabase organisation, with both projects transferred into it. **Must happen before Phase 3** (exception EX-01 expiry)
- [ ] Netlify password protection on non-production deploys
- [ ] Monitored security contact mailbox for `security.txt`
- [ ] Separate named GitHub account for Claude Code's pull requests, so Rich can review and approve them
- [ ] Independent reviewer named; penetration test budgeted for Phase 7

---

## Phase 1: Foundation

**Goal:** Branded, deployed shell with the content schema and seed data.

**Build:**
- Scaffold Next.js (App Router, TypeScript strict), Tailwind, ESLint, Prettier, Vitest
- Tailwind theme from `docs/BRAND.md`: colour tokens, font stack (Arial fallback for now), type scale, square button styles
- Base components: Button (primary, secondary, angled variant), Container, SectionHeader with optional slash, Card, Badge
- Layout: header (full logo top left, nav: Lessons, Get Certified, Sign in), Gunmetal footer (company details, privacy link)
- Supabase local setup and first migrations: `categories`, `lessons`, `settings`, with RLS (public read of published rows only)
- Seed data: categories and the 15 placeholder lessons from PRD section 9 (titles only, no specs, placeholder Vimeo IDs)
- `.env.example`, README with setup steps
- Netlify deploy preview working, pointed at the staging Supabase project and password-protected
- Security baseline (controls 10, 11, 13, 14, 15, 22):
  - security headers and a Report-Only CSP
  - `poweredByHeader` and production source maps off
  - `security.txt`
  - Dependabot
  - CI with SHA-pinned actions, CodeQL, gitleaks and `npm audit`
  - a client-bundle secret scan
  - branch protection on `main`

**Done when:**
- Home page renders with brand styling at 375 px and 1280 px
- Migrations apply cleanly to a fresh database
- Unpublished lessons are not readable with the publishable key
- Lint, typecheck and tests pass; deploy preview is live
- Security headers present on the deploy preview; CI security scans green; evidence recorded for controls 04, 10, 11, 13, 14, 15 and 22

**Kick-off prompt:**
> Read CLAUDE.md and the three docs in /docs. We're starting Phase 1 of docs/BUILD_PLAN.md. Write a task-level plan for this phase, flag anything in the PRD or brand rules that's unclear, and wait for my go-ahead before writing code.

---

## Phase 2: Video library

**Goal:** Anyone can browse and watch lessons. QR links work.

**Build:**
- Home: hero (concrete texture + overlay, one headline, one CTA), category list, "Get Carbon Certified" panel
- `/lessons`: all published lessons grouped by category
- `/lessons/[category]`: category page
- `/lessons/[category]/[lesson]`: Vimeo player (`@vimeo/player`, cyan player colour, captions on), summary, product name, "Register your winch" CTA (warranty URL from settings), next and previous lesson links
- Analytics event hooks (`video_start`, `video_progress_50`, `video_complete`) behind a small wrapper so the tool can be swapped
- `qr_links` and `qr_scans` tables; `/go/[slug]` route that logs the scan, keeps UTMs and redirects to the lesson
- Metadata: page titles, descriptions, Open Graph images
- Security (controls 07, 12, 20):
  - `/go/[slug]` validates the slug and passes on only the known UTM keys
  - the warranty URL and Vimeo IDs are validated before rendering
  - `images.remotePatterns` lists exact Vimeo hosts only
  - Vimeo and analytics are added to the tag inventory
  - the CSP allows only `player.vimeo.com`
  - `/go` is rate-limited

**Done when:**
- A placeholder video plays on mobile and desktop
- `/go/test-slug?utm_source=packaging` logs a scan and lands on the right lesson with UTMs intact
- Lighthouse mobile: Performance 90+, Accessibility 100 on the lesson page

**Kick-off prompt:**
> Phase 1 is done. Start Phase 2 of docs/BUILD_PLAN.md. Plan first, then wait for my go-ahead.

---

## Phase 3: Accounts and progress

**Goal:** Learners can sign in with a magic link, join a store with a code, and their progress is saved.

**Build:**
- Migrations: `partners`, `stores`, `profiles`, `lesson_progress`, with RLS (learners read and write only their own rows; store and partner names readable for the join page by code lookup only)
- Supabase Auth magic link; custom branded email template per BRAND.md
- `/sign-in` (email only), `/auth/callback`
- `/join/[code]` and `/join`: store confirmation, first name, last name, email, unticked marketing opt-in
- Code lookup is rate limited and doesn't reveal the list of stores
- Profile creation trigger on first sign-in
- Progress tracking from the player: throttled saves (about every 10%, on pause, on end); resume position
- `/dashboard`: lessons in progress, completed lessons, progress towards certification (core lessons done / total)
- Sign out, change store (enter a new code)
- Security, done first in this phase (controls 02, 04, 05, 08, 09, 11, 14, 15, 19; framework section 5):
  - the threat model (STRIDE) and data-flow diagram, reviewed by Rich and the independent reviewer
  - the retention register approved
  - the learner permissions matrix
  - Zod validation in every Server Action
  - neutral sign-in responses
  - rate limits and bot protection on join and sign-in
  - a collection notice at join
  - a nonce-based CSP on authenticated routes
  - `Cache-Control: private, no-store` on authenticated pages
  - session cookie attributes reviewed
  - the ASVS Level 2 register started

**Done when:**
- New user joins via a store code, receives the magic link, lands on the dashboard linked to the right store
- Progress persists across devices
- RLS tests prove a learner can't read another learner's progress or profile
- Customer sign-in without a store code works

**Kick-off prompt:**
> Start Phase 3 of docs/BUILD_PLAN.md. This phase touches auth and RLS, so include the policy design and the tests in your plan. Wait for my go-ahead.

---

## Phase 4: Quizzes

**Goal:** Signed-in learners can take and pass the quiz for each lesson.

**Build:**
- Migrations: `questions`, `answer_options`, `quiz_attempts`. Learners can read questions and option text but never `is_correct`. Use a view or RPC that excludes it
- Grading in a server action or Postgres function. Returns score and pass/fail only
- Quiz component: unlocks at 90% watched; shuffled options; one question per screen on mobile; clear pass and fail states (copy from BRAND.md); retry
- Attempt rate limit (default 10 per lesson per hour)
- Seed 2–3 placeholder questions per lesson, clearly marked `[PLACEHOLDER]`
- Dashboard shows passed lessons
- Security (controls 04, 05, 22): the attempt rate limit is enforced server-side; the grading function validates input and checks the 90% watch threshold on the server, not only in the UI

**Done when:**
- `is_correct` can't be retrieved by a learner through any API route (test it)
- Pass and fail flows work on mobile
- Quiz stays locked until 90% watched

**Kick-off prompt:**
> Start Phase 4 of docs/BUILD_PLAN.md. Plan first. Show me how you'll make sure correct answers never reach the browser.

---

## Phase 5: Certification

**Goal:** Store staff who pass all core lessons are certified automatically. Stores become Carbon Certified.

**Build:**
- Migrations: `certificates` (sequential numbers `COA-YYYY-NNNNN`), `store_status` view, settings for threshold, validity and pass mark
- Issue logic: on each quiz pass, check whether all core lessons are passed for a store-linked learner. If so, issue a certificate
- Branded certificate PDF (BRAND.md certificate section), downloadable from the dashboard
- "You're Carbon Certified" email with a link to download
- `/verify/[number]`: first name + last initial, store, status, issue and expiry dates
- Daily `pg_cron` job: expire certificates, recalculate store status
- Store status recalculated on issue, expiry, revoke and store change
- `/api/certified-stores`: JSON (store name, suburb, state, country), cached
- Security (controls 04, 06, 12, 19):
  - certificate issuing runs server-side with the secret key only
  - the verification page and feed return explicit fields only
  - certificate emails carry a link, not personal details
  - `/verify` and the feed are rate-limited

**Done when:**
- A test learner passing all core lessons gets a certificate, email and PDF
- Expiry and threshold logic covered by tests (use a short validity in tests)
- Verification page shows no email or full surname

**Kick-off prompt:**
> Start Phase 5 of docs/BUILD_PLAN.md. Plan first, including how the certificate number sequence stays unique under concurrent passes.

---

## Phase 6: Admin

**Goal:** Rich and one colleague can run the Academy without touching the database.

**Build:**
- `/admin`, accessible only to `role = admin` (checked server-side and in RLS)
- Lessons: create, edit, reorder, publish/unpublish, set Vimeo ID (with a preview), core flag, region
- Questions and options editor (exactly one correct option enforced)
- Partners and stores: create, edit, deactivate; generate and regenerate store codes (readable format, no ambiguous characters)
- Learners: search, view progress, move or remove from a store, deactivate, revoke a certificate
- QR links: create slug to lesson, scan counts, download QR code (SVG, from the master QR style)
- Reports with CSV export: completions by lesson; certified staff by store and partner; certified stores; QR scans by slug and UTM source
- Settings: pass mark, store threshold, certificate validity, warranty registration URL
- Security (controls 03, 04, 06, 15):
  - admins must use MFA (TOTP or passkey, `aal2` enforced in RLS and server checks)
  - step-up re-authentication for role changes, code regeneration, certificate revocation, exports and settings changes
  - the admin permissions matrix tested server-side
  - an `admin_audit_log` of every admin action, against the named operator
  - CSV exports neutralise formula injection

**Done when:**
- Non-admins get a 404 for every `/admin` route and every admin server action
- Everything in the PRD admin section can be done in the UI
- CSV exports open correctly in Excel

**Kick-off prompt:**
> Start Phase 6 of docs/BUILD_PLAN.md. Plan first. Keep the admin plain and functional; it doesn't need the full brand treatment, but it should use the same tokens and components.

---

## Phase 7: Launch readiness

**Goal:** Production-ready with real content.

**Build and check:**
- Licensed Eurostile web fonts installed (if licence is in place)
- Accessibility audit (WCAG 2.1 AA): keyboard navigation, focus states, contrast, screen reader labels, captions
- Performance pass on mobile
- Privacy policy and terms pages (content from Carbon; Claude Code builds the pages)
- Analytics confirmed and events firing
- Error monitoring (optional; Netlify logs at minimum)
- Supabase upgraded to Pro; backups confirmed
- Production SMTP configured and tested (inbox, spam folder, mobile, dark mode)
- `academy.carbonoffroad.com.au` live with HTTPS
- Vimeo embeds restricted to the production domain
- Real videos, product names and quiz questions swapped in; all `[PLACEHOLDER]` and `[SPEC TBC]` markers removed (search the repo and database)
- User acceptance test with 1–2 friendly stores before wider rollout
- Security release gate (framework sections 5 and 7), all required for Tier C:
  - the Tier A checklist and the Tier B/C pre-launch checklist complete
  - the ASVS Level 2 register complete
  - the threat model independently reviewed
  - vendor assessments for Supabase, Netlify, Vimeo, the email provider and GA4
  - DAST and manual testing
  - an **independent penetration test**, with Critical and High findings retested
  - an SBOM
  - a restore rehearsal with an isolated backup copy, and RPO/RTO recorded
  - CSP enforced after clean reports
  - CAA, SPF, DKIM and DMARC verified; no dangling DNS records
  - uptime and certificate monitoring live
  - the privacy policy (APP 1), collection notices (APP 5), overseas recipients (APP 8) and the automated-decision disclosure decided
  - the release record signed, with independent sign-off
- Brand approval: final sign-off against the ad approval checklist in the guidelines (logo, type, colour, copy, safety)

**Kick-off prompt:**
> Start Phase 7 of docs/BUILD_PLAN.md. Give me a launch checklist that covers everything in this phase, and run every check you can do yourself.

---

## Phase 8: Integrations (post-launch)

Pick up once the Academy is live and stable:

- Certified Store badge on the Shopify dealer locator (depends on the locator app; uses `/api/certified-stores`)
- QR codes on packaging and thank-you inserts pointing to `/go/[slug]` (aligns with the guidelines' packaging section)
- CRM / Unleashed / email platform sync for certified staff and partners (once the CRM decision is made)
- US region: US English, imperial-first units, US stores and partners, carbonoffroadusa.com links
- Recertification reminders by email before expiry
