-- UMTUBA Rich Personal Profile Foundation V1
-- AUTHORIZED_MIGRATION_SCOPE = RICH_PROFILE_ONLY
-- Additive only. Does not replace public.profiles.
-- Does NOT add: comments parent_id, reactions, friends, blocks, communities,
-- events, post visibility, messaging, Store, Learning, or user_interest_profiles.
-- Safe to re-run. Local/dev apply only — never remote production from this task.

-- ---------------------------------------------------------------------------
-- 1. Shared helpers (SECURITY INVOKER — no RLS bypass)
-- ---------------------------------------------------------------------------

create or replace function public.can_read_profile_audience(
  p_profile_id uuid,
  p_visibility text
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    (
      (select auth.uid()) is not null
      and (select auth.uid()) = p_profile_id
    )
    or p_visibility = 'public'
    or (
      p_visibility = 'followers'
      and (select auth.uid()) is not null
      and exists (
        select 1
        from public.profile_follows f
        where f.follower_id = (select auth.uid())
          and f.following_id = p_profile_id
      )
    );
$$;

comment on function public.can_read_profile_audience(uuid, text) is
  'Owner always. public rows for everyone. followers rows when viewer follows owner via profile_follows. connections and only_me are owner-only (connections reserved).';

revoke all on function public.can_read_profile_audience(uuid, text) from public;
grant execute on function public.can_read_profile_audience(uuid, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. public.profiles scalar additions
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists bio_long text,
  add column if not exists cover_url text,
  add column if not exists website_url text;

alter table public.profiles drop constraint if exists profiles_bio_long_len;
alter table public.profiles
  add constraint profiles_bio_long_len check (
    bio_long is null or char_length(btrim(bio_long)) between 1 and 4000
  );

alter table public.profiles drop constraint if exists profiles_cover_url_https;
alter table public.profiles
  add constraint profiles_cover_url_https check (
    cover_url is null or (
      char_length(cover_url) between 12 and 2000
      and cover_url !~ '\s'
      and cover_url ~* '^https://'
    )
  );

alter table public.profiles drop constraint if exists profiles_website_url_https;
alter table public.profiles
  add constraint profiles_website_url_https check (
    website_url is null or (
      char_length(website_url) between 12 and 500
      and website_url !~ '\s'
      and website_url ~* '^https://'
    )
  );

comment on column public.profiles.bio_long is
  'Optional longer About bio. Short bio stays in profiles.bio. Never required.';
comment on column public.profiles.cover_url is
  'Optional public HTTPS cover image URL from the profile-covers bucket.';
comment on column public.profiles.website_url is
  'Primary personal website. Additional links live in profile_links only.';

-- ---------------------------------------------------------------------------
-- 3. profile_places
-- ---------------------------------------------------------------------------

create table if not exists public.profile_places (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  place_kind text not null,
  label text not null,
  city text,
  region text,
  country text,
  start_year integer,
  end_year integer,
  is_current boolean not null default false,
  description text,
  sort_order integer not null default 0,
  visibility text not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_places_kind_check check (
    place_kind in ('birthplace', 'hometown', 'current_city', 'previous_city', 'other')
  ),
  constraint profile_places_label_check check (
    char_length(btrim(label)) between 1 and 120
  ),
  constraint profile_places_city_check check (
    city is null or char_length(btrim(city)) between 1 and 80
  ),
  constraint profile_places_region_check check (
    region is null or char_length(btrim(region)) between 1 and 80
  ),
  constraint profile_places_country_check check (
    country is null or char_length(btrim(country)) between 1 and 80
  ),
  constraint profile_places_description_check check (
    description is null or char_length(btrim(description)) between 1 and 500
  ),
  constraint profile_places_year_range_check check (
    (start_year is null or start_year between 1800 and 2100)
    and (end_year is null or end_year between 1800 and 2100)
    and (start_year is null or end_year is null or end_year >= start_year)
  ),
  constraint profile_places_sort_order_check check (sort_order >= 0),
  constraint profile_places_visibility_check check (
    visibility in ('public', 'followers', 'connections', 'only_me')
  )
);

comment on table public.profile_places is
  'Repeatable personal places. City/region/country labels only. No geolocation, street, or building.';

create index if not exists profile_places_profile_sort_idx
  on public.profile_places (profile_id, sort_order, created_at);

create index if not exists profile_places_profile_visibility_idx
  on public.profile_places (profile_id, visibility);

drop trigger if exists profile_places_set_updated_at on public.profile_places;
create trigger profile_places_set_updated_at
  before update on public.profile_places
  for each row execute function public.set_row_updated_at();

alter table public.profile_places enable row level security;
alter table public.profile_places force row level security;

revoke all on table public.profile_places from public, anon, authenticated;
grant select on table public.profile_places to anon, authenticated;
grant insert, update, delete on table public.profile_places to authenticated;

drop policy if exists "Owners manage own profile places" on public.profile_places;
create policy "Owners manage own profile places"
  on public.profile_places
  for all
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = profile_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = profile_id);

drop policy if exists "Audience can read visible profile places" on public.profile_places;
create policy "Audience can read visible profile places"
  on public.profile_places
  for select
  to anon, authenticated
  using (public.can_read_profile_audience(profile_id, visibility));

-- ---------------------------------------------------------------------------
-- 4. profile_education
-- ---------------------------------------------------------------------------

create table if not exists public.profile_education (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  institution text not null,
  education_type text not null default 'other',
  field_of_study text,
  credential text,
  location_label text,
  start_year integer,
  end_year integer,
  is_current boolean not null default false,
  description text,
  external_url text,
  sort_order integer not null default 0,
  visibility text not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_education_institution_check check (
    char_length(btrim(institution)) between 1 and 200
  ),
  constraint profile_education_type_check check (
    education_type in (
      'primary',
      'secondary',
      'undergraduate',
      'graduate',
      'vocational',
      'certificate',
      'other'
    )
  ),
  constraint profile_education_field_check check (
    field_of_study is null or char_length(btrim(field_of_study)) between 1 and 160
  ),
  constraint profile_education_credential_check check (
    credential is null or char_length(btrim(credential)) between 1 and 160
  ),
  constraint profile_education_location_check check (
    location_label is null or char_length(btrim(location_label)) between 1 and 160
  ),
  constraint profile_education_description_check check (
    description is null or char_length(btrim(description)) between 1 and 1000
  ),
  constraint profile_education_url_check check (
    external_url is null or (
      char_length(external_url) between 12 and 500
      and external_url !~ '\s'
      and external_url ~* '^https://'
    )
  ),
  constraint profile_education_year_range_check check (
    (start_year is null or start_year between 1800 and 2100)
    and (end_year is null or end_year between 1800 and 2100)
    and (start_year is null or end_year is null or end_year >= start_year)
  ),
  constraint profile_education_sort_order_check check (sort_order >= 0),
  constraint profile_education_visibility_check check (
    visibility in ('public', 'followers', 'connections', 'only_me')
  )
);

comment on table public.profile_education is
  'International education records. Not a country-specific school directory.';

create index if not exists profile_education_profile_sort_idx
  on public.profile_education (profile_id, sort_order, created_at);

create index if not exists profile_education_profile_visibility_idx
  on public.profile_education (profile_id, visibility);

drop trigger if exists profile_education_set_updated_at on public.profile_education;
create trigger profile_education_set_updated_at
  before update on public.profile_education
  for each row execute function public.set_row_updated_at();

alter table public.profile_education enable row level security;
alter table public.profile_education force row level security;

revoke all on table public.profile_education from public, anon, authenticated;
grant select on table public.profile_education to anon, authenticated;
grant insert, update, delete on table public.profile_education to authenticated;

drop policy if exists "Owners manage own profile education" on public.profile_education;
create policy "Owners manage own profile education"
  on public.profile_education
  for all
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = profile_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = profile_id);

