-- UMTUBA posts origin location V1
-- Additive only. All columns nullable. No defaults. Existing rows stay NULL.
-- Does not change RLS. Does not backfill.
--
-- Do NOT apply from this task.
-- Apply per docs/DEVELOPMENT_WORKFLOW.md (targeted migration; never supabase db push).

alter table public.posts
  add column if not exists origin_country_code text,
  add column if not exists origin_city text,
  add column if not exists origin_lat numeric,
  add column if not exists origin_lng numeric;

alter table public.posts
  drop constraint if exists posts_origin_country_code_check;

alter table public.posts
  add constraint posts_origin_country_code_check
  check (
    origin_country_code is null
    or origin_country_code ~ '^[A-Z]{2}$'
  );

alter table public.posts
  drop constraint if exists posts_origin_city_check;

alter table public.posts
  add constraint posts_origin_city_check
  check (
    origin_city is null
    or char_length(btrim(origin_city)) between 1 and 120
  );

alter table public.posts
  drop constraint if exists posts_origin_city_requires_country_check;

alter table public.posts
  add constraint posts_origin_city_requires_country_check
  check (
    origin_city is null
    or origin_country_code is not null
  );

alter table public.posts
  drop constraint if exists posts_origin_lat_check;

alter table public.posts
  add constraint posts_origin_lat_check
  check (
    origin_lat is null
    or (origin_lat >= -90 and origin_lat <= 90)
  );

alter table public.posts
  drop constraint if exists posts_origin_lng_check;

alter table public.posts
  add constraint posts_origin_lng_check
  check (
    origin_lng is null
    or (origin_lng >= -180 and origin_lng <= 180)
  );

alter table public.posts
  drop constraint if exists posts_origin_coords_pair_check;

alter table public.posts
  add constraint posts_origin_coords_pair_check
  check (
    (origin_lat is null and origin_lng is null)
    or (origin_lat is not null and origin_lng is not null)
  );

alter table public.posts
  drop constraint if exists posts_origin_coords_require_country_check;

alter table public.posts
  add constraint posts_origin_coords_require_country_check
  check (
    origin_lat is null
    or origin_country_code is not null
  );

create index if not exists posts_origin_country_code_idx
  on public.posts (origin_country_code)
  where origin_country_code is not null;

comment on column public.posts.origin_country_code is
  'Optional ISO-2 country where the post was made. Never copied from profiles.';
comment on column public.posts.origin_city is
  'Optional city name the author typed. Lat/lng only when this matches world_cities.';
comment on column public.posts.origin_lat is
  'Optional world_cities center latitude. NULL unless the typed city matches. Never a country centroid.';
comment on column public.posts.origin_lng is
  'Optional world_cities center longitude. NULL unless the typed city matches. Never a country centroid.';
