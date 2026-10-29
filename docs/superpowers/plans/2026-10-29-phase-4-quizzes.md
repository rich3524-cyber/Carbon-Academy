# Phase 4: Quizzes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in learners can take and pass the 2–3 question quiz for each lesson once they've watched the video, and correct answers never reach the browser.

**Architecture:**
- Questions, options and attempts live in three new Supabase tables. Learners get no grant at all on questions or options.
- Three security definer functions do the work, and none of them ever returns `is_correct`:
  - `quiz_status` says whether the quiz is available, locked or ready.
  - `get_quiz` hands out question and option text, with options shuffled, only once the quiz is unlocked.
  - `submit_quiz` checks the unlock, the attempt limit and the answers, grades on the server, logs the attempt, and returns only the score and pass or fail.
- Lesson pages stay static. A client quiz panel talks to Server Actions, as the video player does for progress.

**Tech Stack:** Next.js 16.4.3 (Cache Components on), Supabase Postgres with RLS and plpgsql, Zod, Vitest (unit and local DB), Tailwind v4 tokens (BRAND.md Website style).

**Spec:** `docs/BUILD_PLAN.md` Phase 4, `docs/PRD.md` sections 5.2, 6.4, 6.7 and 8, and decision D4. The security framework controls are 04, 05, 06, 15, 20 and 22.

---

## How correct answers never reach the browser

The kick-off prompt asks for this first. There are six layers, and each one is tested on its own.

1. **No grant on the answer table.** `anon` and `authenticated` have every privilege on `answer_options` and `questions` revoked, and have no RLS policy on them. This blocks every route the Supabase APIs offer:
   - a direct REST select fails, and so does a column select of `is_correct`
   - an embedded select such as `lessons?select=questions(answer_options(is_correct))` fails
   - GraphQL (`/graphql/v1`) only exposes tables the caller has a grant on
2. **The functions never select `is_correct` into their output.**
   - `get_quiz` returns exactly four columns: `question_id`, `prompt`, `option_id` and `option_text`.
   - `submit_quiz` returns exactly three: `score`, `total` and `passed`.
   - `is_correct` is only read inside `submit_quiz`'s `count(*)`.
3. **The helper functions aren't an API.**
   - `quiz_ready`, `quiz_unlocked` and `setting_int` have EXECUTE revoked from `public`, `anon` and `authenticated`.
   - That matters most for `quiz_unlocked`, which takes a user ID and could otherwise be used to probe other learners' progress.
4. **The Server Actions pass on only those fields.**
   - `src/lib/quiz/actions.ts` maps RPC rows into plain objects through `src/lib/quiz/shape.ts`, which builds each object from named fields rather than spreading the row.
   - A unit test asserts the exact keys.
5. **Nothing in the page gives an answer away.**
   - The lesson page is static and holds no quiz data.
   - Questions arrive only in a POST Server Action response, after the unlock.
   - Option IDs are random UUIDs, and option order is shuffled in the database on every request, so neither position nor ID gives the answer away.
6. **On a fail the learner is told the count, never which answers were wrong** (PRD 5.2). The attempt log stores the answers, but learners can't read that column back: the grant leaves it out.

What this can't stop is a learner changing one answer at a time and watching the count. With 3 questions of 4 options, that takes at most 9 attempts. That's the PRD's own design, and decision 2 below covers it.

---

## Decisions and flags (confirm before Task 1)

Each decision shows the recommended choice first.

**1. Fake watch progress (T-20, now due). Recommended: an elapsed-time check, closed when the duration is unknown.**
- **The problem:** the quiz unlocks at 90% watched, but "watched" is whatever the browser reports. Anyone who can open the developer tools can call the progress action with 100% without playing the video. T-20 was accepted for Phase 3 on the grounds that Phase 4 grades on the server, but grading doesn't fix this, and Phase 5 certificates will rest on it.
- **Recommended:**
  - Record when the learner's first progress save for a lesson arrived (`first_progress_at`).
  - The quiz unlocks only when `max_percent ≥ 90` and at least 45% of the video's length has passed since that first save. 45% is 90% of the video watched at Vimeo's fastest speed, 2×.
  - If a lesson has no `duration_seconds`, its quiz stays locked. Each video needs its length entered with its Vimeo ID (by hand until the Phase 6 admin area).
- **What this does and doesn't stop:** it stops instant fakes. Someone determined can still leave a muted tab open, and that limit is recorded in the threat model.
- *Alternative:* keep trusting the reported percentage, as in Phase 3.

**2. The answer-count oracle. Recommended: keep the PRD behaviour and record the risk as accepted.**
- On a fail the learner is told "2 of 3 correct" (PRD 5.2, BRAND.md microcopy). By changing one answer at a time, someone can find the right answers in at most 9 attempts, which is inside the 10-per-hour limit.
- Decision 1 means they must still have had the video open for its length. The quiz is a learning check, and the count helps genuine learners.
- *Alternatives:* show only pass or fail (this changes the approved copy), or allow 5 attempts an hour (this only slows it down).

**3. When questions are sent. Recommended: only once the quiz is unlocked, and only to signed-in learners.**
- Signed-out visitors and locked learners get the status only. That stops questions being harvested and keeps them off cached pages.

**4. Retakes after passing. Recommended: allowed.**
- A pass stays a pass, and later fails don't undo it. Every attempt is logged (PRD 6.4).

**5. Layout. Recommended: one question per screen on every screen size.**
- BUILD_PLAN asks for this on mobile. Using it everywhere keeps one layout to build and test.
- The screen shows "Question 1 of 3" with Back and Next, then "Submit answers".

**6. Attempt limit. Recommended: 10 per learner per lesson per rolling hour, enforced in the database.**
- The limit lives in `submit_quiz` and is set by a new `quiz_attempts_per_hour` setting (default 10, PRD 6.4).
- A per-learner advisory lock stops parallel requests from getting past the limit.
- There's no Netlify edge rule, because Server Actions post to the page URL and the database count already applies per learner.
- Draft copy for the limit: "That's 10 goes in the last hour. Have another look at the video and try again later."

**7. Placeholder questions. Recommended: local and staging only.**
- `supabase/seed.sql` gets 2–3 `[PLACEHOLDER]` questions for every lesson.
- Production gets no questions in this phase. A lesson without a valid quiz shows no quiz panel.
- Real questions are written alongside each video script (PRD production note), and you review them. They go in through a reviewed migration until the admin area exists.

**8. Dashboard "complete". Recommended: a lesson counts as complete when its quiz is passed.**
- Phase 3 decision 11 planned this change. Certification needs every core quiz passed (Phase 5).
- Lessons that have no quiz yet still count as complete at 90% watched, so nothing goes backwards while questions are being written.
- The Carbon Certified counter becomes "X of Y core lessons complete", with the line "A lesson is complete when you pass its quiz" (draft copy).
- Passed lessons show a "Passed" badge.

**9. Lessons without a video. Recommended: no quiz panel.**
- The placeholder "Video coming soon" lessons can't be watched, so they show no quiz.

**10. The signed-out prompt.**
- Below the video, PRD 5.1's text: "Want to test your knowledge? Sign in to take the quiz."
- It links to `/sign-in?next=<lesson path>`. Lesson paths are already on the redirect allowlist.

**11. Analytics.**
- The `quiz_start`, `quiz_pass` and `quiz_fail` events from PRD 6.7 go through `track()`, with slugs only. Scores and answers are never sent (control 20).
- GA4 still isn't loaded (D6), so `track()` stays a no-op.

**12. Quiz copy.**
- Pass and fail copy comes from the BRAND.md microcopy table.
- Draft copy for your approval:
  - Locked: "Watch the video to unlock the quiz."
  - Ready: "A few quick questions on this lesson. Pick one answer for each."
  - The rate-limit message from decision 6
  - Error: the BRAND.md error message
- The button is "TAKE THE QUIZ" (BRAND.md primary CTA).

**13. Validating questions.**
- A quiz is "ready" only if every one of its questions has 3–4 options and exactly one correct option (PRD 8).
- At most one correct option is enforced by a unique index. The full rule is checked by `quiz_ready`, and if any question breaks it the quiz is hidden (fail closed) rather than half-shown.

**14. Logging (control 15).**
- New events: `quiz_submitted` (user ID, lesson ID, passed), `quiz_rate_limited` and `quiz_submit_failed` (code only).
- Answers are never logged (SECURITY.md rule).

**15. Back to the lesson after signing in. Recommended: yes, for lesson pages only.**
- Today every sign-in link lands on `/dashboard`.
- The sign-in page would accept `?next=/lessons/<category>/<lesson>`, check it against the existing allowlist (`safeNextPath`, T-13), and put it in the magic link.
- Supabase only honours redirect URLs on its allow list. Locally `localhost:3000/**` already covers it; you add `<site>/lessons/**` on staging and production in the Auth settings, as for Phase 3.

**16. Remote changes (staging, then production).**
- These use the same flow as Phase 3, and I ask before each one:
  - apply the migration
  - align the version
  - seed placeholders on staging only
  - give one staging lesson a test Vimeo ID and duration, so the full flow can be tried on the deploy preview

---

## How it fits together

```
Lesson page (static, cached)
├── VimeoPlayer (client) ──saveProgress()──▶ save_lesson_progress()   [Phase 3]
│        └── after a save, dispatches "academy:progress-saved" { lessonId, percent }
└── QuizPanel (client)
         ├── getQuizStatus(lessonId) ─▶ quiz_status()   → unavailable | signed_out | locked | ready | passed
         ├── startQuiz(lessonId)     ─▶ get_quiz()      → questions + shuffled options (no is_correct)
         └── submitQuiz(input)       ─▶ submit_quiz()   → { score, total, passed } or a coded refusal
Dashboard (dynamic, no-store) ─▶ quiz_attempts (own rows, no answers column) + lesson_progress
```

- Every arrow into the database uses the learner's own session.
- Every function starts from `current_learner()`, which runs the Phase 3 live-session check, so no function ever takes a user ID from the caller.

## File structure

| File | Responsibility |
|---|---|
| `supabase/migrations/<ts>_quizzes.sql` | Tables, grants, RLS, the `first_progress_at` column, settings row, functions |
| `supabase/seed.sql` | `[PLACEHOLDER]` questions for every seeded lesson (local and staging only) |
| `tests/db/quiz.test.ts` | Every route to `is_correct` refused; unlock, grading, validation, limit, attempt reads |
| `src/types/database.ts` | Regenerated |
| `src/lib/quiz/shape.ts` (+ test) | Pure: group RPC rows into questions, map refusals to UI states, build the answers object |
| `src/lib/quiz/actions.ts` (+ test) | Server Actions: `getQuizStatus`, `startQuiz`, `submitQuiz` (Zod, logging) |
| `src/lib/validation/quiz.ts` (+ test) | Zod schemas for quiz input |
| `src/lib/analytics/track.ts` | Adds the quiz events |
| `src/components/quiz/QuizPanel.tsx` | Client: state machine for status, questions, result |
| `src/components/quiz/QuizQuestion.tsx` | One question: fieldset, radio options at least 44 px high |
| `src/components/quiz/QuizResult.tsx` | Pass and fail states |
| `src/components/video/VimeoPlayer.tsx` | Dispatches `academy:progress-saved` after a successful save |
| `src/app/lessons/[category]/[lesson]/page.tsx` | Renders `QuizPanel` for lessons with a video |
| `src/lib/dashboard/data.ts`, `summary.ts` (+ test) | "Complete" = quiz passed (decision 8) |
| `src/app/(account)/dashboard/page.tsx` | "core lessons complete", Passed badges |
| `src/app/(account)/sign-in/page.tsx`, `SignInForm.tsx`, `src/lib/auth/actions.ts`, `src/lib/validation/account.ts` | `?next=` lesson path carried into the magic link (decision 15) |
| `docs/security/*`, `docs/SECURITY.md` | Threat model, permissions, ASVS, evidence, log inventory |

