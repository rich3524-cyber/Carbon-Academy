-- Phase 2: QR short links (PRD 5.1, 6.6, 8). Security framework controls 04, 06, 12, 22.
-- Anonymous users get no direct table access. Scans are recorded only through
-- log_qr_scan(), which validates input, stores no personal information and caps recording
-- at 60 scans per link per minute.

create table public.qr_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  lesson_id uuid not null references public.lessons (id) on delete restrict,
  scan_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.qr_scans (
  id uuid primary key default gen_random_uuid(),
  qr_link_id uuid not null references public.qr_links (id) on delete cascade,
  utm_source text check (length(utm_source) <= 100),
  utm_medium text check (length(utm_medium) <= 100),
  utm_campaign text check (length(utm_campaign) <= 100),
  scanned_at timestamptz not null default now()
);

create index qr_scans_link_time_idx on public.qr_scans (qr_link_id, scanned_at desc);

alter table public.qr_links enable row level security;
alter table public.qr_scans enable row level security;
revoke all on public.qr_links, public.qr_scans from anon, authenticated;

create function public.log_qr_scan(
  p_slug text,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null
)
returns table (category_slug text, lesson_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link_id uuid;
  v_recent integer;
begin
  if p_slug is null or length(p_slug) > 80 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    return;
  end if;

  select q.id into v_link_id
  from public.qr_links q
  join public.lessons l on l.id = q.lesson_id
  where q.slug = p_slug and l.published;

  if v_link_id is null then
    return;
  end if;

  select count(*) into v_recent
  from public.qr_scans s
  where s.qr_link_id = v_link_id and s.scanned_at > now() - interval '1 minute';

  if v_recent < 60 then
    insert into public.qr_scans (qr_link_id, utm_source, utm_medium, utm_campaign)
    values (v_link_id, left(p_utm_source, 100), left(p_utm_medium, 100), left(p_utm_campaign, 100));
    update public.qr_links set scan_count = scan_count + 1 where id = v_link_id;
  end if;

  return query
    select c.slug, l.slug
    from public.qr_links q
    join public.lessons l on l.id = q.lesson_id
    join public.categories c on c.id = l.category_id
    where q.id = v_link_id;
end;
$$;

revoke all on function public.log_qr_scan(text, text, text, text) from public;
grant execute on function public.log_qr_scan(text, text, text, text) to anon, authenticated;