drop policy if exists "Audience can read visible profile education" on public.profile_education;
create policy "Audience can read visible profile education"
  on public.profile_education
  for select
  to anon, authenticated
  using (public.can_read_profile_audience(profile_id, visibility));

-- ---------------------------------------------------------------------------
-- 5. profile_work
-- ---------------------------------------------------------------------------

create table if not exists public.profile_work (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  work_kind text not null default 'other',
  organization text,
  title text not null,
  location_label text,
  start_year integer,
  end_year integer,
  is_current boolean not null default false,
  description text,
  external_url text,
  sort_order integer not null default 0,
  visibility text not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_work_kind_check check (
    work_kind in (
      'employed',
      'owner',
      'freelance',
      'creator',
      'teacher',
      'seller',
      'student',
      'independent',
      'other'
    )
  ),
  constraint profile_work_title_check check (
    char_length(btrim(title)) between 1 and 160
  ),
  constraint profile_work_organization_check check (
    organization is null or char_length(btrim(organization)) between 1 and 160
  ),
  constraint profile_work_location_check check (
    location_label is null or char_length(btrim(location_label)) between 1 and 160
  ),
  constraint profile_work_description_check check (
    description is null or char_length(btrim(description)) between 1 and 1000
  ),
  constraint profile_work_url_check check (
    external_url is null or (
      char_length(external_url) between 12 and 500
      and external_url !~ '\s'
      and external_url ~* '^https://'
    )
  ),
  constraint profile_work_year_range_check check (
    (start_year is null or start_year between 1800 and 2100)
    and (end_year is null or end_year between 1800 and 2100)
    and (start_year is null or end_year is null or end_year >= start_year)
  ),
  constraint profile_work_sort_order_check check (sort_order >= 0),
  constraint profile_work_visibility_check check (
    visibility in ('public', 'followers', 'connections', 'only_me')
  )
);

