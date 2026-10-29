# Permissions matrix (security framework control 04, Appendix A)

Covers Phase 3 (accounts and progress). Admin rows are filled in Phase 6, when admin features exist. Earlier tables (`categories`, `lessons`, `settings`, `qr_links`, `qr_scans`) are covered by `tests/db/rls.test.ts` and `tests/db/qr.test.ts`.

## Roles

| Role | How it's identified | Notes |
|---|---|---|
| **anon** | Publishable key, no session | Anyone on the internet, including direct calls to the Supabase API |
| **learner** | Signed in, `profiles.role = 'learner'`, `active = true` | Retail staff (store linked) and customers (no store). A deactivated profile counts as signed out in the app |
| **admin** | `profiles.role = 'admin'` | Phase 6. No admin features exist yet. MFA is required (control 03) |
| **service** | Secret key | Local DB tests and the staging test-user script only. **The app never uses it in Phase 3** |

## Database

"Fn" means the access happens only through the named `security definer` function, never directly. Every cell marked † has a test in `tests/db/accounts.test.ts` (Phase 3, Task 3). UI visibility is never evidence (control 04).

| Resource | anon | learner (own rows) | learner (others' rows) | admin | Notes |
|---|---|---|---|---|---|
| `partners`: read | ✗ † | Own store's partner † | ✗ † | Phase 6 | |
| `stores`: read | ✗ † | Own store: `id`, `partner_id`, `name`, `suburb`, `state`, `country`. **Not** `store_code` † | ✗ † | Phase 6 | Column grant (T-11) |
| Store by code | Fn `lookup_store`: name, partner, suburb, state; active stores only † | Same | n/a | | No list endpoint; returns no IDs or codes |
| `stores`, `partners`: insert, update, delete | ✗ † | ✗ † | ✗ | Phase 6 | |
| `profiles`: read | ✗ † | Own row † | ✗ † | Phase 6 | |
| `profiles`: insert | Trigger on `auth.users` only † | ✗ † | ✗ | | Role is always `learner`, whatever the metadata says † |
| `profiles`: update | ✗ † | ✗ directly †; `store_id` only through Fn `join_store(code)` † | ✗ † | Phase 6 | No field is writable directly |
| `profiles`: delete | ✗ † | ✗ † | ✗ | Phase 6 | Cascades from deleting the auth user † |
| `lesson_progress`: read | ✗ † | Own rows † | ✗ † | Phase 6 reports | |
| `lesson_progress`: write | ✗ † | Fn `save_lesson_progress` only: own rows, published lessons, clamped, monotonic † | ✗ (the function takes no user ID) † | | |
| `lesson_progress`: delete | ✗ † | ✗ † | ✗ | Phase 6 | Cascades with the profile † |
| `questions`, `answer_options` (incl. `is_correct`): read | ✗ | ✗ directly; question and option text only through Fn `get_quiz`, once unlocked | ✗ | Phase 6 | No grants at all (T-30, T-35) |
| `questions`, `answer_options`: write | ✗ | ✗ | ✗ | Phase 6 | |
| `quiz_attempts`: read | ✗ | Own rows: `id`, `user_id`, `lesson_id`, `score`, `total`, `passed`, `created_at`. **Not** `answers` | ✗ | Phase 6 reports | Column grant + RLS (T-34) |
| `quiz_attempts`: write | ✗ | Fn `submit_quiz` only: unlocked, within the limit, valid answers | ✗ (the function takes no user ID) | | No insert, update or delete grants |
| Fn `quiz_status(lesson)` | Says only `unavailable` or `signed_out` | State and attempts left | n/a | | |
| Fn `lessons_with_quiz()` | ✗ | IDs of published lessons with a ready quiz | n/a | | Dashboard "complete" rule |
| Fn `quiz_ready`, `quiz_unlocked`, `setting_int` | ✗ | ✗ | ✗ | | EXECUTE revoked: internal helpers; `quiz_unlocked` takes a user ID |
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

## Auth API rules enforced in the database (all pathways)

These hold however `auth.users` is changed: through the app, a direct Auth API call, or the Supabase dashboard.

| Rule | Enforced by | Test |
|---|---|---|
| Sign-up needs a first and last name | `check_new_user` (before insert) | "refuses a sign-up with no names" |
| No profile and no consent record until the email is confirmed | `create_profile` (on `email_confirmed_at`) | "creates no profile … until the email is confirmed" |
| No password can be set or changed on an existing account | `refuse_password_change` (before update) | "refuses to set a password on an existing account" |
| `profiles.email` follows a confirmed email change | `sync_profile_email` | "keeps profiles.email in step" |
| A signed-out, expired or deactivated session gets nothing | `current_learner()` in every policy and write function | "session end" tests |

## Runbooks (manual until the Phase 6 admin area)

**Deletion on request.**
1. In the Supabase dashboard, go to Authentication and delete the user. The deletion cascades to the profile and progress.
2. Record the date and user ID, never the email.

This stays manual until the retention job is built, before the Phase 7 gate.

**Account recovery, when a learner has lost their mailbox** (control 02: administrative recovery is logged against a named operator; ASVS 6.4.3; T-29):
1. **Verify the person.** Their store manager confirms by phone or email that the person works there, and the learner confirms details only they would know: their store, roughly when they joined and which lessons they've done. Never act on a request from the new address alone.
2. **Change the email** with the admin API (Supabase dashboard → Authentication → user → edit). `sync_profile_email` updates the profile.
3. **End every session** for that user (dashboard → user → sign out, or `auth.admin.signOut(userId, 'global')`).
4. **Tell both addresses** that the change was made, and how to report it if it wasn't them.
5. **Log it** in `docs/security/EVIDENCE.md` under "Admin actions": date, user ID, "email changed by Rich", how identity was checked. Never the old or new email.