---

## Task 0: Branch

- [ ] **Step 1:** Create the branch from an up-to-date `main`.

```bash
git switch main && git pull --ff-only && git switch -c feat/phase-4-quizzes
```

- [ ] **Step 2:** Commit this plan.

```bash
git add docs/superpowers/plans/2026-10-29-phase-4-quizzes.md
git commit -m "docs: Phase 4 quizzes plan"
```

---

## Task 1: Security design before code (section 5, controls 04, 05, 15, 22)

**Files:** `docs/security/THREAT_MODEL.md`, `docs/security/PERMISSIONS.md`, `docs/security/ASVS.md`, `docs/SECURITY.md` (log inventory)

- [ ] **Step 1: Threat model.** Update T-20 and add T-30 to T-36:

| ID | Asset / entry | Threat | STRIDE | Control | Status |
|---|---|---|---|---|---|
| T-20 | Lesson progress | Learner fakes watch progress | Tampering | **Phase 4:** the quiz unlocks only at ≥ 90% and at least 45% of the video's length after the first progress save. There's no quiz without a known duration (decision 1). A muted, open tab still passes, and that residual risk is accepted | Mitigated (residual accepted) |
| T-30 | `answer_options.is_correct` | Learner reads correct answers through REST, embedding, GraphQL or an RPC | Information disclosure | No grants on `questions` or `answer_options`; functions return only named non-answer columns; helpers not executable; DB tests for every route | Mitigated |
| T-31 | `submit_quiz` | Brute force using the "X of Y correct" count | Information disclosure | 10 attempts per learner per lesson per hour; unlock needs real elapsed watch time. Residual risk accepted (decision 2) | Accepted |
| T-32 | `submit_quiz` | Attempt flooding or parallel requests to get past the limit | Denial of service, Tampering | Count in the database, under a per-learner, per-lesson advisory lock | Mitigated |
| T-33 | `submit_quiz` | Crafted answers: another question's option, missing or extra keys, a non-object | Tampering | Must answer every question exactly once with that question's own options; otherwise `22023`, nothing logged | Mitigated |
| T-34 | `quiz_attempts` | Reading or writing another learner's attempts | Information disclosure, Tampering | RLS on own rows; select grant without `answers`; no insert, update or delete grants | Mitigated |
| T-35 | `get_quiz` | Harvesting questions without watching, or for unpublished lessons | Information disclosure | Returns rows only when the lesson is published and unlocked for the caller | Mitigated |
| T-36 | Lesson page cache | Quiz data cached on the shared static page | Information disclosure | Questions only travel in POST Server Action responses; the page holds no quiz data (control 14) | Mitigated |

- [ ] **Step 2: Permissions matrix.** Add rows to `PERMISSIONS.md`:

| Resource | Anon | Learner (own) | Learner (others) | How |
|---|---|---|---|---|
| `questions` | none | none (via `get_quiz` when unlocked) | none | no grants |
| `answer_options` (incl. `is_correct`) | none | none | none | no grants |
| `quiz_attempts` read | none | id, lesson, score, total, passed, time | none | column grant + RLS |
| `quiz_attempts` write | none | only through `submit_quiz` | none | no grants |
| `quiz_status()` | yes (says "signed out") | yes | n/a | definer, `current_learner()` |
| `get_quiz()`, `submit_quiz()` | no | yes | n/a | definer, `current_learner()` |
| `lessons_with_quiz()` | no | yes (IDs of lessons with a quiz) | n/a | definer |
| `quiz_ready()`, `quiz_unlocked()`, `setting_int()` | no | no | no | EXECUTE revoked |

- [ ] **Step 3: ASVS register.** Read each requirement from the published 5.0.0 files, never from memory. Fetch them with Node from the OWASP repo into `_tools/asvs`, which is already cached from Phase 3. Mark rows for:
  - business logic sequencing and limits (V2)
  - input validation (V1, V2)
  - access control to data (V8)
  - sensitive data in responses (V14)
  - logging (V16)

  Use the exact IDs from the files.

- [ ] **Step 4: Log inventory.** Add `quiz_submitted`, `quiz_rate_limited` and `quiz_submit_failed` to SECURITY.md section 10, with fields and "never: answers".

- [ ] **Step 5: Commit.**

```bash
git add docs/security docs/SECURITY.md
git commit -m "docs(security): Phase 4 threat model, permissions and log inventory"
```

---

## Task 2: Database migration (controls 04, 05, 06, 22)

**Files:** Create `supabase/migrations/<timestamp>_quizzes.sql` (make it with `npx supabase migration new quizzes`).

- [ ] **Step 1: Write the migration.**

```sql
-- Phase 4: quizzes (PRD 5.2, 6.4 and 8; docs/security/PERMISSIONS.md; T-20, T-30 to T-36).
-- Correct answers never leave the database. Learners have no grant on questions or
-- answer_options. Quizzes are read and graded only through the security definer functions
-- below, which start from current_learner() and never return is_correct (controls 04, 06).

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  prompt text not null check (length(prompt) between 1 and 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index questions_lesson_id_idx on public.questions (lesson_id);

create table public.answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  text text not null check (length(text) between 1 and 200),
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);

create index answer_options_question_id_idx on public.answer_options (question_id);
-- At most one correct option per question. quiz_ready() checks there is exactly one.
create unique index answer_options_one_correct_idx
  on public.answer_options (question_id) where is_correct;

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  -- { question_id: option_id } as submitted (PRD 6.4). Never readable by learners.
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  score smallint not null check (score >= 0),
  total smallint not null check (total > 0 and score <= total),
  passed boolean not null,
  created_at timestamptz not null default now()
);

create index quiz_attempts_user_lesson_idx
  on public.quiz_attempts (user_id, lesson_id, created_at desc);
create index quiz_attempts_lesson_id_idx on public.quiz_attempts (lesson_id);

-- When the first progress save for a lesson arrived, for the watch-time check (decision 1).
alter table public.lesson_progress
  add column first_progress_at timestamptz not null default now();

alter table public.questions enable row level security;
alter table public.answer_options enable row level security;
alter table public.quiz_attempts enable row level security;

revoke all on public.questions, public.answer_options, public.quiz_attempts
  from anon, authenticated;

-- Learners read their own results for the dashboard, but never the answers they gave (T-34).
grant select (id, user_id, lesson_id, score, total, passed, created_at)
  on public.quiz_attempts to authenticated;

create policy "Learners read their own quiz attempts"
  on public.quiz_attempts for select to authenticated
  using (user_id = (select public.current_learner()));

insert into public.settings (key, value, description) values
  ('quiz_attempts_per_hour', '10', 'Quiz attempts allowed per learner per lesson per hour (PRD 6.4)');

-- A whole-number setting, clamped, with a fallback when it's missing or malformed.
create function public.setting_int(p_key text, p_default integer, p_min integer, p_max integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select least(greatest(floor((s.value)::text::numeric)::integer, p_min), p_max)
     from public.settings s
     where s.key = p_key and jsonb_typeof(s.value) = 'number'),
    p_default
  )
$$;

-- A quiz is ready when it has at least one question and every question has 3 or 4 options
-- with exactly one correct (PRD 8). Anything else hides the quiz rather than half-showing it.
create function public.quiz_ready(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.questions q where q.lesson_id = p_lesson_id)
    and not exists (
      select 1
      from public.questions q
      left join public.answer_options o on o.question_id = q.id
      where q.lesson_id = p_lesson_id
      group by q.id
      having count(o.id) not between 3 and 4
          or count(o.id) filter (where o.is_correct) <> 1
    )
$$;

-- The quiz unlocks at 90% watched, and only once at least 45% of the video's length has passed
-- since the learner's first progress save: 90% of the video at Vimeo's fastest speed (2x).
-- No known duration, no quiz (decision 1, T-20). Takes a user ID, so it is never an API.
create function public.quiz_unlocked(p_user uuid, p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
    where lp.user_id = p_user
      and lp.lesson_id = p_lesson_id
      and l.published
      and l.duration_seconds is not null
      and lp.max_percent >= 90
      and now() - lp.first_progress_at >= make_interval(secs => l.duration_seconds * 0.45)
  )
$$;

-- What the lesson page should show. Anyone may ask; it reveals only whether a quiz exists.
create function public.quiz_status(p_lesson_id uuid)
returns table (state text, attempts_left integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.current_learner();
  v_limit integer := public.setting_int('quiz_attempts_per_hour', 10, 1, 100);
  v_used integer;
begin
  if not exists (select 1 from public.lessons l where l.id = p_lesson_id and l.published)
     or not public.quiz_ready(p_lesson_id) then
    return query select 'unavailable'::text, 0;
    return;
  end if;
  if v_user is null then
    return query select 'signed_out'::text, 0;
    return;
  end if;
  if not public.quiz_unlocked(v_user, p_lesson_id) then
    return query select 'locked'::text, 0;
    return;
  end if;

  select count(*) into v_used
  from public.quiz_attempts a
  where a.user_id = v_user and a.lesson_id = p_lesson_id
    and a.created_at > now() - interval '1 hour';

  return query select
    case when exists (
      select 1 from public.quiz_attempts a
      where a.user_id = v_user and a.lesson_id = p_lesson_id and a.passed
    ) then 'passed'::text else 'ready'::text end,
    greatest(v_limit - v_used, 0);
end;
$$;

-- Questions and options for an unlocked quiz, options shuffled on every call (PRD 5.2).
-- Exactly four columns, never is_correct (T-30). Locked or not ready returns no rows (T-35).
create function public.get_quiz(p_lesson_id uuid)
returns table (question_id uuid, prompt text, option_id uuid, option_text text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.current_learner();
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not public.quiz_ready(p_lesson_id) or not public.quiz_unlocked(v_user, p_lesson_id) then
    return;
  end if;

  return query
    select q.id, q.prompt, o.id, o.text
    from public.questions q
    join public.answer_options o on o.question_id = q.id
    where q.lesson_id = p_lesson_id
    order by q.sort_order, q.id, random();
end;
$$;

-- Grades on the server and logs the attempt (PRD 5.2, 6.4). Returns only the score, the total
-- and pass or fail. Refusals use their own codes so the app can tell them apart:
--   42501 not signed in, CAQ01 locked or no quiz, CAQ02 attempt limit, 22023 bad answers.
create function public.submit_quiz(p_lesson_id uuid, p_answers jsonb)
returns table (score integer, total integer, passed boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.current_learner();
  v_limit integer := public.setting_int('quiz_attempts_per_hour', 10, 1, 100);
  v_pass_mark integer := public.setting_int('pass_mark_percent', 100, 1, 100);
  v_total integer;
  v_valid integer;
  v_score integer;
  v_passed boolean;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not public.quiz_ready(p_lesson_id) or not public.quiz_unlocked(v_user, p_lesson_id) then
    raise exception 'quiz locked' using errcode = 'CAQ01';
  end if;

  -- One grading at a time per learner and lesson, so parallel requests can't beat the limit (T-32).
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_lesson_id::text, 0));

  if (
    select count(*) from public.quiz_attempts a
    where a.user_id = v_user and a.lesson_id = p_lesson_id
      and a.created_at > now() - interval '1 hour'
  ) >= v_limit then
    raise exception 'too many attempts' using errcode = 'CAQ02';
  end if;

  -- Every question answered exactly once, each with one of its own options, nothing else (T-33).
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'answers must be an object' using errcode = '22023';
  end if;

  select count(*) into v_total from public.questions q where q.lesson_id = p_lesson_id;

  select count(*) into v_valid
  from jsonb_each_text(p_answers) a
  join public.questions q on q.id::text = a.key and q.lesson_id = p_lesson_id
  join public.answer_options o on o.id::text = a.value and o.question_id = q.id;

  if v_valid <> v_total or (select count(*) from jsonb_object_keys(p_answers)) <> v_total then
    raise exception 'answer every question once' using errcode = '22023';
  end if;

  select count(*) into v_score
  from jsonb_each_text(p_answers) a
  join public.answer_options o on o.id::text = a.value and o.is_correct
  join public.questions q on q.id = o.question_id and q.id::text = a.key
  where q.lesson_id = p_lesson_id;

  v_passed := v_score * 100 >= v_total * v_pass_mark;

  insert into public.quiz_attempts (user_id, lesson_id, answers, score, total, passed)
  values (v_user, p_lesson_id, p_answers, v_score, v_total, v_passed);

  update public.profiles set last_active_at = now()
  where id = v_user and last_active_at < now() - interval '1 hour';

  return query select v_score, v_total, v_passed;
end;
$$;

-- Published lessons that have a ready quiz, for the dashboard's "complete" rule (decision 8).
-- Says only that a quiz exists, as quiz_status already does.
create function public.lessons_with_quiz()
returns table (lesson_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id from public.lessons l where l.published and public.quiz_ready(l.id)
$$;

-- Postgres grants EXECUTE to PUBLIC by default, and Supabase's default privileges grant it to
-- anon and authenticated, so revoke from all three before granting back (as in Phase 3).
revoke all on function public.lessons_with_quiz() from public, anon, authenticated;
grant execute on function public.lessons_with_quiz() to authenticated;
revoke all on function public.setting_int(text, integer, integer, integer)
  from public, anon, authenticated;
revoke all on function public.quiz_ready(uuid) from public, anon, authenticated;
revoke all on function public.quiz_unlocked(uuid, uuid) from public, anon, authenticated;
revoke all on function public.quiz_status(uuid) from public, anon, authenticated;
revoke all on function public.get_quiz(uuid) from public, anon, authenticated;
revoke all on function public.submit_quiz(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.quiz_status(uuid) to anon, authenticated;
grant execute on function public.get_quiz(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
```

