-- Local and launch placeholder content. Remove every [PLACEHOLDER] before launch (Phase 7).
-- Product names from PRD section 9: Rich to confirm against carbonoffroad.com.au.
insert into public.categories (slug, name, sort_order) values
  ('recovery-basics', 'Recovery basics', 1),
  ('winches', 'Winches', 2),
  ('ropes', 'Ropes', 3),
  ('recovery-gear', 'Recovery gear', 4),
  ('parts-and-accessories', 'Parts and accessories', 5);

insert into public.lessons (category_id, slug, title, product_name, summary, is_core, sort_order, published)
select c.id, l.slug, l.title, l.product_name, '[PLACEHOLDER] Summary to come.', l.is_core, l.sort_order, true
from (values
  ('recovery-basics', 'winch-safety-and-recovery-fundamentals', 'Winch safety and recovery fundamentals', null, true, 1),
  ('recovery-basics', 'winch-maintenance-and-servicing', 'Winch maintenance and servicing', null, true, 2),
  ('winches', 'carbon-12k-v3x', 'Carbon 12K V3X', 'Carbon 12K V3X', true, 1),
  ('winches', 'scout-pro-10k-v3', 'Scout Pro 10K V3', 'Scout Pro 10K V3', true, 2),
  ('winches', 'scout-pro-15k-v3', 'Scout Pro 15K V3', 'Scout Pro 15K V3', true, 3),
  ('winches', 'rs9-series', 'RS9 series', 'RS9', true, 4),
  ('winches', 'scout-pro-20k', 'Scout Pro 20K (12 V / 24 V)', 'Scout Pro 20K', false, 5),
  ('winches', '48v-brushless-range', '48 V brushless range', null, false, 6),
  ('winches', 'sxs-and-atv-winches', 'SXS and ATV winches (3K, 6K, 6K Long Drum)', null, false, 7),
  ('ropes', 'synthetic-winch-rope-care-and-inspection', 'Synthetic winch rope: care and inspection', null, true, 1),
  ('ropes', 'replacing-and-spooling-winch-rope', 'Replacing and spooling winch rope', null, false, 2),
  ('ropes', 'kinetic-recovery-ropes', 'Kinetic recovery ropes', null, true, 3),
  ('recovery-gear', 'soft-shackles', 'Soft shackles', null, true, 1),
  ('recovery-gear', 'megapro-hook', 'MegaPro hook', 'MegaPro hook', false, 2),
  ('parts-and-accessories', 'remotes-and-control-boxes', 'Remotes and control boxes', null, false, 1)
) as l (category_slug, slug, title, product_name, is_core, sort_order)
join public.categories c on c.slug = l.category_slug;

-- QR links. scout-pro-10k-v3 matches the PRD 5.1 example; test-slug is for the Phase 2 check.
insert into public.qr_links (slug, lesson_id)
select v.slug, l.id
from (values ('scout-pro-10k-v3'), ('test-slug')) as v (slug)
join public.lessons l on l.slug = 'scout-pro-10k-v3';

-- Phase 3 fixtures: fictional partner and stores (TST prefix). Never real stores (EX-01).
insert into public.partners (id, name, type) values
  ('00000000-0000-4000-8000-000000000101', 'Test Partner', 'retail_group'),
  -- A second partner, so tests prove cross-partner isolation (review finding).
  ('00000000-0000-4000-8000-000000000102', 'Other Partner', 'independent');

insert into public.stores (partner_id, name, suburb, state, store_code, active) values
  ('00000000-0000-4000-8000-000000000101', 'Test Store Robina', 'Robina', 'QLD', 'TST-ROB-7K2Q9MXH', true),
  ('00000000-0000-4000-8000-000000000101', 'Test Store Nerang', 'Nerang', 'QLD', 'TST-NER-3H8W4DPA', true),
  ('00000000-0000-4000-8000-000000000101', 'Test Store Closed', 'Southport', 'QLD', 'TST-OLD-9X9X9X9X', false),
  ('00000000-0000-4000-8000-000000000102', 'Other Store Burleigh', 'Burleigh Heads', 'QLD', 'TST-BUR-5T6Y7Z8W', true);

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