comment on table public.profile_work is
  'Work and vocation records. Organization is optional so independent people can share a profession.';

create index if not exists profile_work_profile_sort_idx
  on public.profile_work (profile_id, sort_order, created_at);

create index if not exists profile_work_profile_visibility_idx
  on public.profile_work (profile_id, visibility);

drop trigger if exists profile_work_set_updated_at on public.profile_work;
create trigger profile_work_set_updated_at
  before update on public.profile_work
  for each row execute function public.set_row_updated_at();

alter table public.profile_work enable row level security;
alter table public.profile_work force row level security;

revoke all on table public.profile_work from public, anon, authenticated;
grant select on table public.profile_work to anon, authenticated;
grant insert, update, delete on table public.profile_work to authenticated;

drop policy if exists "Owners manage own profile work" on public.profile_work;
create policy "Owners manage own profile work"
  on public.profile_work
  for all
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = profile_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = profile_id);

drop policy if exists "Audience can read visible profile work" on public.profile_work;
create policy "Audience can read visible profile work"
  on public.profile_work
  for select
  to anon, authenticated
  using (public.can_read_profile_audience(profile_id, visibility));

-- ---------------------------------------------------------------------------
-- 6. profile_tags
-- ---------------------------------------------------------------------------

create table if not exists public.profile_tags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  label text not null,
  sort_order integer not null default 0,
  visibility text not null default 'public',
  created_at timestamptz not null default now(),
  constraint profile_tags_kind_check check (
    kind in ('interest', 'skill', 'language', 'hobby')
  ),
  constraint profile_tags_label_check check (
    char_length(btrim(label)) between 1 and 80
  ),
  constraint profile_tags_sort_order_check check (sort_order >= 0),
  constraint profile_tags_visibility_check check (
    visibility in ('public', 'followers', 'connections', 'only_me')
  )
);

comment on table public.profile_tags is
  'User-entered interests, skills, languages, and hobbies. Not user_interest_profiles.';

create index if not exists profile_tags_profile_sort_idx
  on public.profile_tags (profile_id, sort_order, created_at);

create unique index if not exists profile_tags_profile_kind_label_uidx
  on public.profile_tags (profile_id, kind, lower(btrim(label)));

drop trigger if exists profile_tags_set_updated_at on public.profile_tags;

alter table public.profile_tags enable row level security;
alter table public.profile_tags force row level security;

revoke all on table public.profile_tags from public, anon, authenticated;
grant select on table public.profile_tags to anon, authenticated;
grant insert, update, delete on table public.profile_tags to authenticated;

drop policy if exists "Owners manage own profile tags" on public.profile_tags;
create policy "Owners manage own profile tags"
  on public.profile_tags
  for all
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = profile_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = profile_id);

drop policy if exists "Audience can read visible profile tags" on public.profile_tags;
create policy "Audience can read visible profile tags"
  on public.profile_tags
  for select
  to anon, authenticated
  using (public.can_read_profile_audience(profile_id, visibility));

-- ---------------------------------------------------------------------------
-- 7. profile_milestones
-- ---------------------------------------------------------------------------

create table if not exists public.profile_milestones (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  title text not null,
  description text,
  occurred_on date,
  occurred_year integer,
  location_label text,
  external_url text,
  sort_order integer not null default 0,
  visibility text not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_milestones_category_check check (
    category in (
      'education',
      'career',
      'creator',
      'teacher',
      'seller',
      'business',
      'achievement',
      'move',
      'project',
      'certification',
      'other'
    )
  ),
  constraint profile_milestones_title_check check (
    char_length(btrim(title)) between 1 and 160
  ),
  constraint profile_milestones_description_check check (
    description is null or char_length(btrim(description)) between 1 and 1000
  ),
  constraint profile_milestones_location_check check (
    location_label is null or char_length(btrim(location_label)) between 1 and 160
  ),
  constraint profile_milestones_year_check check (
    occurred_year is null or occurred_year between 1800 and 2100
  ),
  constraint profile_milestones_url_check check (
    external_url is null or (
      char_length(external_url) between 12 and 500
      and external_url !~ '\s'
      and external_url ~* '^https://'
    )
  ),
  constraint profile_milestones_sort_order_check check (sort_order >= 0),
  constraint profile_milestones_visibility_check check (
    visibility in ('public', 'followers', 'connections', 'only_me')
  )
);

