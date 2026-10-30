# Phase 6: Admin, design and decisions

**Status:** Rich approved every decision below in chat on 30 Oct 2026 ("Approve all"), including the three additions beyond the PRD:
- delete learner
- reinstate certificate
- the `uqr` dependency

The task plan follows the decisions and is waiting for Rich's approval before any code is written.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal (BUILD_PLAN Phase 6):** Rich and one colleague can run the Academy without touching the database.

**Sources:**
- PRD 5.6 and 6.6
- BUILD_PLAN Phase 6
- SECURITY.md (controls 03, 04, 06 and 15; S3 approved; EX-01; the retention table)
- PERMISSIONS.md
- Supabase MFA guide (checked 30 Oct 2026)
- the existing migrations

The framework document wins wherever it differs from these notes. The controls are re-read in the `.docx` before the work is called done.

---

## What exists today

- `profiles.role` is `learner` or `admin`. The sign-up trigger always sets `learner`, whatever the metadata says. There are no admin accounts on any project yet.
- Every learner function starts from `current_learner()`. This checks the live session in `auth.sessions`, so sign-out and deactivation cut access at the database straight away.
- No role has direct write grants on any table. `questions` and `answer_options` have no grants at all, so `is_correct` is unreachable.
- Content reads use `'use cache'` with `cacheLife('minutes')` and no cache tags. An edit would take minutes to show.
- `supabase/config.toml` has TOTP MFA switched **off** locally. On the hosted projects TOTP is on by default; I'll read both projects' auth settings to confirm before relying on it.

---

## Decisions for Rich

Each decision has a recommendation. "Approve all" accepts every recommendation.

### 1. How admin access is enforced: in the database, with the app as a second layer

**Recommendation:**

**Database (the real check):**
- A new `current_admin()` function returns the user's ID only when all of these hold:
  - everything `current_learner()` already checks: live session, not expired, profile active
  - `role = 'admin'`
  - **the session itself is `aal2`**. This is read from `auth.sessions.aal`, not only from the token.
- Every admin read and write goes through `admin_*` security definer functions. Each one starts by calling `current_admin()` and raises "permission denied" if it returns nothing.
- Each function writes its audit row in the same transaction, so there is never an action without a log entry.
- Tables get **no new grants**. Learners' access stays exactly as it is, and `is_correct` remains unreachable through the API.

**App (the second layer):**
- A `requireAdmin()` helper (server-only) runs at the top of every `/admin` page, Server Action and route.
- Anyone who isn't an active admin gets a plain **404**. That covers people who are signed out, learners and deactivated accounts, so the admin area's existence isn't revealed.
- An admin who hasn't done MFA yet in this session is sent to `/admin/mfa` instead.

**Guard test:** a test fails the build if any file under `src/app/admin` or `src/lib/admin` skips `requireAdmin()`.

**Proxy:** `/admin` is added to the account paths, so it gets the nonce CSP, `private, no-store` and `noindex`.

**Alternative:** check `role = admin` in the app, then use the secret key for everything. It's simpler, but there's only one layer and it breaks "checked server-side **and** in RLS" (BUILD_PLAN). **Not recommended.**

### 2. MFA: TOTP authenticator app

**Recommendation:**
- Admins use an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password and the like).
- Supabase's documented second factors are TOTP and SMS. SMS needs a paid SMS provider, which would be a new vendor. Passkeys appear only as a commented-out setting in the CLI config, with no guide, so I'd treat them as not ready yet.
- TOTP meets control 03's "TOTP or passkey".

**Flow:**
1. **Signing in:** an admin signs in with the normal magic link, which gives `aal1`.
2. **First visit to `/admin`:**
   - The enrolment page shows a QR code (made by Supabase) and the setup key.
   - The admin scans it and enters a 6-digit code, which upgrades the session to `aal2`.
   - The page then asks them to **add a second, backup authenticator on another device** (see decision 3).
3. **Every new session after that:** a 6-digit code is entered once to reach `aal2`.

TOTP needs switching on in the local config. If either hosted project has it switched off, switching it on is a remote change, and I'll ask before making it.

### 3. Lost authenticator: a backup factor plus the other admin

**Recommendation:**
- Supabase has no recovery codes. Its own guidance is to enrol a second factor, so the enrolment page asks for a backup.
- If an admin loses every factor, **another admin** can reset that admin's MFA in the admin area. This takes step-up, it's audited, and you can't reset your own MFA.
- With only one admin, the fallback is the Supabase dashboard (Authentication → Users → the user → remove the factor). That's documented as a runbook in SECURITY.md.
- This is why the BUILD_PLAN's "Rich and one colleague" matters: aim for two admins.

### 4. Step-up: a fresh code for high-risk actions

**Recommendation:**

**Which actions need it:** a fresh 6-digit code, used within the last **5 minutes**, for each of these:
- changing someone's role
- resetting someone's MFA
- regenerating a store code
- revoking or reinstating a certificate
- deleting a learner
- any CSV export
- any settings change

This list is control 03's (role changes, MFA changes, bulk export of personal information, settings changes), plus the BUILD_PLAN's (code regeneration, revocation). I've added deletion because it can't be undone.

**How it's checked:**
- The confirm dialog asks for the code.
- The server verifies the code with Supabase. That records a new TOTP time on the session.
- The database function then checks that time in `auth.mfa_amr_claims` itself. A tampered app can't skip it.

**Admin work window:**
- Separately, **the admin area needs a TOTP within the last 8 hours** (one working day). After that it asks for a code again.
- Without this, an `aal2` session could last up to the 30-day session limit.

Both windows are fixed in code. They aren't editable settings, because settings are public and admin-editable.

### 5. Audit log: `admin_audit_log`

**Recommendation:**

**What each row holds:**
- the time
- **the operator's ID and name at the time**, so the log still says who acted if their account is later removed
- the action (a fixed list)
- the target type and ID
- a small `details` JSON with what changed: field names, old and new values for settings, the reason for a revocation

**What it never holds:** emails, tokens, store codes or quiz answers.

**Who can touch it:**
- It's append-only. No role has update or delete grants.
- Only the `admin_*` functions write to it.
- Admins read it on an Audit log page (newest first, filter by action), plus a CSV export.

**Refused access:** this is logged to the app logs (`admin_denied`, with the path and the reason: signed out, not admin or not MFA), under the existing redaction rules. Non-admins can't write to the table.

**Retention:** 12 months (SECURITY.md section 5). The scheduled clean-up is built in Phase 7 with the other retention jobs, as SECURITY.md already commits.

### 6. Store codes: keep the Phase 3 format

**Recommendation:**
- Keep `PREFIX-LOC-XXXXXXXX`: 2–5 letters, 2–5 letters, then 8 random Crockford characters with no 0/O or 1/I. Phase 3 decision 5 chose 8 random characters over the PRD's 4 so codes can't be guessed, and the database already enforces that format.
- The store form has a prefix field (suggested from the partner name and editable, for example `BCF`) and a location field (for example `ROB`). The random part is made in the database.
- **No new column.**

**Regenerating a code:**
- It keeps the prefix and location and makes a new random part. The old code stops working at once.
- It takes step-up and is audited.
- Learners already in the store stay in it.

### 7. Learners

**Recommendation:**

**Search:** by name, email or store. At least 2 characters, up to 50 results.

**Learner detail page:**
- profile
- store
- progress per lesson
- quiz attempts (score and date only, never the answers)
- certificates

**Actions:**
- **Move to another store, or remove from a store.** Moving checks eligibility for a certificate, the same way joining with a code does.
- **Deactivate or reactivate.** Deactivating also **ends all their sessions straight away**.
- **Revoke a certificate** (step-up, with a reason required) and **reinstate** a revoked one (step-up). In Phase 5, a revoked certificate blocks a new one being issued. Without reinstate, a revoke made by mistake would be permanent.
- **Make admin, or remove admin** (step-up). You can't change your own role, and the last admin can't be removed. A new admin must enrol MFA before they can do anything.
- **Delete learner (privacy request)**, with step-up and typing the learner's name to confirm.
  - This removes the account and everything that cascades from it.
  - The audit row keeps the user ID and date only, which matches the SECURITY.md deletion runbook.
  - It replaces the manual runbook.
  - It's beyond the PRD's list, so it needs your OK. **Recommended**, because SECURITY.md says deletion is "manual until the Phase 6 admin area".

### 8. Lessons, categories and quizzes

**Recommendation:**

**Categories:** create, edit and reorder.

**Lessons:**
- create, edit, reorder (up and down buttons, no drag-and-drop library)
- publish or unpublish
- set the core flag and region
- set the Vimeo ID with a **live preview player** on the form

**Lesson duration:** the quiz unlock needs this. The server looks it up from Vimeo's public oEmbed endpoint when the Vimeo ID is saved. That needs no token and no new vendor. The field can still be edited by hand if the lookup fails, for example with domain-restricted videos.

**Deleting:**
- A lesson can only be deleted if nobody has progress, attempts or a QR link on it. Otherwise it's unpublished instead.
- This stops a delete from silently wiping learners' history through the cascades.

**Quiz editor:**
- One form per lesson: 1–5 questions, 2–5 options each, **exactly one correct option** (also enforced in the database).
- The whole quiz saves in one transaction.
- Saving replaces the questions. A learner who has the quiz open at that moment gets "please reload" on submit. That's acceptable for a rare edit.

**Showing edits straight away:** content reads get cache tags, and every admin save calls `updateTag`.

### 9. Partners and stores

**Recommendation:**
- **Partners:** name, type (`dealer`, `retailer`, `big box`) and parent group. Create and edit.
- **Stores:** partner, name, suburb, state, country, active flag, store code. Create, edit, deactivate and reactivate.
- A deactivated store's code stops working, and the store drops off the certified list. Its staff keep their certificates.
- Nothing is hard-deleted. Partners with stores can't be deleted; this is already enforced in the database.

