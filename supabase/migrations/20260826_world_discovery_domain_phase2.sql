-- UMTUBA World Discovery — Phase 2
-- Additive after 20260825_world_discovery_hello_city_foundation_v1.sql.
-- Extends the established world_cities/world_places model. It intentionally
-- links to Store, posts, Live and Post Journey rather than duplicating them.
-- Precise user coordinates are never stored by this domain.

-- ---------------------------------------------------------------------------
-- 1) Geographic hierarchy (curated platform catalog)
-- ---------------------------------------------------------------------------

create table if not exists public.world_countries (
  id uuid primary key default gen_random_uuid(),
  country_code text not null unique check (country_code ~ '^[A-Z]{2}$'),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$'),
  overview text check (overview is null or char_length(overview) <= 5000),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.world_regions (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.world_countries (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  code text check (code is null or char_length(btrim(code)) between 1 and 32),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$'),
  overview text check (overview is null or char_length(overview) <= 5000),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint world_regions_country_slug_unique unique (country_id, slug)
);

alter table public.world_cities
  add column if not exists country_id uuid
    references public.world_countries (id) on delete restrict,
  add column if not exists region_id uuid
    references public.world_regions (id) on delete set null,
  add column if not exists overview text
    check (overview is null or char_length(overview) <= 10000),
  add column if not exists cover_media_path text
    check (cover_media_path is null or char_length(cover_media_path) <= 500),
  add column if not exists timezone_name text
    check (timezone_name is null or char_length(timezone_name) <= 80),
  add column if not exists profile_status text not null default 'draft'
    check (profile_status in ('draft', 'published', 'archived')),
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));

-- Compatibility: Foundation V1 active cities remain published after profile_status
-- is introduced. New cities keep the draft default until admin review.
update public.world_cities
set profile_status = 'published',
    updated_at = timezone('utc', now())
where is_active
  and profile_status = 'draft';

create or replace function public.sync_world_city_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  country_row public.world_countries%rowtype;
  region_row public.world_regions%rowtype;
begin
  if new.country_id is not null then
    select * into country_row
    from public.world_countries
    where id = new.country_id and is_active;
    if not found then
      raise exception 'Active World country not found';
    end if;
    new.country_code := country_row.country_code;
    new.country_name := country_row.name;
  end if;

  if new.region_id is not null then
    select * into region_row
    from public.world_regions
    where id = new.region_id and is_active;
    if not found then
      raise exception 'Active World region not found';
    end if;
    if new.country_id is not null and region_row.country_id <> new.country_id then
      raise exception 'World region does not belong to city country';
    end if;
    new.country_id := region_row.country_id;
    new.region_name := region_row.name;
    select * into country_row
    from public.world_countries
    where id = region_row.country_id and is_active;
    new.country_code := country_row.country_code;
    new.country_name := country_row.name;
  end if;
  return new;
end;
$$;

drop trigger if exists world_cities_sync_hierarchy on public.world_cities;
create trigger world_cities_sync_hierarchy
  before insert or update of country_id, region_id on public.world_cities
  for each row execute function public.sync_world_city_hierarchy();

