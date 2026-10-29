# Phase 5: Certification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Rich approved all 16 decisions on 30 October 2026, as recommended. The task-by-task plan follows them.

**Goal:** Store staff who pass every core lesson are certified automatically, with a branded PDF and a public verification page. Stores with enough certified staff become Carbon Certified Stores.

**Architecture:**
- Certificates are issued **inside the database**, in the same transaction as the quiz pass that completes the set. There's no separate step that could be skipped or run twice.
- Numbers come from a per-year counter row that's locked while it's incremented, so they're unique and gapless.
- Certificate status (active, expired or revoked) and store status are **calculated when they're read**, from dates and counts, so they're never out of date and no nightly job has to keep them right.
- The PDF is generated on request, for the certificate's owner only. It's never stored.
- `/verify/...` and `/api/certified-stores` are public, read-only and rate limited, and they return named fields only.

**Tech stack:** Next.js 16.4.3 (Cache Components), Supabase Postgres (security definer functions), Zod, Vitest, a PDF library (decision 3), and a transactional email provider (decision 2).

**Spec:**
- `docs/BUILD_PLAN.md` Phase 5
- `docs/PRD.md` sections 5.4, 5.5, 6.3 and 6.5, and decisions D1–D3 and D5
- `docs/BRAND.md`: "Certificate PDF", "Email" and microcopy
- Security framework controls 04, 06, 10, 12, 15, 19 and 22

---

## How the certificate number stays unique under concurrent passes

The kick-off prompt asks for this first.

**The race.** A learner has passed 8 of 9 core quizzes. They submit the last one in two tabs at once, or two of their last quizzes finish at the same moment. Each of those transactions sees "every core lesson passed" and tries to issue a certificate. That could mean two certificates for one learner, or two learners taking the same number.

**The design:**

1. **One issuer per learner at a time.** The issue function starts with `pg_advisory_xact_lock` on the learner's ID. The second transaction waits until the first commits, then re-checks eligibility. By then it can see the certificate that was just issued, so it issues nothing.
2. **Numbers from a locked counter, not a sequence.**
   - A `certificate_counters (year, last_number)` table holds one row per year.
   - Issuing runs `insert into certificate_counters (year, last_number) values (2026, 1) on conflict (year) do update set last_number = certificate_counters.last_number + 1 returning last_number`.
   - That statement takes a row lock, so concurrent issuers for different learners queue for the next number one at a time.
   - If a transaction rolls back, its increment rolls back with it, so there are no gaps.
   - A Postgres `sequence` can't give that: it leaves gaps on rollback, and it doesn't reset each year as `COA-YYYY-NNNNN` implies.
3. **Belt and braces.** There's a `unique` constraint on `certificate_number`. A check constraint enforces the `^COA-\d{4}-\d{5}$` format.
4. **Tested.** Two DB tests:
   - 20 parallel issues for 20 different learners give 20 distinct numbers, 00001 to 00020, with no gaps.
   - 10 parallel attempts for one learner give exactly one certificate.

   A mutation check removes the advisory lock and the per-learner test must fail.

---

## Decisions (confirm before the task-level plan)

The recommended choice comes first in each decision.

**1. Where certificates are issued. Recommended: in the database, inside the passing `submit_quiz` transaction.**
- BUILD_PLAN says "issuing runs server-side with the secret key only". The intent is that learners can never issue a certificate themselves.
- A security definer function that learners can't execute does that more strongly than a Server Action holding the secret key:
  - it can't be skipped
  - it can't half-happen
  - it never needs the secret key in the request path
- `submit_quiz` gains a fourth return value, `certified`, which is true only on the pass that issued a certificate. The panel can then say "You're Carbon Certified".
- The same check runs when a learner joins a store (`join_store`). A customer who already passed every core lesson is certified the moment they join (decision 7).

**2. The "You're Carbon Certified" email. Recommended: build it now, and switch on sending once D5 is decided.**
- No transactional email service exists yet. D5 is still open, and Supabase's built-in email only sends its own auth emails.
- Any provider (Resend, Postmark, Google Workspace SMTP) receives learners' names and email addresses. That needs:
  - a vendor assessment (framework section 5)
  - an APP 8 disclosure if it's overseas
  - SPF and DKIM on carbonoffroad.com.au (control 18)
- **Recommended:** build the email (brand-correct template, plain-text version, link only and no personal details beyond the first name) behind a small `sendEmail()` interface. Until a provider is chosen, it logs "would send" (without the address) and sends nothing. The dashboard shows the certificate straight away, so nobody misses out.
- *Alternative:* pick a provider now. Resend has a free tier of 3,000 emails a month (US). That adds the vendor work above to this phase.

**3. PDF library. Recommended: `pdf-lib` plus `@pdf-lib/fontkit`.**
- These are two new dependencies, both MIT-licensed pure JavaScript with no native parts. They run in a Netlify function, and they can embed a font and draw the vector logo from its SVG paths. The certificate is simple text, one rule and the logo.
- *Alternatives:*
  - `@react-pdf/renderer`: larger, and brings its own layout engine
  - a headless browser: too heavy for a serverless function

**4. Certificate font. Recommended: Arimo, an open-licence font with Arial's exact letter widths.**
- BRAND.md: "all Eurostile if a PDF-embedding licence exists, otherwise all Arial". We don't have a Eurostile embedding licence, and CLAUDE.md says never commit Eurostile files.
- Arial is Monotype's font. Embedding it in a PDF is allowed, but committing the font file to the repo (so the server can embed it) means redistributing it, which its licence doesn't allow.
- **Arimo** (Apache 2.0, from Google) was designed to be metrically identical to Arial: the same width for every letter, so it lays out exactly the same. It can be committed and embedded. Arimo Bold is for headings.
- *Alternatives:*
  - Saira, to match the website. That's a brand change, because certificates follow the print guidelines.
  - Confirm a Eurostile embedding licence, and supply the files outside the repo.

**5. The verification address. Recommended: number plus a short check code, for example `/verify/COA-2026-00001-K7Q9`.**
- Certificate numbers are sequential. With only `/verify/COA-2026-00001`, anyone could step through 00001, 00002 and so on, and collect every certified staff member's first name, last initial and store. That's a ready-made list of who works where, useful for social engineering (APP 11; framework control 22).
- **Recommended:** a 4-character random check code, using the same letters as store codes, stored with the certificate and printed on it. The number itself keeps the PRD format.
  - A full, correct address shows the certificate.
  - A number with a wrong or missing code shows "We couldn't find that certificate", the same answer as for a certificate that doesn't exist.
- The page is also rate limited and marked `noindex`.
- *Alternative:* the PRD's plain `/verify/COA-2026-00001`, relying on rate limits only.

**6. Status calculated when read, not by a nightly job. Recommended: yes.**
- A certificate is active while `revoked_at is null and expires_at > now()`. A store is certified while it has at least N learners, currently linked to it, with an active certificate. A `store_status` view works this out.
- That means there's nothing to "recalculate". A store change, expiry or revoke shows up on the next read automatically, including the PRD 6.3 rule that the certificate stays with the learner and both stores' counts change.
- BUILD_PLAN's daily `pg_cron` job is then unnecessary for correctness, so I'd add one only when something must happen at a time, such as Phase 6 expiry-reminder emails.
- *Alternative:* store a status and update it with triggers plus a nightly job. That's more moving parts and can go stale.

