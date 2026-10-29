# Carbon Offroad Academy: Product Requirements

Version 0.1 | 27 October 2026 | Owner: Rich, Sales and Marketing Manager, Carbon Offroad
Domain: academy.carbonoffroad.com.au

---

## 1. Purpose

Carbon Offroad Academy is an online product training portal. It gives retail partner staff and customers one place to learn Carbon Offroad products through short videos, and gives Carbon Offroad a way to train and certify retail staff at scale as dealer and big-box distribution (including BCF / Super Retail Group) grows.

Retail staff who complete the core lessons become **Carbon Certified**. Stores with enough certified staff become **Carbon Certified Stores**.

## 2. Goals and success measures

| Goal | Measure (targets TBC) |
|---|---|
| Retail staff can confidently explain and recommend the right Carbon Offroad gear | Certified staff count; certified stores count |
| Customers fit, use and maintain gear correctly | Lesson views from QR scans; completion rate |
| Fewer fitting and maintenance support enquiries | Support enquiry volume (baseline before launch) |
| Partners see Carbon as easy to work with | Partner onboarding completion; feedback from store managers |

## 3. Audiences

All audiences see the same content. The Academy is product information only. **No pricing and no sales objection handling anywhere.**

| Audience | How they arrive | What they need |
|---|---|---|
| Retail partner staff (primary) | Onboarding link containing their store code | Fast, mobile-friendly lessons; a clear path to certification |
| Customers | QR code in packaging and the after-sales process | The fitting / use / maintenance video for their product, with zero friction |
| Admins (Rich + one colleague) | Direct login | Manage lessons, quizzes, partners, stores; see reporting |

## 4. Scope

### In scope (v1)
- Video library organised by category, with lesson pages
- Vimeo-hosted video with completion tracking
- Open viewing for everyone (no login needed to watch)
- Email magic-link accounts (no passwords) for quizzes, progress and certification
- Retail staff sign-up via store code
- 2–3 multiple-choice questions per lesson, unlocked after the video is watched
- Staff certification with branded PDF certificate and public verification page
- Carbon Certified Store status
- Admin area: content, quizzes, partners, stores, store codes, reports, CSV export
- QR short links (`/go/[slug]`) with UTM passthrough and scan logging
- Certified stores JSON feed (for future dealer-locator use)
- Analytics events

### Out of scope (v1)
- Pricing, objection handling, downloadable files
- Payments, comments or discussion, native app
- US region content (data model supports it; not built or launched)
- Unleashed / CRM / Klaviyo sync
- Shopify integration beyond outbound links and the certified stores feed

## 5. Core user flows

### 5.1 Customer via QR code
1. Customer scans the QR code on packaging or after-sales material: `academy.carbonoffroad.com.au/go/scout-pro-10k-v3?utm_source=packaging&utm_medium=qr`
2. Redirects to the lesson page, preserving UTMs. Scan is logged.
3. Video plays immediately. No login prompt.
4. Lesson page shows a "Register your winch" call to action linking to the existing warranty registration page (URL TBC).
5. Below the video, a soft prompt: "Want to test your knowledge? Sign in to take the quiz." This is optional.

### 5.2 Retail staff onboarding
1. Carbon sends the partner an onboarding email containing `academy.carbonoffroad.com.au/join/BCF-ROB-7K2Q9MXH`. Store codes are a partner prefix, a location, then 8 random characters (Crockford base32: no I, L, O or U), typed in any case (Phase 3 decision 5).
2. The join page shows the store name for confirmation ("You're joining: BCF Robina") and asks for first name, last name and email.
3. Optional unticked checkbox: marketing emails from Carbon Offroad (Spam Act 2003).
4. Magic link sent. Clicking it lands them on their dashboard showing progress towards Carbon Certified.
5. Fallback: `/join` without a code lets them type the code manually.

### 5.3 Learning
1. Learner opens a lesson and watches the video.
2. Progress (max % watched, last position) is saved server-side, throttled to roughly every 10% plus on pause and end.
3. When at least 90% of the video has been watched, the quiz unlocks (signed-in users only).
4. Quiz: 2–3 questions, 3–4 options each, one correct answer. Option order is shuffled.
5. Pass = all answers correct (default; configurable). On a fail, the learner is told how many were right and encouraged to rewatch. Correct answers are **not** revealed. Unlimited retries.
6. Grading happens on the server. Correct answers are never sent to the browser.

