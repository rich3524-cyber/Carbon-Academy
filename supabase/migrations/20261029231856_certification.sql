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

-- Phase 5: submit_quiz gains a fourth column, so it is dropped and recreated. The body is the
-- Phase 4 function with three changes, each marked "Phase 5".
drop function public.submit_quiz(uuid, jsonb);

-- Grades on the server and logs the attempt (PRD 5.2, 6.4). Returns only the score, the total
-- and pass or fail. Refusals use their own codes so the app can tell them apart:
--   42501 not signed in, CAQ01 locked or no quiz, CAQ02 attempt limit, 22023 bad answers.
create function public.submit_quiz(p_lesson_id uuid, p_answers jsonb)
returns table (score integer, total integer, passed boolean, certified boolean) -- Phase 5
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
  v_number text; -- Phase 5
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

  if v_passed then
    v_number := public.issue_certificate_if_eligible(v_user); -- Phase 5 (decision 1)
  end if;
  return query select v_score, v_total, v_passed, v_number is not null;
end;
$$;

-- Change store (PRD 6.3). Signed-in learners only; the code is the authorisation.
create or replace function public.join_store(p_code text)
returns table (store_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.current_learner();
  v_store uuid;
  v_name text;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select s.id, s.name into v_store, v_name
  from public.stores s
  where s.store_code = public.normalise_store_code(p_code) and s.active;

  if v_store is null then
    return;
  end if;

  update public.profiles set store_id = v_store, last_active_at = now() where id = v_user;
  -- Phase 5: a customer who already passed every core lesson is certified on joining (decision 7).
  perform public.issue_certificate_if_eligible(v_user);
  return query select v_name;
end;
$$;

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