**7. Who can be certified. Recommended: store-linked learners only (D1), counted against the store they're at when issued.**
- Customers (no store) can pass every quiz, but aren't certified. The dashboard tells them "Join your store with a store code to become Carbon Certified" (draft copy).
- If they join a store later, they're certified on joining, with no need to retake quizzes.
- The certificate records the learner's name and store **at issue** (snapshots), so the PDF and the verification page don't change if the store is renamed. The **store counts** use the learner's current store (PRD 6.3).

**8. Renewal and new core lessons (D3). Recommended: renewal opens 30 days before expiry.**
- A certificate lasts `certificate_validity_months` (12). From 30 days before it expires, passes of **every current core lesson** made since the renewal window opened count towards a new certificate. The new certificate gets a new number and runs 12 months from its issue date.
- A core lesson added mid-year doesn't affect current certificates (D3). It's required at the next renewal.
- The window is a new setting, `certificate_renewal_window_days` (30).
- *Alternative:* passes from any time count. Then nobody ever retakes a quiz, which defeats renewing.

**9. The PDF. Recommended: generated on request for its owner, never stored.**
- `GET /certificates/[number]` (a Route Handler) signs the learner in, checks that the certificate is theirs, and builds the PDF. It returns it with `Cache-Control: private, no-store` and the BRAND.md filename (`CarbonOffroad_Certificate_COA-2026-00001_v1_20261030.pdf`).
- There's no storage bucket and no stored copies to secure or delete.
- *Alternative:* generate once and store it in Supabase Storage. That's faster to download, but it adds a bucket and its own access rules.

**10. What the certificate says (BRAND.md layout, draft copy).**
- "CARBON CERTIFIED"
- the learner's full name
- "has completed every core lesson in the Carbon Offroad Academy"
- the store name at issue
- issue and expiry dates (for example "30 October 2026")
- the certificate number, check code and verification URL
- the BRAND.md footer line

It's landscape A4 with 20 mm margins, the full black logo top left at about 100 mm wide, and one cyan rule. The copy is a draft for your approval.

**11. The verification page shows only:**
- first name and last initial
- store name at issue
- status (Active, Expired or Revoked)
- issue and expiry dates

That matches PRD 5.4 ("Revoked" added for Phase 6). There's no email, no full surname and no IDs. It's rendered per request and not cached.

**12. The certified stores feed. Recommended: `GET /api/certified-stores`, with each store's name, suburb, state and country.**
- These are businesses, not people. The response is cached for 1 hour, ordered by name and rate limited.
- No CORS header until a real consumer, such as a dealer locator, needs one, so it can't be pulled into other sites' pages for now. It's read-only GET, as control 08 in SECURITY.md already plans.

**13. Rate limits (control 22). Recommended: Netlify edge limits, like sign-in.**
- `/verify/*`: 30 a minute per IP
- `/api/certified-stores`: 60 a minute per IP

**14. The dashboard.**
- A certificate card: number, status, issue and expiry dates, **Download PDF**, and **Verification link**.
- The store line: "Test Store Robina is a Carbon Certified Store" or "Test Store Robina: 1 of 2 certified staff" (draft copy).
- From 30 days before expiry: "Your certificate expires on 30 October 2027. Pass every core lesson again to renew."

**15. Analytics and logging.**
- A `certificate_issued` analytics event with no personal data (PRD 6.7).
- Security log events: `certificate_issued` (user ID and certificate number), `certificate_pdf_denied` (user ID and code) and `verify_not_found` (no input echoed).

**16. Testing on staging.**
- A certificate needs every core lesson passed, and a quiz needs a video and a length. On staging I'd give all 9 placeholder core lessons the Vimeo demo video and its length. That's staging only, so the Preview learner can be certified end to end.
- The DB tests use a 1-minute validity to cover expiry, and threshold changes to cover store status.

---

## How it fits together

```
submit_quiz (pass) ─┐
join_store ─────────┴─▶ issue_certificate_if_eligible(user)   [internal, advisory lock per learner]
                           ├─ store-linked? active? latest certificate not revoked?
                           ├─ every published core lesson passed (since the renewal window opened)?
                           ├─ certificate_counters: next number for the year (row lock)
                           └─ certificates: number, check code, name and store snapshots, dates

Dashboard ─▶ certificates (own rows, RLS) + my_store_status()
/certificates/[number] (Route Handler, owner only) ─▶ PDF built with pdf-lib + Arimo + logo SVG paths
/verify/[code] (public page) ─▶ verify_certificate(code): first name, last initial, store, status, dates
/api/certified-stores (public JSON, cached 1 h) ─▶ certified_stores()
submitQuiz action ─▶ certified? sendEmail(certificateIssuedEmail)   [logs only until D5]
```

## File structure

| File | Responsibility |
|---|---|
| `supabase/migrations/<ts>_certification.sql` | Tables, view, functions, grants; replaces `submit_quiz`, `join_store` |
| `tests/db/certification.test.ts` | Concurrency, eligibility, renewal, expiry, store status, verification, access |
| `tests/db/quiz.test.ts` | `submit_quiz` now returns four columns |
| `src/types/database.ts` | Regenerated |
| `src/lib/certificates/format.ts` (+ test) | Pure: dates, display name, status label, filename, verify code parsing |
| `src/lib/certificates/pdf.ts` (+ test) | Builds the PDF bytes |
| `src/lib/certificates/fonts/Arimo-*.ttf`, `LICENSE.txt` | Embeddable Arial-metric font (Apache 2.0) |
| `src/app/certificates/[number]/route.ts` (+ test) | Owner-only PDF download |
| `src/app/verify/[code]/page.tsx` | Public verification page |
| `src/app/api/certified-stores/route.ts` (+ test) | Public JSON feed |
| `src/lib/certificates/data.ts` | `server-only` reads for the dashboard, verify page and feed |
| `src/lib/email/send.ts`, `src/lib/email/certificate.ts` (+ tests) | `sendEmail()` interface (logs until D5) and the branded template |
| `src/lib/quiz/actions.ts`, `shape.ts` (+ tests) | `certified` in the submit result; sends the email |
| `src/components/quiz/QuizPanel.tsx`, `QuizResult.tsx`, `copy.ts` (+ test) | "You're Carbon Certified" result |
| `src/components/certificates/CertificateCard.tsx` | Dashboard card |
| `src/app/(account)/dashboard/page.tsx` | Card, store line, renewal notice, customer note |
| `netlify/edge-functions/rate-limit-verify.ts`, `rate-limit-feed.ts`; `tests/config/rate-limits.test.ts` | Edge limits (decision 13) |
| `src/lib/log.ts`, `src/lib/analytics/track.ts` | New events |
| `docs/security/*`, `docs/SECURITY.md`, `docs/BRAND.md` | Threat model, permissions, ASVS, logs, tag inventory, font note |

---

## Task 0: Branch

- [ ] Run `git switch main && git pull --ff-only && git switch -c feat/phase-5-certification`.
- [ ] Commit this plan with `git commit -m "docs: Phase 5 certification plan"`.

---

## Task 1: Security design (section 5; controls 04, 12, 15, 19, 22)