### 5.4 Staff certification
1. When a store-linked learner has passed every lesson flagged **core**, a certificate is issued automatically.
2. Certificate: unique number (format `COA-2026-00001`), learner name, store, issue date, expiry date (12 months by default).
3. Learner receives an email and can download a branded PDF from the dashboard.
4. Public verification page `/verify/[certificate-number]` shows: first name + last initial, store, status (Active / Expired), issue and expiry dates.
5. A daily scheduled job marks expired certificates and recalculates store status.

### 5.5 Carbon Certified Store
- A store is Carbon Certified while it has at least **N** staff with active certificates (default N = 2, configurable).
- Status is recalculated when a certificate is issued, expires or is revoked, and when staff leave a store.
- Certified stores appear in the `/api/certified-stores` JSON feed (store name, suburb, state, country).

### 5.6 Admin
- Admins sign in with the same magic-link flow and have the `admin` role. **They must also complete MFA** (TOTP or passkey), enforced server-side, with step-up re-authentication for high-risk actions (security framework control 03; pending decision S3 in `docs/SECURITY.md`).
- Admin can manage everything in section 6.6 and view reports.

## 6. Functional requirements

### 6.1 Content
- **Categories**: name, slug, description, sort order.
- **Lessons**: title, slug, summary, product name (exactly as on the website), category, Vimeo video ID, duration, core flag, region (`AU`, `US`, `ALL`), sort order, published flag.
- **Questions**: belong to a lesson; prompt; 3–4 options; exactly one correct.
- Unpublished lessons are visible to admins only.

### 6.2 Video
- Embedded with the Vimeo Player SDK (`@vimeo/player`).
- Vimeo videos set to embed only on the Academy domain (and localhost / preview URLs during build).
- Player accent colour: Carbon Cyan `#00A4C7`.
- Captions enabled on every video (Vimeo captions; Australian English).
- Anonymous viewers: progress is not stored (analytics events only).
- Signed-in viewers: resume from last position.

### 6.3 Accounts
- Supabase Auth, email magic link only. Custom SMTP in production; the default Supabase email service is for testing only.
- Sender: `academy@carbonoffroad.com.au` (TBC).
- Profile: first name, last name, email, store (nullable), role (`learner` or `admin`), marketing consent flag and timestamp.
- User type is derived: store-linked = retail staff; no store = customer.
- A learner can move stores by entering a new code. Their certificate stays with them and both stores' statuses are recalculated.
- Admin can remove a learner from a store or deactivate them.

### 6.4 Quizzes
- Every attempt is logged: answers, score, pass/fail, timestamp.
- Basic rate limiting on attempts (e.g. 10 per lesson per hour).

### 6.5 Certification
- Applies only to learners linked to a store (see open decision D1).
- Certificate PDF is generated server-side and follows the brand guidelines (document template: logo top left, Carbon Black on white, cyan accents).
- Certificate number is sequential and unique.

### 6.6 Admin area
- CRUD: categories, lessons, questions and options.
- Partners: name, type (dealer, retailer, big box), parent group (e.g. Super Retail Group > BCF).
- Stores: partner, store name, suburb, state, country, active flag, store code.
- Store codes: auto-generated, readable format `[PARTNER]-[3-LETTER STORE]-[4 RANDOM]` (no ambiguous characters such as 0/O, 1/I). Admin can regenerate a code (the old one stops working).
- QR links: slug, target lesson, scan count.
- Reports: completions by lesson; certified staff by store and partner; certified stores list; QR scans by slug. CSV export for each.
- Settings: pass mark, store certification threshold, certificate validity (months).

### 6.7 Analytics
- Tool TBC (GA4 recommended if Shopify already uses it).
- Events: `video_start`, `video_progress_50`, `video_complete`, `quiz_start`, `quiz_pass`, `quiz_fail`, `signup_complete`, `certificate_issued`, `qr_scan`.

## 7. Non-functional requirements