### 10. QR links and the QR code SVG

**Recommendation:**

**Managing links:** create a slug and pick its lesson, change the target lesson, see scan counts. No deletes, so scan history is kept.

**SVG download:**
- The admin fills in UTM source (for example `packaging`) and campaign. Medium is fixed as `qr`.
- BRAND p.52 says every QR touchpoint carries UTM tracking.

**New dependency: `uqr` 0.1.3.**
- MIT licence, **zero dependencies**, from the UnJS project. It turns a URL into an SVG grid.
- Writing a QR encoder by hand isn't "boring".
- The other option, `qrcode`, pulls in three dependencies, including a CLI library.

**Needs from you:** the master QR style file, `carbonoffroad QR.svg` (BRAND.md p.52, p.55, p.68). It isn't in the repo or in the logo folder you shared.
- Until it arrives: plain black on white, a 4-module quiet zone, and error correction level M.

**Flag:** printed QR codes are permanent.
- The download uses the live site address. Right now that's `carbonoffroadacademy.netlify.app`.
- **I recommend not printing QR codes until `academy.carbonoffroad.com.au` is live.** The SVG page says so too.

### 11. Reports and CSV exports

**Recommendation:**

**Reports:** each is on screen, with a CSV export behind step-up.

| Report | Contents |
|---|---|
| Completions by lesson | Per lesson: started, watched to 90%, passed the quiz |
| Certified stores | Store, partner, suburb, state, certified staff, certified yes or no, against the current threshold |
| Certified staff | First name, last name, store, partner, certificate number, issued, expires, status. **No emails** (data minimisation; nothing in the PRD needs them) |
| QR scans | Per slug and UTM source, for a chosen date range (default: last 90 days) |
| Audit log | As in decision 5 |

**CSV format:**
- UTF-8 with a byte-order mark and CRLF line endings, so Excel opens it with the right characters. This is checked in Excel, as the "Done when" asks.
- Every field is quoted.
- **Formula neutralisation:** a cell starting with `=`, `+`, `-`, `@`, tab or carriage return gets a leading `'` (OWASP CSV injection guidance).
- Filename: `CarbonOffroad_Report-[Name]_v1_[YYYYMMDD].csv` (BRAND p.50 convention).

**Download route:** a POST route that checks Origin, `requireAdmin()` and step-up, and sends `private, no-store`.

### 12. Settings

**Recommendation:** one form, with step-up to save. Each change is audited with old and new values.

| Setting | Range |
|---|---|
| Pass mark | 50–100% |
| Store certification threshold | 1–20 |
| Certificate validity | 1–36 months |
| Renewal window | 0–90 days |
| Quiz attempts per hour | 1–20 |
| Warranty registration URL | `https://` only, existing check |
| Company address (email footer) | Free text |

Settings are public by design, and the form refuses anything that looks like a secret. A change to the validity period affects new certificates only. A change to the threshold applies straight away, because store status is calculated when read.

### 13. The first admin, and EX-01

**Recommendation:**

**EX-01:** this exception's control is that both Supabase projects hold **fictional test accounts only**. Your real account would be real personal data in the ITWM organisation, so:
- **Staging:** a fictional admin (`admin@example.com`, "Preview Admin").
  - It's created by extending `scripts/staging-sign-in-link.mjs` with an `--admin` option.
  - You enrol it in your authenticator app to test.
- **Production:** the admin area ships, but **no admin account is created until EX-01 closes** (the move to a Carbon Offroad organisation). Nobody can get in, which is safe.
- After the transfer, I make the first admin on production with one audited SQL statement, with your OK at that time. It's a remote database change.

**Alternative:** amend EX-01 now so your own account can be the production admin. That needs your written approval and an updated exception record. **Not recommended:** it weakens the exception's main compensating control.

### 14. Layout: plain and functional

**Recommendation:** this follows the kick-off prompt, "the same tokens and components".
- **Same pieces as the rest of the site:** header, Button, fields, cards, colour tokens and radius tokens, so the brand guard tests still apply.
- **Admin navigation:** Lessons · Partners and stores · Learners · QR links · Reports · Settings · Audit log.
- **No slash motif and no hero.** Tables scroll sideways inside their card on a phone.
- **Checked at:** 375 px and 1280 px.

**Brand check:** BRAND p.16–17 (writing), p.45 (colours), p.50 (file names), p.52 (QR).

---

## Security controls this phase touches

- **03 MFA and step-up:** decisions 2–4.
- **04 Authorisation:**
  - decision 1
  - PERMISSIONS.md admin column filled in
  - `tests/db/admin.test.ts` runs every admin function as anon, learner, admin without MFA, admin with a stale code, deactivated admin and admin
  - mutation checks
- **06 Input validation:** Zod on every action, plus database checks. CSV neutralisation (decision 11).
- **15 Logging:** `admin_audit_log` and `admin_denied` (decision 5).
- **09 Sessions** (indirectly): the 8-hour admin window, and deactivation ending sessions.
- **14 Caching:** admin pages are never cached, and `'use cache'` never holds admin data.

**Testing real MFA:** DB tests enrol a real TOTP factor on the local stack and work out codes with Node's built-in `crypto`, so no test dependency is added. This proves `aal2` and step-up against Supabase itself, not a mock.

## Remote changes this phase will need (each asked for at the time)

1. **Read** both hosted projects' auth MFA settings. If TOTP is off, ask before switching it on.
2. Apply the Phase 6 migration to staging, then production. **Production goes in before the merge**, following the lesson from Phase 4.
3. Create the fictional staging admin (decision 13).

## Not in this phase

- Retention clean-up jobs (Phase 7, as committed).
- Bulk import of stores from a spreadsheet. Not in the PRD; it can be added later if typing stores in gets tedious.
- Email to learners from the admin area (needs D5).

---

# Task plan

## How it fits together

```
/admin/* page, Server Action or route
  └─ requireAdmin()                                    [app layer: 404, or /admin/mfa]
       └─ rpc admin_access()  →  'none' | 'enrol' | 'verify' | 'ok'
  └─ high-risk? verifyStepUp(formData)                 [fresh code checked by Supabase Auth]
  └─ rpc admin_*()                                     [the real check]
       ├─ require_admin()     current_learner() + role admin + session aal2 + TOTP in last 8 h
       ├─ require_step_up()   TOTP on this session in last 5 min        (high-risk only)
       ├─ the change, validated
       └─ admin_audit()       append-only row, same transaction
  └─ updateTag('content' | 'settings' | 'certified-stores')

auth.mfa_factors trigger  →  audit row when an admin's factor is verified or removed (T-48)
```

**Error codes from the database:**