- [ ] **Threat model.** Add T-37 to T-44:

| ID | Asset / entry | Threat | STRIDE | Control | Status |
|---|---|---|---|---|---|
| T-37 | Issuing | Concurrent passes issue two certificates, or two learners get one number | Tampering | Per-learner advisory lock; locked per-year counter row; unique number; DB concurrency tests | Mitigated |
| T-38 | Issuing | A learner issues their own certificate, or one without passing | EoP | Issue function not executable by any API role; only called inside `submit_quiz` and `join_store` | Mitigated |
| T-39 | `/verify` | Enumerating sequential numbers to list staff names and stores | Information disclosure | 4-character random check code required (about a million combinations per number); same "not found" answer for a wrong code; 30 a minute per IP; `noindex` | Mitigated |
| T-40 | `/verify` | Page shows more than PRD 5.4 allows | Information disclosure | Function returns six named fields; first name and last initial only; test asserts the keys | Mitigated |
| T-41 | `/certificates/[number]` | Downloading another learner's PDF | Information disclosure | Session required; RLS own rows; 404 for others; `private, no-store` | Mitigated |
| T-42 | `/api/certified-stores` | Scraping, or other sites embedding the feed | DoS | Cached 1 h; 60 a minute per IP; store fields only; no CORS | Mitigated |
| T-43 | Certificate email | Personal details or the certificate itself sent by email | Information disclosure | First name and a link only; nothing sent until D5 has a vetted provider | Mitigated |
| T-44 | Revoked certificate | Auto-reissued on the next pass | Tampering | Issuing stops when the learner's latest certificate is revoked (Phase 6 decides reinstatement) | Mitigated |

- [ ] **Permissions matrix.** Add rows:
  - `certificates`: learners read their own rows, without `check_code` for others; there are no writes.
  - `certificate_counters`: no access.
  - `store_status`: no direct access.
  - `my_store_status()`: authenticated.
  - `verify_certificate()` and `certified_stores()`: anon and authenticated.
  - `issue_certificate_if_eligible()` and `random_code()`: none.
  - App rows for the PDF route, the verify page and the feed.
- [ ] **ASVS.** Read the 5.0.0 files in `_tools/asvs`, and fetch V14 (data protection) if it isn't there. Update:
  - 2.1.3, 2.3.1, 2.3.3 and 2.3.4 (2.3.4 now applies: unique numbers under concurrency)
  - 8.2.2 and 8.2.3
  - the V14 rows for minimal data in responses
- [ ] **Log inventory.** Add `certificate_issued` (user ID, certificate number), `certificate_pdf_denied` (user ID, code), `verify_not_found` (no input) and `email_skipped` (template name only).
- [ ] Commit with `git commit -m "docs(security): Phase 5 threat model, permissions and log inventory"`.

---

## Task 2: Migration (controls 04, 06)

- [ ] **Step 1:** Run `npx supabase migration new certification`. Then copy the current `submit_quiz` and `join_store` bodies from their migrations, so that the replacements below differ only where marked.

```sql
-- Phase 5: certification (PRD 5.4, 5.5, 6.3, 6.5; plan decisions 1 and 5–8; T-37 to T-44).
-- Certificates are issued only inside this database, by issue_certificate_if_eligible(), which
-- no API role can execute. Status is calculated when read (decision 6), so expiry, revokes and
-- store changes need no recalculation job.

insert into public.settings (key, value, description) values
  ('certificate_renewal_window_days', '30', 'Days before expiry that renewal opens (plan decision 8)');

create table public.certificate_counters (
  year integer primary key check (year between 2026 and 2100),
  last_number integer not null check (last_number between 1 and 99999)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text not null unique check (certificate_number ~ '^COA-[0-9]{4}-[0-9]{5}$'),
  -- Printed on the certificate and needed by /verify (decision 5, T-39).
  check_code text not null check (check_code ~ '^[0-9A-HJKMNP-TV-Z]{4}$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Snapshots at issue, so the certificate never changes afterwards (decision 7).
  store_id_at_issue uuid references public.stores (id) on delete set null,
  store_name_at_issue text not null,
  first_name text not null,
  last_name text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at > issued_at)
);

create index certificates_user_issued_idx on public.certificates (user_id, issued_at desc);

alter table public.certificate_counters enable row level security;
alter table public.certificates enable row level security;
revoke all on public.certificate_counters, public.certificates from anon, authenticated;

grant select (id, certificate_number, check_code, store_name_at_issue, first_name, last_name,
  issued_at, expires_at, revoked_at, user_id) on public.certificates to authenticated;

create policy "Learners read their own certificates"
  on public.certificates for select to authenticated
  using (user_id = (select public.current_learner()));

-- Random characters from the store-code alphabet (no I, L, O, U). Bytes come from a v4 UUID,
-- whose first four bytes are random; 256 is a multiple of 32, so each character is uniform.
create function public.random_code(p_length integer)
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
    substr('0123456789ABCDEFGHJKMNPQRSTVWXYZ', (get_byte(b, i) % 32) + 1, 1), '' order by i)
  from (select uuid_send(gen_random_uuid()) as b) r, generate_series(0, p_length - 1) i
$$;

-- Active certificate per learner (latest, not revoked, not expired) and certified staff per
-- store, counted against the learner's current store (PRD 5.5, 6.3). Internal: no API grants.
create view public.store_status as
select
  s.id as store_id,
  count(c.id)::integer as active_certified_staff,
  count(c.id) >= public.setting_int('store_certification_threshold', 2, 1, 100) as is_certified
from public.stores s
left join public.profiles p on p.store_id = s.id and p.active
left join lateral (
  select c.id from public.certificates c
  where c.user_id = p.id and c.revoked_at is null and c.expires_at > now()
  order by c.issued_at desc limit 1
) c on true
where s.active
group by s.id;

revoke all on public.store_status from anon, authenticated;

-- Issues a certificate when the learner has earned one. Returns the number, or null.
-- Called only from submit_quiz (after a pass) and join_store. Never an API (T-38).
create function public.issue_certificate_if_eligible(p_user uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window integer := public.setting_int('certificate_renewal_window_days', 30, 1, 180);
  v_months integer := public.setting_int('certificate_validity_months', 12, 1, 60);
  v_profile record;
  v_latest record;
  v_since timestamptz;
  v_core integer;
  v_passed integer;
  v_year integer;
  v_n integer;
  v_number text;
begin
  -- One issuer per learner at a time; the loser re-checks after the winner commits (T-37).
  perform pg_advisory_xact_lock(hashtextextended('certificate:' || p_user::text, 0));

  select p.first_name, p.last_name, p.store_id, s.name as store_name into v_profile
  from public.profiles p
  join public.stores s on s.id = p.store_id and s.active
  where p.id = p_user and p.active;
  if not found then
    return null; -- customers and inactive learners are not certified (D1, decision 7)
  end if;

  select c.expires_at, c.revoked_at into v_latest
  from public.certificates c where c.user_id = p_user
  order by c.issued_at desc limit 1;
  if found then
    if v_latest.revoked_at is not null then
      return null; -- T-44: Phase 6 decides reinstatement
    end if;
    if v_latest.expires_at - make_interval(days => v_window) > now() then
      return null; -- still active, renewal not open yet
    end if;
    v_since := v_latest.expires_at - make_interval(days => v_window); -- decision 8
  end if;

  select count(*) into v_core from public.lessons l where l.published and l.is_core;
  if v_core = 0 then
    return null;
  end if;

  select count(distinct a.lesson_id) into v_passed
  from public.quiz_attempts a
  join public.lessons l on l.id = a.lesson_id and l.published and l.is_core
  where a.user_id = p_user and a.passed and (v_since is null or a.created_at >= v_since);
  if v_passed < v_core then
    return null;
  end if;

  -- Next number for the year. The upsert locks the year's row, so concurrent issuers queue;
  -- a rollback undoes the increment, so numbers have no gaps (T-37).
  v_year := extract(year from now() at time zone 'Australia/Brisbane')::integer;
  insert into public.certificate_counters as cc (year, last_number) values (v_year, 1)
  on conflict (year) do update set last_number = cc.last_number + 1
  returning cc.last_number into v_n;
  v_number := format('COA-%s-%s', v_year, lpad(v_n::text, 5, '0'));

  insert into public.certificates (certificate_number, check_code, user_id, store_id_at_issue,
    store_name_at_issue, first_name, last_name, expires_at)
  values (v_number, public.random_code(4), p_user, v_profile.store_id, v_profile.store_name,
    v_profile.first_name, v_profile.last_name, now() + make_interval(months => v_months));

  return v_number;
end;
$$;

-- The signed-in learner's store and how close it is to Carbon Certified (decision 14).
create function public.my_store_status()
returns table (store_name text, active_certified_staff integer, threshold integer, is_certified boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.name, ss.active_certified_staff,
    public.setting_int('store_certification_threshold', 2, 1, 100), ss.is_certified
  from public.profiles p
  join public.stores s on s.id = p.store_id
  join public.store_status ss on ss.store_id = s.id
  where p.id = public.current_learner()
$$;

-- Public verification (PRD 5.4, decision 11). Needs number and check code; six fields only.
create function public.verify_certificate(p_code text)
returns table (first_name text, last_initial text, store_name text, status text,
  issued_at timestamptz, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.first_name, left(c.last_name, 1), c.store_name_at_issue,
    case when c.revoked_at is not null then 'revoked'
         when c.expires_at <= now() then 'expired'
         else 'active' end,
    c.issued_at, c.expires_at
  from public.certificates c
  where length(p_code) = 19
    and c.certificate_number = upper(left(p_code, 14))
    and c.check_code = upper(right(p_code, 4))
    and substr(p_code, 15, 1) = '-'
$$;

-- Carbon Certified Stores for the public feed (PRD 5.5, decision 12). Business fields only.
create function public.certified_stores()
returns table (name text, suburb text, state text, country text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.name, s.suburb, s.state, s.country
  from public.store_status ss join public.stores s on s.id = ss.store_id
  where ss.is_certified
  order by s.name
$$;
```