create table if not exists public.world_districts (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.world_cities (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$'),
  overview text check (overview is null or char_length(overview) <= 5000),
  center_latitude double precision
    check (center_latitude is null or center_latitude between -90 and 90),
  center_longitude double precision
    check (center_longitude is null or center_longitude between -180 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint world_districts_city_slug_unique unique (city_id, slug),
  constraint world_districts_coordinate_pair_check check (
    (center_latitude is null) = (center_longitude is null)
  )
);

create index if not exists world_regions_country_active_idx
  on public.world_regions (country_id, is_active, name);
create index if not exists world_cities_country_profile_idx
  on public.world_cities (country_id, profile_status, is_active, city_name);
create index if not exists world_districts_city_active_idx
  on public.world_districts (city_id, is_active, name);

drop trigger if exists world_countries_set_updated_at on public.world_countries;
create trigger world_countries_set_updated_at
  before update on public.world_countries
  for each row execute function public.set_row_updated_at();
drop trigger if exists world_regions_set_updated_at on public.world_regions;
create trigger world_regions_set_updated_at
  before update on public.world_regions
  for each row execute function public.set_row_updated_at();
drop trigger if exists world_districts_set_updated_at on public.world_districts;
create trigger world_districts_set_updated_at
  before update on public.world_districts
  for each row execute function public.set_row_updated_at();

alter table public.world_countries enable row level security;
alter table public.world_countries force row level security;
alter table public.world_regions enable row level security;
alter table public.world_regions force row level security;
alter table public.world_districts enable row level security;
alter table public.world_districts force row level security;

-- Public policies must not call is_platform_admin() (anon has no EXECUTE).
-- Admin bypass is provided by the separate authenticated manage policies below.
drop policy if exists "Active world countries are public" on public.world_countries;
create policy "Active world countries are public"
  on public.world_countries for select to anon, authenticated
  using (is_active);
drop policy if exists "Active world regions are public" on public.world_regions;
create policy "Active world regions are public"
  on public.world_regions for select to anon, authenticated
  using (is_active);
drop policy if exists "Active world districts are public" on public.world_districts;
create policy "Active world districts are public"
  on public.world_districts for select to anon, authenticated
  using (is_active);

drop policy if exists "Active world cities are public" on public.world_cities;
create policy "Active world cities are public"
  on public.world_cities for select to anon, authenticated
  using (is_active and profile_status = 'published');
drop policy if exists "Platform admins read all world cities" on public.world_cities;

drop policy if exists "Platform admins manage world countries" on public.world_countries;
create policy "Platform admins manage world countries"
  on public.world_countries for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
drop policy if exists "Platform admins manage world regions" on public.world_regions;
create policy "Platform admins manage world regions"
  on public.world_regions for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
drop policy if exists "Platform admins manage world districts" on public.world_districts;
create policy "Platform admins manage world districts"
  on public.world_districts for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
drop policy if exists "Platform admins manage world cities" on public.world_cities;
create policy "Platform admins manage world cities"
  on public.world_cities for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

revoke insert, update, delete on
  public.world_countries,
  public.world_regions,
  public.world_districts
from anon;
grant select on
  public.world_countries,
  public.world_regions,
  public.world_districts
to anon, authenticated, service_role;
grant insert, update, delete on
  public.world_countries,
  public.world_regions,
  public.world_districts,
  public.world_cities
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Unified Place profile and extensible hierarchical categories
-- ---------------------------------------------------------------------------

alter table public.world_places
  add column if not exists district_id uuid
    references public.world_districts (id) on delete set null,
  add column if not exists place_kind text not null default 'other'
    check (place_kind in (
      'point_of_interest',
      'business',
      'attraction',
      'hotel',
      'restaurant',
      'store',
      'local_service',
      'other'
    )),
  add column if not exists tagline text
    check (tagline is null or char_length(tagline) <= 240),
  add column if not exists profile_status text not null default 'draft'
    check (profile_status in ('draft', 'published', 'archived')),
  add column if not exists opening_hours_status text not null default 'not_provided'
    check (opening_hours_status in ('not_provided', 'provided', 'temporarily_closed')),
  add column if not exists reviews_status text not null default 'not_enabled'
    check (reviews_status in ('not_enabled', 'enabled', 'paused')),
  add column if not exists ai_summary_status text not null default 'not_requested'
    check (ai_summary_status in ('not_requested', 'pending', 'ready', 'failed'));

-- Compatibility: places that already met Foundation V1 public rules remain published.
update public.world_places
set profile_status = 'published',
    updated_at = timezone('utc', now())
where location_visibility = 'public'
  and moderation_status = 'approved'
  and verification_status = 'verified'
  and profile_status = 'draft';

update public.world_places
set place_kind = case category
  when 'store' then 'store'
  when 'restaurant' then 'restaurant'
  when 'hotel' then 'hotel'
  when 'attraction' then 'attraction'
  when 'cafe' then 'restaurant'
  when 'clothing' then 'store'
  when 'service' then 'local_service'
  else place_kind
end
where place_kind = 'other';

create or replace function public.protect_world_place_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_admin boolean := public.is_platform_admin();
  is_service boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if is_admin or is_service then
    return new;
  end if;
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if tg_op = 'INSERT' then
    new.owner_user_id := uid;
    new.moderation_status := 'pending';
    new.verification_status := 'unverified';
    new.profile_status := 'draft';
    if new.source_type = 'platform' then
      new.source_type := case
        when new.store_id is null then 'business_owner'
        else 'store'
      end;
    end if;
  else
    new.owner_user_id := old.owner_user_id;
    new.source_type := old.source_type;
    new.provider_name := old.provider_name;
    new.provider_place_id := old.provider_place_id;
    if new.name is distinct from old.name
       or new.description is distinct from old.description
       or new.tagline is distinct from old.tagline
       or new.category is distinct from old.category
       or new.place_kind is distinct from old.place_kind
       or new.city_id is distinct from old.city_id
       or new.district_id is distinct from old.district_id
       or new.store_id is distinct from old.store_id
       or new.address_display is distinct from old.address_display
       or new.latitude is distinct from old.latitude
       or new.longitude is distinct from old.longitude
       or new.location_visibility is distinct from old.location_visibility then
      new.moderation_status := 'pending';
      new.verification_status := 'pending';
      new.profile_status := 'draft';
    else
      new.moderation_status := old.moderation_status;
      new.verification_status := old.verification_status;
      new.profile_status := old.profile_status;
    end if;
  end if;
  return new;
end;
$$;

create table if not exists public.world_place_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.world_place_categories (id) on delete restrict,
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$'),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  description text check (description is null or char_length(description) <= 1000),
  icon_key text check (icon_key is null or icon_key ~ '^[a-z0-9-]{1,50}$'),
  sort_order integer not null default 0 check (sort_order between -10000 and 10000),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint world_place_categories_not_self_parent check (parent_id is distinct from id)
);

insert into public.world_place_categories (slug, name, sort_order) values
  ('restaurant', 'Restaurant', 10),
  ('store', 'Store', 20),
  ('hotel', 'Hotel', 30),
  ('attraction', 'Attraction', 40),
  ('local-service', 'Local Service', 50),
  ('point-of-interest', 'Point of Interest', 60)
on conflict (slug) do nothing;

insert into public.world_place_categories (parent_id, slug, name, sort_order)
select p.id, child.slug, child.name, child.sort_order
from public.world_place_categories p
join (values
  ('restaurant', 'fast-food', 'Fast Food', 10),
  ('restaurant', 'cafe', 'Cafe', 20),
  ('restaurant', 'fine-dining', 'Fine Dining', 30),
  ('store', 'clothing', 'Clothing', 10),
  ('store', 'electronics', 'Electronics', 20),
  ('store', 'grocery', 'Grocery', 30),
  ('hotel', 'luxury-hotel', 'Luxury', 10),
  ('hotel', 'budget-hotel', 'Budget', 20),
  ('hotel', 'resort', 'Resort', 30)
) as child(parent_slug, slug, name, sort_order)
  on p.slug = child.parent_slug
on conflict (slug) do nothing;

create table if not exists public.world_place_category_assignments (
  place_id uuid not null references public.world_places (id) on delete cascade,
  category_id uuid not null references public.world_place_categories (id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (place_id, category_id)
);

insert into public.world_place_category_assignments (
  place_id, category_id, is_primary
)
select
  p.id,
  c.id,
  true
from public.world_places p
join public.world_place_categories c
  on c.slug = case p.category
    when 'service' then 'local-service'
    when 'other' then 'point-of-interest'
    else p.category
  end
on conflict (place_id, category_id) do nothing;

create unique index if not exists world_place_category_primary_uidx
  on public.world_place_category_assignments (place_id)
  where is_primary;
create index if not exists world_place_categories_parent_idx
  on public.world_place_categories (parent_id, sort_order, name)
  where is_active;
create index if not exists world_place_category_lookup_idx
  on public.world_place_category_assignments (category_id, place_id);
create index if not exists world_places_kind_city_public_idx
  on public.world_places (
    place_kind, city_id, profile_status, moderation_status, verification_status
  )
  where location_visibility = 'public';

create or replace function public.prevent_world_category_cycle()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.parent_id is null then
    return new;
  end if;
  if exists (
    with recursive ancestors as (
      select c.parent_id
      from public.world_place_categories c
      where c.id = new.parent_id
      union all
      select c.parent_id
      from public.world_place_categories c
      join ancestors a on c.id = a.parent_id
      where c.parent_id is not null
    )
    select 1 from ancestors where parent_id = new.id
  ) then
    raise exception 'World place category cycle is not allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists world_place_categories_prevent_cycle
  on public.world_place_categories;
create trigger world_place_categories_prevent_cycle
  before insert or update of parent_id on public.world_place_categories
  for each row execute function public.prevent_world_category_cycle();

drop trigger if exists world_place_categories_set_updated_at
  on public.world_place_categories;
create trigger world_place_categories_set_updated_at
  before update on public.world_place_categories
  for each row execute function public.set_row_updated_at();

alter table public.world_place_categories enable row level security;
alter table public.world_place_categories force row level security;
alter table public.world_place_category_assignments enable row level security;
alter table public.world_place_category_assignments force row level security;

drop policy if exists "Active world place categories are public"
  on public.world_place_categories;
create policy "Active world place categories are public"
  on public.world_place_categories for select to anon, authenticated
  using (is_active);
drop policy if exists "Platform admins manage world place categories"
  on public.world_place_categories;
create policy "Platform admins manage world place categories"
  on public.world_place_categories for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

revoke insert, update, delete on public.world_place_categories
  from anon;
grant select on public.world_place_categories
  to anon, authenticated, service_role;
grant insert, update, delete on public.world_place_categories
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Reusable Place authority and public-visibility helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_world_place(p_place_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role' or exists (
    select 1
    from public.world_places p
    where p.id = p_place_id
      and (
        p.owner_user_id = auth.uid()
        or public.is_platform_admin()
        or (
          p.store_id is not null
          and public.is_store_member_with_role(
            p.store_id,
            array['owner', 'manager', 'catalog_editor']
          )
        )
      )
  );
$$;

create or replace function public.is_public_world_place(p_place_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.world_places p
    join public.world_cities c on c.id = p.city_id
    where p.id = p_place_id
      and p.location_visibility = 'public'
      and p.profile_status = 'published'
      and p.moderation_status = 'approved'
      and p.verification_status = 'verified'
      and c.is_active
      and c.profile_status = 'published'
  );
$$;

create or replace function public.world_place_reviews_enabled(p_place_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_public_world_place(p_place_id)
    and exists (
      select 1 from public.world_places p
      where p.id = p_place_id and p.reviews_status = 'enabled'
    );
$$;

revoke all on function public.can_manage_world_place(uuid) from public;
revoke all on function public.is_public_world_place(uuid) from public;
revoke all on function public.world_place_reviews_enabled(uuid) from public;
grant execute on function public.can_manage_world_place(uuid)
  to anon, authenticated, service_role;
grant execute on function public.is_public_world_place(uuid)
  to anon, authenticated, service_role;
grant execute on function public.world_place_reviews_enabled(uuid)
  to anon, authenticated, service_role;

drop policy if exists "World place category assignments are visible"
  on public.world_place_category_assignments;
create policy "World place category assignments are visible"
  on public.world_place_category_assignments for select to anon, authenticated
  using (
    public.is_public_world_place(place_id)
    or public.can_manage_world_place(place_id)
  );
drop policy if exists "World place managers assign categories"
  on public.world_place_category_assignments;
create policy "World place managers assign categories"
  on public.world_place_category_assignments for all to authenticated
  using (public.can_manage_world_place(place_id))
  with check (public.can_manage_world_place(place_id));

grant select on public.world_place_category_assignments
  to anon, authenticated, service_role;
grant insert, update, delete on public.world_place_category_assignments
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Unified Place profile extensions
-- ---------------------------------------------------------------------------

create table if not exists public.world_place_media (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.world_places (id) on delete cascade,
  media_kind text not null check (media_kind in ('image', 'video')),
  storage_bucket text not null
    check (storage_bucket ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  storage_path text not null check (
    char_length(storage_path) between 3 and 500
    and storage_path !~ '(^|/)\.\.(/|$)'
  ),
  alt_text text check (alt_text is null or char_length(alt_text) <= 300),
  caption text check (caption is null or char_length(caption) <= 500),
  sort_order integer not null default 0 check (sort_order between 0 and 10000),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint world_place_media_path_unique unique (place_id, storage_bucket, storage_path)
);

create or replace function public.protect_world_place_media_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_world_place(new.place_id) then
    raise exception 'Place management permission required';
  end if;
  if tg_op = 'INSERT'
     and not public.is_platform_admin()
     and coalesce(auth.role(), '') <> 'service_role' then
    new.moderation_status := 'pending';
  elsif tg_op = 'UPDATE'
        and not public.is_platform_admin()
        and coalesce(auth.role(), '') <> 'service_role' then
    new.place_id := old.place_id;
    new.moderation_status := old.moderation_status;
  end if;
  return new;
end;
$$;

drop trigger if exists world_place_media_protect_authority
  on public.world_place_media;
create trigger world_place_media_protect_authority
  before insert or update on public.world_place_media
  for each row execute function public.protect_world_place_media_authority();

alter table public.world_places
  add column if not exists cover_media_id uuid
    references public.world_place_media (id) on delete set null;

create table if not exists public.world_place_links (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.world_places (id) on delete cascade,
  link_kind text not null check (
    link_kind in ('website', 'booking', 'menu', 'commerce', 'contact', 'social')
  ),
  label text check (label is null or char_length(label) <= 80),
  url text not null check (
    char_length(url) between 10 and 1000
    and url ~ '^https://'
  ),
  is_public boolean not null default true,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  sort_order integer not null default 0 check (sort_order between 0 and 1000),
  created_at timestamptz not null default timezone('utc', now()),
  constraint world_place_links_unique unique (place_id, link_kind, url)
);

create or replace function public.protect_world_place_link_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_world_place(new.place_id) then
    raise exception 'Place management permission required';
  end if;
  if tg_op = 'INSERT' and not public.is_platform_admin()
     and coalesce(auth.role(), '') <> 'service_role' then
    new.moderation_status := 'pending';
  elsif tg_op = 'UPDATE' and not public.is_platform_admin()
        and coalesce(auth.role(), '') <> 'service_role' then
    new.place_id := old.place_id;
    if new.url is distinct from old.url
       or new.link_kind is distinct from old.link_kind then
      new.moderation_status := 'pending';
    else
      new.moderation_status := old.moderation_status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists world_place_links_protect_authority
  on public.world_place_links;
create trigger world_place_links_protect_authority
  before insert or update on public.world_place_links
  for each row execute function public.protect_world_place_link_authority();

create table if not exists public.world_place_post_links (
  place_id uuid not null references public.world_places (id) on delete cascade,
  post_id bigint not null references public.posts (id) on delete cascade,
  relation_type text not null default 'featured'
    check (relation_type in ('featured', 'visit', 'review', 'official')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (place_id, post_id)
);

create table if not exists public.world_place_live_links (
  place_id uuid not null references public.world_places (id) on delete cascade,
  live_room_id uuid not null references public.live_rooms (id) on delete cascade,
  relation_type text not null default 'hosted_at'
    check (relation_type in ('hosted_at', 'nearby', 'official')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (place_id, live_room_id)
);

create table if not exists public.world_city_post_links (
  city_id uuid not null references public.world_cities (id) on delete cascade,
  post_id bigint not null references public.posts (id) on delete cascade,
  relation_type text not null default 'featured'
    check (relation_type in ('featured', 'visit', 'official', 'post_journey')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (city_id, post_id)
);

create table if not exists public.world_city_live_links (
  city_id uuid not null references public.world_cities (id) on delete cascade,
  live_room_id uuid not null references public.live_rooms (id) on delete cascade,
  relation_type text not null default 'hosted_in'
    check (relation_type in ('hosted_in', 'nearby', 'official')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (city_id, live_room_id)
);

create table if not exists public.world_place_opening_hours (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.world_places (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  valid_from date,
  valid_until date,
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint world_place_opening_hours_shape_check check (
    (is_closed and opens_at is null and closes_at is null)
    or (not is_closed and opens_at is not null and closes_at is not null)
  ),
  constraint world_place_opening_hours_validity_check check (
    valid_until is null or valid_from is null or valid_until >= valid_from
  )
);

create table if not exists public.world_business_profiles (
  place_id uuid primary key references public.world_places (id) on delete cascade,
  legal_name text check (legal_name is null or char_length(legal_name) <= 180),
  public_phone text check (public_phone is null or char_length(public_phone) <= 40),
  public_email text check (public_email is null or char_length(public_email) <= 254),
  price_level smallint check (price_level is null or price_level between 1 and 4),
  reservations_supported boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.world_place_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.world_places (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text check (title is null or char_length(title) <= 120),
  body text check (body is null or char_length(body) <= 2000),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected', 'hidden')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint world_place_reviews_author_unique unique (place_id, author_id)
);

create table if not exists public.world_place_ai_summaries (
  place_id uuid primary key references public.world_places (id) on delete cascade,
  summary_text text not null check (char_length(summary_text) between 1 and 3000),
  model_provider text,
  model_reference text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'superseded')),
  generated_at timestamptz not null default timezone('utc', now()),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz
);

create index if not exists world_place_media_public_idx
  on public.world_place_media (place_id, moderation_status, sort_order);
create index if not exists world_place_links_public_idx
  on public.world_place_links (place_id, is_public, sort_order);
create index if not exists world_place_posts_place_idx
  on public.world_place_post_links (place_id, created_at desc);
create index if not exists world_place_live_place_idx
  on public.world_place_live_links (place_id, created_at desc);
create index if not exists world_city_posts_city_idx
  on public.world_city_post_links (city_id, created_at desc);
create index if not exists world_city_live_city_idx
  on public.world_city_live_links (city_id, created_at desc);
create index if not exists world_place_hours_place_day_idx
  on public.world_place_opening_hours (place_id, day_of_week, valid_from);
create index if not exists world_place_reviews_public_idx
  on public.world_place_reviews (place_id, moderation_status, created_at desc);

drop trigger if exists world_place_opening_hours_set_updated_at
  on public.world_place_opening_hours;
create trigger world_place_opening_hours_set_updated_at
  before update on public.world_place_opening_hours
  for each row execute function public.set_row_updated_at();
drop trigger if exists world_place_reviews_set_updated_at
  on public.world_place_reviews;
create trigger world_place_reviews_set_updated_at
  before update on public.world_place_reviews
  for each row execute function public.set_row_updated_at();

create or replace function public.protect_world_place_review_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.world_place_reviews_enabled(new.place_id) then
    raise exception 'Place is not reviewable';
  end if;
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
    new.moderation_status := 'pending';
  elsif not public.is_platform_admin() then
    new.author_id := old.author_id;
    new.place_id := old.place_id;
    new.moderation_status := old.moderation_status;
  end if;
  return new;
end;
$$;

drop trigger if exists world_place_reviews_protect_authority
  on public.world_place_reviews;
create trigger world_place_reviews_protect_authority
  before insert or update on public.world_place_reviews
  for each row execute function public.protect_world_place_review_authority();

-- Reusable RLS policies for owner-managed Place profile extensions.
alter table public.world_place_media enable row level security;
alter table public.world_place_media force row level security;
alter table public.world_place_links enable row level security;
alter table public.world_place_links force row level security;
alter table public.world_place_post_links enable row level security;
alter table public.world_place_post_links force row level security;
alter table public.world_place_live_links enable row level security;
alter table public.world_place_live_links force row level security;
alter table public.world_city_post_links enable row level security;
alter table public.world_city_post_links force row level security;
alter table public.world_city_live_links enable row level security;
alter table public.world_city_live_links force row level security;
alter table public.world_place_opening_hours enable row level security;
alter table public.world_place_opening_hours force row level security;
alter table public.world_business_profiles enable row level security;
alter table public.world_business_profiles force row level security;
alter table public.world_place_reviews enable row level security;
alter table public.world_place_reviews force row level security;
alter table public.world_place_ai_summaries enable row level security;
alter table public.world_place_ai_summaries force row level security;

drop policy if exists "World place media are visible" on public.world_place_media;
create policy "World place media are visible"
  on public.world_place_media for select to anon, authenticated
  using (
    (moderation_status = 'approved' and public.is_public_world_place(place_id))
    or public.can_manage_world_place(place_id)
  );
drop policy if exists "World place managers manage media" on public.world_place_media;
create policy "World place managers manage media"
  on public.world_place_media for all to authenticated
  using (public.can_manage_world_place(place_id))
  with check (public.can_manage_world_place(place_id));

drop policy if exists "World place links are visible" on public.world_place_links;
create policy "World place links are visible"
  on public.world_place_links for select to anon, authenticated
  using (
    (
      is_public
      and moderation_status = 'approved'
      and public.is_public_world_place(place_id)
    )
    or public.can_manage_world_place(place_id)
  );
drop policy if exists "World place managers manage links" on public.world_place_links;
create policy "World place managers manage links"
  on public.world_place_links for all to authenticated
  using (public.can_manage_world_place(place_id))
  with check (public.can_manage_world_place(place_id));

drop policy if exists "World place post links are visible" on public.world_place_post_links;
create policy "World place post links are visible"
  on public.world_place_post_links for select to anon, authenticated
  using (
    (
      public.is_public_world_place(place_id)
      and exists (
        select 1 from public.posts p
        where p.id = post_id
          and public.is_video_post_publicly_visible(
            p.post_type, p.media_status, p.video_path
          )
      )
    )
    or public.can_manage_world_place(place_id)
  );
drop policy if exists "World place managers manage post links" on public.world_place_post_links;
create policy "World place managers manage post links"
  on public.world_place_post_links for all to authenticated
  using (public.can_manage_world_place(place_id))
  with check (public.can_manage_world_place(place_id));

drop policy if exists "World place live links are visible" on public.world_place_live_links;
create policy "World place live links are visible"
  on public.world_place_live_links for select to anon, authenticated
  using (
    (
      public.is_public_world_place(place_id)
      and exists (
        select 1 from public.live_rooms r
        where r.id = live_room_id
          and r.visibility = 'public'
          and r.status = 'live'
      )
    )
    or public.can_manage_world_place(place_id)
  );
drop policy if exists "World place managers manage live links" on public.world_place_live_links;
create policy "World place managers manage live links"
  on public.world_place_live_links for all to authenticated
  using (public.can_manage_world_place(place_id))
  with check (public.can_manage_world_place(place_id));

drop policy if exists "Public city post links are visible"
  on public.world_city_post_links;
create policy "Public city post links are visible"
  on public.world_city_post_links for select to anon, authenticated
  using (
    exists (
      select 1 from public.world_cities c
      where c.id = city_id and c.is_active and c.profile_status = 'published'
    )
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and public.is_video_post_publicly_visible(
          p.post_type, p.media_status, p.video_path
        )
    )
  );
drop policy if exists "Public city live links are visible"
  on public.world_city_live_links;
create policy "Public city live links are visible"
  on public.world_city_live_links for select to anon, authenticated
  using (
    exists (
      select 1 from public.world_cities c
      where c.id = city_id and c.is_active and c.profile_status = 'published'
    )
    and exists (
      select 1 from public.live_rooms r
      where r.id = live_room_id
        and r.visibility = 'public'
        and r.status = 'live'
    )
  );

revoke insert, update, delete on
  public.world_city_post_links,
  public.world_city_live_links
from anon, authenticated;

drop policy if exists "World place hours are visible" on public.world_place_opening_hours;
create policy "World place hours are visible"
  on public.world_place_opening_hours for select to anon, authenticated
  using (public.is_public_world_place(place_id) or public.can_manage_world_place(place_id));
drop policy if exists "World place managers manage hours" on public.world_place_opening_hours;
create policy "World place managers manage hours"
  on public.world_place_opening_hours for all to authenticated
  using (public.can_manage_world_place(place_id))
  with check (public.can_manage_world_place(place_id));

drop policy if exists "World business profiles are visible" on public.world_business_profiles;
create policy "World business profiles are visible"
  on public.world_business_profiles for select to authenticated
  using (public.can_manage_world_place(place_id));
drop policy if exists "World place managers manage business profiles"
  on public.world_business_profiles;
create policy "World place managers manage business profiles"
  on public.world_business_profiles for all to authenticated
  using (public.can_manage_world_place(place_id))
  with check (public.can_manage_world_place(place_id));

drop policy if exists "Approved world place reviews are public" on public.world_place_reviews;
create policy "Approved world place reviews are public"
  on public.world_place_reviews for select to anon, authenticated
  using (
    (moderation_status = 'approved' and public.is_public_world_place(place_id))
    or author_id = auth.uid()
    or public.is_platform_admin()
  );
drop policy if exists "Users create world place reviews" on public.world_place_reviews;
create policy "Users create world place reviews"
  on public.world_place_reviews for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.world_place_reviews_enabled(place_id)
  );
drop policy if exists "Users update pending world place reviews" on public.world_place_reviews;
create policy "Users update pending world place reviews"
  on public.world_place_reviews for update to authenticated
  using (author_id = auth.uid() and moderation_status = 'pending')
  with check (author_id = auth.uid());
drop policy if exists "Platform admins moderate world place reviews"
  on public.world_place_reviews;
create policy "Platform admins moderate world place reviews"
  on public.world_place_reviews for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Published world AI summaries are public"
  on public.world_place_ai_summaries;
create policy "Published world AI summaries are public"
  on public.world_place_ai_summaries for select to anon, authenticated
  using (
    (status = 'published' and public.is_public_world_place(place_id))
    or public.is_platform_admin()
  );
drop policy if exists "Platform admins manage world AI summaries"
  on public.world_place_ai_summaries;
create policy "Platform admins manage world AI summaries"
  on public.world_place_ai_summaries for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
drop policy if exists "Platform admins manage world city post links"
  on public.world_city_post_links;
create policy "Platform admins manage world city post links"
  on public.world_city_post_links for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
drop policy if exists "Platform admins manage world city live links"
  on public.world_city_live_links;
create policy "Platform admins manage world city live links"
  on public.world_city_live_links for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

grant select on
  public.world_place_media,
  public.world_place_links,
  public.world_place_post_links,
  public.world_place_live_links,
  public.world_city_post_links,
  public.world_city_live_links,
  public.world_place_opening_hours,
  public.world_business_profiles,
  public.world_place_reviews,
  public.world_place_ai_summaries
to anon, authenticated, service_role;
grant insert, update, delete on
  public.world_place_media,
  public.world_place_links,
  public.world_place_post_links,
  public.world_place_live_links,
  public.world_place_opening_hours,
  public.world_business_profiles
to authenticated, service_role;
grant insert, update on public.world_place_reviews to authenticated, service_role;
grant insert, update, delete on
  public.world_place_ai_summaries,
  public.world_city_post_links,
  public.world_city_live_links
to authenticated, service_role;
revoke insert, update, delete on public.world_place_ai_summaries from anon;

-- ---------------------------------------------------------------------------
-- 5) Modular World layers
-- ---------------------------------------------------------------------------

create table if not exists public.world_layers (
  layer_key text primary key check (layer_key in (
    'discovery', 'community', 'media', 'commerce',
    'journey', 'events', 'live', 'ai'
  )),
  default_enabled boolean not null default false,
  description text not null check (char_length(description) <= 500),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.world_layers (layer_key, default_enabled, description) values
  ('discovery', true, 'Public city/place discovery and profiles'),
  ('community', false, 'City Community and Hello City'),
  ('media', true, 'Place/city videos and galleries'),
  ('commerce', true, 'Links to existing Store commerce'),
  ('journey', true, 'World journeys and Post Journey links'),
  ('events', false, 'Moderated local events'),
  ('live', true, 'Links to public Live rooms'),
  ('ai', false, 'Reviewed AI summaries and future travel assistant')
on conflict (layer_key) do nothing;

create table if not exists public.world_city_layers (
  city_id uuid not null references public.world_cities (id) on delete cascade,
  layer_key text not null references public.world_layers (layer_key) on delete restrict,
  enabled boolean not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (city_id, layer_key)
);

create table if not exists public.world_place_layers (
  place_id uuid not null references public.world_places (id) on delete cascade,
  layer_key text not null references public.world_layers (layer_key) on delete restrict,
  enabled boolean not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (place_id, layer_key)
);

alter table public.world_layers enable row level security;
alter table public.world_layers force row level security;
alter table public.world_city_layers enable row level security;
alter table public.world_city_layers force row level security;
alter table public.world_place_layers enable row level security;
alter table public.world_place_layers force row level security;

drop policy if exists "World layers are public" on public.world_layers;
create policy "World layers are public"
  on public.world_layers for select to anon, authenticated using (true);
drop policy if exists "World city layers are public" on public.world_city_layers;
create policy "World city layers are public"
  on public.world_city_layers for select to anon, authenticated
  using (
    exists (
      select 1 from public.world_cities c
      where c.id = city_id
        and c.is_active
        and c.profile_status = 'published'
    )
  );
drop policy if exists "World place layers are visible" on public.world_place_layers;
create policy "World place layers are visible"
  on public.world_place_layers for select to anon, authenticated
  using (public.is_public_world_place(place_id) or public.can_manage_world_place(place_id));
drop policy if exists "World place managers configure layers" on public.world_place_layers;
create policy "World place managers configure layers"
  on public.world_place_layers for all to authenticated
  using (public.can_manage_world_place(place_id))
  with check (public.can_manage_world_place(place_id));
drop policy if exists "Platform admins manage world layers" on public.world_layers;
create policy "Platform admins manage world layers"
  on public.world_layers for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
drop policy if exists "Platform admins manage world city layers"
  on public.world_city_layers;
create policy "Platform admins manage world city layers"
  on public.world_city_layers for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

revoke insert, update, delete on public.world_layers, public.world_city_layers
  from anon;
grant select on public.world_layers, public.world_city_layers
  to anon, authenticated, service_role;
grant select on public.world_place_layers to anon, authenticated, service_role;
grant insert, update, delete on public.world_layers, public.world_city_layers
  to authenticated, service_role;
grant insert, update, delete on public.world_place_layers
  to authenticated, service_role;

create or replace function public.world_layer_enabled(
  p_layer_key text,
  p_city_id uuid default null,
  p_place_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select pl.enabled
     from public.world_place_layers pl
     where pl.place_id = p_place_id and pl.layer_key = p_layer_key),
    (select cl.enabled
     from public.world_city_layers cl
     where cl.city_id = p_city_id and cl.layer_key = p_layer_key),
    (select l.default_enabled
     from public.world_layers l
     where l.layer_key = p_layer_key),
    false
  );
$$;

revoke all on function public.world_layer_enabled(text, uuid, uuid) from public;
grant execute on function public.world_layer_enabled(text, uuid, uuid)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Journey, City Community and Local Events
-- ---------------------------------------------------------------------------

create table if not exists public.world_journeys (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 160),
  description text check (description is null or char_length(description) <= 5000),
  origin_city_id uuid references public.world_cities (id) on delete set null,
  destination_city_id uuid references public.world_cities (id) on delete set null,
  visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected', 'suspended')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.world_journey_stops (
  journey_id uuid not null references public.world_journeys (id) on delete cascade,
  position integer not null check (position between 0 and 1000),
  city_id uuid references public.world_cities (id) on delete set null,
  place_id uuid references public.world_places (id) on delete set null,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (journey_id, position),
  constraint world_journey_stops_target_check check (
    city_id is not null or place_id is not null
  )
);

create table if not exists public.world_journey_posts (
  journey_id uuid not null references public.world_journeys (id) on delete cascade,
  post_id bigint not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (journey_id, post_id)
);

create table if not exists public.world_city_communities (
  city_id uuid primary key references public.world_cities (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 160),
  description text check (description is null or char_length(description) <= 3000),
  status text not null default 'disabled'
    check (status in ('disabled', 'active', 'paused')),
  hello_city_feed_enabled boolean not null default false,
  local_posts_enabled boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.world_local_events (
  id uuid primary key default gen_random_uuid(),
  organizer_user_id uuid not null references auth.users (id) on delete cascade,
  city_id uuid not null references public.world_cities (id) on delete restrict,
  place_id uuid references public.world_places (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 2 and 180),
  description text check (description is null or char_length(description) <= 5000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  visibility text not null default 'public'
    check (visibility in ('private', 'unlisted', 'public')),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected', 'cancelled')),
  source_type text not null default 'organizer'
    check (source_type in ('organizer', 'business', 'platform')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint world_local_events_time_check check (
    ends_at is null or ends_at > starts_at
  )
);

create index if not exists world_journeys_public_idx
  on public.world_journeys (destination_city_id, status, moderation_status, created_at desc);
create index if not exists world_journey_stops_place_idx
  on public.world_journey_stops (place_id) where place_id is not null;
create index if not exists world_local_events_city_public_idx
  on public.world_local_events (city_id, moderation_status, starts_at)
  where visibility = 'public';

drop trigger if exists world_journeys_set_updated_at on public.world_journeys;
create trigger world_journeys_set_updated_at
  before update on public.world_journeys
  for each row execute function public.set_row_updated_at();
drop trigger if exists world_city_communities_set_updated_at
  on public.world_city_communities;
create trigger world_city_communities_set_updated_at
  before update on public.world_city_communities
  for each row execute function public.set_row_updated_at();
drop trigger if exists world_local_events_set_updated_at on public.world_local_events;
create trigger world_local_events_set_updated_at
  before update on public.world_local_events
  for each row execute function public.set_row_updated_at();

create or replace function public.protect_world_journey_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_platform_admin() or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if tg_op = 'INSERT' then
    new.owner_user_id := auth.uid();
    new.moderation_status := 'pending';
    new.status := 'draft';
  else
    new.owner_user_id := old.owner_user_id;
    if new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.origin_city_id is distinct from old.origin_city_id
       or new.destination_city_id is distinct from old.destination_city_id
       or new.visibility is distinct from old.visibility then
      new.moderation_status := 'pending';
      new.status := 'draft';
    else
      new.moderation_status := old.moderation_status;
      if new.status = 'published' and old.status <> 'published' then
        new.status := old.status;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists world_journeys_protect_authority
  on public.world_journeys;
create trigger world_journeys_protect_authority
  before insert or update on public.world_journeys
  for each row execute function public.protect_world_journey_authority();

create or replace function public.protect_world_event_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_service boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if uid is null and not is_service then
    raise exception 'Authentication required';
  end if;
  if not is_service
     and not public.is_platform_admin()
     and not public.world_layer_enabled('events', new.city_id, new.place_id) then
    raise exception 'World Events layer is disabled';
  end if;
  if tg_op = 'INSERT' then
    if uid is not null then
      new.organizer_user_id := uid;
    end if;
    new.moderation_status := 'pending';
    if new.source_type = 'platform'
       and not is_service
       and not public.is_platform_admin() then
      new.source_type := 'organizer';
    end if;
  elsif not is_service and not public.is_platform_admin() then
    new.organizer_user_id := old.organizer_user_id;
    new.moderation_status := old.moderation_status;
    new.source_type := old.source_type;
  end if;
  return new;
end;
$$;

drop trigger if exists world_local_events_protect_authority
  on public.world_local_events;
create trigger world_local_events_protect_authority
  before insert or update on public.world_local_events
  for each row execute function public.protect_world_event_authority();

alter table public.world_journeys enable row level security;
alter table public.world_journeys force row level security;
alter table public.world_journey_stops enable row level security;
alter table public.world_journey_stops force row level security;
alter table public.world_journey_posts enable row level security;
alter table public.world_journey_posts force row level security;
alter table public.world_city_communities enable row level security;
alter table public.world_city_communities force row level security;
alter table public.world_local_events enable row level security;
alter table public.world_local_events force row level security;

drop policy if exists "Public world journeys are visible" on public.world_journeys;
create policy "Public world journeys are visible"
  on public.world_journeys for select to anon, authenticated
  using (
    (
      visibility = 'public'
      and status = 'published'
      and moderation_status = 'approved'
    )
    or owner_user_id = auth.uid()
    or public.is_platform_admin()
  );
drop policy if exists "Users manage own world journeys" on public.world_journeys;
create policy "Users manage own world journeys"
  on public.world_journeys for all to authenticated
  using (owner_user_id = auth.uid() or public.is_platform_admin())
  with check (owner_user_id = auth.uid() or public.is_platform_admin());

drop policy if exists "Visible world journey stops are readable"
  on public.world_journey_stops;
create policy "Visible world journey stops are readable"
  on public.world_journey_stops for select to anon, authenticated
  using (exists (
    select 1 from public.world_journeys j
    where j.id = journey_id
      and (
        (j.visibility = 'public' and j.status = 'published'
          and j.moderation_status = 'approved')
        or j.owner_user_id = auth.uid()
        or public.is_platform_admin()
      )
  ));
drop policy if exists "Journey owners manage stops" on public.world_journey_stops;
create policy "Journey owners manage stops"
  on public.world_journey_stops for all to authenticated
  using (exists (
    select 1 from public.world_journeys j
    where j.id = journey_id
      and (j.owner_user_id = auth.uid() or public.is_platform_admin())
  ))
  with check (exists (
    select 1 from public.world_journeys j
    where j.id = journey_id
      and (j.owner_user_id = auth.uid() or public.is_platform_admin())
  ));

drop policy if exists "Visible world journey posts are readable"
  on public.world_journey_posts;
create policy "Visible world journey posts are readable"
  on public.world_journey_posts for select to anon, authenticated
  using (exists (
    select 1 from public.world_journeys j
    where j.id = journey_id
      and (
        (j.visibility = 'public' and j.status = 'published'
          and j.moderation_status = 'approved')
        or j.owner_user_id = auth.uid()
        or public.is_platform_admin()
      )
  ));
drop policy if exists "Journey owners manage linked posts" on public.world_journey_posts;
create policy "Journey owners manage linked posts"
  on public.world_journey_posts for all to authenticated
  using (exists (
    select 1 from public.world_journeys j
    where j.id = journey_id
      and (j.owner_user_id = auth.uid() or public.is_platform_admin())
  ))
  with check (exists (
    select 1 from public.world_journeys j
    where j.id = journey_id
      and (j.owner_user_id = auth.uid() or public.is_platform_admin())
  ));

drop policy if exists "Active city communities are public"
  on public.world_city_communities;
create policy "Active city communities are public"
  on public.world_city_communities for select to anon, authenticated
  using (status = 'active' or public.is_platform_admin());
drop policy if exists "Platform admins manage city communities"
  on public.world_city_communities;
create policy "Platform admins manage city communities"
  on public.world_city_communities for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
revoke insert, update, delete on public.world_city_communities from anon;

drop policy if exists "Public local events are visible" on public.world_local_events;
create policy "Public local events are visible"
  on public.world_local_events for select to anon, authenticated
  using (
    (
      visibility = 'public'
      and moderation_status = 'approved'
      and public.world_layer_enabled('events', city_id, place_id)
    )
    or organizer_user_id = auth.uid()
    or public.is_platform_admin()
  );
drop policy if exists "Users create local events" on public.world_local_events;
create policy "Users create local events"
  on public.world_local_events for insert to authenticated
  with check (organizer_user_id = auth.uid());
drop policy if exists "Users update own local events" on public.world_local_events;
create policy "Users update own local events"
  on public.world_local_events for update to authenticated
  using (organizer_user_id = auth.uid() or public.is_platform_admin())
  with check (organizer_user_id = auth.uid() or public.is_platform_admin());

grant select on
  public.world_journeys,
  public.world_journey_stops,
  public.world_journey_posts,
  public.world_city_communities,
  public.world_local_events
to anon, authenticated, service_role;
grant insert, update, delete on
  public.world_journeys,
  public.world_journey_stops,
  public.world_journey_posts
to authenticated, service_role;
grant insert, update on public.world_local_events to authenticated, service_role;
grant insert, update, delete on public.world_city_communities
  to authenticated, service_role;

create table if not exists public.world_moderation_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('place', 'city', 'journey', 'event', 'review')),
  entity_id uuid not null,
  action text not null check (char_length(btrim(action)) between 2 and 80),
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  actor_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists world_moderation_events_entity_idx
  on public.world_moderation_events (entity_type, entity_id, created_at desc);
alter table public.world_moderation_events enable row level security;
alter table public.world_moderation_events force row level security;
drop policy if exists "Platform admins read world moderation audit"
  on public.world_moderation_events;
create policy "Platform admins read world moderation audit"
  on public.world_moderation_events for select to authenticated
  using (public.is_platform_admin());
revoke insert, update, delete on public.world_moderation_events
  from anon, authenticated;
grant select on public.world_moderation_events to authenticated, service_role;

create or replace function public.admin_review_world_place(
  p_place_id uuid,
  p_moderation_status text,
  p_verification_status text,
  p_profile_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid := public.require_platform_admin();
  before_row public.world_places%rowtype;
  after_row public.world_places%rowtype;
begin
  if p_moderation_status not in ('pending', 'approved', 'rejected', 'suspended')
     or p_verification_status not in ('unverified', 'pending', 'verified', 'rejected')
     or p_profile_status not in ('draft', 'published', 'archived') then
    raise exception 'Invalid World place review transition';
  end if;
  select * into before_row from public.world_places where id = p_place_id for update;
  if not found then raise exception 'World place not found'; end if;
  update public.world_places
  set moderation_status = p_moderation_status,
      verification_status = p_verification_status,
      profile_status = p_profile_status
  where id = p_place_id
  returning * into after_row;
  insert into public.world_moderation_events (
    entity_type, entity_id, action, before_state, after_state, actor_id
  ) values (
    'place', p_place_id, 'review',
    jsonb_build_object(
      'moderation', before_row.moderation_status,
      'verification', before_row.verification_status,
      'profile', before_row.profile_status
    ),
    jsonb_build_object(
      'moderation', after_row.moderation_status,
      'verification', after_row.verification_status,
      'profile', after_row.profile_status
    ),
    admin_id
  );
end;
$$;

create or replace function public.admin_review_world_city(
  p_city_id uuid,
  p_verification_status text,
  p_profile_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid := public.require_platform_admin();
  before_row public.world_cities%rowtype;
  after_row public.world_cities%rowtype;
begin
  if p_verification_status not in ('unverified', 'pending', 'verified', 'rejected')
     or p_profile_status not in ('draft', 'published', 'archived') then
    raise exception 'Invalid World city review transition';
  end if;
  select * into before_row from public.world_cities where id = p_city_id for update;
  if not found then raise exception 'World city not found'; end if;
  update public.world_cities
  set verification_status = p_verification_status,
      profile_status = p_profile_status
  where id = p_city_id
  returning * into after_row;
  insert into public.world_moderation_events (
    entity_type, entity_id, action, before_state, after_state, actor_id
  ) values (
    'city', p_city_id, 'review',
    jsonb_build_object(
      'verification', before_row.verification_status,
      'profile', before_row.profile_status
    ),
    jsonb_build_object(
      'verification', after_row.verification_status,
      'profile', after_row.profile_status
    ),
    admin_id
  );
end;
$$;

create or replace function public.admin_review_world_journey(
  p_journey_id uuid,
  p_moderation_status text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid := public.require_platform_admin();
  before_row public.world_journeys%rowtype;
  after_row public.world_journeys%rowtype;
begin
  if p_moderation_status not in ('pending', 'approved', 'rejected', 'suspended')
     or p_status not in ('draft', 'published', 'archived') then
    raise exception 'Invalid World journey review transition';
  end if;
  select * into before_row from public.world_journeys where id = p_journey_id for update;
  if not found then raise exception 'World journey not found'; end if;
  update public.world_journeys
  set moderation_status = p_moderation_status,
      status = p_status
  where id = p_journey_id
  returning * into after_row;
  insert into public.world_moderation_events (
    entity_type, entity_id, action, before_state, after_state, actor_id
  ) values (
    'journey', p_journey_id, 'review',
    jsonb_build_object(
      'moderation', before_row.moderation_status,
      'status', before_row.status
    ),
    jsonb_build_object(
      'moderation', after_row.moderation_status,
      'status', after_row.status
    ),
    admin_id
  );
end;
$$;

revoke all on function public.admin_review_world_place(uuid, text, text, text)
  from public, anon;
revoke all on function public.admin_review_world_city(uuid, text, text)
  from public, anon;
revoke all on function public.admin_review_world_journey(uuid, text, text)
  from public, anon;
grant execute on function public.admin_review_world_place(uuid, text, text, text)
  to authenticated, service_role;
grant execute on function public.admin_review_world_city(uuid, text, text)
  to authenticated, service_role;
grant execute on function public.admin_review_world_journey(uuid, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) Safe public Place / City profiles
-- ---------------------------------------------------------------------------

create or replace function public.get_world_place_profile(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  place_row public.world_places%rowtype;
  result jsonb;
begin
  if not public.world_feature_enabled('world_discovery_enabled') then
    raise exception 'World Discovery is disabled';
  end if;

  select p.* into place_row
  from public.world_places p
  where p.slug = lower(btrim(p_slug))
    and public.is_public_world_place(p.id);
  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'id', place_row.id,
    'slug', place_row.slug,
    'name', place_row.name,
    'tagline', place_row.tagline,
    'description', place_row.description,
    'kind', place_row.place_kind,
    'legacyCategory', place_row.category,
    'address', place_row.address_display,
    'latitude', place_row.latitude,
    'longitude', place_row.longitude,
    'verificationStatus', place_row.verification_status,
    'storeId', place_row.store_id,
    'city', (
      select jsonb_build_object(
        'id', c.id, 'slug', c.slug, 'name', c.city_name,
        'region', c.region_name, 'countryCode', c.country_code,
        'countryName', c.country_name
      )
      from public.world_cities c where c.id = place_row.city_id
    ),
    'district', (
      select jsonb_build_object('id', d.id, 'slug', d.slug, 'name', d.name)
      from public.world_districts d where d.id = place_row.district_id and d.is_active
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'slug', c.slug, 'name', c.name,
        'parentId', c.parent_id, 'isPrimary', a.is_primary
      ) order by a.is_primary desc, c.sort_order, c.name)
      from public.world_place_category_assignments a
      join public.world_place_categories c on c.id = a.category_id
      where a.place_id = place_row.id and c.is_active
    ), '[]'::jsonb),
    'gallery', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'kind', m.media_kind, 'bucket', m.storage_bucket,
        'path', m.storage_path, 'alt', m.alt_text, 'caption', m.caption,
        'isCover', m.id = place_row.cover_media_id
      ) order by (m.id = place_row.cover_media_id) desc, m.sort_order, m.id)
      from public.world_place_media m
      where m.place_id = place_row.id and m.moderation_status = 'approved'
    ), '[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', l.link_kind, 'label', l.label, 'url', l.url
      ) order by l.sort_order, l.id)
      from public.world_place_links l
      where l.place_id = place_row.id
        and l.is_public
        and l.moderation_status = 'approved'
    ), '[]'::jsonb),
    'business', (
      select jsonb_build_object(
        'priceLevel', b.price_level,
        'reservationsSupported', b.reservations_supported
      )
      from public.world_business_profiles b
      where b.place_id = place_row.id
    ),
    'openingHours', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', h.day_of_week, 'opensAt', h.opens_at,
        'closesAt', h.closes_at, 'isClosed', h.is_closed, 'note', h.note
      ) order by h.day_of_week, h.opens_at)
      from public.world_place_opening_hours h
      where h.place_id = place_row.id
        and (h.valid_from is null or h.valid_from <= current_date)
        and (h.valid_until is null or h.valid_until >= current_date)
    ), '[]'::jsonb),
    'postIds', coalesce((
      select jsonb_agg(x.post_id order by x.created_at desc)
      from public.world_place_post_links x
      join public.posts p on p.id = x.post_id
        and public.is_video_post_publicly_visible(
          p.post_type, p.media_status, p.video_path
        )
      where x.place_id = place_row.id
    ), '[]'::jsonb),
    'liveRoomIds', coalesce((
      select jsonb_agg(x.live_room_id order by x.created_at desc)
      from public.world_place_live_links x
      join public.live_rooms r on r.id = x.live_room_id
        and r.visibility = 'public' and r.status = 'live'
      where x.place_id = place_row.id
    ), '[]'::jsonb),
    'reviews', jsonb_build_object(
      'enabled', place_row.reviews_status = 'enabled',
      'count', (select count(*) from public.world_place_reviews r
                where r.place_id = place_row.id and r.moderation_status = 'approved'),
      'average', (select round(avg(r.rating)::numeric, 2)
                  from public.world_place_reviews r
                  where r.place_id = place_row.id and r.moderation_status = 'approved')
    ),
    'aiSummary', case
      when public.world_layer_enabled('ai', place_row.city_id, place_row.id)
      then (select s.summary_text from public.world_place_ai_summaries s
            where s.place_id = place_row.id and s.status = 'published')
      else null
    end,
    'layers', (
      select coalesce(jsonb_object_agg(
        l.layer_key,
        public.world_layer_enabled(l.layer_key, place_row.city_id, place_row.id)
      ), '{}'::jsonb)
      from public.world_layers l
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.get_world_city_profile(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  city_row public.world_cities%rowtype;
begin
  if not public.world_feature_enabled('world_discovery_enabled') then
    raise exception 'World Discovery is disabled';
  end if;

  select c.* into city_row
  from public.world_cities c
  where c.slug = lower(btrim(p_slug))
    and c.is_active
    and c.profile_status = 'published';
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', city_row.id,
    'slug', city_row.slug,
    'name', city_row.city_name,
    'overview', city_row.overview,
    'coverMediaPath', city_row.cover_media_path,
    'centerLatitude', city_row.center_latitude,
    'centerLongitude', city_row.center_longitude,
    'region', city_row.region_name,
    'countryCode', city_row.country_code,
    'countryName', city_row.country_name,
    'timezone', city_row.timezone_name,
    'verificationStatus', city_row.verification_status,
    'layers', (
      select coalesce(jsonb_object_agg(
        l.layer_key,
        public.world_layer_enabled(l.layer_key, city_row.id, null)
      ), '{}'::jsonb)
      from public.world_layers l
    ),
    'placeCounts', (
      select coalesce(jsonb_object_agg(q.place_kind, q.total), '{}'::jsonb)
      from (
        select p.place_kind, count(*) as total
        from public.world_places p
        where p.city_id = city_row.id and public.is_public_world_place(p.id)
        group by p.place_kind
      ) q
    ),
    'featuredPlaces', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'slug', p.slug, 'name', p.name, 'kind', p.place_kind,
        'verificationStatus', p.verification_status
      ) order by p.name, p.id)
      from (
        select p.*
        from public.world_places p
        where p.city_id = city_row.id and public.is_public_world_place(p.id)
        order by p.created_at desc, p.id
        limit 24
      ) p
    ), '[]'::jsonb),
    'postIds', coalesce((
      select jsonb_agg(x.post_id order by x.created_at desc)
      from public.world_city_post_links x
      join public.posts p on p.id = x.post_id
        and public.is_video_post_publicly_visible(
          p.post_type, p.media_status, p.video_path
        )
      where x.city_id = city_row.id
    ), '[]'::jsonb),
    'liveRoomIds', coalesce((
      select jsonb_agg(x.live_room_id order by x.created_at desc)
      from public.world_city_live_links x
      join public.live_rooms r on r.id = x.live_room_id
        and r.visibility = 'public' and r.status = 'live'
      where x.city_id = city_row.id
    ), '[]'::jsonb),
    'journeyIds', coalesce((
      select jsonb_agg(j.id order by j.created_at desc)
      from public.world_journeys j
      where (j.destination_city_id = city_row.id or j.origin_city_id = city_row.id)
        and j.visibility = 'public'
        and j.status = 'published'
        and j.moderation_status = 'approved'
    ), '[]'::jsonb),
    'localEvents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'title', e.title, 'startsAt', e.starts_at,
        'endsAt', e.ends_at, 'placeId', e.place_id
      ) order by e.starts_at, e.id)
      from public.world_local_events e
      where e.city_id = city_row.id
        and e.visibility = 'public'
        and e.moderation_status = 'approved'
        and e.starts_at >= timezone('utc', now())
        and public.world_layer_enabled('events', city_row.id, e.place_id)
    ), '[]'::jsonb),
    'community', (
      select jsonb_build_object(
        'name', cc.name,
        'description', cc.description,
        'helloCityEnabled',
          cc.hello_city_feed_enabled
          and public.world_feature_enabled('hello_city_enabled')
          and public.world_layer_enabled('community', city_row.id, null)
      )
      from public.world_city_communities cc
      where cc.city_id = city_row.id and cc.status = 'active'
    ),
    'postJourneyReady', public.world_layer_enabled('journey', city_row.id, null),
    'aiTravelAssistantReady', public.world_layer_enabled('ai', city_row.id, null)
  );