| Code | Meaning | App response |
|---|---|---|
| `42501` | Not an admin (any reason) | `notFound()` |
| `CAA01` | Step-up needed | "Enter a new code from your authenticator app" |
| `CAA02` | Refused by a guard (own role, last admin, lesson in use, admin can't be deleted) | The guard's plain message |
| `CAA03` | A core lesson can't be published without a ready quiz and a duration | Plain message |
| `22023` | Invalid input | Field errors |
| `23505` | Duplicate (slug) | "That's already used" |
| `P0002` | Not found | `notFound()` |

## File structure

| File | Responsibility |
|---|---|
| `supabase/config.toml` | TOTP enrol and verify on (local) |
| `supabase/migrations/<ts>_admin.sql` | Audit log, access helpers, every `admin_*` function, the MFA audit trigger, grants |
| `tests/db/totp.ts`, `tests/db/sql.ts`, `tests/db/users.ts` | Real TOTP codes, direct SQL on the local container, `createTestAdmin()` |
| `tests/db/admin.test.ts` | The admin permissions matrix, step-up, guards, audit |
| `src/types/database.ts` | Regenerated |
| `src/lib/admin/access.ts` | `getAdminAccess`, `requireAdmin`, `requireAdminForMfa` |
| `src/lib/admin/call.ts` (+ test) | `callAdmin()`: runs an `admin_*` RPC and maps the error codes |
| `src/lib/admin/step-up.ts` (+ test) | `verifyStepUp(formData)` |
| `src/lib/admin/csv.ts` (+ test) | `neutralise`, `toCsv`, `reportFilename` |
| `src/lib/admin/qr.ts` (+ test) | `qrUrl`, `qrSvg` (uqr) |
| `src/lib/admin/validation.ts` (+ test) | Zod schemas for every admin form |
| `src/lib/admin/data.ts` | `server-only` reads, each through `callAdmin` |
| `src/lib/admin/actions/{mfa,content,quiz,stores,learners,qr,settings}.ts` (+ tests) | Server Actions |
| `src/lib/vimeo/oembed.ts` (+ test) | Duration lookup |
| `src/lib/content/{categories,lessons,settings}.ts`, `src/lib/certificates/data.ts` | `cacheTag` added |
| `src/config/csp.ts`, `src/proxy.ts` (+ tests) | `/admin` added to the account paths; Vimeo frames allowed on admin lesson pages only |
| `netlify/edge-functions/rate-limit-admin.ts`, `tests/config/rate-limits.test.ts` | 30 POSTs a minute per IP on `/admin/*` |
| `src/lib/log.ts` | `admin_denied`, `admin_action_failed`, `admin_step_up_failed`, `admin_mfa_failed`, `admin_export` |
| `src/components/admin/*` | `AdminNav`, `AdminTable`, `StepUpFields`, `ConfirmField`, `QuizEditor` (client), `VimeoPreview` |
| `src/app/admin/**` | Pages and the two routes (QR SVG, CSV export) |
| `tests/admin/guard.test.ts` | Every admin page, route and action calls the access check |
| `scripts/staging-sign-in-link.mjs` | `--admin` option |
| `docs/security/*`, `docs/SECURITY.md`, `docs/BUILD_PLAN.md` | Threat model, permissions, ASVS, logs, runbooks, status |

---

## Task 0: Branch

- [ ] Run `git switch main && git pull --ff-only && git switch -c feat/phase-6-admin`.
- [ ] Commit this plan with `git commit -m "docs: Phase 6 admin plan"`.

---

## Task 1: Prove the MFA mechanics first (decisions 2 and 4 depend on them)

Everything in the access design rests on four behaviours of Supabase Auth. I'm proving them on the local stack before building on them.

- [ ] In `supabase/config.toml`, set `[auth.mfa.totp] enroll_enabled = true` and `verify_enabled = true`. Then run `npx supabase stop && npm run db:start`.
- [ ] Write `_tools/mfa-spike.mjs`. It's outside the repo and uses the `tests/db/totp.ts` code from Task 4. It creates a fictional user, signs in by magic link, enrols TOTP, verifies, and prints:
  1. `auth.sessions.aal` before and after the verify. **Expect `aal1` then `aal2`.**
  2. `auth.mfa_amr_claims.updated_at` for `totp` after a second verify 31 seconds later. **Expect it to move forward.** That is the whole step-up design.
  3. Whether a second verify with the **same** code is refused, so we know whether the tests need the next 30-second code.
  4. Whether `mfa.enroll` for a second factor at `aal1`, and `mfa.unenroll` at `aal1`, are refused. **Expect both refused.**
- [ ] Ask Rich to check, or check together, that TOTP is enabled on both hosted projects. **Supabase dashboard:** Authentication → Multi-Factor → Authenticator app, enrol and verify. If it's off, ask before switching it on (remote change).
- [ ] **If 1, 2 or 4 doesn't hold, stop and bring it back to Rich before Task 3.** The fallback for 2 is the token's `amr` timestamp, read with `auth.jwt()`.
- [ ] Commit the config change: `git commit -am "chore(auth): enable TOTP MFA locally"`.

---

## Task 2: Security design (section 5; controls 03, 04, 06, 15)

- [ ] **Threat model.** Add T-45 to T-56:

| ID | Asset / entry | Threat | STRIDE | Control | Status |
|---|---|---|---|---|---|
| T-45 | `/admin` pages, actions, `admin_*` functions | A learner or anon reaches admin data or writes | EoP | `require_admin()` first in every function; no table grants; app 404; guard test; enumerated matrix test | Planned |
| T-46 | Admin sign-in | A stolen magic link or `aal1` session used as an admin | Spoofing | `aal2` read from `auth.sessions`; TOTP within 8 h on this session | Planned |
| T-47 | High-risk actions | A hijacked `aal2` session revokes, exports, changes roles or settings | EoP | Step-up: TOTP on this session within 5 min, checked in the database | Planned |
| T-48 | Admin MFA factors | A hijacked `aal2` session swaps the admin's factors through the Auth API for persistence | Spoofing, Repudiation | Supabase needs `aal2` to enrol or remove; trigger audits every factor added or removed; the app's own factor removal needs step-up. Residual: no alert email until D5 | Planned, residual accepted |
| T-49 | Audit trail | An admin action leaves no record, or a record is altered | Repudiation | Audit row written in the same transaction; no update or delete grants for any API role; test asserts a row per action | Planned |
| T-50 | CSV exports | Formula injection through a learner, store or lesson name | Tampering | `neutralise()` on every text cell; unit tests for each trigger character | Planned |
| T-51 | CSV exports | Bulk export of personal information | Information disclosure | Step-up; audit row with report and row count; no emails; `private, no-store` | Planned |
| T-52 | Admin roles | Two admins remove each other, or the last admin is removed or deactivated | DoS | Advisory lock; own role can't change; admins can't be deactivated or deleted while admin | Planned |
| T-53 | Store codes | A code leaks through the audit log or app logs | Information disclosure | Never written to either; test asserts the audit `details` hold no code | Planned |
| T-54 | CSV export route | Cross-site POST triggers an export | CSRF | Origin check; SameSite cookies; step-up code in the body | Planned |
| T-55 | Certification | An admin edit makes nobody certifiable (core lesson published without a quiz) | DoS | `CAA03` guard on publishing a core lesson; quiz save always leaves a ready quiz | Planned |
| T-56 | MFA verify | Brute-forcing 6-digit codes | Spoofing | Supabase MFA verify limits; edge limit of 30 POSTs a minute on `/admin/*`; `admin_mfa_failed` logged | Planned |

- [ ] **Permissions matrix.**
  - Fill the admin column for every row. Admins get "Fn `admin_*` only", and no direct table access.
  - Add rows for `admin_audit_log` (admins read through `admin_list_audit`; nobody writes directly) and for every Server Action and route in this phase.
  - Update the "Runbooks" section: deletion is now in the admin area. Add the lost-authenticator runbook (decision 3).
- [ ] **ASVS.** Read V6 (authentication), V7 (session management), V8 (authorisation) and V16 (logging) in `_tools/asvs`, plus the CSV injection requirement in V1. Update the rows this phase meets, using the exact IDs from those files.
- [ ] **Log inventory:**
  - `admin_denied`: reason `not_admin` or `mfa`, no path
  - `admin_action_failed`: action name and error code
  - `admin_step_up_failed`: Auth error code
  - `admin_mfa_failed`: Auth error code
  - `admin_export`: report name and row count

  Add `admin_audit_log` as a log store: Confidential, 12 months.
- [ ] Commit with `git commit -m "docs(security): Phase 6 threat model, permissions and log inventory"`.

---

## Task 3: Migration (controls 03, 04, 06, 15)

- [ ] **Step 1:** Run `npx supabase migration new admin`.
- [ ] **Step 2: Write the access core and the audit log exactly as below.**

```sql
-- Phase 6: admin (PRD 5.6, 6.6; plan decisions 1–13; controls 03, 04, 06, 15; T-45 to T-56).
-- Admins get no table grants. Every admin read and write is an admin_* security definer
-- function whose first statement is require_admin(): an active admin whose session passed MFA
-- (aal2, read from auth.sessions) with a TOTP in the last 8 hours. High-risk functions then call
-- require_step_up(): a TOTP on this session in the last 5 minutes. Each write records its own
-- audit row in the same transaction. search_path is empty, so every name is schema-qualified.

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  -- No foreign key: the record outlives the operator's account (decision 5).
  actor_id uuid not null,
  actor_name text not null check (length(actor_name) between 1 and 101),
  action text not null check (action in (
    'category_saved', 'category_moved', 'lesson_saved', 'lesson_moved', 'lesson_deleted',
    'quiz_saved', 'partner_saved', 'store_saved', 'store_code_regenerated',
    'learner_store_changed', 'learner_activated', 'learner_deactivated', 'role_changed',
    'mfa_reset', 'mfa_factor_added', 'mfa_factor_removed', 'certificate_revoked',
    'certificate_reinstated', 'learner_deleted', 'qr_link_saved', 'settings_changed',
    'report_exported')),
  target_type text not null check (target_type in (
    'category', 'lesson', 'partner', 'store', 'learner', 'certificate', 'qr_link', 'settings',
    'report')),
  target_id text check (length(target_id) <= 100),
  -- What changed. Never emails, tokens, store codes or quiz answers (T-53).
  details jsonb not null default '{}'
    check (jsonb_typeof(details) = 'object' and pg_column_size(details) <= 4000)
);

create index admin_audit_log_at_idx on public.admin_audit_log (at desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- The admin's ID, or null: everything current_learner() checks, plus role admin, this session at
-- aal2 in auth.sessions (not only the token), and a TOTP on this session in the last 8 hours.
create function public.current_admin()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  join auth.sessions s on s.user_id = p.id
  where p.id = public.current_learner()
    and p.role = 'admin'
    and s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
    and s.aal = 'aal2'
    and exists (
      select 1 from auth.mfa_amr_claims c
      where c.session_id = s.id
        and c.authentication_method = 'totp'
        and c.updated_at > now() - interval '8 hours'
    )
$$;

-- First statement of every admin_* function. 42501 for anyone else; the app turns it into a 404.
create function public.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.current_admin();
begin
  if v_admin is null then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  return v_admin;
end;
$$;

-- Step-up (decision 4): a TOTP verified on this session in the last 5 minutes.
create function public.require_step_up()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from auth.mfa_amr_claims c
    where c.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and c.authentication_method = 'totp'
      and c.updated_at > now() - interval '5 minutes'
  ) then
    raise exception 'step-up required' using errcode = 'CAA01';
  end if;
end;
$$;

create function public.admin_audit(
  p_actor uuid, p_action text, p_target_type text, p_target_id text, p_details jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_audit_log (actor_id, actor_name, action, target_type, target_id, details)
  select p_actor, p.first_name || ' ' || p.last_name, p_action, p_target_type, p_target_id,
    coalesce(p_details, '{}')
  from public.profiles p
  where p.id = p_actor;
  if not found then
    raise exception 'audit actor missing' using errcode = 'P0002';
  end if;
end;
$$;

-- What /admin should show. A learner, a deactivated account or anon only ever learns 'none'.
create function public.admin_access()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p.id is null or p.role <> 'admin' then 'none'
    when public.current_admin() is not null then 'ok'
    when exists (
      select 1 from auth.mfa_factors f
      where f.user_id = p.id and f.factor_type = 'totp' and f.status = 'verified'
    ) then 'verify'
    else 'enrol'
  end
  from (select 1) one
  left join public.profiles p on p.id = public.current_learner()
$$;

-- T-48: every factor an admin verifies or loses is recorded, whichever path made the change
-- (the app, a direct Auth API call or the dashboard). The actor is the signed-in admin when
-- there is one (admin_reset_mfa), otherwise the factor's owner.
create function public.audit_admin_mfa_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_actor uuid := coalesce(public.current_learner(), v_user);
begin
  if not exists (select 1 from public.profiles p where p.id = v_user and p.role = 'admin') then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.status = 'verified' and old.status is distinct from 'verified' then
    perform public.admin_audit(v_actor, 'mfa_factor_added', 'learner', v_user::text,
      jsonb_build_object('factor_type', new.factor_type));
  elsif tg_op = 'DELETE' and old.status = 'verified' then
    perform public.admin_audit(v_actor, 'mfa_factor_removed', 'learner', v_user::text,
      jsonb_build_object('factor_type', old.factor_type));
  end if;
  return null;
end;
$$;

create trigger audit_admin_mfa_change
  after update or delete on auth.mfa_factors
  for each row execute function public.audit_admin_mfa_change();
```

- [ ] **Step 3: Write the `admin_*` functions from this catalogue.**

**Rules for every function:**
- `language plpgsql`, `security definer`, `set search_path = ''`.
- First line: `declare v_admin uuid := public.require_admin();`
- Then `perform public.require_step_up();` where the table says so.
- Then validation. Bad input raises `22023`.
- Then the change, then `perform public.admin_audit(...)`.
- Lists return `table(...)` so the generated types are exact.

| Function | Returns | Step-up | Rules | Audit action, details |
|---|---|---|---|---|
| `admin_overview()` | `jsonb` | | Counts: learners, active certificates, certified stores, published lessons, core lessons without a ready quiz | |
| `admin_list_categories()` | table: id, slug, name, description, sort_order, lesson_count | | Ordered by sort_order, name | |
| `admin_save_category(p_id uuid, p_slug text, p_name text, p_description text)` | `uuid` | | Null `p_id` inserts. Slug `^[a-z0-9]+(-[a-z0-9]+)*$` ≤ 80; name 1–80; description ≤ 300 | `category_saved`, `{created}` |
| `admin_move_category(p_id uuid, p_direction integer)` | `void` | | Direction −1 or 1. Renumber 10, 20, 30…, then swap with the neighbour | `category_moved` |
| `admin_list_lessons()` | table: id, category_id, category_name, slug, title, product_name, is_core, region, published, sort_order, vimeo_id, duration_seconds, quiz_ready, learners_started, qr_links | | All lessons, drafts included. `quiz_ready` from `public.quiz_ready(id)` | |
| `admin_get_lesson(p_id uuid)` | `jsonb` | | Every column. `P0002` if missing | |
| `admin_save_lesson(p_id uuid, p_category uuid, p_slug text, p_title text, p_summary text, p_product_name text, p_vimeo_id text, p_duration_seconds integer, p_is_core boolean, p_region public.region, p_published boolean)` | `uuid` | | Slug as above, unique per category (`23505`); title 1–120; summary ≤ 500; product ≤ 120; Vimeo `^[0-9]{1,12}$` or null; duration 1–36000 or null. **Publishing a core lesson needs `quiz_ready` and a duration, or `CAA03` (T-55)** | `lesson_saved`, `{created, published, is_core}` |
| `admin_move_lesson(p_id uuid, p_direction integer)` | `void` | | Within its category, as for categories | `lesson_moved` |
| `admin_delete_lesson(p_id uuid)` | `void` | | `CAA02` if any `lesson_progress`, `quiz_attempts` or `qr_links` row exists | `lesson_deleted`, `{title}` |
| `admin_get_quiz(p_lesson uuid)` | `jsonb` | | `[{prompt, options: [{text, correct}]}]` in sort order. Admins only, so `correct` may appear here | |
| `admin_save_quiz(p_lesson uuid, p_questions jsonb)` | `void` | | Lock the lesson row. 1–5 questions; prompt 1–300; 2–5 options; text 1–200; **exactly one `correct: true` per question**. Delete the lesson's questions (options cascade), then insert in order | `quiz_saved`, `{questions}` (the count only) |
| `admin_list_partners()` | table: id, name, type, parent_group, store_count | | | |
| `admin_save_partner(p_id uuid, p_name text, p_type text, p_parent_group text)` | `uuid` | | Name 1–120; type `dealer`, `retailer`, `big box` or null; parent ≤ 120 | `partner_saved`, `{created}` |
| `admin_list_stores(p_partner uuid)` | table: id, partner_id, partner_name, name, suburb, state, country, active, store_code, learners, certified_staff, is_certified | | Null `p_partner` returns all. Certified figures from `store_status` | |
| `admin_save_store(p_id uuid, p_partner uuid, p_name text, p_suburb text, p_state text, p_country text, p_active boolean, p_prefix text, p_location text)` | `uuid` | | Name 1–120; suburb ≤ 80; state ≤ 40; country AU, NZ or US. **On insert:** prefix and location `^[A-Z]{2,5}$`, code = `prefix-location-random_code(8)`, retried on `unique_violation`. **On update:** prefix and location are ignored | `store_saved`, `{created, active}`, never the code |
| `admin_regenerate_store_code(p_store uuid, p_prefix text, p_location text)` | `text` (the new code) | **Yes** | As insert. Old code stops working at once | `store_code_regenerated`, `{}` |
| `admin_search_learners(p_query text)` | table: id, first_name, last_name, email, store_name, role, active, certificate_status | | Trimmed query 2–100 characters; `%` and `_` escaped; `ilike` on names, email and store name; 50 rows | |
| `admin_get_learner(p_user uuid)` | `jsonb` | | Profile, store, progress per lesson, attempts (score, total, passed, date; **never answers**), certificates, verified MFA factor count | |
| `admin_set_learner_store(p_user uuid, p_store uuid)` | `void` | | Null removes. The store must be active. Afterwards `perform public.issue_certificate_if_eligible(p_user)` | `learner_store_changed`, `{from, to}` (store IDs) |
| `admin_set_learner_active(p_user uuid, p_active boolean)` | `void` | | Not yourself (`CAA02`). Can't deactivate an admin (`CAA02`, "remove the admin role first"). Deactivating also runs `delete from auth.sessions where user_id = p_user` | `learner_activated` or `learner_deactivated` |
| `admin_set_role(p_user uuid, p_role text)` | `void` | **Yes** | **Order matters:** `pg_advisory_xact_lock(hashtext('admin_roles'))` comes **before** `require_admin()`, so a concurrent demotion is seen (T-52). Not yourself (`CAA02`). Role `learner` or `admin`. Target must be active | `role_changed`, `{from, to}` |
| `admin_reset_mfa(p_user uuid)` | `void` | **Yes** | Not yourself (`CAA02`). Delete the user's `auth.mfa_factors` and `auth.sessions` | `mfa_reset` (plus the trigger's `mfa_factor_removed` rows) |
| `admin_revoke_certificate(p_certificate uuid, p_reason text)` | `void` | **Yes** | Reason 3–300. `CAA02` if already revoked | `certificate_revoked`, `{number, reason}` |
| `admin_reinstate_certificate(p_certificate uuid)` | `void` | **Yes** | `CAA02` if not revoked | `certificate_reinstated`, `{number}` |
| `admin_delete_learner(p_user uuid, p_confirm_name text)` | `void` | **Yes** | Not yourself, not an admin (`CAA02`). `p_confirm_name` must equal "first last", case-insensitive and trimmed (`22023`). `delete from auth.users where id = p_user`, which cascades | `learner_deleted`, `{}` (ID and date only, SECURITY.md runbook) |
| `admin_list_qr_links()` | table: id, slug, lesson_id, lesson_title, scan_count, created_at | | | |
| `admin_save_qr_link(p_id uuid, p_slug text, p_lesson uuid)` | `uuid` | | Insert: slug as the existing check (`23505` duplicate). Update: **the lesson only**; the slug is fixed once printed | `qr_link_saved`, `{created, lesson_id}` |
| `admin_report_completions()` | table: lesson_id, category_name, title, is_core, published, started, watched, passed | | Watched = `max_percent >= 90`; passed = distinct learners with a passed attempt | |
| `admin_report_certified_stores()` | table: store_id, partner_name, store_name, suburb, state, certified_staff, threshold, is_certified | | Active stores, from `store_status` | |
| `admin_report_certified_staff()` | table: first_name, last_name, store_name, partner_name, certificate_number, issued_at, expires_at, status | | Every certificate. Status `active`, `expired` or `revoked`, matching Phase 5's rule. Current store from the profile. **No email** | |
| `admin_report_qr_scans(p_from date, p_to date)` | table: slug, lesson_title, utm_source, scans | | `p_to >= p_from`; at most 3 years; null source shows as `(none)` | |
| `admin_list_audit(p_action text, p_before bigint)` | table: id, at, actor_name, action, target_type, target_id, details | | Newest first, 100 rows, keyset on `id < p_before` | |
| `admin_get_settings()` | table: key, value, description, updated_at | | The keys in decision 12 | |
| `admin_save_settings(p_values jsonb)` | `void` | **Yes** | Each key is in decision 12's list and passes `setting_value_ok(key, value)` (below), or `22023`. Rows locked and updated only when changed | `settings_changed`, `{key: {from, to}}` |
| `admin_log_export(p_report text, p_rows integer)` | `void` | **Yes** | Report is one of `completions`, `certified-stores`, `certified-staff`, `qr-scans`, `audit` | `report_exported`, `{report, rows}` |