- [ ] **Step 2: Replace `submit_quiz`.** A new output column means dropping and recreating it: `drop function public.submit_quiz(uuid, jsonb);`. Then write the **complete** Phase 4 function again from `20261029055343_quizzes.sql`, with exactly three changes:

```sql
returns table (score integer, total integer, passed boolean, certified boolean) -- Phase 5
```

```sql
  v_passed boolean;
  v_number text; -- Phase 5
```

```sql
  -- replaces: return query select v_score, v_total, v_passed;
  if v_passed then
    v_number := public.issue_certificate_if_eligible(v_user); -- Phase 5 (decision 1)
  end if;
  return query select v_score, v_total, v_passed, v_number is not null;
```

  Everything else stays character for character the same as Phase 4. Review that with a `diff` of the two function bodies.

- [ ] **Step 3: Replace `join_store`** with `create or replace`, keeping the same signature. After `update public.profiles set store_id = …`, add `perform public.issue_certificate_if_eligible(v_user);` with the comment `-- Phase 5: a customer who already passed every core lesson is certified on joining (decision 7)`.

- [ ] **Step 4: Grants.**

```sql
revoke all on function public.random_code(integer) from public, anon, authenticated;
revoke all on function public.issue_certificate_if_eligible(uuid) from public, anon, authenticated;
revoke all on function public.my_store_status() from public, anon, authenticated;
revoke all on function public.verify_certificate(text) from public, anon, authenticated;
revoke all on function public.certified_stores() from public, anon, authenticated;
revoke all on function public.submit_quiz(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.my_store_status() to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
grant execute on function public.certified_stores() to anon, authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
```

- [ ] **Step 5:** Run `npm run db:reset && npm run db:types`. Then update `tests/db/quiz.test.ts`, whose "submit_quiz returns only score, total and passed" test becomes four keys: `certified`, `passed`, `score`, `total`. Run `npm run test:db`. Expected: all pass.

---

## Task 3: DB tests (controls 04, 22; "Done when" 1 and 2)

**Files:** Create `tests/db/certification.test.ts`.

- [ ] Use the Phase 4 helpers (`createTestUser`, the admin client). Fixture: give the learner a passed attempt for every published core lesson by inserting into `quiz_attempts` with the secret key, then call `admin.rpc('issue_certificate_if_eligible', { p_user })`. The secret-key role keeps EXECUTE. That lets most tests skip the video and quiz flow. One test goes through `submit_quiz` end to end.

Tests, with names and assertions:

1. **"issues one certificate when the last core lesson is passed through submit_quiz"**
   - Set up: 8 core passes plus progress unlocked on the 9th, then `submit_quiz` with correct answers.
   - Expect `certified: true`.
   - The row matches `^COA-\d{4}-\d{5}$`, the check code matches `^[0-9A-HJKMNP-TV-Z]{4}$`, and the store name and first and last names are snapshots.
   - `expires_at` is about 12 months after `issued_at`.
2. **"does not certify a customer, then certifies them on joining a store"**
   - Set up: a customer with all passes.
   - The issuer returns null.
   - Then `join_store(ROBINA)` creates a certificate.
3. **"does not count non-core or unpublished lessons"**
4. **"issues nothing while a certificate is active and renewal is not open"**: a second call returns null.
5. **"renewal: passes from before the window do not count, new passes do"**
   - Set `expires_at` to now + 10 days (inside the 30-day window).
   - The old passes (backdated 60 days) don't count, so the issuer returns null.
   - Insert fresh passes for every core lesson, and a new certificate with a new number is issued.
6. **"never reissues after a revoke"** (T-44).
7. **"20 learners issued at once get 20 distinct, consecutive numbers"** (T-37)
   - Create 20 store-linked learners with all passes.
   - `Promise.all` the 20 issuer calls.
   - The numbers are unique, and their integer parts form one run with no gaps.
8. **"10 parallel issues for one learner create exactly one certificate"** (T-37).
9. **"store status counts current store, active certificates only, against the threshold"**
   - Two certified learners at TST-NER make it certified (threshold 2).
   - Expire one with `expires_at = now() - 1 minute` and it's not certified.
   - Move a learner to another store with `join_store`, and both stores' counts change. The certificate keeps `store_name_at_issue`.
   - Set the threshold setting to 1 and it's certified again.
   - Restore the setting afterwards.