end;
$$;

revoke all on function public.get_world_place_profile(text) from public;
revoke all on function public.get_world_city_profile(text) from public;
grant execute on function public.get_world_place_profile(text)
  to anon, authenticated, service_role;
grant execute on function public.get_world_city_profile(text)
  to anon, authenticated, service_role;

create or replace function public.discover_world_places_v2(
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_destination_city_id uuid default null,
  p_radius_km double precision default 25,
  p_legacy_category text default null,
  p_category_id uuid default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  place_id uuid,
  store_id uuid,
  city_id uuid,
  name text,
  slug text,
  description text,
  category text,
  place_kind text,
  primary_category_slug text,
  address_display text,
  latitude double precision,
  longitude double precision,
  city_name text,
  region_name text,
  country_code text,
  country_name text,
  distance_km double precision,
  verification_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  origin_lat double precision;
  origin_lng double precision;
  radius double precision := greatest(0.1, least(coalesce(p_radius_km, 25), 200));
  result_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
  result_offset integer := greatest(0, least(coalesce(p_offset, 0), 500));
  latitude_delta double precision;
  longitude_delta double precision;
begin
  if not public.world_feature_enabled('world_discovery_enabled') then
    raise exception 'World Discovery is disabled';
  end if;
  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Latitude and longitude must be provided together';
  end if;
  if p_latitude is not null and (
    p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
  ) then
    raise exception 'Invalid discovery coordinates';
  end if;
  if p_legacy_category is not null and p_legacy_category not in (
    'store', 'restaurant', 'hotel', 'clothing', 'cafe',
    'service', 'attraction', 'other'
  ) then
    raise exception 'Unsupported legacy place category';
  end if;

  if p_latitude is not null then
    if not public.world_feature_enabled('nearby_places_enabled') then
      raise exception 'Nearby places are disabled';
    end if;
    origin_lat := p_latitude;
    origin_lng := p_longitude;
  elsif p_destination_city_id is not null then
    select c.center_latitude, c.center_longitude
      into origin_lat, origin_lng
    from public.world_cities c
    where c.id = p_destination_city_id
      and c.is_active
      and c.profile_status = 'published';
    if not found then
      raise exception 'Destination city not found';
    end if;
  else
    raise exception 'Choose a destination or provide one-time location';
  end if;

  latitude_delta := radius / 111.32;
  longitude_delta := radius / (
    111.32 * greatest(abs(cos(radians(origin_lat))), 0.01)
  );

  return query
  select
    p.id,
    p.store_id,
    p.city_id,
    p.name,
    p.slug,
    p.description,
    p.category,
    p.place_kind,
    primary_category.slug,
    p.address_display,
    p.latitude,
    p.longitude,
    c.city_name,
    c.region_name,
    c.country_code,
    c.country_name,
    public.world_distance_km(
      origin_lat, origin_lng, p.latitude, p.longitude
    ),
    p.verification_status
  from public.world_places p
  join public.world_cities c on c.id = p.city_id
  left join lateral (
    select cat.slug
    from public.world_place_category_assignments a
    join public.world_place_categories cat on cat.id = a.category_id
    where a.place_id = p.id and a.is_primary and cat.is_active
    limit 1
  ) primary_category on true
  where public.is_public_world_place(p.id)
    and (p_legacy_category is null or p.category = p_legacy_category)
    and (
      p_category_id is null
      or exists (
        select 1
        from public.world_place_category_assignments a
        where a.place_id = p.id and a.category_id = p_category_id
      )
    )
    and p.latitude between origin_lat - latitude_delta and origin_lat + latitude_delta
    and p.longitude between origin_lng - longitude_delta and origin_lng + longitude_delta
    and public.world_distance_km(
      origin_lat, origin_lng, p.latitude, p.longitude
    ) <= radius
  order by
    public.world_distance_km(origin_lat, origin_lng, p.latitude, p.longitude),
    p.id
  limit result_limit
  offset result_offset;
end;
$$;

revoke all on function public.discover_world_places_v2(
  double precision, double precision, uuid, double precision,
  text, uuid, integer, integer
) from public;
grant execute on function public.discover_world_places_v2(
  double precision, double precision, uuid, double precision,
  text, uuid, integer, integer
) to anon, authenticated, service_role;
revoke execute on function public.discover_world_places(
  double precision, double precision, uuid, double precision, text, integer, integer
) from anon, authenticated;
grant execute on function public.discover_world_places(
  double precision, double precision, uuid, double precision, text, integer, integer
) to service_role;

-- ---------------------------------------------------------------------------
-- 8) Unified World search architecture (no AI search)
-- ---------------------------------------------------------------------------