- [ ] **Step 2: Apply it locally and regenerate the types.**

```bash
npm run db:reset && npm run db:types
```

Expected: the reset finishes without errors, and `src/types/database.ts` gains `questions`, `answer_options`, `quiz_attempts` and the four granted functions.

- [ ] **Step 3: Run the Supabase advisor locally** (`npx supabase db lint`). Review every warning. A SECURITY DEFINER warning on the four granted functions is expected and intended, as with `log_qr_scan` in Phase 2. Record each review in the PR.

---

## Task 3: Database tests: answers never leave the database (controls 04, 05, 22; "Done when" 1 and 3)

**Files:** Create `tests/db/quiz.test.ts`

Each test builds its own lesson fixture with the secret key, so the tests don't depend on seed content, and deletes it afterwards. The lesson's questions cascade with it.

- [ ] **Step 1: Write the tests.**

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { admin, publicClient } from './clients'
import { createTestUser, deleteTestUser, type TestUser } from './users'

// Security framework controls 04, 05 and 22; threat model T-20 and T-30 to T-36.
// "Done when": is_correct can't be retrieved by a learner through any API route, and the
// quiz stays locked until 90% watched.

const DURATION = 100 // seconds; the watch-time check needs 45 s since the first save
let alice: TestUser | undefined
let bob: TestUser | undefined
let lessonId: string
let unpublishedId: string
const correct: Record<string, string> = {} // question id -> correct option id
const wrong: Record<string, string> = {} // question id -> a wrong option id