10. **"verify_certificate needs the check code and returns six fields"** (T-39, T-40)
    - A correct code returns exactly `first_name`, `last_initial`, `store_name`, `status`, `issued_at` and `expires_at`. `last_initial` is one character, and there's no email anywhere in the JSON.
    - A wrong check code, a missing code and lower case on a wrong code all return no rows.
    - Lower case on a correct code works.
11. **"status reads expired and revoked"**.
12. **"certified_stores returns business fields for certified stores only"**: keys `country`, `name`, `state`, `suburb`.
13. **"learners read only their own certificates; nobody can write or read the counter"**
    - Bob sees no rows for Alice.
    - Inserts, updates and deletes are refused.
    - `certificate_counters` select gives 42501.
    - `store_status` select gives 42501.
    - The issuer RPC as a learner gives an error.
14. **"my_store_status reports the learner's own store"**.

- [ ] Run `npm run test:db`. Expected: all pass.
- [ ] **Mutation checks.** Use `_tools/mutation-check-cert.mjs`, adapted from the Phase 4 script, and commit first. Each mutation must turn the named test red:
  1. Remove the advisory lock: test 8 fails.
  2. Swap the counter upsert for `select coalesce(max(...))+1 from certificates`: test 7 fails (duplicates or a constraint error under load).
  3. Drop the check-code condition in `verify_certificate`: test 10 fails.
  4. Remove `and l.is_core`: test 3 fails.
  5. Remove the revoke guard: test 6 fails.
  6. Grant EXECUTE on the issuer to `authenticated`: test 13 fails.
- [ ] Commit with `git commit -m "feat(db): certificates issued in the database, unique under concurrency"`.

---

## Task 4: Pure helpers (control 05)

**Files:** Create `src/lib/certificates/format.ts` and `src/lib/certificates/format.test.ts`.

- [ ] **Step 1: Write the failing tests.**

```ts
import { describe, expect, it } from 'vitest'
import {
  CertificateNumber,
  VerifyCode,
  certificateFilename,
  certificateStatus,
  displayDate,
  isRenewalOpen,
} from './format'

describe('certificate formats', () => {
  it('accepts numbers and verify codes in the issued format only', () => {
    expect(CertificateNumber.safeParse('COA-2026-00001').success).toBe(true)
    expect(VerifyCode.parse('coa-2026-00001-k7q9')).toBe('COA-2026-00001-K7Q9')
    for (const bad of ['COA-2026-1', 'COA-2026-00001-K7Q', 'COA-2026-00001-K7QI', '../etc', ''])
      expect(VerifyCode.safeParse(bad).success).toBe(false)
  })

  it('formats dates in Brisbane time, as on the certificate', () => {
    expect(displayDate('2026-10-29T15:00:00Z')).toBe('30 October 2026')
  })

  it('names the download as BRAND.md p.50 says', () => {
    expect(certificateFilename('COA-2026-00001', '2026-10-29T15:00:00Z')).toBe(
      'CarbonOffroad_Certificate_COA-2026-00001_v1_20261030.pdf',
    )
  })

  it('works out status and the renewal window', () => {
    const now = new Date('2026-10-30T00:00:00Z')
    expect(certificateStatus({ expiresAt: '2027-01-01T00:00:00Z', revokedAt: null }, now)).toBe('active')
    expect(certificateStatus({ expiresAt: '2026-10-01T00:00:00Z', revokedAt: null }, now)).toBe('expired')
    expect(certificateStatus({ expiresAt: '2027-01-01T00:00:00Z', revokedAt: '2026-10-29T00:00:00Z' }, now)).toBe('revoked')
    expect(isRenewalOpen('2026-11-20T00:00:00Z', 30, now)).toBe(true)
    expect(isRenewalOpen('2027-01-20T00:00:00Z', 30, now)).toBe(false)
  })
})
```

- [ ] **Step 2:** Run `npx vitest run src/lib/certificates`. Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Implement.**

```ts
import { z } from 'zod'

/** Certificate numbers and verification codes (plan decision 5). Crockford letters only. */
export const CertificateNumber = z.string().regex(/^COA-\d{4}-\d{5}$/)
export const VerifyCode = z
  .string()
  .max(19)
  .transform((s) => s.toUpperCase())
  .pipe(z.string().regex(/^COA-\d{4}-\d{5}-[0-9A-HJKMNP-TV-Z]{4}$/))

const TZ = 'Australia/Brisbane'

/** "30 October 2026" (BRAND.md dates, p.16), in Brisbane time. */
export function displayDate(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }).format(new Date(iso))
}

/** CarbonOffroad_Certificate_[Number]_v1_[YYYYMMDD].pdf (BRAND.md p.50). */
export function certificateFilename(number: string, issuedAt: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ }).format(new Date(issuedAt))
  return `CarbonOffroad_Certificate_${number}_v1_${parts.replaceAll('-', '')}.pdf`
}

export type CertificateStatus = 'active' | 'expired' | 'revoked'

export function certificateStatus(
  c: { expiresAt: string; revokedAt: string | null },
  now = new Date(),
): CertificateStatus {
  if (c.revokedAt) return 'revoked'
  return new Date(c.expiresAt) > now ? 'active' : 'expired'
}

/** Renewal opens `windowDays` before expiry (plan decision 8). */
export function isRenewalOpen(expiresAt: string, windowDays: number, now = new Date()): boolean {
  return new Date(expiresAt).getTime() - windowDays * 86_400_000 <= now.getTime()
}
```

- [ ] **Step 4:** Run the tests again. Expected: PASS. Commit with `git commit -m "feat(certificates): formats, status and filenames"`.

---

## Task 5: The PDF (brand p.21, p.22, p.29, p.48, p.50; decisions 3, 4, 9, 10)

**Files:**
- Create `src/lib/certificates/logo-paths.ts`, `src/lib/certificates/pdf.ts` and `src/lib/certificates/pdf.test.ts`
- Create `src/lib/certificates/fonts/` holding Arimo Regular, Arimo Bold and the licence
- Modify `next.config.ts`

- [ ] **Step 1: Dependencies.** Run `npm install pdf-lib @pdf-lib/fontkit`. Both are MIT-licensed and have no native code. Record them in the PR. `npm audit` must stay clean, and Dependabot covers them.

- [ ] **Step 2: Font.** Download the static **Arimo-Regular.ttf** and **Arimo-Bold.ttf** from the official Arimo repository (`github.com/googlefonts/Arimo`, **SIL OFL 1.1**: the repository was relicensed from Apache 2.0, correction 30 Oct 2026), along with its `OFL.txt`, into `src/lib/certificates/fonts/`. Add a BRAND.md note under "Certificate PDF": Arimo is used in place of Arial, because it's metrically identical and its licence allows embedding and redistribution (decision 4).

- [ ] **Step 3: Logo paths from the master.** Generate `logo-paths.ts` from `public/brand/logo-full-black-transparent.svg`, copying every `<path d="…">` in order. This is a copy of the master's data, not a redrawing (p.61). Add a test in `pdf.test.ts` that re-reads the SVG and asserts that `LOGO_PATHS` equals its `d` attributes exactly, so the copy can never drift from the master.