- [ ] **Step 4: Write `setting_value_ok`.** It's an internal, immutable `language sql` function, with no EXECUTE grant:

```sql
create function public.setting_value_ok(p_key text, p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_key in ('pass_mark_percent', 'store_certification_threshold',
                   'certificate_validity_months', 'certificate_renewal_window_days',
                   'quiz_attempts_per_hour') then
      jsonb_typeof(p_value) = 'number'
      and (p_value #>> '{}') ~ '^[0-9]+$'
      and (p_value #>> '{}')::integer between
        case p_key when 'pass_mark_percent' then 50 when 'certificate_renewal_window_days' then 0
                   else 1 end
        and
        case p_key when 'pass_mark_percent' then 100 when 'store_certification_threshold' then 20
                   when 'certificate_validity_months' then 36
                   when 'certificate_renewal_window_days' then 90 else 20 end
    when p_key = 'warranty_registration_url' then
      jsonb_typeof(p_value) = 'null'
      or (jsonb_typeof(p_value) = 'string' and (p_value #>> '{}') ~ '^https://[^\s]{4,296}$')
    when p_key = 'company_address' then
      jsonb_typeof(p_value) = 'string' and length(btrim(p_value #>> '{}')) between 1 and 200
    else false
  end
$$;
```

- [ ] **Step 5: Grants**, at the end of the migration:
  - `revoke all on function … from public, anon, authenticated` for **every** function in this migration.
  - Then `grant execute … to authenticated` for `admin_access()` and every function named `admin_*`, **except** `admin_audit`.
  - `current_admin`, `require_admin`, `require_step_up`, `admin_audit`, `setting_value_ok` and `audit_admin_mfa_change` stay ungranted.