async function makeLesson(published: boolean, duration: number | null) {
  const { data: category } = await admin.from('categories').select('id').limit(1).single()
  const { data, error } = await admin
    .from('lessons')
    .insert({
      category_id: category!.id,
      slug: `quiz-test-${crypto.randomUUID().slice(0, 8)}`,
      title: 'Quiz test lesson',
      duration_seconds: duration,
      published,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

async function addQuestion(lesson: string, sortOrder: number, optionCount = 3) {
  const { data: q, error } = await admin
    .from('questions')
    .insert({ lesson_id: lesson, prompt: `Question ${sortOrder}`, sort_order: sortOrder })
    .select('id')
    .single()
  if (error) throw error
  const options = Array.from({ length: optionCount }, (_, i) => ({
    question_id: q.id,
    text: `Option ${i + 1}`,
    is_correct: i === 0,
  }))
  const { data: opts, error: optError } = await admin
    .from('answer_options')
    .insert(options)
    .select('id, is_correct')
  if (optError) throw optError
  return {
    questionId: q.id as string,
    correctId: opts.find((o) => o.is_correct)!.id as string,
    wrongId: opts.find((o) => !o.is_correct)!.id as string,
  }
}

/** Saves progress as the learner, then backdates the first save by `ageSeconds`. */
async function watch(user: TestUser, lesson: string, percent: number, ageSeconds: number) {
  const { error } = await user.client.rpc('save_lesson_progress', {
    p_lesson_id: lesson,
    p_percent: percent,
    p_position_seconds: 10,
  })
  if (error) throw error
  await admin
    .from('lesson_progress')
    .update({
      max_percent: percent,
      first_progress_at: new Date(Date.now() - ageSeconds * 1000).toISOString(),
    })
    .eq('user_id', user.id)
    .eq('lesson_id', lesson)
}

const submit = (user: TestUser, answers: unknown, lesson = lessonId) =>
  user.client.rpc('submit_quiz', { p_lesson_id: lesson, p_answers: answers }).single()

beforeAll(async () => {
  alice = await createTestUser('quiz-alice')
  bob = await createTestUser('quiz-bob')
  lessonId = await makeLesson(true, DURATION)
  for (const n of [1, 2]) {
    const q = await addQuestion(lessonId, n)
    correct[q.questionId] = q.correctId
    wrong[q.questionId] = q.wrongId
  }
  unpublishedId = await makeLesson(false, DURATION)
  await addQuestion(unpublishedId, 1)
})

afterAll(async () => {
  await admin.from('lessons').delete().in('id', [lessonId, unpublishedId])
  await deleteTestUser(alice)
  await deleteTestUser(bob)
})

describe('is_correct is unreachable (T-30)', () => {
  it.each([
    ['answer_options', '*'],
    ['answer_options', 'is_correct'],
    ['answer_options', 'id, text'],
    ['questions', '*'],
  ])('a learner cannot select %s (%s)', async (table, columns) => {
    const { data, error } = await alice!.client.from(table).select(columns)
    expect(data).toBeNull()
    expect(error?.code).toBe('42501')
  })

  it('anon cannot select answer_options either', async () => {
    const { data, error } = await publicClient.from('answer_options').select('is_correct')
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('cannot be reached by embedding from lessons', async () => {
    const { data, error } = await alice!.client
      .from('lessons')
      .select('id, questions(id, answer_options(is_correct))')
      .eq('id', lessonId)
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('is not exposed through GraphQL', async () => {
    const token = (await alice!.client.auth.getSession()).data.session!.access_token
    const res = await fetch(`${process.env.SUPABASE_TEST_URL}/graphql/v1`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_TEST_PUBLISHABLE_KEY!,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ answerOptionsCollection { edges { node { isCorrect } } } }' }),
    })
    const body = await res.text()
    expect(body).not.toMatch(/"isCorrect"\s*:\s*(true|false)/)
  })

  it.each([
    ['quiz_ready', { p_lesson_id: 'LESSON' }],
    ['quiz_unlocked', { p_user: 'USER', p_lesson_id: 'LESSON' }],
    ['setting_int', { p_key: 'pass_mark_percent', p_default: 1, p_min: 1, p_max: 100 }],
  ])('helper %s is not callable by a learner', async (fn, args) => {
    const filled = JSON.parse(
      JSON.stringify(args).replace('LESSON', lessonId).replace('USER', alice!.id),
    )
    const { error } = await alice!.client.rpc(fn, filled)
    expect(error).not.toBeNull()
  })

  it('get_quiz returns exactly four columns and no answer data', async () => {
    await watch(alice!, lessonId, 95, 60)
    const { data, error } = await alice!.client.rpc('get_quiz', { p_lesson_id: lessonId })
    expect(error).toBeNull()
    expect(data).toHaveLength(6)
    for (const row of data!) {
      expect(Object.keys(row).sort()).toEqual(['option_id', 'option_text', 'prompt', 'question_id'])
    }
    expect(JSON.stringify(data)).not.toContain('is_correct')
  })

  it('submit_quiz returns only score, total and passed', async () => {
    const { data, error } = await submit(alice!, wrong)
    expect(error).toBeNull()
    expect(Object.keys(data!).sort()).toEqual(['passed', 'score', 'total'])
  })
})

describe('unlocking (T-20, T-35)', () => {
  it('is locked with no progress', async () => {
    const { data } = await bob!.client.rpc('quiz_status', { p_lesson_id: lessonId }).single()
    expect(data).toEqual({ state: 'locked', attempts_left: 0 })
    const { data: rows } = await bob!.client.rpc('get_quiz', { p_lesson_id: lessonId })
    expect(rows).toEqual([])
    expect((await submit(bob!, correct)).error?.code).toBe('CAQ01')
  })

  it('stays locked below 90% watched', async () => {
    await watch(bob!, lessonId, 89, 600)
    const { data } = await bob!.client.rpc('quiz_status', { p_lesson_id: lessonId }).single()
    expect(data!.state).toBe('locked')
  })

  it('stays locked when 100% is reported faster than the video can play', async () => {
    await watch(bob!, lessonId, 100, 10) // 10 s after the first save; 45 s are needed
    const { data } = await bob!.client.rpc('quiz_status', { p_lesson_id: lessonId }).single()
    expect(data!.state).toBe('locked')
  })

  it('unlocks at 90% once enough time has passed', async () => {
    await watch(bob!, lessonId, 90, 46)
    const { data } = await bob!.client.rpc('quiz_status', { p_lesson_id: lessonId }).single()
    expect(data).toEqual({ state: 'ready', attempts_left: 10 })
  })

  it('stays locked when the lesson has no known duration', async () => {
    await admin.from('lessons').update({ duration_seconds: null }).eq('id', lessonId)
    const { data } = await bob!.client.rpc('quiz_status', { p_lesson_id: lessonId }).single()
    expect(data!.state).toBe('locked')
    await admin.from('lessons').update({ duration_seconds: DURATION }).eq('id', lessonId)
  })

  it('reports unavailable for an unpublished lesson, even with progress', async () => {
    await admin
      .from('lesson_progress')
      .insert({ user_id: bob!.id, lesson_id: unpublishedId, max_percent: 100, first_progress_at: '2020-01-01T00:00:00Z' })
    const { data } = await bob!.client.rpc('quiz_status', { p_lesson_id: unpublishedId }).single()
    expect(data!.state).toBe('unavailable')
    const { data: rows } = await bob!.client.rpc('get_quiz', { p_lesson_id: unpublishedId })
    expect(rows).toEqual([])
  })

  it('tells anon only that a quiz exists', async () => {
    const { data } = await publicClient.rpc('quiz_status', { p_lesson_id: lessonId }).single()
    expect(data).toEqual({ state: 'signed_out', attempts_left: 0 })
    const { error } = await publicClient.rpc('get_quiz', { p_lesson_id: lessonId })
    expect(error).not.toBeNull()
  })
})

describe('grading (PRD 5.2, D4)', () => {
  it('passes with every answer correct, and records the attempt', async () => {
    const { data } = await submit(bob!, correct)
    expect(data).toEqual({ score: 2, total: 2, passed: true })
    const { data: status } = await bob!.client
      .rpc('quiz_status', { p_lesson_id: lessonId })
      .single()
    expect(status!.state).toBe('passed')
  })

  it('fails with one wrong and keeps the earlier pass (decision 4)', async () => {
    const [q1] = Object.keys(correct)
    const { data } = await submit(bob!, { ...correct, [q1]: wrong[q1] })
    expect(data).toEqual({ score: 1, total: 2, passed: false })
    const { data: status } = await bob!.client
      .rpc('quiz_status', { p_lesson_id: lessonId })
      .single()
    expect(status!.state).toBe('passed')
  })
})

describe('answer validation (T-33)', () => {
  it.each([
    ['a missing question', () => ({ [Object.keys(correct)[0]]: Object.values(correct)[0] })],
    ['an extra key', () => ({ ...correct, [crypto.randomUUID()]: crypto.randomUUID() })],
    [
      "another question's option",
      () => {
        const [a, b] = Object.keys(correct)
        return { [a]: correct[b], [b]: correct[a] }
      },
    ],
    ['an array', () => Object.values(correct)],
    ['a string', () => 'all of them'],
    ['a non-uuid value', () => Object.fromEntries(Object.keys(correct).map((k) => [k, 42]))],
  ])('rejects %s with 22023 and logs nothing', async (_, build) => {
    const before = await admin
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', bob!.id)
    const { error } = await submit(bob!, build())
    expect(error?.code).toBe('22023')
    const after = await admin
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', bob!.id)
    expect(after.count).toBe(before.count)
  })
})

describe('attempt limit (T-31, T-32)', () => {
  it('refuses the 11th attempt in an hour, for that learner only', async () => {
    await admin.from('quiz_attempts').delete().eq('user_id', alice!.id)
    const rows = Array.from({ length: 10 }, () => ({
      user_id: alice!.id,
      lesson_id: lessonId,
      answers: {},
      score: 0,
      total: 2,
      passed: false,
    }))
    await admin.from('quiz_attempts').insert(rows)
    expect((await submit(alice!, correct)).error?.code).toBe('CAQ02')
    const { data } = await alice!.client.rpc('quiz_status', { p_lesson_id: lessonId }).single()
    expect(data!.attempts_left).toBe(0)
    // Bob has his own allowance.
    expect((await submit(bob!, correct)).error).toBeNull()
  })

  it('counts only the last hour', async () => {
    await admin
      .from('quiz_attempts')
      .update({ created_at: new Date(Date.now() - 61 * 60 * 1000).toISOString() })
      .eq('user_id', alice!.id)
    expect((await submit(alice!, correct)).error).toBeNull()
  })
})

describe('quiz_attempts access (T-34)', () => {
  it('a learner reads only their own results, without answers', async () => {
    const { data, error } = await bob!.client
      .from('quiz_attempts')
      .select('user_id, lesson_id, score, total, passed')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
    expect(data!.every((r) => r.user_id === bob!.id)).toBe(true)
  })

  it('cannot read the answers column', async () => {
    const { error } = await bob!.client.from('quiz_attempts').select('answers')
    expect(error?.code).toBe('42501')
  })

  it('cannot insert, update or delete attempts directly', async () => {
    const insert = await bob!.client.from('quiz_attempts').insert({
      user_id: bob!.id,
      lesson_id: lessonId,
      answers: {},
      score: 2,
      total: 2,
      passed: true,
    })
    expect(insert.error).not.toBeNull()
    const update = await bob!.client.from('quiz_attempts').update({ passed: true }).eq('user_id', bob!.id)
    expect(update.error).not.toBeNull()
    const del = await bob!.client.from('quiz_attempts').delete().eq('user_id', bob!.id)
    expect(del.error).not.toBeNull()
  })
})

describe('quiz validity (decision 13)', () => {
  it('hides a quiz with a question that has only two options', async () => {
    const broken = await makeLesson(true, DURATION)
    await addQuestion(broken, 1, 2)
    const { data } = await bob!.client.rpc('quiz_status', { p_lesson_id: broken }).single()
    expect(data!.state).toBe('unavailable')
    await admin.from('lessons').delete().eq('id', broken)
  })

  it('refuses a second correct option on one question', async () => {
    const [q1] = Object.keys(correct)
    const { error } = await admin
      .from('answer_options')
      .insert({ question_id: q1, text: 'Also right', is_correct: true })
    expect(error?.code).toBe('23505')
  })

  it('lists lessons with a ready quiz for the dashboard', async () => {
    const { data, error } = await bob!.client.rpc('lessons_with_quiz')
    expect(error).toBeNull()
    expect(data!.map((r) => r.lesson_id)).toContain(lessonId)
    expect(data!.map((r) => r.lesson_id)).not.toContain(unpublishedId)
  })
})
```

- [ ] **Step 2: Run them.** Use `npm run test:db`. Expected: every Phase 3 test still passes, along with the new `quiz.test.ts` tests.

- [ ] **Step 3: Mutation checks.** Commit first, because a mutation on an uncommitted file can't be restored with `git checkout` (Phase 2 lesson). Make each change below in a scratch migration, run `npm run db:reset && npm run test:db`, and confirm the named tests fail:
  1. `grant select on public.answer_options to authenticated;` makes the T-30 select tests fail.
  2. Add `o.is_correct` as a fifth `get_quiz` column. The four-columns test fails.
  3. Remove the `now() - lp.first_progress_at` line. The "faster than the video can play" test fails.
  4. Change `>= v_limit` to `> v_limit + 100`. The 11th-attempt test fails.
  5. Remove the `v_valid <> v_total` check. The "another question's option" test fails.

  Then delete the scratch migration and re-run. Record the results in EVIDENCE.md (control 04).

- [ ] **Step 4: Commit.**

```bash
git add supabase/migrations tests/db/quiz.test.ts src/types/database.ts
git commit -m "feat(db): quizzes with server-side grading and no client access to answers"
```

---

## Task 4: Placeholder questions in the seed (decision 7)

**Files:** Modify `supabase/seed.sql`

- [ ] **Step 1:** Append to the seed. Every option is marked `[PLACEHOLDER]`, so it can't be mistaken for real content. The seed runs locally and on staging only, never on production.

```sql
-- Phase 4 placeholder quizzes (decision 7): three questions per lesson, three options each,
-- the first option correct. Local and staging only. Real questions are written with each
-- video script and reviewed by Rich before they reach production.
with q as (
  insert into public.questions (lesson_id, prompt, sort_order)
  select l.id, format('[PLACEHOLDER] Question %s about %s?', n, l.title), n
  from public.lessons l
  cross join generate_series(1, 3) as n
  returning id
)
insert into public.answer_options (question_id, text, is_correct)
select q.id, o.text, o.is_correct
from q
cross join (values
  ('[PLACEHOLDER] The right answer', true),
  ('[PLACEHOLDER] A wrong answer', false),
  ('[PLACEHOLDER] Another wrong answer', false)
) as o (text, is_correct);
```

- [ ] **Step 2:** Run `npm run db:reset && npm run test:db`. Expected: everything passes.
- [ ] **Step 3:** Commit with `git commit -am "chore(seed): placeholder quiz questions for local and staging"`.

---

## Task 5: Input schema and pure helpers (controls 05, 07)

**Files:**
- Create `src/lib/validation/quiz.ts` and `src/lib/validation/quiz.test.ts`
- Create `src/lib/quiz/shape.ts` and `src/lib/quiz/shape.test.ts`

- [ ] **Step 1: Write the failing tests.**

`src/lib/validation/quiz.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { QuizSubmission } from './quiz'

const L = '3f9a1c2e-4b5d-4e6f-8a7b-9c0d1e2f3a4b'
const Q = '0b8e5a52-1c4d-4f0e-9b1a-2c3d4e5f6a7b'
const O = '7c6d5e4f-3a2b-4c1d-8e9f-0a1b2c3d4e5f'

describe('QuizSubmission (control 05)', () => {
  it('accepts a lesson ID and an answer map, lower-casing the IDs', () => {
    const parsed = QuizSubmission.parse({ lessonId: L.toUpperCase(), answers: { [Q.toUpperCase()]: O } })
    expect(parsed).toEqual({ lessonId: L, answers: { [Q]: O } })
  })

  it.each([
    { lessonId: 'nope', answers: { [Q]: O } },
    { lessonId: L, answers: {} },
    { lessonId: L, answers: { [Q]: 'not-a-uuid' } },
    { lessonId: L, answers: { 'not-a-uuid': O } },
    { lessonId: L, answers: Object.fromEntries(Array.from({ length: 11 }, () => [crypto.randomUUID(), O])) },
    { lessonId: L, answers: [O] },
    'nonsense',
  ])('rejects %j', (input) => {
    expect(QuizSubmission.safeParse(input).success).toBe(false)
  })
})
```

`src/lib/quiz/shape.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { groupQuestions, refusalFor, toQuizState } from './shape'

describe('groupQuestions', () => {
  it('groups rows in order and copies only the named fields', () => {
    const rows = [
      { question_id: 'q1', prompt: 'P1', option_id: 'a', option_text: 'A', is_correct: true },
      { question_id: 'q1', prompt: 'P1', option_id: 'b', option_text: 'B' },
      { question_id: 'q2', prompt: 'P2', option_id: 'c', option_text: 'C' },
    ]
    const questions = groupQuestions(rows)
    expect(questions).toEqual([
      { id: 'q1', prompt: 'P1', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] },
      { id: 'q2', prompt: 'P2', options: [{ id: 'c', text: 'C' }] },
    ])
    // Even if the database ever sent extra columns, they would not be passed on (layer 4).
    expect(JSON.stringify(questions)).not.toContain('is_correct')
  })
})

describe('toQuizState', () => {
  it.each(['unavailable', 'signed_out', 'locked', 'ready', 'passed'])('keeps %s', (s) => {
    expect(toQuizState(s)).toBe(s)
  })
  it('treats anything else as unavailable', () => {
    expect(toQuizState('open sesame')).toBe('unavailable')
    expect(toQuizState(undefined)).toBe('unavailable')
  })
})

describe('refusalFor', () => {
  it.each([
    ['42501', 'signed_out'],
    ['CAQ01', 'locked'],
    ['CAQ02', 'limited'],
    ['22023', 'invalid'],
    ['XX000', 'error'],
    [undefined, 'error'],
  ])('maps %s to %s', (code, reason) => {
    expect(refusalFor(code)).toBe(reason)
  })
})
```

- [ ] **Step 2:** Run `npx vitest run src/lib/validation/quiz.test.ts src/lib/quiz/shape.test.ts`. Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write the implementations.**

`src/lib/validation/quiz.ts`:

```ts
import { z } from 'zod'

/** Quiz answers from the browser (control 05). The database checks them again (T-33). */
const Id = z.uuid().transform((id) => id.toLowerCase())

export const QuizLessonId = Id

export const QuizSubmission = z.object({
  lessonId: Id,
  answers: z
    .record(z.uuid(), Id)
    .refine((a) => Object.keys(a).length >= 1 && Object.keys(a).length <= 10)
    .transform((a) =>
      Object.fromEntries(Object.entries(a).map(([q, o]) => [q.toLowerCase(), o])),
    ),
})

export type QuizSubmission = z.infer<typeof QuizSubmission>
```

`src/lib/quiz/shape.ts`:

```ts
/** Pure mapping between the quiz functions and the UI. Copies named fields only (T-30, layer 4). */

export type QuizRow = { question_id: string; prompt: string; option_id: string; option_text: string }
export type QuizOption = { id: string; text: string }
export type QuizQuestion = { id: string; prompt: string; options: QuizOption[] }

export function groupQuestions(rows: readonly QuizRow[]): QuizQuestion[] {
  const byId = new Map<string, QuizQuestion>()
  for (const row of rows) {
    let question = byId.get(row.question_id)
    if (!question) {
      question = { id: row.question_id, prompt: row.prompt, options: [] }
      byId.set(row.question_id, question)
    }
    question.options.push({ id: row.option_id, text: row.option_text })
  }
  return [...byId.values()]
}

const STATES = ['unavailable', 'signed_out', 'locked', 'ready', 'passed'] as const
export type QuizState = (typeof STATES)[number]

export function toQuizState(value: unknown): QuizState {
  return STATES.find((s) => s === value) ?? 'unavailable'
}

export type QuizRefusal = 'signed_out' | 'locked' | 'limited' | 'invalid' | 'error'

const REFUSALS: Record<string, QuizRefusal> = {
  '42501': 'signed_out',
  CAQ01: 'locked',
  CAQ02: 'limited',
  '22023': 'invalid',
}

export function refusalFor(code: string | undefined): QuizRefusal {
  return (code && REFUSALS[code]) || 'error'
}
```

- [ ] **Step 4:** Run the two test files again. Expected: PASS.
- [ ] **Step 5:** Commit with `git commit -m "feat(quiz): input schema and result mapping"`.

---

## Task 6: Server Actions (controls 04, 05, 15)

**Files:**
- Create `src/lib/quiz/actions.ts` and `src/lib/quiz/actions.test.ts`
- Modify `src/lib/log.ts`

- [ ] **Step 1: Extend the logger.** These are new events. `lessonId` and `outcome` are new optional fields, and answers are still never logged.

```ts
type SecurityEvent =
  | 'sign_in_link_failed'
  | 'join_link_failed'
  | 'sign_in_failed'
  | 'sign_in_succeeded'
  | 'sign_out_failed'
  | 'honeypot_tripped'
  | 'store_code_not_found'
  | 'progress_save_failed'
  | 'store_change_failed'
  | 'quiz_submitted'
  | 'quiz_rate_limited'
  | 'quiz_submit_failed'

/**
 * IDs, error codes and pass or fail only. Never emails, names, form data, tokens, URLs or quiz
 * answers (control 15, T-22).
 */
type Fields = {
  userId?: string
  code?: string
  requestId?: string
  lessonId?: string
  outcome?: 'passed' | 'failed'
}
```

- [ ] **Step 2: Write the failing tests.** Mock the session client the same way `src/lib/progress/actions.test.ts` does.

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const getClaims = vi.fn()
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createSessionClient: async () => ({ auth: { getClaims }, rpc }),
}))
const log = vi.fn()
vi.mock('@/lib/log', () => ({ logSecurityEvent: (...args: unknown[]) => log(...args) }))

const { getQuizStatus, startQuiz, submitQuiz } = await import('./actions')
const L = '3f9a1c2e-4b5d-4e6f-8a7b-9c0d1e2f3a4b'
const Q = '0b8e5a52-1c4d-4f0e-9b1a-2c3d4e5f6a7b'
const O = '7c6d5e4f-3a2b-4c1d-8e9f-0a1b2c3d4e5f'

/** rpc() returns a builder with .single() for single-row calls, and a promise for others. */
function rpcResult(result: unknown) {
  const promise = Promise.resolve(result)
  return Object.assign(promise, { single: () => promise })
}

beforeEach(() => {
  rpc.mockReset()
  log.mockReset()
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null })
})

describe('getQuizStatus', () => {
  it('returns the state and attempts left', async () => {
    rpc.mockReturnValue(rpcResult({ data: { state: 'ready', attempts_left: 7 }, error: null }))
    expect(await getQuizStatus(L)).toEqual({ state: 'ready', attemptsLeft: 7 })
    expect(rpc).toHaveBeenCalledWith('quiz_status', { p_lesson_id: L })
  })

  it('is unavailable for a bad ID or a database error', async () => {
    expect(await getQuizStatus('nope')).toEqual({ state: 'unavailable', attemptsLeft: 0 })
    rpc.mockReturnValue(rpcResult({ data: null, error: { code: 'XX000' } }))
    expect(await getQuizStatus(L)).toEqual({ state: 'unavailable', attemptsLeft: 0 })
  })
})

describe('startQuiz', () => {
  it('groups questions and passes on only the named fields', async () => {
    rpc.mockReturnValue(
      rpcResult({
        data: [{ question_id: Q, prompt: 'P', option_id: O, option_text: 'T', is_correct: true }],
        error: null,
      }),
    )
    const result = await startQuiz(L)
    expect(result).toEqual({ ok: true, questions: [{ id: Q, prompt: 'P', options: [{ id: O, text: 'T' }] }] })
    expect(JSON.stringify(result)).not.toContain('is_correct')
  })

  it('is locked when nothing comes back, and signed out without a session', async () => {
    rpc.mockReturnValue(rpcResult({ data: [], error: null }))
    expect(await startQuiz(L)).toEqual({ ok: false, reason: 'locked' })
    getClaims.mockResolvedValue({ data: null, error: null })
    expect(await startQuiz(L)).toEqual({ ok: false, reason: 'signed_out' })
  })
})

describe('submitQuiz (a public endpoint: authenticates and validates itself)', () => {
  it('grades through the database without passing a user ID, and logs no answers', async () => {
    rpc.mockReturnValue(rpcResult({ data: { score: 2, total: 3, passed: false }, error: null }))
    expect(await submitQuiz({ lessonId: L, answers: { [Q]: O } })).toEqual({
      ok: true,
      score: 2,
      total: 3,
      passed: false,
    })
    expect(rpc).toHaveBeenCalledWith('submit_quiz', { p_lesson_id: L, p_answers: { [Q]: O } })
    expect(log).toHaveBeenCalledWith('quiz_submitted', { userId: 'user-1', lessonId: L, outcome: 'failed' })
    expect(JSON.stringify(log.mock.calls)).not.toContain(O)
  })

  it.each([
    ['CAQ02', 'limited', 'quiz_rate_limited'],
    ['CAQ01', 'locked', 'quiz_submit_failed'],
    ['22023', 'invalid', 'quiz_submit_failed'],
  ])('maps database code %s to %s', async (code, reason, event) => {
    rpc.mockReturnValue(rpcResult({ data: null, error: { code } }))
    expect(await submitQuiz({ lessonId: L, answers: { [Q]: O } })).toEqual({ ok: false, reason })
    expect(log).toHaveBeenCalledWith(event, { userId: 'user-1', lessonId: L, code })
  })

  it('rejects bad input and signed-out callers without touching the database', async () => {
    expect(await submitQuiz({ lessonId: L, answers: { [Q]: 'x' } })).toEqual({ ok: false, reason: 'invalid' })
    getClaims.mockResolvedValue({ data: null, error: null })
    expect(await submitQuiz({ lessonId: L, answers: { [Q]: O } })).toEqual({ ok: false, reason: 'signed_out' })
    expect(rpc).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3:** Run `npx vitest run src/lib/quiz/actions.test.ts`. Expected: FAIL with "Cannot find module".

- [ ] **Step 4: Write the actions.**

```ts
'use server'

import { logSecurityEvent } from '@/lib/log'
import { type QuizQuestion, type QuizRefusal, type QuizState, groupQuestions, refusalFor, toQuizState } from '@/lib/quiz/shape'
import { createSessionClient } from '@/lib/supabase/server'
import { QuizLessonId, QuizSubmission } from '@/lib/validation/quiz'

// Called from public, static lesson pages. Each action authenticates and validates itself;
// the database functions check the session, unlock, limit and answers again (controls 04, 05).
// Questions only ever travel in these POST responses, never in the cached page (T-36).

export type QuizStatus = { state: QuizState; attemptsLeft: number }
export type StartResult = { ok: true; questions: QuizQuestion[] } | { ok: false; reason: QuizRefusal }
export type SubmitResult =
  | { ok: true; score: number; total: number; passed: boolean }
  | { ok: false; reason: QuizRefusal }

async function signedInClient() {
  const supabase = await createSessionClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims.sub ? { supabase, userId: data.claims.sub } : null
}

export async function getQuizStatus(lessonId: unknown): Promise<QuizStatus> {
  const parsed = QuizLessonId.safeParse(lessonId)
  if (!parsed.success) return { state: 'unavailable', attemptsLeft: 0 }
  const supabase = await createSessionClient()
  const { data, error } = await supabase.rpc('quiz_status', { p_lesson_id: parsed.data }).single()
  if (error || !data) return { state: 'unavailable', attemptsLeft: 0 }
  return { state: toQuizState(data.state), attemptsLeft: data.attempts_left }
}

export async function startQuiz(lessonId: unknown): Promise<StartResult> {
  const parsed = QuizLessonId.safeParse(lessonId)
  if (!parsed.success) return { ok: false, reason: 'invalid' }
  const session = await signedInClient()
  if (!session) return { ok: false, reason: 'signed_out' }
  const { data, error } = await session.supabase.rpc('get_quiz', { p_lesson_id: parsed.data })
  if (error) return { ok: false, reason: refusalFor(error.code) }
  const questions = groupQuestions(data ?? [])
  return questions.length ? { ok: true, questions } : { ok: false, reason: 'locked' }
}

export async function submitQuiz(input: unknown): Promise<SubmitResult> {
  const parsed = QuizSubmission.safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'invalid' }
  const session = await signedInClient()
  if (!session) return { ok: false, reason: 'signed_out' }
  const { lessonId, answers } = parsed.data
  const { data, error } = await session.supabase
    .rpc('submit_quiz', { p_lesson_id: lessonId, p_answers: answers })
    .single()
  if (error || !data) {
    const reason = refusalFor(error?.code)
    logSecurityEvent(reason === 'limited' ? 'quiz_rate_limited' : 'quiz_submit_failed', {
      userId: session.userId,
      lessonId,
      code: error?.code,
    })
    return { ok: false, reason }
  }
  logSecurityEvent('quiz_submitted', {
    userId: session.userId,
    lessonId,
    outcome: data.passed ? 'passed' : 'failed',
  })
  return { ok: true, score: data.score, total: data.total, passed: data.passed }
}
```

- [ ] **Step 5:** Run `npx vitest run src/lib/quiz`, then `npm run typecheck`. Expected: PASS. If the generated RPC return types are nullable, narrow them in the action rather than loosening the tests.
- [ ] **Step 6:** Commit with `git commit -m "feat(quiz): server actions for status, questions and grading"`.

---

## Task 7: Analytics events (PRD 6.7, control 20; decision 11)

**Files:** Modify `src/lib/analytics/track.ts` and `src/lib/analytics/track.test.ts`

- [ ] **Step 1:** Add a test asserting that `track('quiz_pass', props)` pushes `{ event: 'quiz_pass', lesson_slug, category_slug }`, and that it does nothing when `window.dataLayer` doesn't exist. Use the existing video test as the pattern.
- [ ] **Step 2:** Widen the type. The props stay slugs only.

```ts
export type VideoEvent = 'video_start' | 'video_progress_50' | 'video_complete'
export type QuizEvent = 'quiz_start' | 'quiz_pass' | 'quiz_fail'
export type EventProps = { lesson_slug: string; category_slug: string }

export function track(event: VideoEvent | QuizEvent, props: EventProps): void {
```

- [ ] **Step 3:** Run `npx vitest run src/lib/analytics`. Expected: PASS. Add `quiz_start`, `quiz_pass` and `quiz_fail` to `docs/security/TAG_INVENTORY.md` under the analytics wrapper.
- [ ] **Step 4:** Commit with `git commit -am "feat(analytics): quiz events, slugs only"`.

---

## Task 8: Back to the lesson after signing in (decision 15; controls 02, 12; T-13)

**Files:**
- Modify `src/lib/validation/account.ts`, `src/lib/auth/actions.ts`, `src/app/(account)/sign-in/page.tsx` and `src/app/(account)/sign-in/SignInForm.tsx`
- Tests: `src/lib/validation/account.test.ts` and `src/lib/auth/actions.test.ts`

The local stack already allows `http://localhost:3000/**`. The hosted projects need `<site>/lessons/**` added to Auth → URL Configuration → Redirect URLs, and you make that change in Task 13.

- [ ] **Step 1: Write the failing tests.**
  - In `actions.test.ts`, a form posting `next=/lessons/winches/scout-pro-10k-v3` calls `signInWithOtp` with `emailRedirectTo: ${site}/lessons/winches/scout-pro-10k-v3`.
  - `next=https://evil.example/x` and `next=/admin` both give `${site}/dashboard`.
  - In `account.test.ts`, `SignInInput` accepts a missing `next` and rejects one over 500 characters.

- [ ] **Step 2:** Run `npx vitest run src/lib/auth src/lib/validation`. Expected: FAIL.

- [ ] **Step 3: Implement.**

`src/lib/validation/account.ts`:

```ts
export const SignInInput = z.object({
  email: Email,
  website: Honeypot,
  // Checked against the allowlist by safeNextPath before use (T-13).
  next: z.string().max(500).optional(),
})
```

`src/lib/auth/actions.ts`, in `sendSignInLink`:

```ts
  const landing = safeNextPath(parsed.data.next, siteUrl())
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl()}${landing}` },
  })
```

`src/app/(account)/sign-in/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/ui/Container'
import { safeNextPath } from '@/lib/auth/next-path'
import { getCurrentUser } from '@/lib/auth/session'
import { siteUrl } from '@/lib/site'
import { SignInForm } from './SignInForm'

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } }

// Per-request page: navigations between account pages are checked separately from the layout's
// opt-out, so each page opts out of instant navigation too (Next.js 16 instant-navigation guide).
export const instant = false

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
  const { next } = await searchParams
  // Only allowlisted paths survive (T-13); anything else becomes /dashboard.
  const landing = safeNextPath(typeof next === 'string' ? next.slice(0, 500) : null, siteUrl())
  if (await getCurrentUser()) redirect(landing)
  return (
    <Container className="max-w-xl py-10 md:py-14">
      <h1 className="text-h1 md:text-h1-lg">Sign in</h1>
      <p className="mt-4">
        Enter your email and we&apos;ll send you a sign-in link. No password needed.
      </p>
      <SignInForm next={landing} />
    </Container>
  )
}
```

Check that `siteUrl` is exported from `src/lib/site.ts` under that name, as `src/lib/auth/actions.ts` uses it. Then, in `SignInForm.tsx`, take `{ next }: { next: string }` and add `<input type="hidden" name="next" value={next} />` beside `<Honeypot />`.

- [ ] **Step 4:** Run `npx vitest run src/lib/auth src/lib/validation && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit with `git commit -m "feat(auth): return to the lesson after signing in"`.

---

## Task 9: Quiz components (brand p.25, p.45, p.49; BRAND.md Website style and microcopy; WCAG 2.1 AA)

