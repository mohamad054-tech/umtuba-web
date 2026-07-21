-- UMTUBA World Discovery & Hello City Foundation V1
-- Additive after 20260821_store_checkout_shipping_fee_ambiguous_code_fix.sql.
-- No provider data is copied or scraped. Business coordinates are owner supplied.
-- Precise user coordinates are accepted only as ephemeral discovery inputs and
-- are never stored by this foundation.

-- ---------------------------------------------------------------------------
-- 1) Database-authoritative feature flags
-- ---------------------------------------------------------------------------

create table if not exists public.world_feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint world_feature_flags_key_check check (
    key in (
      'world_discovery_enabled',
      'nearby_places_enabled',
      'external_directions_enabled',
      'hello_city_enabled',
      'arrival_detection_enabled'
    )
  )
);

insert into public.world_feature_flags (key, enabled, description) values
  ('world_discovery_enabled', false, 'Database-backed World Discovery surface'),
  ('nearby_places_enabled', false, 'Optional one-shot device-location discovery'),
  ('external_directions_enabled', true, 'External provider-neutral directions links'),
  ('hello_city_enabled', false, 'Explicit Hello City publishing and public feed'),
  ('arrival_detection_enabled', false, 'Automatic arrival detection; V1 remains disabled')
on conflict (key) do nothing;

alter table public.world_feature_flags enable row level security;
alter table public.world_feature_flags force row level security;

drop policy if exists "World feature flags are readable" on public.world_feature_flags;
create policy "World feature flags are readable"
  on public.world_feature_flags for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.world_feature_flags from anon, authenticated;
grant select on public.world_feature_flags to anon, authenticated, service_role;

create table if not exists public.world_feature_flag_events (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null,
  old_enabled boolean,
  new_enabled boolean not null,
  actor_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists world_feature_flag_events_created_idx
  on public.world_feature_flag_events (created_at desc);

alter table public.world_feature_flag_events enable row level security;
alter table public.world_feature_flag_events force row level security;

drop policy if exists "Platform admins read world flag audit" on public.world_feature_flag_events;
create policy "Platform admins read world flag audit"
  on public.world_feature_flag_events for select
  to authenticated
  using (public.is_platform_admin());

revoke insert, update, delete on public.world_feature_flag_events from anon, authenticated;
grant select on public.world_feature_flag_events to authenticated, service_role;

create or replace function public.world_feature_enabled(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select f.enabled from public.world_feature_flags f where f.key = p_key),
    false
  );
$$;

revoke all on function public.world_feature_enabled(text) from public;
grant execute on function public.world_feature_enabled(text)
  to anon, authenticated, service_role;