comment on table public.profile_milestones is
  'User-shared milestones. category=achievement is user-entered, never UMTUBA verified. No health, legal, financial, government-ID, political, or religion categories.';

create index if not exists profile_milestones_profile_sort_idx
  on public.profile_milestones (profile_id, sort_order, created_at);

create index if not exists profile_milestones_profile_visibility_idx
  on public.profile_milestones (profile_id, visibility);

create index if not exists profile_milestones_profile_category_idx
  on public.profile_milestones (profile_id, category);

drop trigger if exists profile_milestones_set_updated_at on public.profile_milestones;
create trigger profile_milestones_set_updated_at
  before update on public.profile_milestones
  for each row execute function public.set_row_updated_at();

alter table public.profile_milestones enable row level security;
alter table public.profile_milestones force row level security;

revoke all on table public.profile_milestones from public, anon, authenticated;
grant select on table public.profile_milestones to anon, authenticated;
grant insert, update, delete on table public.profile_milestones to authenticated;

drop policy if exists "Owners manage own profile milestones" on public.profile_milestones;
create policy "Owners manage own profile milestones"
  on public.profile_milestones
  for all
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = profile_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = profile_id);

drop policy if exists "Audience can read visible profile milestones" on public.profile_milestones;
create policy "Audience can read visible profile milestones"
  on public.profile_milestones
  for select
  to anon, authenticated
  using (public.can_read_profile_audience(profile_id, visibility));

-- ---------------------------------------------------------------------------
-- 8. profile_links
-- ---------------------------------------------------------------------------

create table if not exists public.profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  url text not null,
  sort_order integer not null default 0,
  visibility text not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_links_label_check check (
    char_length(btrim(label)) between 1 and 80
  ),
  constraint profile_links_url_check check (
    char_length(url) between 12 and 500
    and url !~ '\s'
    and url ~* '^https://'
  ),
  constraint profile_links_sort_order_check check (sort_order >= 0),
  constraint profile_links_visibility_check check (
    visibility in ('public', 'followers', 'connections', 'only_me')
  )
);

comment on table public.profile_links is
  'Additional HTTPS links. Primary website is profiles.website_url.';

create index if not exists profile_links_profile_sort_idx
  on public.profile_links (profile_id, sort_order, created_at);

create unique index if not exists profile_links_profile_url_uidx
  on public.profile_links (profile_id, lower(url));

drop trigger if exists profile_links_set_updated_at on public.profile_links;
create trigger profile_links_set_updated_at
  before update on public.profile_links
  for each row execute function public.set_row_updated_at();

alter table public.profile_links enable row level security;
alter table public.profile_links force row level security;

revoke all on table public.profile_links from public, anon, authenticated;
grant select on table public.profile_links to anon, authenticated;
grant insert, update, delete on table public.profile_links to authenticated;

drop policy if exists "Owners manage own profile links" on public.profile_links;
create policy "Owners manage own profile links"
  on public.profile_links
  for all
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = profile_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = profile_id);

drop policy if exists "Audience can read visible profile links" on public.profile_links;
create policy "Audience can read visible profile links"
  on public.profile_links
  for select
  to anon, authenticated
  using (public.can_read_profile_audience(profile_id, visibility));

-- ---------------------------------------------------------------------------
-- 9. Cover images — separate bucket (safer than widening avatars)
--    Avatars stay 2 MB. Covers need a larger limit and isolated policies.
--    Same owner-folder security: {auth.uid()}/{filename}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-covers',
  'profile-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read access for profile covers" on storage.objects;
drop policy if exists "Users can upload own profile cover folder" on storage.objects;
drop policy if exists "Users can update own profile cover folder" on storage.objects;
drop policy if exists "Users can delete own profile cover folder" on storage.objects;

create policy "Public read access for profile covers"
  on storage.objects
  for select
  using (bucket_id = 'profile-covers');

create policy "Users can upload own profile cover folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-covers'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can update own profile cover folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-covers'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'profile-covers'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete own profile cover folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-covers'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