**Files:**
- Create `src/lib/progress/events.ts`
- Create `src/components/quiz/copy.ts`, `QuizQuestion.tsx`, `QuizResult.tsx` and `QuizPanel.tsx`
- Create `src/components/quiz/QuizPanel.test.tsx`

- [ ] **Step 1: Shared event name.** `src/lib/progress/events.ts`:

```ts
/** Sent by the video player after a progress save, so the quiz can unlock without a reload. */
export const PROGRESS_SAVED = 'academy:progress-saved'
export type ProgressSavedDetail = { lessonId: string; percent: number }
```

- [ ] **Step 2: Copy.** `src/components/quiz/copy.ts`:

```ts
// Pass and fail lines are the BRAND.md microcopy. The rest is draft copy, awaiting Rich's
// approval (brand p.69, plan decision 12).
export const QUIZ_COPY = {
  signedOut: 'Want to test your knowledge? Sign in to take the quiz.',
  sessionEnded: 'Your session has ended. Sign in again to take the quiz.',
  locked: 'Watch the video to unlock the quiz.',
  ready: 'A few quick questions on this lesson. Pick one answer for each.',
  passedBefore: "You've passed this quiz. Take it again any time.",
  limited: "That's 10 goes in the last hour. Have another look at the video and try again later.",
  pass: "Nailed it. That's one more lesson done.",
  fail: (score: number, total: number) =>
    `${score} of ${total} correct. Have another look at the video and try again.`,
  error: 'Something went wrong on our end. Give it another go in a minute.',
}
```

- [ ] **Step 3: One question.** `src/components/quiz/QuizQuestion.tsx`. Each option is a real radio input inside a label, so it works with the keyboard and screen readers. The option rows are at least 44 px high, use field corners and a Concrete border (3.2:1, WCAG 1.4.11), and get a black border when chosen.

```tsx
import type { Ref } from 'react'
import type { QuizQuestion as Question } from '@/lib/quiz/shape'

export function QuizQuestion({
  question,
  number,
  total,
  selected,
  onSelect,
  focusRef,
}: {
  question: Question
  number: number
  total: number
  selected: string | undefined
  onSelect: (optionId: string) => void
  focusRef: Ref<HTMLLegendElement>
}) {
  return (
    <fieldset>
      <legend ref={focusRef} tabIndex={-1} className="text-h3 font-semibold">
        <span className="block text-small font-normal">
          Question {number} of {total}
        </span>
        {question.prompt}
      </legend>
      <div className="mt-4 flex flex-col gap-3">
        {question.options.map((option) => (
          <label
            key={option.id}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-field border-2 border-concrete bg-white px-4 py-3 has-checked:border-carbon-black"
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option.id}
              checked={selected === option.id}
              onChange={() => onSelect(option.id)}
              className="h-5 w-5 shrink-0 accent-carbon-black"
            />
            <span>{option.text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
```

- [ ] **Step 4: Result.** `src/components/quiz/QuizResult.tsx`. The fail state shows the count only, never which answers were wrong (PRD 5.2).

```tsx
import { Button } from '@/components/ui/Button'
import { QUIZ_COPY } from './copy'

export function QuizResult({
  score,
  total,
  passed,
  canRetry,
  onRetry,
}: {
  score: number
  total: number
  passed: boolean
  canRetry: boolean
  onRetry: () => void
}) {
  return (
    <div>
      <p className="text-h3 font-extrabold">{passed ? QUIZ_COPY.pass : QUIZ_COPY.fail(score, total)}</p>
      {!passed && canRetry && (
        <div className="mt-6">
          <Button onClick={onRetry}>Try again</Button>
        </div>
      )}
      {!passed && !canRetry && <p className="mt-4">{QUIZ_COPY.limited}</p>}
    </div>
  )
}
```

- [ ] **Step 5: The panel.** `src/components/quiz/QuizPanel.tsx`.
  - It renders nothing while loading, and nothing when the lesson has no quiz.
  - Results are announced through `aria-live="polite"`.
  - Focus moves to the question on every step and to the result when it arrives (WCAG 2.4.3).
  - The panel never holds `is_correct`, because nothing it calls returns it.

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { type EventProps, track } from '@/lib/analytics/track'
import { PROGRESS_SAVED, type ProgressSavedDetail } from '@/lib/progress/events'
import { type QuizStatus, getQuizStatus, startQuiz, submitQuiz } from '@/lib/quiz/actions'
import type { QuizQuestion as Question, QuizRefusal } from '@/lib/quiz/shape'
import { QUIZ_COPY } from './copy'
import { QuizQuestion } from './QuizQuestion'
import { QuizResult } from './QuizResult'

type View =
  | { kind: 'loading' }
  | { kind: 'status'; status: QuizStatus }
  | {
      kind: 'taking'
      questions: Question[]
      step: number
      answers: Record<string, string>
      sending: boolean
    }
  | { kind: 'result'; score: number; total: number; passed: boolean; attemptsLeft: number }
  | { kind: 'refused'; reason: QuizRefusal }