```ts
// Copied from public/brand/logo-full-black-transparent.svg (viewBox 0 0 2000 565.6).
// Never edit by hand: regenerate from the master. pdf.test.ts checks they match.
export const LOGO_VIEWBOX = { width: 2000, height: 565.6 }
export const LOGO_PATHS: readonly string[] = [/* generated */]
```

- [ ] **Step 4: Build the PDF.** `src/lib/certificates/pdf.ts`:

```ts
import 'server-only'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb } from 'pdf-lib'
import { displayDate } from './format'
import { LOGO_PATHS, LOGO_VIEWBOX } from './logo-paths'

const MM = 72 / 25.4
const PAGE = { width: 297 * MM, height: 210 * MM } // A4 landscape [Approved] (BRAND.md)
const MARGIN = 20 * MM
// BRAND.md colour tokens as RGB fractions (the brand guard bans raw hex in source).
const BLACK = rgb(17 / 255, 17 / 255, 17 / 255) // carbon-black
const CYAN = rgb(0, 164 / 255, 199 / 255) // carbon-cyan: the one accent rule
const GUNMETAL = rgb(48 / 255, 48 / 255, 48 / 255)

export type CertificateForPdf = {
  certificateNumber: string
  checkCode: string
  firstName: string
  lastName: string
  storeName: string
  issuedAt: string
  expiresAt: string
  verifyUrl: string
}

const fontDir = join(process.cwd(), 'src/lib/certificates/fonts')

export async function buildCertificatePdf(c: CertificateForPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle(`Carbon Certified certificate ${c.certificateNumber}`) // BRAND.md: title property
  pdf.setAuthor('Carbon Offroad')
  pdf.setCreator('Carbon Offroad Academy')
  const [regular, bold] = await Promise.all([
    readFile(join(fontDir, 'Arimo-Regular.ttf')).then((b) => pdf.embedFont(b, { subset: true })),
    readFile(join(fontDir, 'Arimo-Bold.ttf')).then((b) => pdf.embedFont(b, { subset: true })),
  ])
  const page = pdf.addPage([PAGE.width, PAGE.height])
  const top = PAGE.height - MARGIN

  // Full logo, black, top left, about 100 mm wide (30–40% of the page, p.22). Vector paths.
  const logoWidth = 100 * MM
  const scale = logoWidth / LOGO_VIEWBOX.width
  for (const d of LOGO_PATHS) page.drawSvgPath(d, { x: MARGIN, y: top, scale, color: BLACK })

  let y = top - LOGO_VIEWBOX.height * scale - 24 * MM
  page.drawText('CARBON CERTIFIED', { x: MARGIN, y, size: 32, font: bold, color: BLACK }) // H1
  y -= 7 * MM
  page.drawRectangle({ x: MARGIN, y, width: 50 * MM, height: 1.5 * MM, color: CYAN }) // one rule
  y -= 16 * MM
  page.drawText(`${c.firstName} ${c.lastName}`, { x: MARGIN, y, size: 22, font: bold, color: BLACK }) // H2
  y -= 10 * MM
  page.drawText('has completed every core lesson in the Carbon Offroad Academy.', { x: MARGIN, y, size: 11, font: regular, color: BLACK })
  y -= 7 * MM
  page.drawText(c.storeName, { x: MARGIN, y, size: 11, font: bold, color: BLACK })
  y -= 14 * MM
  const label = (text: string, x: number) => page.drawText(text, { x, y, size: 8.5, font: regular, color: GUNMETAL })
  const value = (text: string, x: number) => page.drawText(text, { x, y: y - 5 * MM, size: 11, font: bold, color: BLACK })
  label('Issued', MARGIN)
  value(displayDate(c.issuedAt), MARGIN)
  label('Expires', MARGIN + 60 * MM)
  value(displayDate(c.expiresAt), MARGIN + 60 * MM)
  label('Certificate', MARGIN + 120 * MM)
  value(c.certificateNumber, MARGIN + 120 * MM)

  page.drawText(`Check this certificate at ${c.verifyUrl}`, { x: MARGIN, y: MARGIN + 12 * MM, size: 9, font: regular, color: BLACK })
  page.drawText('Carbon Offroad | KPD Industries Pty Ltd | ABN 80 142 983 382 | 1300 780 141 | carbonoffroad.com.au', {
    x: MARGIN, y: MARGIN, size: 8, font: regular, color: GUNMETAL,
  })
  return pdf.save()
}
```

- [ ] **Step 5: Tests** (`pdf.test.ts`, run in node with `// @vitest-environment node`). Use `pdf-lib`'s `PDFDocument.load` on the output and check:
  - one page, 841.89 × 595.28 points
  - the title property contains the number
  - the size is under 10 MB (BRAND.md export rule)
  - the fonts are embedded (the PDF bytes contain `/FontFile2`)
  - the logo paths match the master SVG

  Also write a sample to `../_tools/sample-certificate.pdf` for the visual check in Task 11.

- [ ] **Step 6: Bundle the fonts for Netlify.** In `next.config.ts`, add `outputFileTracingIncludes: { '/certificates/[number]': ['./src/lib/certificates/fonts/**'] }`. Then check after `npm run build` that `.next/server/app/certificates/[number]/route.js.nft.json` lists both TTFs.

- [ ] **Step 7:** Run the tests, lint and typecheck. Commit with `git commit -m "feat(certificates): branded PDF with the vector logo and an embedded Arial-metric font"`.

---

## Task 6: Owner-only PDF download (controls 04, 14; T-41)

**Files:**
- Create `src/app/certificates/[number]/route.ts` and `src/app/certificates/[number]/route.test.ts`
- Modify `src/lib/log.ts` and `src/proxy.ts`

- [ ] **Step 1: Write the failing test.** Mock the session client the same way the quiz actions test does. Check:
  1. A bad number gives 404, and the database isn't queried.
  2. With no session, 404 and `certificate_pdf_denied` logged with code `signed_out`.
  3. When the row isn't returned (someone else's, under RLS), 404 and code `not_found`.
  4. A revoked certificate gives 404.
  5. The owner gets 200 with `application/pdf`, `Cache-Control: private, no-store`, and a `Content-Disposition` attachment with the BRAND.md filename.

- [ ] **Step 2: Implement.**

```ts
import { buildCertificatePdf } from '@/lib/certificates/pdf'
import { CertificateNumber, certificateFilename } from '@/lib/certificates/format'
import { logSecurityEvent } from '@/lib/log'
import { siteUrl } from '@/lib/site'
import { createSessionClient } from '@/lib/supabase/server'

// A public endpoint like any Route Handler: it authenticates itself, and RLS returns only the
// learner's own certificate (control 04, T-41). Every refusal is the same 404.
const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

export async function GET(_request: Request, ctx: RouteContext<'/certificates/[number]'>) {
  const { number } = await ctx.params
  if (!CertificateNumber.safeParse(number).success) return notFound()
  const supabase = await createSessionClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims.sub
  if (!userId) {
    logSecurityEvent('certificate_pdf_denied', { code: 'signed_out' })
    return notFound()
  }
  const { data } = await supabase
    .from('certificates')
    .select('certificate_number, check_code, first_name, last_name, store_name_at_issue, issued_at, expires_at, revoked_at')
    .eq('certificate_number', number)
    .maybeSingle()
  if (!data || data.revoked_at) {
    logSecurityEvent('certificate_pdf_denied', { userId, code: data ? 'revoked' : 'not_found' })
    return notFound()
  }
  const bytes = await buildCertificatePdf({
    certificateNumber: data.certificate_number,
    checkCode: data.check_code,
    firstName: data.first_name,
    lastName: data.last_name,
    storeName: data.store_name_at_issue,
    issuedAt: data.issued_at,
    expiresAt: data.expires_at,
    verifyUrl: `${siteUrl()}/verify/${data.certificate_number}-${data.check_code}`,
  })
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${certificateFilename(data.certificate_number, data.issued_at)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
```

