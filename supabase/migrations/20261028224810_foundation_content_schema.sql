-- Phase 1: content schema (PRD section 6.1 and 8).
-- RLS (security framework control 04): everyone can read categories, published lessons
-- and settings. Nobody can write with the publishable key. Admin writes come in Phase 6
-- through server actions.

create type public.region as enum ('AU', 'US', 'ALL');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text,
  product_name text,
  vimeo_id text,
  duration_seconds integer check (duration_seconds > 0),
  is_core boolean not null default false,
  region public.region not null default 'AU',
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (category_id, slug)
);

create index lessons_category_id_idx on public.lessons (category_id);

-- Never store secrets here: settings are publicly readable.
create table public.settings (
  key text primary key,
  value jsonb not null,
  description text not null,
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.lessons enable row level security;
alter table public.settings enable row level security;

revoke insert, update, delete, truncate on public.categories, public.lessons, public.settings
  from anon, authenticated;
grant select on public.categories, public.lessons, public.settings to anon, authenticated;

create policy "Categories are readable by everyone"
  on public.categories for select to anon, authenticated
  using (true);

create policy "Published lessons are readable by everyone"
  on public.lessons for select to anon, authenticated
  using (published);

create policy "Settings are readable by everyone"
  on public.settings for select to anon, authenticated
  using (true);

-- Defaults from PRD section 11 (D2, D3, D4, D8). Company address from guidelines p.69.
insert into public.settings (key, value, description) values
  ('pass_mark_percent', '100', 'Quiz pass mark as a percentage (D4: all questions correct)'),
  ('store_certification_threshold', '2', 'Staff with active certificates needed for a Carbon Certified Store (D2)'),
  ('certificate_validity_months', '12', 'Months a certificate stays active (D3)'),
  ('quiz_attempts_per_hour', '10', 'Quiz attempts allowed per lesson per hour'),
  ('warranty_registration_url', 'null', 'Warranty registration page (D8, to be confirmed)'),
  ('company_address', '"Unit 1a, 1 Waterway Drive, Coomera QLD 4209"', 'Head office address for email footers. Moves to 11 Blanck Street, Ormeau QLD 4208 in February 2027');