type Props = { lessonId: string; lessonPath: string; analytics: EventProps }

export function QuizPanel({ lessonId, lessonPath, analytics }: Props) {
  const [view, setView] = useState<View>({ kind: 'loading' })
  const focusTarget = useRef<HTMLElement | null>(null)
  const signInHref = `/sign-in?next=${encodeURIComponent(lessonPath)}`

  const refresh = useCallback(() => {
    void getQuizStatus(lessonId).then((status) => setView({ kind: 'status', status }))
  }, [lessonId])

  useEffect(refresh, [refresh])

  // Unlock without a reload when the player saves 90% (decision 1 still applies on the server).
  const locked = view.kind === 'status' && view.status.state === 'locked'
  useEffect(() => {
    if (!locked) return
    const onSaved = (event: Event) => {
      const detail = (event as CustomEvent<ProgressSavedDetail>).detail
      if (detail?.lessonId === lessonId && detail.percent >= 90) refresh()
    }
    window.addEventListener(PROGRESS_SAVED, onSaved)
    return () => window.removeEventListener(PROGRESS_SAVED, onSaved)
  }, [locked, lessonId, refresh])

  const stepKey = view.kind === 'taking' ? view.step : view.kind
  useEffect(() => {
    if (view.kind === 'taking' || view.kind === 'result') focusTarget.current?.focus()
  }, [stepKey, view.kind])

  async function begin() {
    const result = await startQuiz(lessonId)
    if (!result.ok) return setView({ kind: 'refused', reason: result.reason })
    track('quiz_start', analytics)
    setView({ kind: 'taking', questions: result.questions, step: 0, answers: {}, sending: false })
  }

  async function send(answers: Record<string, string>) {
    setView((v) => (v.kind === 'taking' ? { ...v, sending: true } : v))
    const result = await submitQuiz({ lessonId, answers })
    if (!result.ok) return setView({ kind: 'refused', reason: result.reason })
    track(result.passed ? 'quiz_pass' : 'quiz_fail', analytics)
    const status = await getQuizStatus(lessonId)
    setView({
      kind: 'result',
      score: result.score,
      total: result.total,
      passed: result.passed,
      attemptsLeft: status.attemptsLeft,
    })
  }

  if (view.kind === 'loading') return null
  if (view.kind === 'status' && view.status.state === 'unavailable') return null

  return (
    <section
      aria-labelledby={`quiz-${lessonId}`}
      className="mt-10 max-w-2xl rounded-card bg-white p-6 md:p-8"
    >
      <h2 id={`quiz-${lessonId}`} className="text-h2">
        Quiz
      </h2>
      <div aria-live="polite" className="mt-4">
        {view.kind === 'status' && (
          <StatusBody status={view.status} signInHref={signInHref} onStart={begin} />
        )}
        {view.kind === 'taking' && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const last = view.step === view.questions.length - 1
              if (last) void send(view.answers)
              else setView({ ...view, step: view.step + 1 })
            }}
          >
            <QuizQuestion
              question={view.questions[view.step]}
              number={view.step + 1}
              total={view.questions.length}
              selected={view.answers[view.questions[view.step].id]}
              onSelect={(optionId) =>
                setView({
                  ...view,
                  answers: { ...view.answers, [view.questions[view.step].id]: optionId },
                })
              }
              focusRef={(el) => {
                focusTarget.current = el
              }}
            />
            <div className="mt-6 flex flex-wrap gap-3">
              {view.step > 0 && (
                <Button variant="secondary" onClick={() => setView({ ...view, step: view.step - 1 })}>
                  Back
                </Button>
              )}
              <Button
                type="submit"
                disabled={!view.answers[view.questions[view.step].id] || view.sending}
              >
                {view.step === view.questions.length - 1 ? 'Submit answers' : 'Next'}
              </Button>
            </div>
          </form>
        )}
        {view.kind === 'result' && (
          <div
            ref={(el) => {
              focusTarget.current = el
            }}
            tabIndex={-1}
          >
            <QuizResult
              score={view.score}
              total={view.total}
              passed={view.passed}
              canRetry={view.attemptsLeft > 0}
              onRetry={begin}
            />
          </div>
        )}
        {view.kind === 'refused' && (
          <RefusedBody reason={view.reason} signInHref={signInHref} onRetry={begin} />
        )}
      </div>
    </section>
  )
}

function StatusBody({
  status,
  signInHref,
  onStart,
}: {
  status: QuizStatus
  signInHref: string
  onStart: () => void
}) {
  if (status.state === 'signed_out') {
    return (
      <>
        <p>{QUIZ_COPY.signedOut}</p>
        <div className="mt-6">
          <ButtonLink href={signInHref} variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </>
    )
  }
  if (status.state === 'locked') return <p>{QUIZ_COPY.locked}</p>
  return (
    <>
      {status.state === 'passed' && (
        <p className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Passed</Badge>
          {QUIZ_COPY.passedBefore}
        </p>
      )}
      {status.attemptsLeft > 0 ? (
        <>
          <p className={status.state === 'passed' ? 'mt-3' : ''}>{QUIZ_COPY.ready}</p>
          <div className="mt-6">
            <Button onClick={onStart}>Take the quiz</Button>
          </div>
        </>
      ) : (
        <p className="mt-3">{QUIZ_COPY.limited}</p>
      )}
    </>
  )
}

function RefusedBody({
  reason,
  signInHref,
  onRetry,
}: {
  reason: QuizRefusal
  signInHref: string
  onRetry: () => void
}) {
  if (reason === 'signed_out') {
    return (
      <>
        <p>{QUIZ_COPY.sessionEnded}</p>
        <div className="mt-6">
          <ButtonLink href={signInHref} variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </>
    )
  }
  if (reason === 'locked') return <p>{QUIZ_COPY.locked}</p>
  if (reason === 'limited') return <p>{QUIZ_COPY.limited}</p>
  return (
    <>
      <p>{QUIZ_COPY.error}</p>
      <div className="mt-6">
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </>
  )
}
```

  If the `react-hooks/set-state-in-effect` lint rule flags `useEffect(refresh, [refresh])`, the fix is to keep `setView` inside the `.then()` callback, as it is here. If the rule still objects, use the `useSyncExternalStore` pattern from Phase 3's `ConfirmForm`. Don't disable the rule.

- [ ] **Step 6: Component test.** `src/components/quiz/QuizPanel.test.tsx` mocks `@/lib/quiz/actions` and `@/lib/analytics/track`, then checks:
  1. `unavailable` renders nothing.
  2. `signed_out` renders the prompt, with a link to `/sign-in?next=%2Flessons%2Fwinches%2Fx`.
  3. `locked` renders the locked copy. Dispatching `academy:progress-saved` with 90% for this lesson calls `getQuizStatus` again, and dispatching it for another lesson doesn't.
  4. In `ready`, clicking "Take the quiz" shows "Question 1 of 2". "Next" is disabled until an option is chosen. Choosing and pressing Next shows question 2, and "Submit answers" calls `submitQuiz` with `{ lessonId, answers: { q1: a, q2: c } }`.
  5. A `{ ok: true, passed: false, score: 1, total: 2 }` result shows "1 of 2 correct. Have another look at the video and try again." and a "Try again" button, and calls `track('quiz_fail', …)`.
  6. A pass shows "Nailed it. That's one more lesson done." and calls `track('quiz_pass', …)`.
  7. A `limited` refusal shows the limit copy and no button.

  Use plain assertions such as `getByText`, `getByRole` and `.getAttribute`, because the jest-dom matchers aren't set up (Phase 3 lesson).

- [ ] **Step 7:** Run `npx vitest run src/components/quiz && npm run lint && npm run typecheck`. Expected: PASS. Then run the brand guard (`npm test -- tests/brand`). It allows only named radius tokens and raw hex nowhere, comments included.
- [ ] **Step 8:** Commit with `git commit -m "feat(quiz): quiz panel, one question per screen"`.

---

## Task 10: Lesson page and player wiring

**Files:** Modify `src/components/video/VimeoPlayer.tsx` and `src/app/lessons/[category]/[lesson]/page.tsx`

- [ ] **Step 1: The player announces saves.** In `save()`, replace the `.then` so that a successful save is broadcast:

```ts
      void saveProgress({ lessonId, percent, seconds: Math.floor(data.seconds) }).then((result) => {
        if (!result.saved) {
          progress.tracking = false
          return
        }
        const detail: ProgressSavedDetail = { lessonId, percent }
        window.dispatchEvent(new CustomEvent(PROGRESS_SAVED, { detail }))
      })
```

Add `import { PROGRESS_SAVED, type ProgressSavedDetail } from '@/lib/progress/events'`. Then extend `VimeoPlayer.test.tsx` with a check that a successful save dispatches the event with the lesson ID and percent.

- [ ] **Step 2: Render the panel** for lessons with a video (decision 9). In `page.tsx`, after the summary paragraph:

```tsx
      {data.vimeoId && (
        <QuizPanel
          lessonId={data.id}
          lessonPath={`/lessons/${data.category.slug}/${data.slug}`}
          analytics={{ lesson_slug: data.slug, category_slug: data.category.slug }}
        />
      )}
```

Add `import { QuizPanel } from '@/components/quiz/QuizPanel'`. The page stays static (○ in the build output), and the panel fetches everything through Server Actions after load (T-36).

- [ ] **Step 3:** Run `npm run build`. Expected: lesson routes are still `○`/`◐` as before, with no new dynamic routes. Then run `npm run check:bundle`. Expected: clean.
- [ ] **Step 4:** Commit with `git commit -m "feat(lessons): quiz below the video"`.

---

## Task 11: Dashboard: complete means passed (decision 8; PRD 6.3)

**Files:**
- Modify `src/lib/dashboard/summary.ts`, `src/lib/dashboard/summary.test.ts` and `src/lib/dashboard/data.ts`
- Modify `src/app/(account)/dashboard/page.tsx`

- [ ] **Step 1: Write failing tests** in `summary.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { summariseProgress } from './summary'

const lesson = (slug: string, isCore = true) => ({ slug, title: slug, isCore, categorySlug: 'c' })
const row = (id: string, maxPercent: number, completedAt: string | null, isCore = true) => ({
  lessonId: id,
  maxPercent,
  completedAt,
  lesson: lesson(id, isCore),
})

describe('summariseProgress (decision 8)', () => {
  const quiz = { passed: new Set(['passed']), withQuiz: new Set(['passed', 'watched-quiz']) }

  it('a lesson with a quiz is complete only when passed', () => {
    const d = summariseProgress(
      [row('passed', 100, 'x'), row('watched-quiz', 100, 'x'), row('no-quiz', 95, 'x')],
      5,
      quiz,
    )
    expect(d.completed.map((l) => [l.title, l.passed])).toEqual([
      ['passed', true],
      ['no-quiz', false],
    ])
    expect(d.inProgress.map((l) => l.title)).toEqual(['watched-quiz'])
    expect(d.core).toEqual({ done: 2, total: 5 })
  })

  it('a lesson with no quiz still completes at 90% watched', () => {
    const d = summariseProgress([row('no-quiz', 50, null)], 1, quiz)
    expect(d.inProgress).toHaveLength(1)
    expect(d.core.done).toBe(0)
  })
})
```

Replace the existing Phase 3 cases with these. The old "complete = 90% watched" rule now only applies to lessons without a quiz.

- [ ] **Step 2:** Run `npx vitest run src/lib/dashboard`. Expected: FAIL.

- [ ] **Step 3: Implement.** In `summary.ts`:

```ts
export type ProgressRow = {
  lessonId: string
  maxPercent: number
  completedAt: string | null
  lesson: { slug: string; title: string; isCore: boolean; categorySlug: string } | null
}