- [ ] **Step 3:** Add `certificate_pdf_denied`, `certificate_issued`, `verify_not_found` and `email_skipped` to the `SecurityEvent` type. In `src/proxy.ts`, treat `/certificates/*` as a private path (`private, no-store`, session refresh), like the account routes (control 14). Extend the proxy test.
- [ ] **Step 4:** Run the tests, typecheck and lint. Commit with `git commit -m "feat(certificates): owner-only PDF download"`.

---

## Task 7: Verification page and the certified stores feed (PRD 5.4, 5.5; T-39, T-40, T-42)

**Files:**
- Create `src/lib/certificates/data.ts`, `src/app/verify/[code]/page.tsx`, `src/app/api/certified-stores/route.ts` and their tests
- Create `netlify/edge-functions/rate-limit-verify.ts` and `rate-limit-feed.ts`
- Modify `tests/config/rate-limits.test.ts`

- [ ] **Step 1: Data access** (`server-only`). Each function maps named fields only.

```ts
import 'server-only'
import { cacheLife } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { VerifyCode } from './format'

export type Verification = {
  firstName: string
  lastInitial: string
  storeName: string
  status: 'active' | 'expired' | 'revoked'
  issuedAt: string
  expiresAt: string
}

/** Per request, never cached: status changes with time (decision 6). */
export async function verifyCertificate(code: string): Promise<Verification | null> {
  const parsed = VerifyCode.safeParse(code)
  if (!parsed.success) return null
  const { data } = await createPublicClient().rpc('verify_certificate', { p_code: parsed.data }).maybeSingle()
  if (!data) return null
  return {
    firstName: data.first_name,
    lastInitial: data.last_initial,
    storeName: data.store_name,
    status: data.status as Verification['status'],
    issuedAt: data.issued_at,
    expiresAt: data.expires_at,
  }
}

export type CertifiedStore = { name: string; suburb: string | null; state: string | null; country: string }

/** Public business data, safe in the shared cache for an hour (control 14, decision 12). */
export async function getCertifiedStores(): Promise<CertifiedStore[]> {
  'use cache'
  cacheLife('hours')
  const { data, error } = await createPublicClient().rpc('certified_stores')
  if (error) throw new Error('Could not load certified stores')
  return (data ?? []).map((s) => ({ name: s.name, suburb: s.suburb, state: s.state, country: s.country }))
}
```

- [ ] **Step 2: The page**, `src/app/verify/[code]/page.tsx`. It's per request: it awaits `connection()` inside `<Suspense>`, and its metadata is `{ title: 'Verify a certificate', robots: { index: false, follow: false } }`. It shows:
  - a heading, "Certificate check"
  - the learner, for example "Pat S."
  - the store
  - a status badge: Active as `accent`, Expired as `neutral`, Revoked as `dark`
  - "Issued 30 October 2026" and "Expires 30 October 2027"
  - the code in small text

  When there's no match it says "We couldn't find that certificate. Check the code printed on the certificate and try again." (draft copy) and logs `verify_not_found`, without echoing the input. The same message covers a bad format, a wrong check code and an unknown number (T-39).

- [ ] **Step 3: The feed**, `src/app/api/certified-stores/route.ts`:

```ts
import { getCertifiedStores } from '@/lib/certificates/data'

// Public, read-only GET (PRD 5.5, control 08): store fields only, cached for an hour, no CORS.
export async function GET() {
  const stores = await getCertifiedStores()
  return Response.json(
    { stores },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } },
  )
}
```

  Test it: the body is `{ stores: [...] }`, and each store has exactly the keys `country`, `name`, `state` and `suburb`. There's no `Access-Control-Allow-Origin` header.

- [ ] **Step 4: Edge rate limits** (decision 13), using the sign-in pattern:
  - `rate-limit-verify.ts`: `path: ['/verify/*']`, `windowLimit: 30`
  - `rate-limit-feed.ts`: `path: ['/api/certified-stores']`, `windowLimit: 60`

  Both use `windowSize: 60` and `aggregateBy: ['ip', 'domain']`. Add them to `tests/config/rate-limits.test.ts`.

- [ ] **Step 5:** Run the tests and the build. The verify route is dynamic (ƒ), and the feed is static or cached. Commit with `git commit -m "feat(certificates): verification page and certified stores feed"`.

---

## Task 8: Email, built and ready for D5 (decision 2; brand p.45; controls 15, 19; T-43)

**Files:**
- Create `src/lib/email/send.ts`, `src/lib/email/certificate.ts` and `src/lib/email/certificate.test.ts`

- [ ] **Step 1: Write the failing tests.** The template:
  - HTML-escapes the first name (`<b>Pat</b>` arrives as `&lt;b&gt;Pat&lt;/b&gt;`)
  - has a subject under 45 characters ("You're Carbon Certified")
  - links the CTA to `${siteUrl}/dashboard`
  - includes the email logo PNG with `width="200"` and alt text "Carbon Offroad"
  - has a footer with the company name, the address passed in, and the phone number
  - has a plain-text version
  - contains no email address, surname or certificate number (T-43)

  For `sendEmail()`: it logs `email_skipped` with the template name only, never the address, and returns `{ sent: false }`.

- [ ] **Step 2: Implement.**
  - `certificate.ts` builds the BRAND.md "Email" layout as table-based HTML:
    - a black header with the centred white logo PNG
    - the headline "You're Carbon Certified" in Arial Bold, 26 px
    - the body: "Hi {firstName}, you've passed every core lesson. Your certificate is ready to download from your dashboard." (draft copy)
    - one cyan CTA, "VIEW YOUR CERTIFICATE", in black bold uppercase and at least 44 px tall
    - a Gunmetal footer in white text
  - Colours come from a small `EMAIL_COLOURS` map. The brand guard allows hex only in email templates, so add `src/lib/email/` to its allowlist with a comment (BRAND.md gives the hex values for email).
  - `send.ts` has the comment "No provider until PRD D5 is decided. When it is, implement this function only (vendor assessment, APP 8 disclosure and SPF/DKIM first)." It contains `logSecurityEvent('email_skipped', { code: email.template })` and returns `{ sent: false }`.

- [ ] **Step 3:** Run the tests. Commit with `git commit -m "feat(email): certificate email, ready for a provider (D5)"`.

---

## Task 9: Quiz result and Server Action (decision 1)

**Files:**
- Modify `src/lib/quiz/actions.ts`, `src/lib/quiz/actions.test.ts`, `src/components/quiz/QuizPanel.tsx`, `QuizResult.tsx`, `copy.ts` and `QuizPanel.test.tsx`
- Modify `src/lib/analytics/track.ts`