create index if not exists world_countries_name_trgm_idx
  on public.world_countries using gin (name extensions.gin_trgm_ops);
create index if not exists world_cities_name_trgm_idx
  on public.world_cities using gin (city_name extensions.gin_trgm_ops);
create index if not exists world_places_name_trgm_idx
  on public.world_places using gin (name extensions.gin_trgm_ops);
create index if not exists world_place_categories_name_trgm_idx
  on public.world_place_categories using gin (name extensions.gin_trgm_ops);

create or replace function public.search_world_entities(
  p_query text,
  p_entity_types text[] default null,
  p_city_id uuid default null,
  p_category_id uuid default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  entity_type text,
  entity_id uuid,
  title text,
  subtitle text,
  slug text,
  city_id uuid,
  category_slug text,
  relevance real
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  query_text text := public.normalize_search_query(p_query);
  result_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
  result_offset integer := greatest(0, least(coalesce(p_offset, 0), 500));
  allowed_types constant text[] := array[
    'country', 'city', 'place', 'point_of_interest', 'business',
    'attraction', 'hotel', 'restaurant', 'store', 'local_service', 'category'
  ];
begin
  if not public.world_feature_enabled('world_discovery_enabled') then
    raise exception 'World Discovery is disabled';
  end if;
  if query_text is null or char_length(query_text) not between 2 and 80 then
    raise exception 'World search query must contain 2 to 80 characters';
  end if;
  if p_entity_types is not null and not p_entity_types <@ allowed_types then
    raise exception 'Unsupported World search entity type';
  end if;

  return query
  with candidates as (
    select
      'country'::text as entity_type,
      c.id as entity_id,
      c.name as title,
      c.country_code as subtitle,
      c.slug,
      null::uuid as city_id,
      null::text as category_slug,
      greatest(similarity(lower(c.name), query_text), similarity(c.slug, query_text))::real
        as relevance
    from public.world_countries c
    where c.is_active
      and (p_entity_types is null or 'country' = any(p_entity_types))
      and (lower(c.name) % query_text or c.slug % query_text or lower(c.name) like '%' || query_text || '%')

    union all

    select
      'city'::text,
      c.id,
      c.city_name,
      c.country_name,
      c.slug,
      c.id,
      null::text,
      greatest(similarity(lower(c.city_name), query_text), similarity(c.slug, query_text))::real
    from public.world_cities c
    where c.is_active
      and c.profile_status = 'published'
      and (p_city_id is null or c.id = p_city_id)
      and (p_entity_types is null or 'city' = any(p_entity_types))
      and (lower(c.city_name) % query_text or c.slug % query_text
           or lower(c.city_name) like '%' || query_text || '%')

    union all

    select
      p.place_kind,
      p.id,
      p.name,
      concat_ws(', ', c.city_name, c.country_name),
      p.slug,
      p.city_id,
      primary_category.slug,
      greatest(similarity(lower(p.name), query_text), similarity(p.slug, query_text))::real
    from public.world_places p
    join public.world_cities c on c.id = p.city_id
    left join lateral (
      select cat.slug
      from public.world_place_category_assignments a
      join public.world_place_categories cat on cat.id = a.category_id
      where a.place_id = p.id and a.is_primary and cat.is_active
      limit 1
    ) primary_category on true
    where public.is_public_world_place(p.id)
      and (p_city_id is null or p.city_id = p_city_id)
      and (
        p_category_id is null
        or exists (
          select 1 from public.world_place_category_assignments a
          where a.place_id = p.id and a.category_id = p_category_id
        )
      )
      and (
        p_entity_types is null
        or 'place' = any(p_entity_types)
        or p.place_kind = any(p_entity_types)
      )
      and (lower(p.name) % query_text or p.slug % query_text
           or lower(p.name) like '%' || query_text || '%')

    union all

    select
      'category'::text,
      c.id,
      c.name,
      coalesce(parent.name, 'Place category'),
      c.slug,
      null::uuid,
      c.slug,
      greatest(similarity(lower(c.name), query_text), similarity(c.slug, query_text))::real
    from public.world_place_categories c
    left join public.world_place_categories parent on parent.id = c.parent_id
    where c.is_active
      and (p_entity_types is null or 'category' = any(p_entity_types))
      and (lower(c.name) % query_text or c.slug % query_text
           or lower(c.name) like '%' || query_text || '%')
  )
  select
    x.entity_type,
    x.entity_id,
    x.title,
    x.subtitle,
    x.slug,
    x.city_id,
    x.category_slug,
    x.relevance
  from candidates x
  order by
    (lower(x.title) = query_text) desc,
    (lower(x.title) like query_text || '%') desc,
    x.relevance desc,
    x.title,
    x.entity_id
  limit result_limit
  offset result_offset;
end;
$$;

revoke all on function public.search_world_entities(
  text, text[], uuid, uuid, integer, integer
) from public;
grant execute on function public.search_world_entities(
  text, text[], uuid, uuid, integer, integer
) to anon, authenticated, service_role;

-- Keep global Search's reserved `places` type disabled. Phase 2 exposes a
-- dedicated safe World RPC; global-search UI integration is a later rollout.
