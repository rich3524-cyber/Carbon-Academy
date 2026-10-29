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

-- The limit itself was seeded in Phase 1 (quiz_attempts_per_hour = 10). Make the scope clear.
update public.settings
set description = 'Quiz attempts allowed per learner per lesson per hour (PRD 6.4)'
where key = 'quiz_attempts_per_hour';

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