- [ ] **Tests first.**
  - `submitQuiz` passes `certified` through.
  - When `certified` is true, it logs `certificate_issued`, with the user ID and the code `issued` and never the number in analytics. It reads the learner's own first name and email (own profile row) and calls `sendEmail(certificateIssuedEmail(...))`.
  - When `certified` is false, no email.
  - The panel shows "You're Carbon Certified. Your certificate is ready to download." (BRAND.md microcopy) and a "View your certificate" link to `/dashboard`, and calls `track('certificate_issued', analytics)`.
- [ ] **Implement:**
  - `SubmitResult` gains `certified: boolean`.
  - `QUIZ_COPY.certified`.
  - `QuizResult` takes `certified`.
  - `track` accepts `'certificate_issued'`.
  - Add the event to `TAG_INVENTORY.md`.
- [ ] Run the tests. Commit with `git commit -m "feat(quiz): tell the learner when a pass certifies them"`.

---

## Task 10: Dashboard (decisions 7, 14)

**Files:**
- Modify `src/lib/dashboard/data.ts`, `summary.ts` (+ test) and `src/app/(account)/dashboard/page.tsx`
- Create `src/components/certificates/CertificateCard.tsx`

- [ ] **Data.** In parallel with progress, read:
  - the learner's latest certificate (own rows, ordered by `issued_at desc`, limit 1)
  - `my_store_status()`
  - the `certificate_renewal_window_days` setting

  Keep this out of any cache (control 14).
- [ ] **Card:**
  - a white `rounded-card` with "Your certificate"
  - the number, a status badge, and the issued and expires dates
  - a **Download PDF** button (a pill link to `/certificates/[number]`, with `download`)
  - a **Verification link** (`/verify/[number]-[code]`)
  - the renewal notice when `isRenewalOpen`: "Your certificate expires on {date}. Pass every core lesson again to renew."
  - an expired card says "Expired on {date}. Pass every core lesson again to renew."
- [ ] **The store line**, under the Carbon Certified progress panel:
  - "{Store} is a Carbon Certified Store." when it's certified
  - "{Store}: {n} of {threshold} certified staff needed to become a Carbon Certified Store." when it isn't
  - for customers: "Join your store with a store code to become Carbon Certified." with a link to `/join`

  All draft copy.
- [ ] **Tests:** summary-level unit tests for the copy choices, which are pure.
- [ ] Commit with `git commit -m "feat(dashboard): certificate card and store status"`.

---

## Task 11: Local verification (CLAUDE.md; "Done when" 1–3)

- [ ] **Full suite:** `npm run lint && npm run typecheck && npm test && npm run test:db && npm run build && npm run check:bundle`.
- [ ] **Locally**, as a fictional learner at TST-ROB, pass every core lesson. Seed passes for 8 lessons with the secret key, then take the last quiz through the UI. That needs the Vimeo demo video and a duration on that lesson, and real playback via `_tools/repro-player.mjs` (Phase 4 lesson).
  - The panel says "You're Carbon Certified".
  - The dashboard card appears.
  - **Download PDF** downloads `CarbonOffroad_Certificate_COA-…pdf`.
  - The verification link shows "Quiz C." with no surname and no email.
  - A wrong check code shows "We couldn't find that certificate".
  - The server log has `email_skipped`, without the address.
- [ ] **Open the PDF** and check it against BRAND.md "Certificate PDF" and pages p.21, p.22, p.29, p.48 and p.50:
  - the logo is black, top left and about 100 mm wide
  - the title is uppercase
  - there's one cyan rule
  - the footer line is there
  - the fonts are embedded (Properties → Fonts shows Arimo, embedded subset)
  - the title property is set
  - the file is under 10 MB
- [ ] **Second learner at the same store:** the store becomes certified, and `/api/certified-stores` lists it with four fields.
- [ ] **Screens:** 375 and 1280 px for the dashboard and the verify page. Then keyboard checks, Lighthouse on `/verify/...`, and the header matrix: identical, plus the new routes. The verify page uses the public CSP, and `/certificates` is `private, no-store`.

---

## Task 12: Staging, preview and production (ask Rich before each remote change)

- [ ] **Staging, after Rich's OK:**
  - apply the migration and align the version
  - run the privilege query and the advisor
  - give the 9 core staging lessons the Vimeo demo video and the 62 s duration
  - seed passed attempts for 8 core lessons for the fictional Preview learner, so Rich only needs to take the 9th
- [ ] **Rich on the deploy preview:**
  - take the last quiz and see "You're Carbon Certified"
  - download and open the PDF
  - open the verification link
  - check the dashboard card and store line
  - run Lighthouse on the verify page
- [ ] **Production, after the merge and Rich's OK:**
  - apply the migration and align the version
  - run the privilege query and the advisor
  - run the live header matrix
  - add no data. No certificates can be issued until real core quizzes exist.

---

## Task 13: Evidence and the PR

- [ ] Re-read controls 04, 06, 10, 12, 15, 19 and 22 in the framework document. Then record the evidence in `EVIDENCE.md`:
  - DB tests and mutation results
  - the field-only responses
  - the edge limits
  - the email content rules
  - the new dependencies

  Update ASVS, the threat model statuses, `BUILD_PLAN.md` and the memory notes.
- [ ] Write `_tools/pr-phase-5.md`. It needs:
  - what changed
  - the concurrency design, with its tests
  - the checks
  - the controls
  - the brand pages checked
  - the draft copy for approval
  - what's still open: D5 email sending, real core quizzes, the original icon files
  - the Claude Code attribution line

---

## Self-review against the spec

| Requirement (BUILD_PLAN Phase 5, PRD) | Where |
|---|---|
| `certificates` with `COA-YYYY-NNNNN`; settings for threshold, validity, pass mark | Task 2 (threshold and validity exist from Phase 1; pass mark from Phase 4; renewal window added) |
| `store_status` view | Task 2 |
| Issue on each pass when every core lesson is passed, store-linked only | Task 2 `issue_certificate_if_eligible` from `submit_quiz` and `join_store`; Task 3 tests 1–3 |
| Unique numbers under concurrent passes (kick-off) | Counter row lock plus advisory lock; Task 3 tests 7–8; mutations 1–2 |
| Branded PDF downloadable from the dashboard | Tasks 5, 6, 10 |
| "You're Carbon Certified" email with a link | Task 8 (built; sending waits for D5, decision 2) |
| `/verify/[number]` with first name plus last initial, store, status, dates | Task 7 (number plus check code, decision 5); Task 3 test 10 |
| Daily `pg_cron` job | Not needed: status is calculated when read (decision 6) |
| Store status recalculated on issue, expiry, revoke, store change | Calculated live; Task 3 test 9 |
| `/api/certified-stores` JSON, cached | Task 7 |
| Security: secret-key-only issuing; explicit fields; link-only email; rate limits | Decision 1 (DB, not executable); Tasks 3, 7, 8; T-37 to T-44 |
| "Done when": test learner gets a certificate, email and PDF | Task 11 (email logged until D5) |
| "Done when": expiry and threshold logic tested | Task 3 tests 5, 9, 11 |
| "Done when": verification shows no email or full surname | Task 3 test 10; Task 11 |