export type DashboardLesson = {
  href: string
  title: string
  percent: number
  isCore: boolean
  passed: boolean
}

export type QuizResults = { passed: ReadonlySet<string>; withQuiz: ReadonlySet<string> }

/**
 * Complete means the lesson's quiz is passed (decision 8). A lesson with no quiz yet still
 * completes at 90% watched (Phase 3 decision 11), so nothing goes backwards while questions
 * are written.
 */
export function summariseProgress(
  rows: ProgressRow[],
  totalCore: number,
  quiz: QuizResults,
): Dashboard {
  const visible = rows.filter(
    (r): r is ProgressRow & { lesson: NonNullable<ProgressRow['lesson']> } => r.lesson !== null,
  )
  const isComplete = (r: (typeof visible)[number]) =>
    quiz.withQuiz.has(r.lessonId) ? quiz.passed.has(r.lessonId) : r.completedAt !== null
  const toLesson = (r: (typeof visible)[number]): DashboardLesson => ({
    href: `/lessons/${r.lesson.categorySlug}/${r.lesson.slug}`,
    title: r.lesson.title,
    percent: r.maxPercent,
    isCore: r.lesson.isCore,
    passed: quiz.passed.has(r.lessonId),
  })
  const completed = visible.filter(isComplete)
  return {
    inProgress: visible.filter((r) => !isComplete(r)).map(toLesson),
    completed: completed.map(toLesson),
    core: { done: completed.filter((r) => r.lesson.isCore).length, total: totalCore },
  }
}
```

In `data.ts`, fetch the learner's passes and the lessons that have quizzes alongside progress. These are their own rows only, under RLS, and never cached:

```ts
  const [progress, passes, withQuiz, library] = await Promise.all([
    supabase
      .from('lesson_progress')
      .select('lesson_id, max_percent, completed_at, lessons(slug, title, is_core, categories(slug))')
      .order('updated_at', { ascending: false }),
    supabase.from('quiz_attempts').select('lesson_id').eq('passed', true),
    supabase.rpc('lessons_with_quiz'),
    getLibrary(),
  ])
  if (progress.error || passes.error || withQuiz.error) throw new Error('Could not load progress')
  const totalCore = library.flatMap((c) => c.lessons).filter((l) => l.isCore).length
  return summariseProgress(
    progress.data.map((r) => ({
      lessonId: r.lesson_id,
      maxPercent: r.max_percent,
      completedAt: r.completed_at,
      lesson: r.lessons
        ? {
            slug: r.lessons.slug,
            title: r.lessons.title,
            isCore: r.lessons.is_core,
            categorySlug: r.lessons.categories?.slug ?? '',
          }
        : null,
    })),
    totalCore,
    {
      passed: new Set(passes.data.map((p) => p.lesson_id)),
      withQuiz: new Set(withQuiz.data.map((l) => l.lesson_id)),
    },
  )
```

- [ ] **Step 4: The dashboard page.** Make these changes in `src/app/(account)/dashboard/page.tsx`:
  - The counter line becomes `… of {core.total} core lessons complete`.
  - The explainer becomes "A lesson is complete when you pass its quiz. Complete every core lesson to become Carbon Certified." (draft copy), and "Quizzes are on the way." is removed.
  - In the in-progress list, a lesson at 90% or more shows the line "Take the quiz to complete it." (draft copy) under its progress bar.
  - In the completed list, `{lesson.passed && <Badge tone="accent">Passed</Badge>}` appears after the title.

- [ ] **Step 5:** Run `npx vitest run src/lib/dashboard && npm run typecheck && npm run lint`. Expected: PASS.
- [ ] **Step 6:** Commit with `git commit -m "feat(dashboard): lessons complete when the quiz is passed"`.

---

## Task 12: Local verification (CLAUDE.md "before calling a task done"; "Done when" 2)

- [ ] **Step 1: Full suite.** All of these must pass:

```bash
npm run lint && npm run typecheck && npm test && npm run test:db && npm run build && npm run check:bundle
```

- [ ] **Step 2: A local lesson with a video.** This is local only. Using the secret key or Studio on the local stack, give the seeded `scout-pro-10k-v3` lesson Vimeo's public demo video ID (the one used in Phase 2) and a `duration_seconds` of 20. Twenty seconds makes the watch-time wait short, at 9 seconds.

- [ ] **Step 3: Walk the flows** at 375 px and 1280 px on a production build (`npx next start`), signed in through the sign-in page as a fictional `@example.com` learner created in local Studio. The sign-in links arrive in the local Mailpit inbox:
  1. Signed out: the prompt appears, Sign in goes to `/sign-in?next=…`, the emailed link (in Mailpit) lands back on the lesson.
  2. Signed in, before watching: "Watch the video to unlock the quiz."
  3. Play to the end: the panel unlocks without a reload.
  4. Fail on purpose: "2 of 3 correct…" with no hint of which was wrong, then Try again. The options come back in a new order.
  5. Pass: "Nailed it…". The dashboard shows the lesson complete with a Passed badge, and the core counter goes up.
  6. Do 10 attempts: the limit copy appears and there's no button.
  7. Keyboard only: Tab and the arrow keys work the radios, Enter goes to the next question, and focus moves to each question and to the result.

  On phones the browser pane drops clicks. Where that happens, drive the form with `requestSubmit()` (Phase 3 lesson) and say so in the evidence.

- [ ] **Step 4: Network check (T-30, T-36).** In the browser's network log for the whole flow, search every response body for `is_correct` and `isCorrect`. Expected: no matches. Also confirm that the lesson HTML contains no question text.

- [ ] **Step 5:** Run Lighthouse (mobile) on the lesson page. The targets are accessibility 100 and LCP under 2.5 s (PRD). Then run the header matrix (`node ../_tools/header-matrix.mjs http://localhost:3000`). Expected: identical to the restyle run.

- [ ] **Step 6: Brand check** against the PDF pages:
  - p.25: contrast, and no cyan text on white
  - p.45: buttons
  - p.49: form fields
  - p.16: tone, with no exclamation marks
  - BRAND.md microcopy

  Cite the pages in the PR, and list the draft copy for your approval.

---

## Task 13: Staging, then production (ask Rich before each remote change)

- [ ] **Step 1: Staging, after your OK.**
  - Apply the migration and align `supabase_migrations.schema_migrations` with the repo file name (Phase 1 lesson: the MCP assigns its own version).
  - Run the security advisor and review every warning.
  - Seed the placeholder questions on staging.
  - Set a test Vimeo ID and duration on one staging lesson.
- [ ] **Step 2: You:** add `https://<preview host>/lessons/**` and `https://carbonoffroadacademy.netlify.app/lessons/**` to the Redirect URLs on staging (`checklist: _tools/staging-auth-checklist.md`, updated).
- [ ] **Step 3: You, on the deploy preview:** walk flows 1–7 from Task 12 in your own browser (the pane doesn't keep the Netlify login), and run Lighthouse on the lesson.
- [ ] **Step 4: Production, after you merge and give the OK.**
  - Apply the migration and align its version.
  - Run the advisor.
  - **No seed and no questions.** Production quizzes stay hidden until real questions are approved.
  - You add `/lessons/**` to the production Redirect URLs.
  - Re-run the live header matrix.

---

## Task 14: Evidence and the PR (CLAUDE.md security and brand checks)

- [ ] **Step 1:** Re-read controls 04, 05, 06, 15, 20 and 22 in the framework document, along with their verification procedures. Then record the evidence in `docs/security/EVIDENCE.md`:
  - **04:** `tests/db/quiz.test.ts` and the five mutation results
  - **05:** the Zod schemas plus the database answer validation
  - **06:** parameterised plpgsql, `search_path = ''` and schema-qualified names
  - **15:** the new events, which never log answers
  - **20:** analytics events with slugs only
  - **22:** the attempt limit and its test
- [ ] **Step 2:** Update ASVS rows, T-20 to "Mitigated (residual accepted)" and the Status table in `BUILD_PLAN.md`.
- [ ] **Step 3:** Write the PR description to `_tools/pr-phase-4.md`. It needs:
  - what changed
  - how correct answers stay on the server, with the six layers and their tests
  - the checks
  - controls 04, 05, 06, 15, 20 and 22
  - the brand pages checked
  - the draft copy for your approval
  - what's still open: real questions, a Carbon test video, and durations on every lesson

  End it with the Claude Code attribution line.

---

## Self-review against the spec

| Requirement (BUILD_PLAN Phase 4, PRD) | Where |
|---|---|
| Migrations for `questions`, `answer_options` and `quiz_attempts` | Task 2 |
| Learners never see `is_correct`; a view or RPC excludes it | Task 2 (no grants, RPCs); Task 3 tests every route |
| Grading in a server function returning score and pass or fail only | `submit_quiz`; Task 3 "exactly three columns" |
| Unlocks at 90% watched, checked on the server | `quiz_unlocked`, plus the watch-time check (decision 1); Task 3 |
| Shuffled options | `order by … random()` in `get_quiz`; Task 12 flow 4 |
| One question per screen on mobile | Task 9 (every size, decision 5) |
| Pass and fail states with BRAND.md copy; retry | Task 9 `QuizResult`, `copy.ts` |
| Correct answers not revealed on a fail (PRD 5.2) | Count only; Task 9 test 5; Task 12 flow 4 |
| Attempt limit, 10 per lesson per hour, server-side | `submit_quiz` + setting; Task 3 |
| Every attempt logged with answers, score, pass and time (PRD 6.4) | `quiz_attempts`; answers not readable by learners |
| Pass mark configurable (PRD 5.2, D4) | `pass_mark_percent` setting read in `submit_quiz` |
| `[PLACEHOLDER]` seed questions | Task 4 (local and staging only, decision 7) |
| The dashboard shows passed lessons | Task 11 |
| Signed-out prompt below the video (PRD 5.1) | Task 9 `signed_out`; Task 8 returns to the lesson |
| Analytics `quiz_start`, `quiz_pass`, `quiz_fail` (PRD 6.7) | Task 7, Task 9 |
| Security controls 04, 05 and 22 | Tasks 1–3, 6, 14 |
| "Done when": no route to `is_correct` (tested) | Task 3 `is_correct is unreachable` + Task 12 Step 4 |
| "Done when": pass and fail work on mobile | Task 12 Step 3 at 375 px, Task 13 Step 3 |
| "Done when": locked until 90% watched | Task 3 `unlocking`; Task 12 flows 2–3 |