create or replace function public.admin_set_world_feature_flag(
  p_key text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
  old_value boolean;
begin
  admin_id := public.require_platform_admin();
  if p_key is null or p_enabled is null then
    raise exception 'Feature key and enabled state are required';
  end if;
  if p_key not in (
    'world_discovery_enabled',
    'nearby_places_enabled',
    'external_directions_enabled',
    'hello_city_enabled',
    'arrival_detection_enabled'
  ) then
    raise exception 'Unsupported world feature flag';
  end if;

  select enabled into old_value
  from public.world_feature_flags
  where key = p_key
  for update;

  if not found then
    raise exception 'World feature flag not found';
  end if;

  update public.world_feature_flags
  set enabled = p_enabled,
      updated_by = admin_id,
      updated_at = timezone('utc', now())
  where key = p_key;

  insert into public.world_feature_flag_events (
    flag_key, old_enabled, new_enabled, actor_id
  ) values (
    p_key, old_value, p_enabled, admin_id
  );

  return jsonb_build_object('key', p_key, 'enabled', p_enabled);
end;
$$;

revoke all on function public.admin_set_world_feature_flag(text, boolean)
  from public, anon;
grant execute on function public.admin_set_world_feature_flag(text, boolean)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Small curated city and business-place model
-- ---------------------------------------------------------------------------

create table if not exists public.world_cities (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  country_name text not null check (char_length(btrim(country_name)) between 2 and 120),
  region_name text,
  city_name text not null check (char_length(btrim(city_name)) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$'),
  center_latitude double precision not null
    check (center_latitude between -90 and 90),
  center_longitude double precision not null
    check (center_longitude between -180 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint world_cities_slug_unique unique (slug),
  constraint world_cities_name_unique unique (country_code, region_name, city_name)
);

create index if not exists world_cities_country_city_idx
  on public.world_cities (country_code, city_name);

drop trigger if exists world_cities_set_updated_at on public.world_cities;
create trigger world_cities_set_updated_at
  before update on public.world_cities
  for each row execute function public.set_row_updated_at();

alter table public.world_cities enable row level security;
alter table public.world_cities force row level security;

-- Public path must not call is_platform_admin() (anon has no EXECUTE on it).
drop policy if exists "Active world cities are public" on public.world_cities;
create policy "Active world cities are public"
  on public.world_cities for select
  to anon, authenticated
  using (is_active);

drop policy if exists "Platform admins read all world cities" on public.world_cities;
create policy "Platform admins read all world cities"
  on public.world_cities for select
  to authenticated
  using (public.is_platform_admin());

revoke insert, update, delete on public.world_cities from anon, authenticated;
grant select on public.world_cities to anon, authenticated, service_role;

create table if not exists public.world_places (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  store_id uuid references public.stores (id) on delete set null,
  city_id uuid not null references public.world_cities (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 160),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$'),
  description text check (description is null or char_length(description) <= 2000),
  category text not null check (
    category in (
      'store', 'restaurant', 'hotel', 'clothing', 'cafe',
      'service', 'attraction', 'other'
    )
  ),
  address_display text check (
    address_display is null or char_length(btrim(address_display)) between 2 and 300
  ),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location_visibility text not null default 'private'
    check (location_visibility in ('private', 'public')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected', 'suspended')),
  source_type text not null default 'business_owner'
    check (source_type in ('business_owner', 'store', 'platform')),
  provider_name text,
  provider_place_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint world_places_slug_unique unique (slug),
  constraint world_places_provider_pair_check check (
    (provider_name is null) = (provider_place_id is null)
  )
);

create index if not exists world_places_public_filter_idx
  on public.world_places (moderation_status, location_visibility, category, city_id);
create index if not exists world_places_coordinates_idx
  on public.world_places (latitude, longitude);
create index if not exists world_places_owner_idx
  on public.world_places (owner_user_id, created_at desc);
create index if not exists world_places_store_idx
  on public.world_places (store_id)
  where store_id is not null;
create unique index if not exists world_places_provider_identity_uidx
  on public.world_places (provider_name, provider_place_id)
  where provider_name is not null and provider_place_id is not null;

drop trigger if exists world_places_set_updated_at on public.world_places;
create trigger world_places_set_updated_at
  before update on public.world_places
  for each row execute function public.set_row_updated_at();

alter table public.world_places enable row level security;
alter table public.world_places force row level security;

drop policy if exists "Owners and admins read world places" on public.world_places;
create policy "Owners and admins read world places"
  on public.world_places for select
  to authenticated
  using (
    owner_user_id = (select auth.uid())
    or public.is_platform_admin()
    or (
      store_id is not null
      and public.is_store_member_with_role(
        store_id,
        array['owner', 'manager', 'catalog_editor', 'viewer']
      )
    )
  );

drop policy if exists "Business owners create world places" on public.world_places;
create policy "Business owners create world places"
  on public.world_places for insert
  to authenticated
  with check (
    owner_user_id = (select auth.uid())
    and (
      store_id is null
      or public.is_store_member_with_role(
        store_id,
        array['owner', 'manager', 'catalog_editor']
      )
    )
  );

drop policy if exists "Business owners update world places" on public.world_places;
create policy "Business owners update world places"
  on public.world_places for update
  to authenticated
  using (
    owner_user_id = (select auth.uid())
    or (
      store_id is not null
      and public.is_store_member_with_role(
        store_id,
        array['owner', 'manager', 'catalog_editor']
      )
    )
    or public.is_platform_admin()
  )
  with check (
    owner_user_id = (select auth.uid())
    or (
      store_id is not null
      and public.is_store_member_with_role(
        store_id,
        array['owner', 'manager', 'catalog_editor']
      )
    )
    or public.is_platform_admin()
  );

revoke delete on public.world_places from anon, authenticated;
revoke insert, update on public.world_places from anon;
grant select, insert, update on public.world_places to authenticated, service_role;

create or replace function public.protect_world_place_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_admin boolean := public.is_platform_admin();
begin
  if is_admin then
    return new;
  end if;
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if tg_op = 'INSERT' then
    new.owner_user_id := uid;
    new.moderation_status := 'pending';
    new.verification_status := 'unverified';
    if new.source_type = 'platform' then
      new.source_type := case when new.store_id is null then 'business_owner' else 'store' end;
    end if;
  else
    new.owner_user_id := old.owner_user_id;
    new.moderation_status := old.moderation_status;
    new.verification_status := old.verification_status;
    new.source_type := old.source_type;
    new.provider_name := old.provider_name;
    new.provider_place_id := old.provider_place_id;
  end if;
  return new;
end;
$$;

drop trigger if exists world_places_protect_authority on public.world_places;
create trigger world_places_protect_authority
  before insert or update on public.world_places
  for each row execute function public.protect_world_place_authority();

revoke all on function public.protect_world_place_authority()
  from public, anon, authenticated;

-- Haversine distance; inputs are ephemeral and are not persisted.
create or replace function public.world_distance_km(
  p_lat_a double precision,
  p_lng_a double precision,
  p_lat_b double precision,
  p_lng_b double precision
)
returns double precision
language sql
immutable
set search_path = public
as $$
  select 6371.0088 * 2 * asin(
    sqrt(
      power(sin(radians(p_lat_b - p_lat_a) / 2), 2)
      + cos(radians(p_lat_a)) * cos(radians(p_lat_b))
      * power(sin(radians(p_lng_b - p_lng_a) / 2), 2)
    )
  );
$$;

revoke all on function public.world_distance_km(
  double precision, double precision, double precision, double precision
) from public;

create or replace function public.discover_world_places(
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_destination_city_id uuid default null,
  p_radius_km double precision default 25,
  p_category text default null,
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
  if p_category is not null and p_category not in (
    'store', 'restaurant', 'hotel', 'clothing', 'cafe',
    'service', 'attraction', 'other'
  ) then
    raise exception 'Unsupported place category';
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
      and c.is_active;
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
    p.address_display,
    p.latitude,
    p.longitude,
    c.city_name,
    c.region_name,
    c.country_code,
    c.country_name,
    public.world_distance_km(origin_lat, origin_lng, p.latitude, p.longitude),
    p.verification_status
  from public.world_places p
  join public.world_cities c on c.id = p.city_id
  where p.location_visibility = 'public'
    and p.moderation_status = 'approved'
    and p.verification_status = 'verified'
    and c.is_active
    and (p_category is null or p.category = p_category)
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

revoke all on function public.discover_world_places(
  double precision, double precision, uuid, double precision, text, integer, integer
) from public;
grant execute on function public.discover_world_places(
  double precision, double precision, uuid, double precision, text, integer, integer
) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Hello City (disabled by DB flag; explicit publishing only)
-- ---------------------------------------------------------------------------

create table if not exists public.user_location_safety (
  user_id uuid primary key references auth.users (id) on delete cascade,
  minor_or_age_unverified boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_location_safety enable row level security;
alter table public.user_location_safety force row level security;

drop policy if exists "Users read own location safety" on public.user_location_safety;
create policy "Users read own location safety"
  on public.user_location_safety for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_platform_admin());

revoke insert, update, delete on public.user_location_safety from anon, authenticated;
grant select on public.user_location_safety to authenticated, service_role;

create table if not exists public.hello_city_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  city_id uuid not null references public.world_cities (id) on delete restrict,
  arrival_city_id uuid references public.world_cities (id) on delete set null,
  city_name text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  message_text text not null check (char_length(btrim(message_text)) between 1 and 500),
  audience_scope text not null default 'followers'
    check (audience_scope in ('city', 'country', 'followers', 'local_community')),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected', 'suspended')),
  comments_enabled boolean not null default false,
  private_messages_allowed boolean not null default false,
  explicitly_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  constraint hello_city_posts_expiry_check check (
    expires_at > created_at
    and expires_at <= created_at + interval '7 days'
  )
);

create index if not exists hello_city_posts_public_feed_idx
  on public.hello_city_posts (city_id, moderation_status, expires_at desc);
create index if not exists hello_city_posts_author_rate_idx
  on public.hello_city_posts (author_id, created_at desc);

alter table public.hello_city_posts enable row level security;
alter table public.hello_city_posts force row level security;

drop policy if exists "Authors and admins read Hello City drafts" on public.hello_city_posts;
create policy "Authors and admins read Hello City drafts"
  on public.hello_city_posts for select
  to authenticated
  using (author_id = (select auth.uid()) or public.is_platform_admin());

revoke insert, update, delete on public.hello_city_posts from anon, authenticated;
grant select on public.hello_city_posts to authenticated, service_role;

create table if not exists public.hello_city_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.hello_city_posts (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint hello_city_reports_reporter_unique unique (post_id, reporter_id)
);

alter table public.hello_city_reports enable row level security;
alter table public.hello_city_reports force row level security;

drop policy if exists "Users report Hello City posts" on public.hello_city_reports;
create policy "Users report Hello City posts"
  on public.hello_city_reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

drop policy if exists "Admins read Hello City reports" on public.hello_city_reports;
create policy "Admins read Hello City reports"
  on public.hello_city_reports for select
  to authenticated
  using (public.is_platform_admin());

revoke update, delete on public.hello_city_reports from anon, authenticated;
revoke insert on public.hello_city_reports from anon;
grant select, insert on public.hello_city_reports to authenticated, service_role;

create or replace function public.publish_hello_city_post(
  p_city_id uuid,
  p_arrival_city_id uuid,
  p_message_text text,
  p_audience_scope text default 'followers',
  p_expires_in_hours integer default 24,
  p_comments_enabled boolean default false,
  p_private_messages_allowed boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  city_row public.world_cities%rowtype;
  is_protected boolean := true;
  safe_audience text;
  post_id uuid;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if not public.world_feature_enabled('hello_city_enabled') then
    raise exception 'Hello City is disabled';
  end if;
  if public.world_feature_enabled('arrival_detection_enabled') then
    -- V1 never publishes automatically even if a future operator toggles this.
    null;
  end if;
  if nullif(btrim(coalesce(p_message_text, '')), '') is null then
    raise exception 'Message is required';
  end if;
  if char_length(btrim(p_message_text)) > 500 then
    raise exception 'Message is too long';
  end if;
  if p_audience_scope not in ('city', 'country', 'followers', 'local_community') then
    raise exception 'Unsupported audience';
  end if;
  if coalesce(p_expires_in_hours, 24) not between 1 and 168 then
    raise exception 'Expiration must be between 1 and 168 hours';
  end if;
  if exists (
    select 1 from public.hello_city_posts h
    where h.author_id = uid
      and h.created_at > timezone('utc', now()) - interval '1 hour'
  ) then
    raise exception 'Hello City publishing rate limit reached';
  end if;

  select * into city_row
  from public.world_cities
  where id = p_city_id and is_active;
  if not found then
    raise exception 'City not found';
  end if;
  if p_arrival_city_id is not null and not exists (
    select 1 from public.world_cities
    where id = p_arrival_city_id and is_active
  ) then
    raise exception 'Arrival city not found';
  end if;

  insert into public.user_location_safety (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  select minor_or_age_unverified into is_protected
  from public.user_location_safety
  where user_id = uid;

  safe_audience := case when is_protected then 'followers' else p_audience_scope end;

  insert into public.hello_city_posts (
    author_id,
    city_id,
    arrival_city_id,
    city_name,
    country_code,
    message_text,
    audience_scope,
    moderation_status,
    comments_enabled,
    private_messages_allowed,
    explicitly_published,
    expires_at
  ) values (
    uid,
    city_row.id,
    p_arrival_city_id,
    city_row.city_name,
    city_row.country_code,
    btrim(p_message_text),
    safe_audience,
    'pending',
    case when is_protected then false else coalesce(p_comments_enabled, false) end,
    case when is_protected then false else coalesce(p_private_messages_allowed, false) end,
    true,
    timezone('utc', now()) + make_interval(hours => coalesce(p_expires_in_hours, 24))
  )
  returning id into post_id;

  return post_id;
end;
$$;

revoke all on function public.publish_hello_city_post(
  uuid, uuid, text, text, integer, boolean, boolean
) from public, anon;
grant execute on function public.publish_hello_city_post(
  uuid, uuid, text, text, integer, boolean, boolean
) to authenticated, service_role;

create or replace function public.list_public_hello_city_posts(
  p_city_id uuid,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  post_id uuid,
  author_id uuid,
  city_id uuid,
  city_name text,
  country_code text,
  message_text text,
  audience_scope text,
  comments_enabled boolean,
  private_messages_allowed boolean,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.world_feature_enabled('hello_city_enabled') then
    raise exception 'Hello City is disabled';
  end if;

  return query
  select
    h.id,
    h.author_id,
    h.city_id,
    h.city_name,
    h.country_code,
    h.message_text,
    h.audience_scope,
    h.comments_enabled,
    h.private_messages_allowed,
    h.created_at,
    h.expires_at
  from public.hello_city_posts h
  where h.city_id = p_city_id
    and h.moderation_status = 'approved'
    and h.explicitly_published
    and h.expires_at > timezone('utc', now())
    and h.audience_scope in ('city', 'country', 'local_community')
  order by h.created_at desc, h.id
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, least(coalesce(p_offset, 0), 500));
end;
$$;

revoke all on function public.list_public_hello_city_posts(uuid, integer, integer)
  from public;
grant execute on function public.list_public_hello_city_posts(uuid, integer, integer)
  to anon, authenticated, service_role;
