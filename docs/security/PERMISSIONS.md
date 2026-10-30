# Permissions matrix (security framework control 04, Appendix A)

Covers Phase 3 (accounts and progress) onwards. **Phase 6:** admins get no direct table access at all. Every admin read and write is an `admin_*` security definer function whose first statement is `require_admin()`, and high-risk ones also call `require_step_up()`. `tests/db/admin.test.ts` enumerates every `admin_*` function from `pg_proc` and calls each one as every refused caller. Earlier tables (`categories`, `lessons`, `settings`, `qr_links`, `qr_scans`) are covered by `tests/db/rls.test.ts` and `tests/db/qr.test.ts`.

## Roles

| Role | How it's identified | Notes |
|---|---|---|
| **anon** | Publishable key, no session | Anyone on the internet, including direct calls to the Supabase API |
| **learner** | Signed in, `profiles.role = 'learner'`, `active = true` | Retail staff (store linked) and customers (no store). A deactivated profile counts as signed out in the app |
| **admin** | `profiles.role = 'admin'`, `active`, this session at `aal2` in `auth.sessions`, and a TOTP on this session in the last 8 hours (`current_admin()`) | Phase 6. Anything less is treated as a learner (the admin area is a 404). High-risk actions also need a TOTP in the last 5 minutes (step-up) |
| **service** | Secret key | Local DB tests and the staging test-user script only. **The app never uses it in Phase 3** |

## Database

"Fn" means the access happens only through the named `security definer` function, never directly. Every cell marked † has a test in `tests/db/accounts.test.ts` (Phase 3, Task 3). UI visibility is never evidence (control 04).