- [ ] **Step 6:** Run `npm run db:reset && npm run db:types && npx supabase db lint`. Expect no lint errors.
- [ ] Commit with `git commit -m "feat(db): admin functions behind MFA, step-up and an audit log"`.

---

## Task 4: DB test helpers

**Files:**
- Create: `tests/db/totp.ts`, `tests/db/sql.ts`
- Modify: `tests/db/users.ts`

- [ ] **`tests/db/totp.ts`**, Node `crypto` only (no new dependency):

```ts
import { createHmac } from 'node:crypto'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(secret: string): Buffer {
  const bits = [...secret.replace(/=+$/, '').toUpperCase()]
    .map((char) => {
      const value = BASE32.indexOf(char)
      if (value < 0) throw new Error('TOTP secret is not base32')
      return value.toString(2).padStart(5, '0')
    })
    .join('')
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)))
}

/** RFC 6238 code as Supabase checks it: SHA-1, 6 digits, 30-second steps. */
export function totp(secret: string, at = Date.now()): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)))
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest()
  const offset = hmac.readUInt8(hmac.length - 1) & 0x0f
  return ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0')
}
```

- [ ] **`tests/db/sql.ts`**: direct SQL on the **local** container only. It's needed to backdate MFA times, which the API can't reach:

```ts
import { execFileSync } from 'node:child_process'

// The API can't reach auth.mfa_amr_claims, so the 5-minute and 8-hour windows are tested by
// backdating it directly. Local container only; clients.ts already refuses hosted URLs.
const CONTAINER = 'supabase_db_Carbon-Academy'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function localSql(sql: string): string {
  return execFileSync(
    'docker',
    ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tAc', sql],
    { encoding: 'utf8' },
  ).trim()
}

/** Moves every TOTP verification on this user's sessions back by the given minutes. */
export function backdateTotp(userId: string, minutes: number) {
  if (!UUID.test(userId) || !Number.isInteger(minutes)) throw new Error('Bad test input')
  localSql(
    `update auth.mfa_amr_claims c set updated_at = now() - interval '${minutes} minutes'
     from auth.sessions s
     where s.id = c.session_id and s.user_id = '${userId}' and c.authentication_method = 'totp'`,
  )
}
```

- [ ] **`createTestAdmin()`** in `tests/db/users.ts`:

```ts
export type TestAdmin = TestUser & { factorId: string; stepUp: () => Promise<void> }

/** A fictional admin with a real enrolled TOTP factor. `verified: false` stops at aal1. */
export async function createTestAdmin(label: string, { verified = true } = {}): Promise<TestAdmin> {
  const user = await createTestUser(label)
  const { error } = await admin.from('profiles').update({ role: 'admin' }).eq('id', user.id)
  if (error) throw error
  const { data, error: enrolError } = await user.client.auth.mfa.enroll({ factorType: 'totp' })
  if (enrolError) throw enrolError
  const verify = async (at?: number) => {
    const code = totp(data.totp.secret, at)
    const result = await user.client.auth.mfa.challengeAndVerify({ factorId: data.id, code })
    if (result.error) throw result.error
  }
  if (verified) await verify()
  // The next 30-second code, in case Supabase refuses a code it has just accepted (Task 1, check 3).
  return { ...user, factorId: data.id, stepUp: () => verify(Date.now() + 30_000) }
}
```

- [ ] Commit with `git commit -m "test(db): real TOTP helpers for admin tests"`.

---

## Task 5: DB tests, the admin permissions matrix (controls 03, 04, 15; "Done when" 1)

**Files:** Create `tests/db/admin.test.ts`.

**Test cast:**
- anon (`publicClient`)
- a learner
- an admin at `aal1` (`verified: false`)
- an admin whose TOTP is 9 hours old (`backdateTotp(id, 540)`)
- a deactivated admin
- a signed-out admin (token replayed with `clientWithToken` after `signOut`)
- the admin under test
- a second admin, for the two-admin guards

Tests, with names and assertions:

1. **"every admin_* function refuses everyone but a current admin"**
   - **Enumerate the functions from the database**, so a new function can't be missed: `localSql("select proname, coalesce(array_to_string(proargnames, ','), '') from pg_proc where pronamespace = 'public'::regnamespace and proname like 'admin\\_%' and proname <> 'admin_audit'")`.
   - For each one, call `rpc(name, {every arg: null})` as each of the six refused callers.
   - Expect error code `42501` from every call, and assert the list has at least 30 functions.
2. **"admin_access tells a learner only 'none', and an admin 'enrol', 'verify' or 'ok'"**
   - A learner gets `none`, anon gets an error, and a deactivated admin gets `none`.
   - A new admin before enrolling gets `enrol`, a verified factor at `aal1` gets `verify`, `aal2` gets `ok`, and 9 hours stale gets `verify`.
3. **"high-risk functions need a TOTP in the last 5 minutes"**
   - For `admin_regenerate_store_code`, `admin_set_role`, `admin_reset_mfa`, `admin_revoke_certificate`, `admin_reinstate_certificate`, `admin_delete_learner`, `admin_save_settings` and `admin_log_export`:
   - after `backdateTotp(id, 6)` each gives `CAA01`
   - after `stepUp()` each succeeds with valid arguments
4. **"plain admin functions work at aal2 without step-up"**: save a category, a lesson, a partner and a store after `backdateTotp(id, 6)`.
5. **"every write leaves exactly one audit row, naming the operator"**
   - For each write in the catalogue, the count of new `admin_audit_log` rows with that action is 1, and `actor_name` is the admin's first and last name.
   - Read through `admin_list_audit`.
   - Direct `select`, `insert`, `update` and `delete` on `admin_audit_log` give `42501` for learners **and admins**.
6. **"store codes never reach the audit log"**: after creating and regenerating a store, no audit row's `details::text` contains the code or its random part.
7. **"regenerating a code stops the old one at once"**
   - `lookup_store(old)` returns nothing and `lookup_store(new)` finds the store.
   - The new code matches `^[A-Z]{2,5}-[A-Z]{2,5}-[0-9A-HJKMNP-TV-Z]{8}$`.
8. **"role guards: not yourself, the last admin stays, admins can't be deactivated or deleted"**
   - Own role change gives `CAA02`.
   - Two admins demoting each other in parallel (`Promise.allSettled`): at least one admin remains.
   - Deactivating or deleting an admin gives `CAA02`.
9. **"a demoted or deactivated admin loses access on their next call"**
   - Demote the second admin: their next `admin_overview` gives `42501`.
   - Deactivate a learner: their `auth.sessions` count (via `localSql`) is 0, and their copied token gets nothing from `current_learner()`-based reads.
10. **"admin_reset_mfa removes factors and sessions and is audited by the resetting admin"**: `mfa_reset` plus `mfa_factor_removed` rows with the **resetting** admin's name.
11. **"the MFA trigger records factors an admin adds or removes through the Auth API"** (T-48)
    - The admin enrols and verifies a second factor through `mfa.enroll` and `challengeAndVerify`, giving a `mfa_factor_added` row.
    - Unenrolling it gives a `mfa_factor_removed` row.
    - A learner enrolling MFA writes nothing.
12. **"quiz save enforces exactly one correct option and keeps answers admin-only"**
    - Zero or two correct options, 0 or 6 questions, or 1 option each give `22023`.
    - A valid save makes `quiz_ready` true.
    - `admin_get_quiz` returns `correct` to an admin.
    - A learner's `get_quiz` still has no `is_correct` (rerun the Phase 4 key assertion).
13. **"a core lesson can't be published without a ready quiz and a duration"** (T-55): `CAA03`, then it succeeds after a quiz and a duration are saved.
14. **"a lesson in use can't be deleted"**: with progress gives `CAA02`; a fresh draft with nothing attached deletes.
15. **"moving a learner checks certification; revoke blocks it, reinstate restores it"**
    - A learner with all core passes and no store is moved into TST-ROB, and a certificate is issued.
    - Revoke it, and `store_status` drops.
    - Reinstate it, and it's back.
    - A second revoke of a revoked certificate gives `CAA02`.
16. **"delete learner needs the exact name and removes everything"**
    - Wrong name gives `22023`.
    - Right name: the profile, progress, attempts and certificates are gone (secret key counts).
    - The audit row has the user ID as `target_id` and `{}` details.
17. **"settings: only known keys, within range, audited with old and new values"**
    - `{pass_mark_percent: 49}`, `{pass_mark_percent: "90"}`, `{unknown: 1}` and `{warranty_registration_url: "http://x"}` each give `22023`.
    - A valid change is audited with `from` and `to`.
    - Restore the values afterwards.
18. **"search escapes wildcards and caps results"**: a query of `%` returns nothing special, and 1-character queries give `22023`.
19. **"reports return the documented columns and no email"**: assert each function's keys, and that no value contains `@example.com`.

