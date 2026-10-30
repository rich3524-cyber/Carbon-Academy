-- Phase 6: admin (PRD 5.6, 6.6; plan decisions 1–13; controls 03, 04, 06, 15; T-45 to T-56).
-- Admins get no table grants. Every admin read and write is an admin_* security definer
-- function whose first statement is require_admin(): an active admin whose session passed MFA
-- (aal2, read from auth.sessions) with a TOTP in the last 8 hours. High-risk functions then call
-- require_step_up(): a TOTP on this session in the last 5 minutes. Each write records its own
-- audit row in the same transaction. search_path is empty, so every name is schema-qualified.
--
-- Error codes the app maps (src/lib/admin/call.ts): 42501 not an admin (404), CAA01 step-up
-- needed, CAA02 refused by a guard, CAA03 core lesson can't be published yet, 22023 invalid
-- input, 23505 duplicate, P0002 not found.

-- ---------------------------------------------------------------------------------------------
-- Audit log (decision 5)
-- ---------------------------------------------------------------------------------------------

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  -- No foreign key: the record outlives the operator's account.
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
create index admin_audit_log_action_idx on public.admin_audit_log (action, id desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Access (decisions 1, 2 and 4)
-- ---------------------------------------------------------------------------------------------

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

-- Settings an admin may change, with their ranges (decision 12). Internal: no EXECUTE grant.
-- The renewal window starts at 1 because setting_int() clamps it to at least 1 day.
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
      and (p_value #>> '{}') ~ '^[0-9]{1,3}$'
      and (p_value #>> '{}')::integer between
        case p_key when 'pass_mark_percent' then 50 else 1 end
        and
        case p_key when 'pass_mark_percent' then 100 when 'store_certification_threshold' then 20
                   when 'certificate_validity_months' then 36
                   when 'certificate_renewal_window_days' then 90 else 20 end
    when p_key = 'warranty_registration_url' then
      jsonb_typeof(p_value) = 'null'
      or (jsonb_typeof(p_value) = 'string' and (p_value #>> '{}') ~ '^https://[^\s]{4,292}$')
    when p_key = 'company_address' then
      jsonb_typeof(p_value) = 'string' and length(btrim(p_value #>> '{}')) between 1 and 200
    else false
  end
$$;

-- Normalises a slug-like input (trim, lower case) and checks the shared slug rule.
create function public.admin_slug_ok(p_slug text, p_max integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_slug is not null and length(p_slug) <= p_max
    and p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
$$;

-- Raises 22023 unless the text is present (when required) and within the length.
create function public.admin_check_text(
  p_value text, p_field text, p_min integer, p_max integer
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if (p_min > 0 and (p_value is null or length(btrim(p_value)) < p_min))
     or length(coalesce(p_value, '')) > p_max then
    raise exception 'invalid %', p_field using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Overview
-- ---------------------------------------------------------------------------------------------

create function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'learners', (select count(*) from public.profiles where role = 'learner'),
    'active_certificates', (
      select count(*) from public.certificates
      where revoked_at is null and expires_at > now()),
    'certified_stores', (select count(*) from public.store_status where is_certified),
    'published_lessons', (select count(*) from public.lessons where published),
    'core_lessons_without_quiz', (
      select count(*) from public.lessons l
      where l.published and l.is_core and not public.quiz_ready(l.id))
  );
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Categories and lessons (decision 8)
-- ---------------------------------------------------------------------------------------------

create function public.admin_list_categories()
returns table (
  id uuid, slug text, name text, description text, sort_order integer, lesson_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select c.id, c.slug, c.name, c.description, c.sort_order,
    (select count(*)::integer from public.lessons l where l.category_id = c.id)
  from public.categories c
  order by c.sort_order, c.name;
end;
$$;

create function public.admin_save_category(
  p_id uuid, p_slug text, p_name text, p_description text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_id uuid := p_id;
begin
  if not public.admin_slug_ok(p_slug, 80) then
    raise exception 'invalid slug' using errcode = '22023';
  end if;
  perform public.admin_check_text(p_name, 'name', 1, 80);
  perform public.admin_check_text(p_description, 'description', 0, 300);

  if v_id is null then
    insert into public.categories (slug, name, description, sort_order)
    values (p_slug, btrim(p_name), nullif(btrim(p_description), ''),
      coalesce((select max(sort_order) from public.categories), 0) + 10)
    returning id into v_id;
  else
    update public.categories
    set slug = p_slug, name = btrim(p_name), description = nullif(btrim(p_description), '')
    where id = v_id;
    if not found then
      raise exception 'category not found' using errcode = 'P0002';
    end if;
  end if;

  perform public.admin_audit(v_admin, 'category_saved', 'category', v_id::text,
    jsonb_build_object('created', p_id is null));
  return v_id;
end;
$$;

create function public.admin_move_category(p_id uuid, p_direction integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_pos integer;
  v_other uuid;
  v_other_pos integer;
begin
  if p_direction not in (-1, 1) then
    raise exception 'invalid direction' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('admin_order:categories'));
  -- Renumber 10, 20, 30… so neighbours always differ, then swap with the neighbour.
  update public.categories c set sort_order = o.pos
  from (select id, (row_number() over (order by sort_order, name) * 10)::integer as pos
        from public.categories) o
  where c.id = o.id;

  select sort_order into v_pos from public.categories where id = p_id;
  if not found then
    raise exception 'category not found' using errcode = 'P0002';
  end if;
  select id, sort_order into v_other, v_other_pos from public.categories
  where sort_order = v_pos + p_direction * 10;
  if v_other is null then
    return; -- already first or last
  end if;
  update public.categories set sort_order = v_other_pos where id = p_id;
  update public.categories set sort_order = v_pos where id = v_other;
  perform public.admin_audit(v_admin, 'category_moved', 'category', p_id::text,
    jsonb_build_object('direction', p_direction));
end;
$$;

create function public.admin_list_lessons()
returns table (
  id uuid, category_id uuid, category_name text, slug text, title text, product_name text,
  is_core boolean, region public.region, published boolean, sort_order integer, vimeo_id text,
  duration_seconds integer, quiz_ready boolean, learners_started integer, qr_links integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select l.id, l.category_id, c.name, l.slug, l.title, l.product_name, l.is_core, l.region,
    l.published, l.sort_order, l.vimeo_id, l.duration_seconds, public.quiz_ready(l.id),
    (select count(*)::integer from public.lesson_progress p where p.lesson_id = l.id),
    (select count(*)::integer from public.qr_links q where q.lesson_id = l.id)
  from public.lessons l
  join public.categories c on c.id = l.category_id
  order by c.sort_order, c.name, l.sort_order, l.title;
end;
$$;

create function public.admin_get_lesson(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lesson jsonb;
begin
  perform public.require_admin();
  select to_jsonb(l) || jsonb_build_object(
      'quiz_ready', public.quiz_ready(l.id),
      'in_use', exists (select 1 from public.lesson_progress p where p.lesson_id = l.id)
        or exists (select 1 from public.quiz_attempts a where a.lesson_id = l.id)
        or exists (select 1 from public.qr_links q where q.lesson_id = l.id))
    into v_lesson
  from public.lessons l
  where l.id = p_id;
  if v_lesson is null then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;
  return v_lesson;
end;
$$;

create function public.admin_save_lesson(
  p_id uuid, p_category uuid, p_slug text, p_title text, p_summary text, p_product_name text,
  p_vimeo_id text, p_duration_seconds integer, p_is_core boolean, p_region public.region,
  p_published boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_id uuid := p_id;
begin
  if not public.admin_slug_ok(p_slug, 80) then
    raise exception 'invalid slug' using errcode = '22023';
  end if;
  perform public.admin_check_text(p_title, 'title', 1, 120);
  perform public.admin_check_text(p_summary, 'summary', 0, 500);
  perform public.admin_check_text(p_product_name, 'product name', 0, 120);
  if p_vimeo_id is not null and p_vimeo_id !~ '^[0-9]{1,12}$' then
    raise exception 'invalid vimeo id' using errcode = '22023';
  end if;
  if p_duration_seconds is not null and p_duration_seconds not between 1 and 36000 then
    raise exception 'invalid duration' using errcode = '22023';
  end if;
  if p_is_core is null or p_published is null or p_region is null then
    raise exception 'invalid flags' using errcode = '22023';
  end if;
  if not exists (select 1 from public.categories where id = p_category) then
    raise exception 'invalid category' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.lessons (category_id, slug, title, summary, product_name, vimeo_id,
      duration_seconds, is_core, region, published, sort_order)
    values (p_category, p_slug, btrim(p_title), nullif(btrim(p_summary), ''),
      nullif(btrim(p_product_name), ''), p_vimeo_id, p_duration_seconds, p_is_core, p_region,
      false,
      coalesce((select max(sort_order) from public.lessons where category_id = p_category), 0)
        + 10)
    returning id into v_id;
  else
    perform 1 from public.lessons where id = v_id for update;
    if not found then
      raise exception 'lesson not found' using errcode = 'P0002';
    end if;
  end if;

  -- T-55: a published core lesson without a ready quiz and a length stops everyone certifying.
  if p_is_core and p_published
     and not (public.quiz_ready(v_id) and p_duration_seconds is not null) then
    raise exception 'core lesson needs a quiz and a duration' using errcode = 'CAA03';
  end if;

  update public.lessons
  set category_id = p_category, slug = p_slug, title = btrim(p_title),
    summary = nullif(btrim(p_summary), ''), product_name = nullif(btrim(p_product_name), ''),
    vimeo_id = p_vimeo_id, duration_seconds = p_duration_seconds, is_core = p_is_core,
    region = p_region, published = p_published
  where id = v_id;

  perform public.admin_audit(v_admin, 'lesson_saved', 'lesson', v_id::text,
    jsonb_build_object('created', p_id is null, 'published', p_published, 'is_core', p_is_core));
  return v_id;
end;
$$;

create function public.admin_move_lesson(p_id uuid, p_direction integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_category uuid;
  v_pos integer;
  v_other uuid;
  v_other_pos integer;
begin
  if p_direction not in (-1, 1) then
    raise exception 'invalid direction' using errcode = '22023';
  end if;
  select category_id into v_category from public.lessons where id = p_id;
  if not found then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('admin_order:lessons:' || v_category::text, 0));
  update public.lessons l set sort_order = o.pos
  from (select id, (row_number() over (order by sort_order, title) * 10)::integer as pos
        from public.lessons where category_id = v_category) o
  where l.id = o.id;

  select sort_order into v_pos from public.lessons where id = p_id;
  select id, sort_order into v_other, v_other_pos from public.lessons
  where category_id = v_category and sort_order = v_pos + p_direction * 10;
  if v_other is null then
    return;
  end if;
  update public.lessons set sort_order = v_other_pos where id = p_id;
  update public.lessons set sort_order = v_pos where id = v_other;
  perform public.admin_audit(v_admin, 'lesson_moved', 'lesson', p_id::text,
    jsonb_build_object('direction', p_direction));
end;
$$;

create function public.admin_delete_lesson(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_title text;
begin
  select title into v_title from public.lessons where id = p_id for update;
  if not found then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;
  -- Deleting would cascade away learners' history (decision 8). Unpublish instead.
  if exists (select 1 from public.lesson_progress where lesson_id = p_id)
     or exists (select 1 from public.quiz_attempts where lesson_id = p_id)
     or exists (select 1 from public.qr_links where lesson_id = p_id) then
    raise exception 'lesson in use' using errcode = 'CAA02';
  end if;
  delete from public.lessons where id = p_id;
  perform public.admin_audit(v_admin, 'lesson_deleted', 'lesson', p_id::text,
    jsonb_build_object('title', v_title));
end;
$$;

-- Admins only, so the correct option may appear here (never in get_quiz).
create function public.admin_get_quiz(p_lesson uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  if not exists (select 1 from public.lessons where id = p_lesson) then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'prompt', q.prompt,
        'options', (
          select coalesce(jsonb_agg(jsonb_build_object('text', o.text, 'correct', o.is_correct)
            order by o.created_at, o.id), '[]')
          from public.answer_options o where o.question_id = q.id))
      order by q.sort_order, q.created_at)
    from public.questions q
    where q.lesson_id = p_lesson
  ), '[]');
end;
$$;

-- Replaces the lesson's whole quiz in one transaction (decision 8). The rules match
-- quiz_ready(): every question has 3 or 4 options with exactly one correct.
create function public.admin_save_quiz(p_lesson uuid, p_questions jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_question jsonb;
  v_option jsonb;
  v_question_id uuid;
  v_position integer := 0;
begin
  perform 1 from public.lessons where id = p_lesson for update;
  if not found then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_questions) is distinct from 'array'
     or jsonb_array_length(p_questions) not between 1 and 5 then
    raise exception 'invalid questions' using errcode = '22023';
  end if;
  for v_question in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(v_question -> 'prompt') is distinct from 'string'
       or length(btrim(v_question ->> 'prompt')) not between 1 and 300
       or jsonb_typeof(v_question -> 'options') is distinct from 'array'
       or jsonb_array_length(v_question -> 'options') not between 3 and 4
       or (select count(*) from jsonb_array_elements(v_question -> 'options') o
           where o.value -> 'correct' = 'true'::jsonb) <> 1
       or exists (select 1 from jsonb_array_elements(v_question -> 'options') o
           where jsonb_typeof(o.value -> 'text') is distinct from 'string'
              or length(btrim(o.value ->> 'text')) not between 1 and 200
              or jsonb_typeof(o.value -> 'correct') is distinct from 'boolean') then
      raise exception 'invalid question' using errcode = '22023';
    end if;
  end loop;

  delete from public.questions where lesson_id = p_lesson;
  for v_question in select value from jsonb_array_elements(p_questions) loop
    v_position := v_position + 10;
    insert into public.questions (lesson_id, prompt, sort_order)
    values (p_lesson, btrim(v_question ->> 'prompt'), v_position)
    returning id into v_question_id;
    for v_option in select value from jsonb_array_elements(v_question -> 'options') loop
      insert into public.answer_options (question_id, text, is_correct)
      values (v_question_id, btrim(v_option ->> 'text'), (v_option ->> 'correct')::boolean);
    end loop;
  end loop;

  perform public.admin_audit(v_admin, 'quiz_saved', 'lesson', p_lesson::text,
    jsonb_build_object('questions', jsonb_array_length(p_questions)));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Partners and stores (decisions 6 and 9)
-- ---------------------------------------------------------------------------------------------

create function public.admin_list_partners()
returns table (id uuid, name text, type text, parent_group text, store_count integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select p.id, p.name, p.type, p.parent_group,
    (select count(*)::integer from public.stores s where s.partner_id = p.id)
  from public.partners p
  order by p.name;
end;
$$;

create function public.admin_save_partner(
  p_id uuid, p_name text, p_type text, p_parent_group text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_id uuid := p_id;
begin
  perform public.admin_check_text(p_name, 'name', 1, 120);
  perform public.admin_check_text(p_parent_group, 'parent group', 0, 120);
  if p_type is not null and p_type not in ('dealer', 'retailer', 'big box') then
    raise exception 'invalid type' using errcode = '22023';
  end if;
  if v_id is null then
    insert into public.partners (name, type, parent_group)
    values (btrim(p_name), p_type, nullif(btrim(p_parent_group), ''))
    returning id into v_id;
  else
    update public.partners
    set name = btrim(p_name), type = p_type, parent_group = nullif(btrim(p_parent_group), '')
    where id = v_id;
    if not found then
      raise exception 'partner not found' using errcode = 'P0002';
    end if;
  end if;
  perform public.admin_audit(v_admin, 'partner_saved', 'partner', v_id::text,
    jsonb_build_object('created', p_id is null));
  return v_id;
end;
$$;

create function public.admin_list_stores(p_partner uuid)
returns table (
  id uuid, partner_id uuid, partner_name text, name text, suburb text, state text,
  country text, active boolean, store_code text, learners integer, certified_staff integer,
  is_certified boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select s.id, s.partner_id, p.name, s.name, s.suburb, s.state, s.country, s.active,
    s.store_code,
    (select count(*)::integer from public.profiles pr where pr.store_id = s.id),
    coalesce(st.active_certified_staff, 0), coalesce(st.is_certified, false)
  from public.stores s
  join public.partners p on p.id = s.partner_id
  left join public.store_status st on st.store_id = s.id
  where p_partner is null or s.partner_id = p_partner
  order by p.name, s.name;
end;
$$;

-- A fresh code: prefix, location and 8 random Crockford characters (decision 6). Retries on the
-- (vanishingly rare) collision. Internal.
create function public.admin_new_store_code(p_prefix text, p_location text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_code text;
begin
  if p_prefix is null or p_prefix !~ '^[A-Z]{2,5}$'
     or p_location is null or p_location !~ '^[A-Z]{2,5}$' then
    raise exception 'invalid code parts' using errcode = '22023';
  end if;
  loop
    v_code := p_prefix || '-' || p_location || '-' || public.random_code(8);
    exit when not exists (select 1 from public.stores where store_code = v_code);
  end loop;
  return v_code;
end;
$$;

create function public.admin_save_store(
  p_id uuid, p_partner uuid, p_name text, p_suburb text, p_state text, p_country text,
  p_active boolean, p_prefix text, p_location text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_id uuid := p_id;
begin
  perform public.admin_check_text(p_name, 'name', 1, 120);
  perform public.admin_check_text(p_suburb, 'suburb', 0, 80);
  perform public.admin_check_text(p_state, 'state', 0, 40);
  if p_country is null or p_country not in ('AU', 'NZ', 'US') or p_active is null then
    raise exception 'invalid store' using errcode = '22023';
  end if;
  if not exists (select 1 from public.partners where id = p_partner) then
    raise exception 'invalid partner' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.stores (partner_id, name, suburb, state, country, active, store_code)
    values (p_partner, btrim(p_name), nullif(btrim(p_suburb), ''), nullif(btrim(p_state), ''),
      p_country, p_active, public.admin_new_store_code(p_prefix, p_location))
    returning id into v_id;
  else
    -- Editing never touches the code; regenerating is its own step-up action.
    update public.stores
    set partner_id = p_partner, name = btrim(p_name), suburb = nullif(btrim(p_suburb), ''),
      state = nullif(btrim(p_state), ''), country = p_country, active = p_active
    where id = v_id;
    if not found then
      raise exception 'store not found' using errcode = 'P0002';
    end if;
  end if;
  perform public.admin_audit(v_admin, 'store_saved', 'store', v_id::text,
    jsonb_build_object('created', p_id is null, 'active', p_active));
  return v_id;
end;
$$;

create function public.admin_regenerate_store_code(
  p_store uuid, p_prefix text, p_location text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_code text;
begin
  perform public.require_step_up();
  perform 1 from public.stores where id = p_store for update;
  if not found then
    raise exception 'store not found' using errcode = 'P0002';
  end if;
  v_code := public.admin_new_store_code(p_prefix, p_location);
  update public.stores set store_code = v_code where id = p_store;
  -- Never the code itself (T-53).
  perform public.admin_audit(v_admin, 'store_code_regenerated', 'store', p_store::text, '{}');
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Learners (decision 7)
-- ---------------------------------------------------------------------------------------------

-- Phase 5's rule, as text: the latest certificate's status, or null.
create function public.certificate_status_of(p_user uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when c.revoked_at is not null then 'revoked'
    when c.expires_at <= now() then 'expired'
    else 'active'
  end
  from public.certificates c
  where c.user_id = p_user
  order by c.issued_at desc
  limit 1
$$;

create function public.admin_search_learners(p_query text)
returns table (
  id uuid, first_name text, last_name text, email text, store_name text, role text,
  active boolean, certificate_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := btrim(coalesce(p_query, ''));
  v_pattern text;
begin
  perform public.require_admin();
  if length(v_query) not between 2 and 100 then
    raise exception 'invalid query' using errcode = '22023';
  end if;
  v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return query
  select p.id, p.first_name, p.last_name, p.email, s.name, p.role, p.active,
    public.certificate_status_of(p.id)
  from public.profiles p
  left join public.stores s on s.id = p.store_id
  where p.first_name ilike v_pattern or p.last_name ilike v_pattern
    or (p.first_name || ' ' || p.last_name) ilike v_pattern
    or p.email ilike v_pattern or s.name ilike v_pattern
  order by p.last_name, p.first_name
  limit 50;
end;
$$;

create function public.admin_get_learner(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_result jsonb;
begin
  select jsonb_build_object(
    'id', p.id, 'first_name', p.first_name, 'last_name', p.last_name, 'email', p.email,
    'role', p.role, 'active', p.active, 'created_at', p.created_at,
    'last_active_at', p.last_active_at, 'is_self', p.id = v_admin,
    'store', case when s.id is null then null else jsonb_build_object(
      'id', s.id, 'name', s.name, 'partner_name', pa.name) end,
    'mfa_factors', (select count(*) from auth.mfa_factors f
                    where f.user_id = p.id and f.status = 'verified'),
    'progress', (
      select coalesce(jsonb_agg(jsonb_build_object(
          'lesson_id', l.id, 'title', l.title, 'max_percent', lp.max_percent,
          'updated_at', lp.updated_at) order by c.sort_order, l.sort_order), '[]')
      from public.lesson_progress lp
      join public.lessons l on l.id = lp.lesson_id
      join public.categories c on c.id = l.category_id
      where lp.user_id = p.id),
    -- Score and date only, never the answers (decision 7).
    'attempts', (
      select coalesce(jsonb_agg(jsonb_build_object(
          'lesson_title', l.title, 'score', a.score, 'total', a.total, 'passed', a.passed,
          'created_at', a.created_at) order by a.created_at desc), '[]')
      from public.quiz_attempts a
      join public.lessons l on l.id = a.lesson_id
      where a.user_id = p.id),
    'certificates', (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', ce.id, 'number', ce.certificate_number, 'store_name', ce.store_name_at_issue,
          'issued_at', ce.issued_at, 'expires_at', ce.expires_at, 'revoked_at', ce.revoked_at)
          order by ce.issued_at desc), '[]')
      from public.certificates ce
      where ce.user_id = p.id)
  ) into v_result
  from public.profiles p
  left join public.stores s on s.id = p.store_id
  left join public.partners pa on pa.id = s.partner_id
  where p.id = p_user;
  if v_result is null then
    raise exception 'learner not found' using errcode = 'P0002';
  end if;
  return v_result;
end;
$$;

create function public.admin_set_learner_store(p_user uuid, p_store uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_from uuid;
begin
  select store_id into v_from from public.profiles where id = p_user for update;
  if not found then
    raise exception 'learner not found' using errcode = 'P0002';
  end if;
  if p_store is not null and not exists (
    select 1 from public.stores where id = p_store and active
  ) then
    raise exception 'invalid store' using errcode = '22023';
  end if;
  update public.profiles set store_id = p_store where id = p_user;
  -- Same as joining with a code (decision 7).
  if p_store is not null then
    perform public.issue_certificate_if_eligible(p_user);
  end if;
  perform public.admin_audit(v_admin, 'learner_store_changed', 'learner', p_user::text,
    jsonb_build_object('from', v_from, 'to', p_store));
end;
$$;

create function public.admin_set_learner_active(p_user uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_role text;
begin
  if p_active is null then
    raise exception 'invalid flag' using errcode = '22023';
  end if;
  if p_user = v_admin then
    raise exception 'cannot change your own account' using errcode = 'CAA02';
  end if;
  select role into v_role from public.profiles where id = p_user for update;
  if not found then
    raise exception 'learner not found' using errcode = 'P0002';
  end if;
  if v_role = 'admin' and not p_active then
    raise exception 'remove the admin role first' using errcode = 'CAA02';
  end if;
  update public.profiles set active = p_active where id = p_user;
  if not p_active then
    -- Signed out everywhere straight away (ASVS 7.4.2, 7.4.5).
    delete from auth.sessions where user_id = p_user;
  end if;
  perform public.admin_audit(v_admin,
    case when p_active then 'learner_activated' else 'learner_deactivated' end,
    'learner', p_user::text, '{}');
end;
$$;

create function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid;
  v_old text;
  v_active boolean;
begin
  -- Lock first, then check access, so a demotion committed by another admin is seen (T-52).
  perform pg_advisory_xact_lock(hashtext('admin_roles'));
  v_admin := public.require_admin();
  perform public.require_step_up();
  if p_role is null or p_role not in ('learner', 'admin') then
    raise exception 'invalid role' using errcode = '22023';
  end if;
  if p_user = v_admin then
    raise exception 'cannot change your own role' using errcode = 'CAA02';
  end if;
  select role, active into v_old, v_active from public.profiles where id = p_user for update;
  if not found then
    raise exception 'learner not found' using errcode = 'P0002';
  end if;
  if not v_active then
    raise exception 'account is deactivated' using errcode = 'CAA02';
  end if;
  if v_old = p_role then
    return;
  end if;
  update public.profiles set role = p_role where id = p_user;
  perform public.admin_audit(v_admin, 'role_changed', 'learner', p_user::text,
    jsonb_build_object('from', v_old, 'to', p_role));
end;
$$;

create function public.admin_reset_mfa(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
begin
  perform public.require_step_up();
  if p_user = v_admin then
    raise exception 'cannot reset your own MFA' using errcode = 'CAA02';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'learner not found' using errcode = 'P0002';
  end if;
  -- The trigger records each removed factor against this admin.
  delete from auth.mfa_factors where user_id = p_user;
  delete from auth.sessions where user_id = p_user;
  perform public.admin_audit(v_admin, 'mfa_reset', 'learner', p_user::text, '{}');
end;
$$;

create function public.admin_revoke_certificate(p_certificate uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_number text;
  v_revoked timestamptz;
begin
  perform public.require_step_up();
  perform public.admin_check_text(p_reason, 'reason', 3, 300);
  select certificate_number, revoked_at into v_number, v_revoked
  from public.certificates where id = p_certificate for update;
  if not found then
    raise exception 'certificate not found' using errcode = 'P0002';
  end if;
  if v_revoked is not null then
    raise exception 'already revoked' using errcode = 'CAA02';
  end if;
  update public.certificates set revoked_at = now() where id = p_certificate;
  perform public.admin_audit(v_admin, 'certificate_revoked', 'certificate', p_certificate::text,
    jsonb_build_object('number', v_number, 'reason', btrim(p_reason)));
end;
$$;

create function public.admin_reinstate_certificate(p_certificate uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_number text;
  v_revoked timestamptz;
begin
  perform public.require_step_up();
  select certificate_number, revoked_at into v_number, v_revoked
  from public.certificates where id = p_certificate for update;
  if not found then
    raise exception 'certificate not found' using errcode = 'P0002';
  end if;
  if v_revoked is null then
    raise exception 'not revoked' using errcode = 'CAA02';
  end if;
  update public.certificates set revoked_at = null where id = p_certificate;
  perform public.admin_audit(v_admin, 'certificate_reinstated', 'certificate',
    p_certificate::text, jsonb_build_object('number', v_number));
end;
$$;

-- Deletion on request (decision 7; SECURITY.md runbook). Cascades to the profile, progress,
-- attempts and certificates. The audit row keeps the user ID and date only.
create function public.admin_delete_learner(p_user uuid, p_confirm_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_name text;
  v_role text;
begin
  perform public.require_step_up();
  if p_user = v_admin then
    raise exception 'cannot delete yourself' using errcode = 'CAA02';
  end if;
  select first_name || ' ' || last_name, role into v_name, v_role
  from public.profiles where id = p_user for update;
  if not found then
    raise exception 'learner not found' using errcode = 'P0002';
  end if;
  if v_role = 'admin' then
    raise exception 'remove the admin role first' using errcode = 'CAA02';
  end if;
  if lower(btrim(coalesce(p_confirm_name, ''))) <> lower(v_name) then
    raise exception 'name does not match' using errcode = '22023';
  end if;
  delete from auth.users where id = p_user;
  perform public.admin_audit(v_admin, 'learner_deleted', 'learner', p_user::text, '{}');
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- QR links (decision 10)
-- ---------------------------------------------------------------------------------------------

create function public.admin_list_qr_links()
returns table (
  id uuid, slug text, lesson_id uuid, lesson_title text, scan_count integer,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select q.id, q.slug, q.lesson_id, l.title, q.scan_count, q.created_at
  from public.qr_links q
  join public.lessons l on l.id = q.lesson_id
  order by q.slug;
end;
$$;

create function public.admin_save_qr_link(p_id uuid, p_slug text, p_lesson uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_id uuid := p_id;
begin
  if not exists (select 1 from public.lessons where id = p_lesson) then
    raise exception 'invalid lesson' using errcode = '22023';
  end if;
  if v_id is null then
    if not public.admin_slug_ok(p_slug, 80) then
      raise exception 'invalid slug' using errcode = '22023';
    end if;
    insert into public.qr_links (slug, lesson_id) values (p_slug, p_lesson) returning id into v_id;
  else
    -- The slug is fixed once created: printed codes depend on it.
    update public.qr_links set lesson_id = p_lesson where id = v_id;
    if not found then
      raise exception 'qr link not found' using errcode = 'P0002';
    end if;
  end if;
  perform public.admin_audit(v_admin, 'qr_link_saved', 'qr_link', v_id::text,
    jsonb_build_object('created', p_id is null, 'lesson_id', p_lesson));
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Reports (decision 11)
-- ---------------------------------------------------------------------------------------------

create function public.admin_report_completions()
returns table (
  lesson_id uuid, category_name text, title text, is_core boolean, published boolean,
  started integer, watched integer, passed integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select l.id, c.name, l.title, l.is_core, l.published,
    (select count(*)::integer from public.lesson_progress p where p.lesson_id = l.id),
    (select count(*)::integer from public.lesson_progress p
     where p.lesson_id = l.id and p.max_percent >= 90),
    (select count(distinct a.user_id)::integer from public.quiz_attempts a
     where a.lesson_id = l.id and a.passed)
  from public.lessons l
  join public.categories c on c.id = l.category_id
  order by c.sort_order, c.name, l.sort_order, l.title;
end;
$$;

create function public.admin_report_certified_stores()
returns table (
  store_id uuid, partner_name text, store_name text, suburb text, state text,
  certified_staff integer, threshold integer, is_certified boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select s.id, p.name, s.name, s.suburb, s.state, st.active_certified_staff,
    public.setting_int('store_certification_threshold', 2, 1, 100), st.is_certified
  from public.store_status st
  join public.stores s on s.id = st.store_id
  join public.partners p on p.id = s.partner_id
  order by st.is_certified desc, p.name, s.name;
end;
$$;

-- No emails (decision 11, data minimisation).
create function public.admin_report_certified_staff()
returns table (
  first_name text, last_name text, store_name text, partner_name text,
  certificate_number text, issued_at timestamptz, expires_at timestamptz, status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select c.first_name, c.last_name, s.name, pa.name, c.certificate_number, c.issued_at,
    c.expires_at,
    case when c.revoked_at is not null then 'revoked'
         when c.expires_at <= now() then 'expired' else 'active' end
  from public.certificates c
  join public.profiles p on p.id = c.user_id
  left join public.stores s on s.id = p.store_id
  left join public.partners pa on pa.id = s.partner_id
  order by pa.name nulls last, s.name nulls last, c.last_name, c.issued_at desc;
end;
$$;

create function public.admin_report_qr_scans(p_from date, p_to date)
returns table (slug text, lesson_title text, utm_source text, scans integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 1096 then
    raise exception 'invalid range' using errcode = '22023';
  end if;
  return query
  select q.slug, l.title, coalesce(sc.utm_source, '(none)'), count(*)::integer
  from public.qr_scans sc
  join public.qr_links q on q.id = sc.qr_link_id
  join public.lessons l on l.id = q.lesson_id
  where sc.scanned_at >= p_from::timestamptz
    and sc.scanned_at < (p_to + 1)::timestamptz
  group by q.slug, l.title, coalesce(sc.utm_source, '(none)')
  order by q.slug, count(*) desc;
end;
$$;

create function public.admin_list_audit(p_action text, p_before bigint)
returns table (
  id bigint, at timestamptz, actor_name text, action text, target_type text, target_id text,
  details jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select a.id, a.at, a.actor_name, a.action, a.target_type, a.target_id, a.details
  from public.admin_audit_log a
  where (p_action is null or a.action = p_action)
    and (p_before is null or a.id < p_before)
  order by a.id desc
  limit 100;
end;
$$;

create function public.admin_log_export(p_report text, p_rows integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
begin
  perform public.require_step_up();
  if p_report is null
     or p_report not in ('completions', 'certified-stores', 'certified-staff', 'qr-scans', 'audit')
     or p_rows is null or p_rows < 0 then
    raise exception 'invalid export' using errcode = '22023';
  end if;
  perform public.admin_audit(v_admin, 'report_exported', 'report', p_report,
    jsonb_build_object('report', p_report, 'rows', p_rows));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Settings (decision 12)
-- ---------------------------------------------------------------------------------------------

create function public.admin_get_settings()
returns table (key text, value jsonb, description text, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select s.key, s.value, s.description, s.updated_at
  from public.settings s
  where s.key in ('pass_mark_percent', 'store_certification_threshold',
    'certificate_validity_months', 'certificate_renewal_window_days', 'quiz_attempts_per_hour',
    'warranty_registration_url', 'company_address')
  order by s.key;
end;
$$;

create function public.admin_save_settings(p_values jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_key text;
  v_value jsonb;
  v_old jsonb;
  v_changes jsonb := '{}'::jsonb;
begin
  perform public.require_step_up();
  if jsonb_typeof(p_values) is distinct from 'object' then
    raise exception 'invalid settings' using errcode = '22023';
  end if;
  for v_key, v_value in select e.key, e.value from jsonb_each(p_values) e loop
    if not public.setting_value_ok(v_key, v_value) then
      raise exception 'invalid setting %', v_key using errcode = '22023';
    end if;
    select s.value into v_old from public.settings s where s.key = v_key for update;
    if not found then
      raise exception 'invalid setting %', v_key using errcode = '22023';
    end if;
    if v_old is distinct from v_value then
      update public.settings set value = v_value, updated_at = now() where key = v_key;
      v_changes := v_changes || jsonb_build_object(v_key,
        jsonb_build_object('from', v_old, 'to', v_value));
    end if;
  end loop;
  if v_changes <> '{}' then
    perform public.admin_audit(v_admin, 'settings_changed', 'settings', null, v_changes);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Grants. Internal helpers get none; admin_* API functions and admin_access go to authenticated
-- only, and each refuses anyone but a current admin itself.
-- ---------------------------------------------------------------------------------------------

revoke all on function public.current_admin() from public, anon, authenticated;
revoke all on function public.require_admin() from public, anon, authenticated;
revoke all on function public.require_step_up() from public, anon, authenticated;
revoke all on function public.admin_audit(uuid, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.audit_admin_mfa_change() from public, anon, authenticated;
revoke all on function public.setting_value_ok(text, jsonb) from public, anon, authenticated;
revoke all on function public.admin_slug_ok(text, integer) from public, anon, authenticated;
revoke all on function public.admin_check_text(text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.admin_new_store_code(text, text) from public, anon, authenticated;
revoke all on function public.certificate_status_of(uuid) from public, anon, authenticated;

do $$
declare
  v_signature text;
begin
  for v_signature in
    select p.oid::regprocedure::text
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and (p.proname = 'admin_access'
        or (p.proname like 'admin\_%' and p.proname not in (
          'admin_audit', 'admin_slug_ok', 'admin_check_text', 'admin_new_store_code')))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_signature);
    execute format('grant execute on function %s to authenticated', v_signature);
  end loop;
end;
$$;