| Resource | anon | learner (own rows) | learner (others' rows) | admin | Notes |
|---|---|---|---|---|---|
| `partners`: read | ✗ † | Own store's partner † | ✗ † | Fn `admin_*` only | |
| `stores`: read | ✗ † | Own store: `id`, `partner_id`, `name`, `suburb`, `state`, `country`. **Not** `store_code` † | ✗ † | Fn `admin_*` only | Column grant (T-11) |
| Store by code | Fn `lookup_store`: name, partner, suburb, state; active stores only † | Same | n/a | | No list endpoint; returns no IDs or codes |
| `stores`, `partners`: insert, update, delete | ✗ † | ✗ † | ✗ | Fn `admin_*` only | |
| `profiles`: read | ✗ † | Own row † | ✗ † | Fn `admin_*` only | |
| `profiles`: insert | Trigger on `auth.users` only † | ✗ † | ✗ | | Role is always `learner`, whatever the metadata says † |
| `profiles`: update | ✗ † | ✗ directly †; `store_id` only through Fn `join_store(code)` † | ✗ † | Fn `admin_*` only | No field is writable directly |
| `profiles`: delete | ✗ † | ✗ † | ✗ | Fn `admin_*` only | Cascades from deleting the auth user † |
| `lesson_progress`: read | ✗ † | Own rows † | ✗ † | Fn `admin_report_*` only | |
| `lesson_progress`: write | ✗ † | Fn `save_lesson_progress` only: own rows, published lessons, clamped, monotonic † | ✗ (the function takes no user ID) † | | |
| `lesson_progress`: delete | ✗ † | ✗ † | ✗ | Fn `admin_*` only | Cascades with the profile † |
| `questions`, `answer_options` (incl. `is_correct`): read | ✗ | ✗ directly; question and option text only through Fn `get_quiz`, once unlocked | ✗ | Fn `admin_*` only | No grants at all (T-30, T-35) |
| `questions`, `answer_options`: write | ✗ | ✗ | ✗ | Fn `admin_*` only | |
| `quiz_attempts`: read | ✗ | Own rows: `id`, `user_id`, `lesson_id`, `score`, `total`, `passed`, `created_at`. **Not** `answers` | ✗ | Fn `admin_report_*` only | Column grant + RLS (T-34) |
| `quiz_attempts`: write | ✗ | Fn `submit_quiz` only: unlocked, within the limit, valid answers | ✗ (the function takes no user ID) | | No insert, update or delete grants |
| Fn `quiz_status(lesson)` | Says only `unavailable` or `signed_out` | State and attempts left | n/a | | |
| Fn `lessons_with_quiz()` | ✗ | IDs of published lessons with a ready quiz | n/a | | Dashboard "complete" rule |
| Fn `quiz_ready`, `quiz_unlocked`, `setting_int` | ✗ | ✗ | ✗ | | EXECUTE revoked: internal helpers; `quiz_unlocked` takes a user ID |
| `certificates`: read | ✗ | Own rows: number, check code, names and store at issue, dates, revoked | ✗ | Fn `admin_*` only | Column grant + RLS (T-41) |
| `certificates`: write | ✗ | ✗ (issued only by `issue_certificate_if_eligible`, inside `submit_quiz` and `join_store`) | ✗ | Fn `admin_revoke_certificate`, `admin_reinstate_certificate` (step-up) | T-37, T-38 |
| `certificate_counters`, `store_status` | ✗ | ✗ | ✗ | Fn `admin_report_*` only | Internal |
| Fn `my_store_status()` | ✗ | Own store: name, certified staff, threshold, certified | n/a | | |
| Fn `verify_certificate(code)` | Six fields, needs number and check code | same | same | | T-39, T-40 |
| Fn `certified_stores()` | Certified stores: name, suburb, state, country | same | same | | T-42 |
| Fn `issue_certificate_if_eligible`, `random_code` | ✗ | ✗ | ✗ | | EXECUTE revoked (T-38) |
| `admin_audit_log` | ✗ | ✗ | ✗ | Read through Fn `admin_list_audit`; never written directly by anyone | Written only by `admin_audit()` inside admin functions and the `auth.mfa_factors` trigger; no API role has update or delete (T-49) |
| Fn `admin_access()` | ✗ | Says `none` only | n/a | `enrol`, `verify` or `ok` | Decides the 404 and the MFA page |
| Fn `admin_*` (about 35, listed in the Phase 6 plan) | ✗ | ✗ (`42501`) | ✗ | ✓ at `aal2` with a TOTP in the last 8 h; step-up for role, MFA, store code, certificate, delete, settings and export | `tests/db/admin.test.ts` test 1 |
| Fn `current_admin`, `require_admin`, `require_step_up`, `admin_audit`, `setting_value_ok` | ✗ | ✗ | ✗ | ✗ (internal) | EXECUTE revoked |
| Fn `join_store`, `save_lesson_progress` | ✗ (not granted, and `auth.uid()` is checked) † | ✓ | n/a | | |

## App (Server Actions)

Every Server Action is a public endpoint (framework section 4). `proxy.ts` is never the access check.

| Action | Who may call it | Server-side check | Test |
|---|---|---|---|
| `requestSignInLink` | Anyone | Zod; honeypot; edge rate limit; never creates an account | `src/lib/auth/actions.test.ts` |
| `requestJoinLink` | Anyone | Zod (strips unknown fields); honeypot; edge rate limit; code re-checked against `lookup_store` | `src/lib/auth/actions.test.ts` |
| `goToStore` | Anyone | Zod store-code format only | Task 10 |
| `confirmSignIn` | Anyone holding a token | Zod token format; Supabase verifies the token; `safeNextPath()` | `src/lib/auth/next-path.test.ts` |
| `signOut`, `signOutEverywhere` | Anyone (no-op when signed out) | POST only (Origin check); cookies cleared even if Supabase fails | Task 18 |
| `getResumePoint`, `saveProgress` | Anyone; signed-out callers get nothing | `getClaims()`; Zod; the database checks `current_learner()` again | `src/lib/progress/actions.test.ts` |
| `changeStore` | Signed-in learner | `requireUser()`; Zod; `join_store` checks `current_learner()` | `src/lib/stores/actions.test.ts` |
| `getQuizStatus` | Anyone | Zod lesson ID; `quiz_status` checks `current_learner()` | `src/lib/quiz/actions.test.ts` |
| `startQuiz`, `submitQuiz` | Signed-in learner | `getClaims()`; Zod; the database checks `current_learner()`, the unlock, the limit and the answers again | `src/lib/quiz/actions.test.ts`, `tests/db/quiz.test.ts` |
| `GET /certificates/[number]` (PDF) | Signed-in owner | `getClaims()`; Zod number; RLS own row; revoked refused; same 404 for every refusal; `private, no-store` | `src/app/certificates/[number]/route.test.ts` |
| `/verify/[code]` | Anyone | Zod code; `verify_certificate` needs the check code; six fields; edge limit 30/min; `noindex` | `tests/db/certification.test.ts` |
| `GET /api/certified-stores` | Anyone | Four store fields; cached 1 h; edge limit 60/min; no CORS | `src/app/api/certified-stores/route.test.ts` |

| `/admin/**` pages | Admin with MFA | `requireAdmin()` on every page (guard test); 404 for anyone else; `/admin/mfa` uses `requireAdminForMfa()` | `tests/admin/guard.test.ts`, Phase 6 Task 18 matrix |
| Admin Server Actions (`src/lib/admin/actions/*`) | Admin with MFA | `requireAdmin()` first (guard test); Zod; high-risk ones `verifyStepUp()`; the database checks access and step-up again | Action tests; `tests/db/admin.test.ts` |
| `GET /admin/qr/[id]/svg` | Admin with MFA | `requireAdmin()`; Zod UTM values; `private, no-store` | Route test |
| `POST /admin/reports/[report]/export` | Admin with MFA and step-up | Origin check; `requireAdmin()`; Zod; `verifyStepUp()`; `admin_log_export` (step-up in the DB); `private, no-store` | Route test (T-54) |

## Auth API rules enforced in the database (all pathways)

These hold however `auth.users` is changed: through the app, a direct Auth API call, or the Supabase dashboard.

| Rule | Enforced by | Test |
|---|---|---|
| Sign-up needs a first and last name | `check_new_user` (before insert) | "refuses a sign-up with no names" |
| No profile and no consent record until the email is confirmed | `create_profile` (on `email_confirmed_at`) | "creates no profile … until the email is confirmed" |
| No password can be set or changed on an existing account | `refuse_password_change` (before update) | "refuses to set a password on an existing account" |
| `profiles.email` follows a confirmed email change | `sync_profile_email` | "keeps profiles.email in step" |
| A signed-out, expired or deactivated session gets nothing | `current_learner()` in every policy and write function | "session end" tests |

## Runbooks

**Deletion on request (Phase 6: in the admin area).**
1. Admin → Learners → the learner → Delete learner. Type their full name and a fresh code from the authenticator app.
2. The audit log records the date, the operator and the user ID, never the email. Admins must have the admin role removed first.

**Lost authenticator (admins; decision 3, ASVS 6.4.4).**
1. Verify the person as in account recovery below: by phone, with details only they would know. Never on a request by email alone.
2. Another admin opens Admin → Learners → that admin → Reset MFA (step-up). It removes every factor and signs them out; they set up a new authenticator at their next sign-in. The audit log records it against the resetting admin.
3. With only one admin: Supabase dashboard → Authentication → Users → the user → remove the factor, then record it in `EVIDENCE.md` under "Admin actions".

This stays manual until the retention job is built, before the Phase 7 gate.

**Account recovery, when a learner has lost their mailbox** (control 02: administrative recovery is logged against a named operator; ASVS 6.4.3; T-29):
1. **Verify the person.** Their store manager confirms by phone or email that the person works there, and the learner confirms details only they would know: their store, roughly when they joined and which lessons they've done. Never act on a request from the new address alone.
2. **Change the email** with the admin API (Supabase dashboard → Authentication → user → edit). `sync_profile_email` updates the profile.
3. **End every session** for that user (dashboard → user → sign out, or `auth.admin.signOut(userId, 'global')`).
4. **Tell both addresses** that the change was made, and how to report it if it wasn't them.
5. **Log it** in `docs/security/EVIDENCE.md` under "Admin actions": date, user ID, "email changed by Rich", how identity was checked. Never the old or new email.