- [ ] Run `npm run test:db`. Expected: all pass, Phase 3–5 suites included.
- [ ] **Mutation checks** with `_tools/mutation-check-admin.mjs`, following the Phase 5 script. Each mutation must turn the named test red:
  1. Drop `and s.aal = 'aal2'` from `current_admin`: tests 1 and 2.
  2. Drop the 8-hour clause: tests 1 and 2.
  3. Remove `require_step_up()` from `admin_regenerate_store_code`: test 3.
  4. Remove the own-role guard: test 8.
  5. `grant select on admin_audit_log to authenticated`: test 5.
  6. Remove the audit call from `admin_save_partner`: test 5.
  7. Remove the `CAA03` guard: test 13.
  8. Grant EXECUTE on `require_admin` to `authenticated`, and replace it in one function with a `profiles.role` check only: test 1.
- [ ] Commit with `git commit -m "test(db): admin permissions matrix, step-up, guards and audit"`.

---

## Task 6: Cache tags so admin edits show straight away (decision 8)

- [ ] Add `cacheTag` next to the existing `cacheLife` calls:
  - `cacheTag('content')` in `src/lib/content/categories.ts` and `lessons.ts`
  - `cacheTag('settings')` in `src/lib/content/settings.ts`
  - `cacheTag('certified-stores')` in `getCertifiedStores`
- [ ] Every admin Server Action that changes those calls `updateTag` with the matching tag after a successful RPC.
  - Read `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md` first: `updateTag` works only in Server Actions.
  - The `/api/certified-stores` CDN cache (1 hour) is unchanged and still documented.
- [ ] Run `npm test && npm run build`. Commit with `git commit -m "feat(content): cache tags for admin edits"`.

---

## Task 7: The app access layer (decision 1; controls 04, 14)

**Files:**
- Create: `src/lib/admin/access.ts`, `src/lib/admin/call.ts` (+ test), `src/lib/admin/step-up.ts` (+ test), `tests/admin/guard.test.ts`
- Modify: `src/lib/log.ts`

- [ ] **`src/lib/admin/access.ts`:**

```ts
import 'server-only'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { cache } from 'react'
import { logSecurityEvent } from '@/lib/log'
import { createSessionClient } from '@/lib/supabase/server'

export type AdminAccess = 'none' | 'enrol' | 'verify' | 'ok'
const STATES: readonly string[] = ['none', 'enrol', 'verify', 'ok']

/** Asked of the database every request (decision 1). Never 'use cache' (control 14). */
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  await connection()
  const supabase = await createSessionClient()
  const { data, error } = await supabase.rpc('admin_access')
  return !error && typeof data === 'string' && STATES.includes(data) ? (data as AdminAccess) : 'none'
})

/**
 * First line of every /admin page, Server Action and route. Anyone who isn't an active admin
 * gets a 404, so the area's existence isn't revealed; an admin without MFA in this session goes
 * to /admin/mfa. The database checks again in every admin_* function.
 */
export async function requireAdmin(): Promise<void> {
  const access = await getAdminAccess()
  if (access === 'ok') return
  logSecurityEvent('admin_denied', { code: access === 'none' ? 'not_admin' : 'mfa' })
  if (access === 'none') notFound()
  redirect('/admin/mfa')
}

/** /admin/mfa only: any admin, with or without MFA in this session. */
export async function requireAdminForMfa(): Promise<Exclude<AdminAccess, 'none'>> {
  const access = await getAdminAccess()
  if (access === 'none') {
    logSecurityEvent('admin_denied', { code: 'not_admin' })
    notFound()
  }
  return access
}
```

- [ ] **`src/lib/admin/call.ts`**: one place maps database errors:
  - `42501` and `P0002` call `notFound()`.
  - The others become `AdminError` values: `step_up`, `refused`, `blocked_publish`, `invalid`, `duplicate` and `failed`.
  - Every failure logs `admin_action_failed` with the function name and code.
  - **Test:** each code maps as the table in "How it fits together" says, and an unknown code becomes `failed`.
- [ ] **`src/lib/admin/step-up.ts`:**

```ts
import 'server-only'
import { z } from 'zod'
import { logSecurityEvent } from '@/lib/log'
import { createSessionClient } from '@/lib/supabase/server'

const StepUpInput = z.object({ code: z.string().regex(/^\d{6}$/), factorId: z.uuid() })

/**
 * Decision 4: verifies a fresh code with Supabase Auth, which records a new TOTP time on this
 * session. The admin_* function then checks that time itself, so skipping this gets CAA01.
 */
export async function verifyStepUp(formData: FormData): Promise<boolean> {
  const parsed = StepUpInput.safeParse({
    code: formData.get('stepUpCode'),
    factorId: formData.get('stepUpFactor'),
  })
  if (!parsed.success) return false
  const supabase = await createSessionClient()
  const { error } = await supabase.auth.mfa.challengeAndVerify(parsed.data)
  if (error) {
    logSecurityEvent('admin_step_up_failed', { code: error.code })
    return false
  }
  return true
}
```

  **Test, with a mocked session client:**
  - A malformed code never calls Supabase.
  - A refused code logs and returns false.
  - The code is never logged.
- [ ] **Log events.** Add to `SecurityEvent` in `src/lib/log.ts`: `admin_denied`, `admin_action_failed`, `admin_step_up_failed`, `admin_mfa_failed` and `admin_export`. Add one field, `action?: string`, for the function or report name; it holds no personal data. Update the log test.
- [ ] **`tests/admin/guard.test.ts`:**

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Decision 1 and framework section 4: every admin page, route and Server Action checks access
// itself. Layouts don't count: they don't re-run on every navigation.
const root = process.cwd()
function filesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesIn(path) : [path]
  })
}
const CHECK = /\brequireAdmin(ForMfa)?\(\)/

describe('admin guard', () => {
  it('every admin page and route calls requireAdmin', () => {
    const entries = filesIn(join(root, 'src', 'app', 'admin')).filter((f) =>
      /[\\/](page|route)\.tsx?$/.test(f),
    )
    expect(entries.length).toBeGreaterThan(10)
    const missing = entries.filter((f) => !CHECK.test(readFileSync(f, 'utf8')))
    expect(missing.map((f) => relative(root, f))).toEqual([])
  })

  it('every exported admin Server Action calls requireAdmin first', () => {
    const files = filesIn(join(root, 'src', 'lib', 'admin', 'actions')).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
    )
    const missing = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split(/(?=export async function )/)
        .filter((chunk) => chunk.startsWith('export async function '))
        .filter((chunk) => !CHECK.test(chunk))
        .map((chunk) => `${relative(root, file)}: ${chunk.slice(22, chunk.indexOf('('))}`),
    )
    expect(missing).toEqual([])
  })
})
```

- [ ] Run `npm test && npm run typecheck`. Commit with `git commit -m "feat(admin): access check, error mapping and step-up"`.

---

## Task 8: Routing, headers and rate limit (controls 11, 14; T-56)

- [ ] **`src/config/csp.ts`:**
  - Add `'/admin'` to `ACCOUNT_PATHS`.
  - `nonceCsp(nonce, dev, { vimeo })` allows `frame-src https://player.vimeo.com` when `vimeo` is true. It stays `'none'` otherwise.
- [ ] **`src/proxy.ts`:**
  - Add `'/admin'` and `'/admin/:path*'` to the matcher.
  - Pass `vimeo: pathname.startsWith('/admin/lessons/')`, for the preview.
  - Update the sync test so `ACCOUNT_PATHS` and the matcher still agree.
- [ ] **`src/app/admin/layout.tsx`:** metadata `robots: { index: false, follow: false }`, and the admin nav. No access check here (it's in each page).
- [ ] **`netlify/edge-functions/rate-limit-admin.ts`:** path `/admin/*`, `method: ['POST']`, `windowLimit: 30`, `windowSize: 60`, `aggregateBy: ['ip', 'domain']`. Add it to `tests/config/rate-limits.test.ts`.
- [ ] **Tests:** `/admin` gets the nonce CSP and `private, no-store`, and only admin lesson pages allow the Vimeo frame.
- [ ] Commit with `git commit -m "feat(admin): account headers, noindex and rate limit for /admin"`.

---

## Task 9: MFA pages (decisions 2 and 3)

**Files:**
- Create: `src/lib/admin/actions/mfa.ts` (+ test), `src/app/admin/mfa/page.tsx`, `src/app/admin/security/page.tsx`, `src/components/admin/StepUpFields.tsx`

- [ ] **First:** do Task 13's install step and its `src/lib/admin/qr.ts` and test steps. The enrolment page draws its QR code with `qrSvg()`.

- [ ] **Server Actions**, each starting with `requireAdminForMfa()` or `requireAdmin()`:
  - **`startEnrol()`:**
    - `requireAdminForMfa()`.
    - Remove this user's **unverified** factors, then `mfa.enroll({ factorType: 'totp', friendlyName })`. The name is "Authenticator" or "Backup authenticator" (it can't be typed in).
    - Return the factor ID, the setup key and an inline SVG of the `otpauth://` URI made with `qrSvg()` from Task 13.
    - It's an SVG, not an image URL, so the CSP is unchanged.
  - **`confirmEnrol(formData)`:** `challengeAndVerify` with the 6-digit code, then redirect to `/admin/security?backup=1`.
  - **`verifySession(formData)`:** for the `verify` state. Pick the factor (a select when there are two), check the code, then redirect to `/admin`. A failure logs `admin_mfa_failed`.
  - **`removeFactor(formData)`:**
    - `requireAdmin()` plus `verifyStepUp`.
    - Refuse to remove the **last** verified factor.
    - `mfa.unenroll`, then `refreshSession()`.
