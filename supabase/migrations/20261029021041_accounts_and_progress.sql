-- Phase 3: accounts, stores and lesson progress (PRD section 8; docs/security/PERMISSIONS.md).
-- Learners read only their own rows. All writes go through security definer functions that
-- use current_learner() (auth.uid() plus a live-session check) and never take a user ID
-- (controls 04, 06). search_path is empty in every function, so every name is schema-qualified.

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  type text check (length(type) <= 40),
  parent_group text check (length(parent_group) <= 120),
  created_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete restrict,
  name text not null check (length(name) between 1 and 120),
  suburb text check (length(suburb) <= 80),
  state text check (length(state) <= 40),
  country text not null default 'AU' check (country in ('AU', 'NZ', 'US')),
  -- Prefix, location, then 8 random Crockford base32 characters (decision 5). Stored upper case.
  store_code text not null unique
    check (store_code ~ '^[A-Z]{2,5}-[A-Z]{2,5}-[0-9A-HJKMNP-TV-Z]{8}$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index stores_partner_id_idx on public.stores (partner_id);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (length(first_name) between 1 and 50),
  last_name text not null check (length(last_name) between 1 and 50),
  email text not null check (length(email) <= 254),
  store_id uuid references public.stores (id) on delete set null,
  role text not null default 'learner' check (role in ('learner', 'admin')),
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  active boolean not null default true,
  -- For the retention job: delete after 24 months of inactivity (SECURITY.md section 5).
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index profiles_store_id_idx on public.profiles (store_id);

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  max_percent smallint not null default 0 check (max_percent between 0 and 100),
  last_position_seconds integer not null default 0 check (last_position_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index lesson_progress_lesson_id_idx on public.lesson_progress (lesson_id);

alter table public.partners enable row level security;
alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.lesson_progress enable row level security;

-- Deny by default, then grant back only reads. No direct writes for anyone but the owner role.
revoke all on public.partners, public.stores, public.profiles, public.lesson_progress
  from anon, authenticated;

grant select on public.profiles, public.lesson_progress, public.partners to authenticated;
-- Column grant: learners never see store codes, even their own store's (T-11).
grant select (id, partner_id, name, suburb, state, country) on public.stores to authenticated;

-- The signed-in learner's ID, or null if their session has ended (signed out, expired, revoked)
-- or their profile is deactivated. A JWT stays valid until it expires, so checking auth.sessions
-- makes sign-out and deactivation take effect at the database straight away (ASVS 7.4.1, 7.4.2).
-- Every policy and write function below uses this instead of auth.uid().
create function public.current_learner()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  join auth.sessions s on s.user_id = p.id
  where p.id = auth.uid()
    and s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
    -- Time-boxed sessions carry an end time (review finding L2). The inactivity timeout is
    -- enforced by Supabase Auth at refresh, so it can lag by up to one access-token lifetime.
    and (s.not_after is null or s.not_after > now())
    and p.active
$$;

create policy "Learners read their own profile"
  on public.profiles for select to authenticated
  using (id = (select public.current_learner()));

create policy "Learners read their own progress"
  on public.lesson_progress for select to authenticated
  using (user_id = (select public.current_learner()));

create policy "Learners read their own store"
  on public.stores for select to authenticated
  using (
    id = (select p.store_id from public.profiles p where p.id = (select public.current_learner()))
  );

create policy "Learners read their own store's partner"
  on public.partners for select to authenticated
  using (
    id = (
      select s.partner_id
      from public.stores s
      join public.profiles p on p.store_id = s.id
      where p.id = (select public.current_learner())
    )
  );

-- Normalises a typed store code: trim and upper case. Anything over 40 characters is rejected.
create function public.normalise_store_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_code is null or length(p_code) > 40 then null
              else upper(btrim(p_code)) end
$$;

-- Guards on auth.users. user_metadata comes from the client and is untrusted (T-17).

-- 1. Before insert: refuse a sign-up without names (fail closed at the Auth API).
create function public.check_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if btrim(coalesce(new.raw_user_meta_data ->> 'first_name', '')) = ''
     or btrim(coalesce(new.raw_user_meta_data ->> 'last_name', '')) = '' then
    raise exception 'first_name and last_name are required';
  end if;
  return new;
end;
$$;

create trigger before_auth_user_created
  before insert on auth.users
  for each row execute function public.check_new_user();

-- 2. No password can be set or changed on an existing account. The app is magic-link only, but
-- Supabase's Auth API (updateUser) would let anyone holding a session, such as someone with a
-- forwarded link, add a lasting password that "sign out on all devices" can't remove
-- (review finding H1, ASVS 6.1.3, T-27). Insert is deliberately not blocked: Supabase may store
-- a random temporary password when it creates a magic-link user. A password chosen at API
-- sign-up still needs the mailbox (confirm email is on) and meets the hosted password rules.
create function public.refuse_password_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.encrypted_password, '') <> ''
     and new.encrypted_password is distinct from old.encrypted_password then
    raise exception 'passwords are not used in the Academy';
  end if;
  return new;
end;
$$;

create trigger refuse_password_change
  before update of encrypted_password on auth.users
  for each row execute function public.refuse_password_change();

-- 3. The profile is created only once the email is confirmed (the first magic-link sign-in),
-- so nobody can create a profile or record marketing consent for someone else's address
-- (review finding M2, T-26). Reads known keys only, trims and caps them, never reads a role.
create function public.create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_opt_in boolean := coalesce((v_meta ->> 'marketing_opt_in')::boolean, false);
  v_store uuid;
begin
  select s.id into v_store
  from public.stores s
  where s.store_code = public.normalise_store_code(v_meta ->> 'store_code') and s.active;

  insert into public.profiles
    (id, first_name, last_name, email, store_id, marketing_opt_in, marketing_opt_in_at)
  values (
    new.id,
    left(btrim(v_meta ->> 'first_name'), 50),
    left(btrim(v_meta ->> 'last_name'), 50),
    new.email,
    v_store,
    v_opt_in,
    case when v_opt_in then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_confirmed_insert
  after insert on auth.users
  for each row when (new.email_confirmed_at is not null)
  execute function public.create_profile();

create trigger on_auth_user_confirmed_update
  after update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.create_profile();

-- 4. Keep profiles.email in step after a confirmed email change (double confirmation is on,
-- and Supabase emails both addresses; review finding H1).
create function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

-- Join page lookup (T-11). Returns only what the page shows. No IDs, no codes, no list.
create function public.lookup_store(p_code text)
returns table (store_name text, partner_name text, suburb text, state text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.name, p.name, s.suburb, s.state
  from public.stores s
  join public.partners p on p.id = s.partner_id
  where s.store_code = public.normalise_store_code(p_code) and s.active
$$;

-- Change store (PRD 6.3). Signed-in learners only; the code is the authorisation.
create function public.join_store(p_code text)
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
  return query select v_name;
end;
$$;

-- Progress saves from the player (PRD 5.3). Own rows only, published lessons only. Percent is
-- clamped and only ever goes up; completion is stamped once at 90%. Saves under 2 seconds apart
-- are ignored (the player sends about every 10%, plus pause and end).
create function public.save_lesson_progress(
  p_lesson_id uuid,
  p_percent numeric,
  p_position_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.current_learner();
  v_percent smallint := least(greatest(coalesce(round(p_percent), 0), 0), 100);
  v_duration integer;
  v_position integer;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select l.duration_seconds into v_duration
  from public.lessons l
  where l.id = p_lesson_id and l.published;

  if not found then
    raise exception 'lesson not available' using errcode = 'P0002';
  end if;

  v_position := least(greatest(coalesce(p_position_seconds, 0), 0), coalesce(v_duration, 86400));

  insert into public.lesson_progress as lp
    (user_id, lesson_id, max_percent, last_position_seconds, completed_at, updated_at)
  values
    (v_user, p_lesson_id, v_percent, v_position, case when v_percent >= 90 then now() end, now())
  on conflict (user_id, lesson_id) do update
    set max_percent = greatest(lp.max_percent, excluded.max_percent),
        last_position_seconds = excluded.last_position_seconds,
        completed_at = coalesce(lp.completed_at, excluded.completed_at),
        updated_at = now()
    where lp.updated_at < now() - interval '2 seconds';

  update public.profiles set last_active_at = now()
  where id = v_user and last_active_at < now() - interval '1 hour';
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default, and Supabase's default privileges also grant it
-- to anon and authenticated, so revoke from all three before granting back.
revoke all on function public.check_new_user() from public, anon, authenticated;
revoke all on function public.refuse_password_change() from public, anon, authenticated;
revoke all on function public.create_profile() from public, anon, authenticated;
revoke all on function public.sync_profile_email() from public, anon, authenticated;
-- Only used inside the definer functions above; not an API (review finding L9).
revoke all on function public.normalise_store_code(text) from public, anon, authenticated;
revoke all on function public.current_learner() from public, anon, authenticated;
grant execute on function public.current_learner() to authenticated;
revoke all on function public.lookup_store(text) from public, anon, authenticated;
revoke all on function public.join_store(text) from public, anon, authenticated;
revoke all on function public.save_lesson_progress(uuid, numeric, integer)
  from public, anon, authenticated;
grant execute on function public.lookup_store(text) to anon, authenticated;
grant execute on function public.join_store(text) to authenticated;
grant execute on function public.save_lesson_progress(uuid, numeric, integer) to authenticated;