- **Mobile first.** Store staff will mostly use phones, often on the shop floor.
- **Performance.** LCP under 2.5 s on 4G for library and lesson pages.
- **Accessibility.** WCAG 2.1 AA (see BRAND.md for contrast rules).
- **Language.** Australian English throughout.
- **Security.** Row Level Security on every table. Service role key used only server-side. The build follows the ITWM Custom Website Security Framework v3.1 at **Tier C (ASVS 5.0.0 Level 2)**; see `docs/SECURITY.md`.
- **Privacy.** Collect only what's needed. Privacy policy aligned to the Australian Privacy Principles. Marketing consent separate and opt-in.
- **Reliability.** Managed services only (Supabase, Netlify, Vimeo). Supabase Pro plan at launch for daily backups.
- **Ownership.** All accounts, repo and domain owned by Carbon Offroad (KPD Industries Pty Ltd), not personal or agency accounts.
- **Maintainability.** One person must be able to run it. Minimal dependencies, documented in the repo.

## 8. Data model (summary)

| Table | Key columns |
|---|---|
| `categories` | id, slug, name, description, sort_order |
| `lessons` | id, slug, title, summary, product_name, category_id, vimeo_id, duration_seconds, is_core, region, sort_order, published |
| `questions` | id, lesson_id, prompt, sort_order |
| `answer_options` | id, question_id, text, is_correct (never exposed to clients) |
| `partners` | id, name, type, parent_group |
| `stores` | id, partner_id, name, suburb, state, country, store_code (unique), active |
| `profiles` | id (= auth user), first_name, last_name, email, store_id, role, marketing_opt_in, marketing_opt_in_at, active |
| `lesson_progress` | user_id, lesson_id, max_percent, last_position_seconds, completed_at |
| `quiz_attempts` | id, user_id, lesson_id, answers (jsonb), score, passed, created_at |
| `certificates` | id, certificate_number, user_id, store_id_at_issue, issued_at, expires_at, revoked_at |
| `qr_links` | id, slug, lesson_id, scan_count |
| `qr_scans` | id, qr_link_id, utm_source, utm_medium, utm_campaign, scanned_at |
| `settings` | key, value |
| `store_status` (view) | store_id, active_certified_staff, is_certified |

## 9. Launch content (placeholder list, Rich to confirm)

Product names must be checked against the website before seeding. All specs stay out of seed data until confirmed.

| # | Category | Lesson | Proposed core |
|---|---|---|---|
| 1 | Recovery basics | Winch safety and recovery fundamentals | Yes |
| 2 | Recovery basics | Winch maintenance and servicing | Yes |
| 3 | Winches | Carbon 12K V3X | Yes |
| 4 | Winches | Scout Pro 10K V3 | Yes |
| 5 | Winches | Scout Pro 15K V3 | Yes |
| 6 | Winches | RS9 series | Yes |
| 7 | Winches | Scout Pro 20K (12 V / 24 V) | No |
| 8 | Winches | 48 V brushless range | No |
| 9 | Winches | SXS and ATV winches (3K, 6K, 6K Long Drum) | No |
| 10 | Ropes | Synthetic winch rope: care and inspection | Yes |
| 11 | Ropes | Replacing and spooling winch rope | No |
| 12 | Ropes | Kinetic recovery ropes | Yes |
| 13 | Recovery gear | Soft shackles | Yes |
| 14 | Recovery gear | MegaPro hook | No |
| 15 | Parts and accessories | Remotes and control boxes | No |

Production note: write the 2–3 quiz questions alongside each video script so the video clearly teaches what the quiz tests. Every recovery shown must use correct technique (rated recovery points, line dampers, clear zones, gloves).

## 10. Brand

All UI, certificates and emails follow the Carbon Offroad Brand Guidelines v1.0. The build-ready extract is in `docs/BRAND.md`.

## 11. Open decisions

| # | Decision | Default until decided |
|---|---|---|
| D1 | Can customers (no store) earn a certificate? | No. Customers can sign in, track progress and take quizzes, but certificates are for store-linked staff only |
| D2 | Store certification threshold | 2 staff with active certificates |
| D3 | Certificate validity, and what happens when a new core lesson is added | 12 months; new core lessons apply at next recertification |
| D4 | Pass mark | All questions correct |
| D5 | Transactional email provider and sender address | TBC (Google Workspace SMTP or a provider such as Resend) |
| D6 | Analytics tool | GA4 |
| D7 | Certified Store rewards (locator badge, POS sticker, co-op priority) | Business decision, outside the build |
| D8 | Warranty registration URL | TBC |
| D9 | Vimeo plan tier | Must support domain-restricted embeds, hiding from vimeo.com and player customisation |
| D10 | US region launch | Not in v1 |
| D11 | Who distributes store codes (Rich, sales team, partner head office) | Rich |