- [ ] **`/admin/mfa` page**, by `requireAdminForMfa()` state:
  - `enrol`: steps 1–3 with the QR code, setup key and code field.
  - `verify`: the code field.
  - `ok`: redirect to `/admin`.

  **Copy (draft, for Rich's approval):**
  - "Set up your authenticator app"
  - "Scan this code with an authenticator app, then enter the 6-digit code it shows."
  - "Enter the 6-digit code from your authenticator app"
- [ ] **`/admin/security` page:** the admin's own factors (name, added date), "Add a backup authenticator", and "Remove", with step-up.
  - With `?backup=1` and only one factor, it shows: "Add a backup authenticator on a different device. If you lose your only one, you'll need another admin to reset it."
- [ ] **`StepUpFields`**, a Server Component:
  - a factor select (only when there's more than one)
  - a "Code from your authenticator app" field with `inputMode="numeric"`, `autoComplete="one-time-code"` and `pattern="\d{6}"`
  - the `stepUpCode` and `stepUpFactor` names
  - It's used inside every high-risk form, so no dialog or extra JavaScript is needed.
- [ ] **Tests:**
  - The actions refuse non-admins (`notFound` thrown).
  - `removeFactor` refuses the last factor.
  - The code never appears in a log call.
- [ ] Commit with `git commit -m "feat(admin): MFA enrolment, verification and backup factor"`.

---

## Task 10: Admin shell and overview (decision 14)

- [ ] **`src/components/admin/AdminNav.tsx`:** links to Lessons, Partners and stores, Learners, QR links, Reports, Settings, Audit log and Your security. Use existing tokens. It's a horizontal scroll list on phones and a row at 1280 px.
- [ ] **`src/components/admin/AdminTable.tsx`:** a semantic `<table>` in a `Card`, with `overflow-x-auto`, `scope="col"` headers and an optional caption.
- [ ] **`src/app/admin/page.tsx`:**
  - `requireAdmin()`, then the `admin_overview` counts as cards.
  - A warning card when any core lesson has no ready quiz: "Nobody can be certified until every published core lesson has a quiz."
- [ ] **Every admin page:** `export const instant = false`, as on the account pages. The data read sits inside `<Suspense>`, following `authentication-with-cache-components.md`.
- [ ] Commit with `git commit -m "feat(admin): admin shell and overview"`.

---

## Task 11: Lessons, categories and quizzes (decision 8)

**Files:**
- Create: `src/lib/vimeo/oembed.ts` (+ test), `src/lib/admin/actions/content.ts`, `quiz.ts` (+ tests), `src/components/admin/QuizEditor.tsx`, `VimeoPreview.tsx`
- Pages: `/admin/lessons`, `/admin/lessons/new`, `/admin/lessons/[id]`, `/admin/lessons/[id]/quiz`, `/admin/categories`

- [ ] **`src/lib/vimeo/oembed.ts`:**

```ts
import 'server-only'
import { z } from 'zod'
import { isVimeoId } from '@/lib/validation/urls'

const OEmbed = z.object({ duration: z.number().int().positive().max(36_000) })

/** Duration in seconds from Vimeo's public oEmbed endpoint, or null (decision 8). No token. */
export async function vimeoDuration(id: string): Promise<number | null> {
  if (!isVimeoId(id)) return null
  const target = encodeURIComponent(`https://vimeo.com/${id}`)
  try {
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=${target}`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    if (!response.ok) return null
    const parsed = OEmbed.safeParse(await response.json())
    return parsed.success ? parsed.data.duration : null
  } catch {
    return null
  }
}
```

  **Test, with a mocked `fetch`:**
  - A non-numeric ID makes no request.
  - A 404, a timeout and a missing or negative duration each give null.
  - A good response gives the integer.
- [ ] **Schemas in `src/lib/admin/validation.ts`** mirror the catalogue limits exactly: `LessonInput`, `CategoryInput` and `QuizInput`.
  - `QuizInput` is a JSON string, parsed and then validated, with the `.refine` exactly-one-correct rule.
  - **Test:** each limit at its boundary, both sides.
- [ ] **Actions:**
  - `saveLesson`:
    - When the duration is blank and a Vimeo ID is given, try `vimeoDuration`.
    - Then `admin_save_lesson`.
    - On success, `updateTag('content')` and redirect to the lesson.
    - `CAA03` shows: "Add a quiz and the video length before publishing a core lesson."
  - `moveLesson`, `deleteLesson`, `saveCategory`, `moveCategory`, `saveQuiz`.
  - Each starts `requireAdmin()`, then Zod, then `callAdmin`, then `updateTag`.
- [ ] **Pages:**
  - **`/admin/lessons`:** grouped by category. Columns: title, core, region, published, quiz ready, learners started. Up and down buttons as small forms, plus "New lesson".
  - **`/admin/lessons/[id]`:**
    - the form, using the existing `Field` component
    - `VimeoPreview`: the player iframe for a valid ID, with the same `allow` list as the lesson page
    - a "Quiz" link
    - "Delete" only when nothing is attached
  - **`/admin/lessons/[id]/quiz`:**
    - `QuizEditor`, a client component: add and remove questions and options, one radio per question for the correct option, plus a JSON hidden field.
    - It's prefilled from `admin_get_quiz`.
    - A note: "Saving replaces this quiz. Anyone taking it right now will be asked to reload."
  - **`/admin/categories`:** list, inline new and edit, up and down.
- [ ] **Tests:**
  - The actions' happy path and each error mapping, with `callAdmin` mocked.
  - `QuizEditor` renders the existing questions and blocks submit until each question has one correct option (Testing Library).
- [ ] Commit with `git commit -m "feat(admin): lessons, categories and the quiz editor"`.

---

## Task 12: Partners and stores (decisions 6 and 9)

- [ ] **Actions:** `savePartner`, `saveStore` and `regenerateStoreCode`. The last one needs step-up: `verifyStepUp` first, and a failure returns "That code didn't work. Enter a new one."
- [ ] **Pages:**
  - **`/admin/partners`:** list and new.
  - **`/admin/partners/[id]`:** edit the partner and see its stores.
  - **`/admin/stores/new?partner=`:**
    - prefix suggested from the partner name: the first letters of up to three words, upper case, 2–5 characters
    - location field
    - the rest of the store fields
  - **`/admin/stores/[id]`:**
    - edit, and the active toggle
    - the code, shown in a monospace span with a "Copy" button (a small client component)
    - "Regenerate code" with `StepUpFields`, and the warning: "The old code stops working straight away. Staff already in the store stay in it."
- [ ] Every store change calls `updateTag('certified-stores')`.
- [ ] **Tests:** prefix suggestion (`Super Retail Group` → `SRG`, `BCF` → `BCF`, one-letter words skipped), and the actions.
- [ ] Commit with `git commit -m "feat(admin): partners, stores and store codes"`.

---

## Task 13: QR links and the SVG (decision 10)

- [ ] **Install:** `npm install uqr@0.1.3 --save-exact`. Record it in the SBOM notes and in EVIDENCE (control 22): MIT licence, zero dependencies.
- [ ] **`src/lib/admin/qr.ts`:**
  - `qrUrl(siteUrl, slug, source, campaign)` builds `${siteUrl}/go/${slug}?utm_source=…&utm_medium=qr&utm_campaign=…`.
    - Source and campaign are `^[a-z0-9-]{1,40}$`.
    - It uses the `URL` class, so nothing is concatenated unescaped.
  - `qrSvg(text)` calls `renderSVG(text, { ecc: 'M', border: 4 })`. Check the option names against the installed types.
  - The default colours are black and white. The brand guard's hex rule stays as it is, with no exemption.
- [ ] **Test:**
  - The URL shape.
  - Bad UTM values are refused.
  - The SVG starts with `<svg`, contains no `<script`, and gives the same output for the same input.
- [ ] **Pages:**
  - **`/admin/qr`:** list (slug, lesson, scans), and new (slug and lesson select).
  - **`/admin/qr/[id]`:**
    - change the lesson
    - the download form (source, campaign)
    - the note: "Printed codes can't be changed. Don't print until academy.carbonoffroad.com.au is live."
- [ ] **Route `src/app/admin/qr/[id]/svg/route.ts` (GET):**
  - `requireAdmin()`, then Zod on the query, then the link from `admin_list_qr_links`.
  - Responds with `Content-Type: image/svg+xml`, `Content-Disposition: attachment; filename="CarbonOffroad_QR-[slug]_v1_[YYYYMMDD].svg"` and `private, no-store`.
- [ ] Commit with `git commit -m "feat(admin): QR links and SVG download"`.

---

## Task 14: Learners (decision 7)

- [ ] **Actions:**
  - `searchLearners`: a GET form; the page reads `searchParams`.
  - `setLearnerStore`, `setLearnerActive`.
  - With step-up: `setRole`, `resetMfa`, `revokeCertificate` (reason required), `reinstateCertificate`, `deleteLearner`.
  - Every certificate or store change calls `updateTag('certified-stores')`.
- [ ] **`/admin/learners`:** search box and the results table.
- [ ] **`/admin/learners/[id]`:**
  - **Information:** profile, store (with a move or remove form), progress table, attempts table (score and date), and certificates (number, issued, expires, status).
  - **Actions:** revoke or reinstate, deactivate or reactivate, make or remove admin, reset MFA (shown only for admins with factors), and "Delete learner".
  - **`ConfirmField`:** type the learner's full name.
  - **Copy (draft):** "This permanently deletes [name]'s account, progress and certificates. It can't be undone."
  - An admin's own page hides role, deactivate, delete and reset.
- [ ] **Tests:** each action's mapping, including `refused` messages. The search action trims and caps the query.
- [ ] Commit with `git commit -m "feat(admin): learner search, progress and account actions"`.

---

## Task 15: Reports and CSV (decision 11; T-50, T-51, T-54)

- [ ] **`src/lib/admin/csv.ts`:**

```ts
/** OWASP CSV injection: a cell Excel would read as a formula gets a leading apostrophe. */
export function neutralise(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

export type Column<T> = { header: string; value: (row: T) => string | number | boolean | null }

/** UTF-8 with a byte-order mark and CRLF, every field quoted, so Excel opens it cleanly. */
export function toCsv<T>(rows: readonly T[], columns: readonly Column<T>[]): string {
  const cell = (value: string | number | boolean | null) => {
    const text = value === null ? '' : typeof value === 'string' ? neutralise(value) : String(value)
    return `"${text.replace(/"/g, '""')}"`
  }
  const lines = [
    columns.map((column) => cell(column.header)),
    ...rows.map((row) => columns.map((column) => cell(column.value(row)))),
  ]
  return `﻿${lines.map((line) => line.join(',')).join('\r\n')}\r\n`
}

/** BRAND p.50 naming: CarbonOffroad_Report-CertifiedStaff_v1_20261030.csv (Brisbane date). */
export function reportFilename(name: string, now = new Date()): string {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane' })
    .format(now)
    .replaceAll('-', '')
  return `CarbonOffroad_Report-${name}_v1_${date}.csv`
}
```

  **Tests:**
  - **Formula characters:** each of `=`, `+`, `-`, `@`, tab and CR at the start gets the apostrophe. `=` in the middle doesn't. Numbers (including −1) aren't touched.
  - **Quoting:** quotes are doubled, and commas and newlines stay inside the quotes.
  - **Format:** the BOM is present and the line endings are CRLF.
  - **Filename:** the Brisbane date rolls over at 14:00 UTC.
- [ ] **`/admin/reports`:** links to the five reports.
- [ ] **`/admin/reports/[report]`:**
  - The table, plus a date range for QR scans, defaulting to the last 90 days.
  - The export form, with `StepUpFields`, posting to the route.
- [ ] **Route `src/app/admin/reports/[report]/export/route.ts` (POST):**
  1. The `Origin` header must equal the site origin, otherwise 404.
  2. `requireAdmin()`.
  3. Zod on the report name and dates.
  4. `verifyStepUp(formData)`. A failure redirects back with `?stepup=failed`.
  5. Fetch the rows.
  6. `admin_log_export(report, rows.length)`.
  7. `toCsv` with `Content-Type: text/csv; charset=utf-8`, an attachment filename, `private, no-store` and `X-Content-Type-Options: nosniff`.
  8. Log `admin_export`.
- [ ] **Route test**, with mocks:
  - wrong Origin → 404
  - non-admin → 404
  - bad step-up → redirect
  - success → the headers and the BOM
- [ ] Commit with `git commit -m "feat(admin): reports and safe CSV export"`.

---

## Task 16: Settings and the audit log page (decisions 5 and 12)

- [ ] **`/admin/settings`:**
  - One form with the decision 12 fields, help text and `StepUpFields`.
  - `saveSettings` runs `requireAdmin()`, then Zod (the same ranges as `setting_value_ok`, and the warranty URL through `safeHttpsUrl`), then `verifyStepUp`, then `admin_save_settings`.
  - Afterwards `updateTag('settings')` and `updateTag('certified-stores')`.
  - **Test:** a Zod range test that matches the SQL table, boundary for boundary.
  - **Fixed keys only.** There's no way to add a free-form setting, which is how decision 12's "never a secret" rule holds: settings stay publicly readable.
- [ ] **`/admin/audit`:**
  - Columns: time (Brisbane), operator, action (plain words), target, details.
  - Filter by action, and "Older" with keyset paging.
  - Export via the Task 15 route.
- [ ] Commit with `git commit -m "feat(admin): settings and audit log"`.

---

## Task 17: Fictional staging admin (decision 13)

- [ ] Extend `scripts/staging-sign-in-link.mjs` with `--admin`. After creating or finding the user, it sets `profiles.role = 'admin'` with the staging secret key and prints a link that lands on `/admin`. Still staging only and `@example.com` only. The usage text is updated.
- [ ] `--delete admin` already works for clean-up.
- [ ] Commit with `git commit -m "chore(scripts): fictional staging admin"`.

---

## Task 18: Local verification (CLAUDE.md; "Done when" 1–3)

- [ ] **Full suite:** `npm run lint && npm run typecheck && npm test && npm run test:db && npm run build && npm run check:bundle`.
- [ ] **"Done when" 1, non-admins get a 404 everywhere:**
  - Write `_tools/admin-404-matrix.mjs`, which uses headless Chrome over CDP.
  - Run it signed out, as a learner, and as an admin at `aal1`.
  - It requests every `/admin` route from the build output (`.next/server/app/admin/**`) and both routes. It also POSTs one Server Action ID per action file, taken from the page's form.
  - **Expected:** 404 signed out and as a learner; a redirect to `/admin/mfa` for the `aal1` admin.
- [ ] **"Done when" 2, every PRD admin task in the UI.** Locally, as a fictional admin with a real authenticator app on my side (the setup key into a TOTP script), do every row of the coverage table below, in a browser. Screenshots at 375 and 1280 px.
- [ ] **"Done when" 3:**
  - Export all five CSVs.
  - A learner named `=HYPERLINK("x")` and a store named `+Test` appear with a leading apostrophe.
  - Rich opens the files in Excel (Task 19). The text should show as typed, with no formula warnings and no mangled characters.
- [ ] **Keyboard pass:** every form is reachable, the focus is visible, and the step-up code field has a label.
- [ ] **Header matrix:** `/admin` gets the nonce CSP, `private, no-store` and `noindex`; public pages are unchanged.

---

## Task 19: Staging, preview and production (ask Rich before each remote change)

- [ ] **Staging, after Rich's OK:**
  - Apply the migration and align the version.
  - Run the privilege query: no new table grants, and every `admin_*` function executable only by `authenticated` (and refusing learners). Then the advisor.
  - Run `--admin` to create the fictional admin.
- [ ] **Rich on the deploy preview:**
  - Sign in, enrol his authenticator app for the fictional admin, and add a backup.
  - Edit a lesson, save a quiz and regenerate a store code (step-up).
  - Revoke and reinstate the Preview learner's certificate.
  - Change a setting and put it back.
  - Export each CSV and open it in Excel.
  - Check the audit log.
  - Sign in as the Preview learner and confirm `/admin` is a 404.
- [ ] **Production, before the merge (Phase 4 lesson):**
  - After Rich's OK, apply the migration and align the version.
  - Run the privilege query and the advisor.
  - **No admin account is created** (decision 13, EX-01).
  - After the merge: the live header matrix, and `/admin` gives a 404 signed out.

---

## Task 20: Evidence and the PR

- [ ] Re-read controls 03, 04, 06, 09, 11, 14, 15 and 22 in the framework document. Record the evidence in `EVIDENCE.md`:
  - the MFA spike results
  - DB tests and mutation results
  - the 404 matrix
  - CSV checks and Excel
  - the new dependency
  - the remote changes

  Then update ASVS, the threat model statuses (Planned to Verified), PERMISSIONS, SECURITY.md runbooks, `BUILD_PLAN.md` Status and the memory notes.
- [ ] Write `_tools/pr-phase-6.md`. It needs:
  - what changed
  - the access design
  - the checks
  - the controls
  - the brand pages checked (p.16–17, p.45, p.50, p.52)
  - the draft copy for approval
  - what's still open:
    - the production admin after EX-01
    - the QR master SVG
    - D5 alerts for MFA changes
    - the retention jobs in Phase 7
  - the Claude Code attribution line

---

## Coverage: every PRD and BUILD_PLAN admin item

| Requirement | Where |
|---|---|
| `/admin` only for `role = admin`, server-side and in RLS | Decision 1; Tasks 3, 5 (test 1), 7, 18 |
| MFA (TOTP or passkey), `aal2` enforced in the database and server | Decisions 2, 3; Tasks 1, 3, 5 (test 2), 9 |
| Step-up for role changes, code regeneration, revocation, exports, settings | Decision 4; Task 3 catalogue; Task 5 test 3; Tasks 12, 14–16 |
| Permissions matrix tested server-side | Task 5 (enumerated test 1 and mutations); PERMISSIONS.md (Task 2) |
| `admin_audit_log` against the named operator | Decision 5; Task 3; Task 5 tests 5, 10, 11; Task 16 page |
| CSV formula neutralisation | Decision 11; Task 15 tests; Task 18 |
| CRUD categories, lessons, questions and options | Task 11 |
| Reorder, publish, Vimeo ID with preview, core flag, region | Task 11 |
| Exactly one correct option | Task 3 (`admin_save_quiz`), Task 5 test 12, Task 11 `QuizInput` |
| Partners: name, type, parent group | Task 12 |
| Stores: create, edit, deactivate, generate and regenerate codes | Decision 6; Tasks 3, 12; Task 5 tests 6, 7 |
| Learners: search, progress, move or remove store, deactivate, revoke | Decision 7; Task 14; Task 5 tests 9, 15, 18 |
| Delete learner and reinstate certificate (approved additions) | Task 14; Task 5 tests 15, 16 |
| QR links: create, scan counts, SVG download | Decision 10; Task 13 |
| Reports with CSV: completions, certified staff by store and partner, certified stores, QR scans by slug and UTM source | Decision 11; Tasks 3, 15 |
| Settings: pass mark, threshold, validity, warranty URL | Decision 12; Tasks 3, 16; Task 5 test 17 |
| "Done when": 404 for non-admins on every route and action | Task 18 matrix |
| "Done when": everything in the PRD admin section in the UI | Task 18 run through this table |
| "Done when": CSVs open in Excel | Tasks 18, 19 |
| Plain, same tokens and components | Decision 14; Task 10; brand guard tests unchanged |
