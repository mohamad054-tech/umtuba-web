-- UMTUBA World Discovery — Security Hardening V1
-- Additive after 20260826_world_discovery_domain_phase2.sql.
-- Idempotent: safe to re-run (drop policy/trigger if exists, create or replace).
-- No new tables. No data is scraped/copied. No feature flags are enabled here.

-- ---------------------------------------------------------------------------
-- 1) Split public vs admin RLS — anon must never evaluate is_platform_admin()
-- ---------------------------------------------------------------------------
-- Postgres does not guarantee left-to-right short-circuit evaluation of OR
-- inside a USING clause. A policy granted to anon that inlines
-- `<predicate> or public.is_platform_admin()` can attempt to evaluate
-- is_platform_admin() while running as anon, which has no EXECUTE grant on
-- that function (by design — see 20260806_ads_admin_review_foundation_v1.sql)
-- and raises "permission denied for function is_platform_admin" for rows
-- that fail the first predicate.
--
-- Fix: every public/anon visibility policy below drops the inline
-- `or public.is_platform_admin()` bypass. Where the table already has a
-- separate authenticated-only "manage" (for all) policy driven by
-- is_platform_admin(), that policy already satisfies the admin bypass for
-- SELECT (permissive policies are OR'd per role/command) and no further
-- policy is required. Where no such policy existed, a dedicated
-- authenticated-only admin read policy is added. is_platform_admin() is
-- NEVER granted EXECUTE to anon and this migration does not change that.

drop policy if exists "Active world countries are public" on public.world_countries;
create policy "Active world countries are public"
  on public.world_countries for select to anon, authenticated
  using (is_active);
-- Admin bypass already covered by "Platform admins manage world countries" (for all).

drop policy if exists "Active world regions are public" on public.world_regions;
create policy "Active world regions are public"
  on public.world_regions for select to anon, authenticated
  using (is_active);
-- Admin bypass already covered by "Platform admins manage world regions" (for all).

drop policy if exists "Active world districts are public" on public.world_districts;
create policy "Active world districts are public"
  on public.world_districts for select to anon, authenticated
  using (is_active);
-- Admin bypass already covered by "Platform admins manage world districts" (for all).

-- Supersedes both the Foundation V1 and Phase 2 definitions of this policy
-- (same policy name; this is the final authoritative version).
drop policy if exists "Active world cities are public" on public.world_cities;
create policy "Active world cities are public"
  on public.world_cities for select to anon, authenticated
  using (is_active and profile_status = 'published');
-- Admin bypass already covered by "Platform admins manage world cities" (for all).

drop policy if exists "Active world place categories are public"
  on public.world_place_categories;
create policy "Active world place categories are public"
  on public.world_place_categories for select to anon, authenticated
  using (is_active);
-- Admin bypass already covered by "Platform admins manage world place categories" (for all).

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
-- Admin bypass already covered by "Platform admins manage world city layers" (for all).

drop policy if exists "Active city communities are public"
  on public.world_city_communities;
create policy "Active city communities are public"
  on public.world_city_communities for select to anon, authenticated
  using (status = 'active');
-- Admin bypass already covered by "Platform admins manage city communities" (for all).

-- world_layers keeps its single `using (true)` public SELECT policy: it has
-- no admin-only rows and never calls is_platform_admin() in the anon path.
-- Nothing to change here.

drop policy if exists "Approved world place reviews are public" on public.world_place_reviews;
create policy "Approved world place reviews are public"
  on public.world_place_reviews for select to anon, authenticated
  using (
    (moderation_status = 'approved' and public.is_public_world_place(place_id))
    or author_id = auth.uid()
  );
drop policy if exists "Platform admins read all world place reviews"
  on public.world_place_reviews;
create policy "Platform admins read all world place reviews"
  on public.world_place_reviews for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "Published world AI summaries are public"
  on public.world_place_ai_summaries;
create policy "Published world AI summaries are public"
  on public.world_place_ai_summaries for select to anon, authenticated
  using (status = 'published' and public.is_public_world_place(place_id));
-- Admin bypass already covered by "Platform admins manage world AI summaries" (for all).

drop policy if exists "Public world journeys are visible" on public.world_journeys;
create policy "Public world journeys are visible"
  on public.world_journeys for select to anon, authenticated
  using (
    (visibility = 'public' and status = 'published' and moderation_status = 'approved')
    or owner_user_id = auth.uid()
  );
-- Admin bypass already covered by "Users manage own world journeys" (for all).

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
      )
  ));
-- Admin bypass already covered by "Journey owners manage stops" (for all).

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
      )
  ));
-- Admin bypass already covered by "Journey owners manage linked posts" (for all).

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
  );
drop policy if exists "Platform admins read world local events"
  on public.world_local_events;
create policy "Platform admins read world local events"
  on public.world_local_events for select to authenticated
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 2) Restricted place layers — managers may not self-grant platform-only keys
-- ---------------------------------------------------------------------------

create or replace function public.world_place_manager_layer_keys()
returns text[]
language sql
immutable
set search_path = public
as $$
  select array['discovery', 'media', 'commerce', 'journey', 'live'];
$$;

create or replace function public.world_platform_only_layer_keys()
returns text[]
language sql
immutable
set search_path = public
as $$
  select array['community', 'events', 'ai'];
$$;

revoke all on function public.world_place_manager_layer_keys() from public;
revoke all on function public.world_platform_only_layer_keys() from public;
grant execute on function public.world_place_manager_layer_keys()
  to anon, authenticated, service_role;
grant execute on function public.world_platform_only_layer_keys()
  to anon, authenticated, service_role;

create or replace function public.protect_world_place_layer_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean := public.is_platform_admin();
  is_service boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if is_admin or is_service then
    return new;
  end if;

  if not public.can_manage_world_place(new.place_id) then
    raise exception 'Place management permission required';
  end if;

  if new.layer_key = any(public.world_platform_only_layer_keys()) then
    raise exception
      'Layer "%" is platform-managed and cannot be configured by place managers',
      new.layer_key;
  end if;

  if not (new.layer_key = any(public.world_place_manager_layer_keys())) then
    raise exception 'Unsupported World place layer key: %', new.layer_key;
  end if;

  return new;
end;
$$;

drop trigger if exists world_place_layers_protect_authority on public.world_place_layers;
create trigger world_place_layers_protect_authority
  before insert or update on public.world_place_layers
  for each row execute function public.protect_world_place_layer_authority();

revoke all on function public.protect_world_place_layer_authority()
  from public, anon, authenticated;

-- RLS remains a coarse can_manage_world_place() gate; the trigger above is
-- the authoritative enforcement of which layer_key values a non-admin,
-- non-service actor may write. USING/WITH CHECK are intentionally left
-- unchanged so managers can still see/remove their own layer rows.
drop policy if exists "World place managers configure layers" on public.world_place_layers;
create policy "World place managers configure layers"
  on public.world_place_layers for all to authenticated
  using (public.can_manage_world_place(place_id))
  with check (public.can_manage_world_place(place_id));

-- ---------------------------------------------------------------------------
-- 3) profile_status compatibility backfill
-- ---------------------------------------------------------------------------
-- Phase 2 added `profile_status` with a `draft` default to world_cities and
-- world_places. Rows created under Foundation V1 (before profile_status
-- existed) already satisfied the Foundation V1 public-visibility rules and
-- must not silently disappear from public discovery just because Phase 2
-- introduced an extra publication gate. This one-time backfill restores
-- publication for records that already met the Foundation V1 public
-- contract. New rows keep the `draft` default and require explicit review
-- via admin_review_world_city / admin_review_world_place.

update public.world_cities
set profile_status = 'published',
    updated_at = timezone('utc', now())
where is_active
  and profile_status = 'draft';

update public.world_places
set profile_status = 'published',
    updated_at = timezone('utc', now())
where location_visibility = 'public'
  and moderation_status = 'approved'
  and verification_status = 'verified'
  and profile_status = 'draft';

-- ---------------------------------------------------------------------------
-- 4) Content link ownership — a place manager may not link arbitrary content
-- ---------------------------------------------------------------------------

create or replace function public.can_link_world_post(p_post_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role'
    or public.is_platform_admin()
    or exists (
      select 1 from public.posts p
      where p.id = p_post_id and p.user_id = auth.uid()
    );
$$;

create or replace function public.can_link_world_live_room(p_live_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role'
    or public.is_platform_admin()
    or exists (
      select 1 from public.live_rooms r
      where r.id = p_live_room_id and r.host_id = auth.uid()
    );
$$;

revoke all on function public.can_link_world_post(bigint) from public;
revoke all on function public.can_link_world_live_room(uuid) from public;
grant execute on function public.can_link_world_post(bigint)
  to authenticated, service_role;
grant execute on function public.can_link_world_live_room(uuid)
  to authenticated, service_role;

create or replace function public.protect_world_place_post_link_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean := public.is_platform_admin();
  is_service boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if is_admin or is_service then
    return new;
  end if;
  if not public.can_manage_world_place(new.place_id) then
    raise exception 'Place management permission required to link this place';
  end if;
  if not public.can_link_world_post(new.post_id) then
    raise exception 'Post ownership required to link this post';
  end if;
  return new;
end;
$$;

drop trigger if exists world_place_post_links_protect_authority
  on public.world_place_post_links;
create trigger world_place_post_links_protect_authority
  before insert or update on public.world_place_post_links
  for each row execute function public.protect_world_place_post_link_authority();

revoke all on function public.protect_world_place_post_link_authority()
  from public, anon, authenticated;

create or replace function public.protect_world_place_live_link_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean := public.is_platform_admin();
  is_service boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if is_admin or is_service then
    return new;
  end if;
  if not public.can_manage_world_place(new.place_id) then
    raise exception 'Place management permission required to link this place';
  end if;
  if not public.can_link_world_live_room(new.live_room_id) then
    raise exception 'Live room host permission required to link this room';
  end if;
  return new;
end;
$$;

drop trigger if exists world_place_live_links_protect_authority
  on public.world_place_live_links;
create trigger world_place_live_links_protect_authority
  before insert or update on public.world_place_live_links
  for each row execute function public.protect_world_place_live_link_authority();

revoke all on function public.protect_world_place_live_link_authority()
  from public, anon, authenticated;

create or replace function public.protect_world_journey_post_link_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean := public.is_platform_admin();
  is_service boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if is_admin or is_service then
    return new;
  end if;
  if not exists (
    select 1 from public.world_journeys j
    where j.id = new.journey_id and j.owner_user_id = auth.uid()
  ) then
    raise exception 'Journey ownership required to link this journey';
  end if;
  if not public.can_link_world_post(new.post_id) then
    raise exception 'Post ownership required to link this post';
  end if;
  return new;
end;
$$;

drop trigger if exists world_journey_posts_protect_authority
  on public.world_journey_posts;
create trigger world_journey_posts_protect_authority
  before insert or update on public.world_journey_posts
  for each row execute function public.protect_world_journey_post_link_authority();

revoke all on function public.protect_world_journey_post_link_authority()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Place media private bucket (mirrors store-product-media)
-- ---------------------------------------------------------------------------
-- PRIVATE bucket: no getPublicUrl; app mints short-lived signed URLs after
-- authZ. Path convention: places/{place_id}/{uuid}.{ext}.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'world-place-media',
  'world-place-media',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "World place managers upload place media" on storage.objects;
drop policy if exists "World place managers update place media objects" on storage.objects;
drop policy if exists "World place managers delete place media objects" on storage.objects;
drop policy if exists "World place managers read own place media objects" on storage.objects;
drop policy if exists "Public may select approved world place media" on storage.objects;
drop policy if exists "Platform admins read world place media objects" on storage.objects;

create policy "World place managers upload place media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'world-place-media'
    and (storage.foldername(name))[1] = 'places'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_manage_world_place(((storage.foldername(name))[2])::uuid)
  );

create policy "World place managers update place media objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'world-place-media'
    and (storage.foldername(name))[1] = 'places'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_manage_world_place(((storage.foldername(name))[2])::uuid)
  )
  with check (
    bucket_id = 'world-place-media'
    and (storage.foldername(name))[1] = 'places'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_manage_world_place(((storage.foldername(name))[2])::uuid)
  );

create policy "World place managers delete place media objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'world-place-media'
    and (storage.foldername(name))[1] = 'places'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_manage_world_place(((storage.foldername(name))[2])::uuid)
  );

create policy "World place managers read own place media objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'world-place-media'
    and (storage.foldername(name))[1] = 'places'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_manage_world_place(((storage.foldername(name))[2])::uuid)
  );

-- SELECT only for approved media on a fully public place (enables signed
-- URL minting). Draft / pending / rejected media are NOT readable here.
create policy "Public may select approved world place media"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'world-place-media'
    and exists (
      select 1
      from public.world_place_media m
      where m.storage_bucket = 'world-place-media'
        and m.storage_path = name
        and m.moderation_status = 'approved'
        and public.is_public_world_place(m.place_id)
    )
  );

create policy "Platform admins read world place media objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'world-place-media'
    and public.is_platform_admin()
  );

-- Force the authoritative bucket/path shape regardless of client input, and
-- reject path traversal, in addition to the existing manage-permission gate.
create or replace function public.protect_world_place_media_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean := public.is_platform_admin();
  is_service boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if not public.can_manage_world_place(new.place_id) then
    raise exception 'Place management permission required';
  end if;

  if tg_op = 'UPDATE' and not is_admin and not is_service then
    new.place_id := old.place_id;
    new.moderation_status := old.moderation_status;
  elsif tg_op = 'INSERT' and not is_admin and not is_service then
    new.moderation_status := 'pending';
  end if;

  new.storage_bucket := 'world-place-media';

  if new.storage_path ~ '(^|/)\.\.(/|$)'
     or new.storage_path !~ ('^places/' || new.place_id::text || '/[A-Za-z0-9_.-]+$') then
    raise exception 'World place media path must match places/%/{file}', new.place_id;
  end if;

  return new;
end;
$$;

-- Trigger already exists from Phase 2 (world_place_media_protect_authority);
-- re-create it to be certain it targets the function above after replace.
drop trigger if exists world_place_media_protect_authority on public.world_place_media;
create trigger world_place_media_protect_authority
  before insert or update on public.world_place_media
  for each row execute function public.protect_world_place_media_authority();

revoke all on function public.protect_world_place_media_authority()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Cross-entity integrity triggers on world_places
-- ---------------------------------------------------------------------------

create or replace function public.protect_world_place_district()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.district_id is not null and not exists (
    select 1 from public.world_districts d
    where d.id = new.district_id and d.city_id = new.city_id
  ) then
    raise exception 'World place district must belong to the same city';
  end if;
  return new;
end;
$$;

drop trigger if exists world_places_protect_district on public.world_places;
create trigger world_places_protect_district
  before insert or update on public.world_places
  for each row execute function public.protect_world_place_district();

revoke all on function public.protect_world_place_district()
  from public, anon, authenticated;

create or replace function public.protect_world_place_cover_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cover_media_id is not null and not exists (
    select 1 from public.world_place_media m
    where m.id = new.cover_media_id and m.place_id = new.id
  ) then
    raise exception 'World place cover media must belong to the same place';
  end if;
  return new;
end;
$$;

drop trigger if exists world_places_protect_cover_media on public.world_places;
create trigger world_places_protect_cover_media
  before insert or update on public.world_places
  for each row execute function public.protect_world_place_cover_media();

revoke all on function public.protect_world_place_cover_media()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7) Hello City author protection
-- ---------------------------------------------------------------------------
-- publish_hello_city_post() already sets author_id = auth.uid() and direct
-- INSERT/UPDATE/DELETE are revoked from anon/authenticated on this table, but
-- this trigger closes the gap for any future direct writer (admin tooling,
-- service_role automation) so a non-admin actor can never author-spoof.

create or replace function public.protect_hello_city_post_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean := public.is_platform_admin();
  is_service boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if tg_op = 'INSERT' then
    if not is_admin and not is_service then
      new.author_id := auth.uid();
    end if;
    if new.author_id is null then
      raise exception 'Hello City post author is required';
    end if;
  else
    if not is_admin and not is_service then
      new.author_id := old.author_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists hello_city_posts_protect_authority on public.hello_city_posts;
create trigger hello_city_posts_protect_authority
  before insert or update on public.hello_city_posts
  for each row execute function public.protect_hello_city_post_authority();

revoke all on function public.protect_hello_city_post_authority()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8) Audited admin actor safety
-- ---------------------------------------------------------------------------
-- require_platform_admin() may legitimately return a null uid when called by
-- service_role without a JWT subject. That is fine for ordinary automation,
-- but every *audited* World admin RPC below writes an actor_id into an
-- append-only audit trail (world_feature_flag_events / world_moderation_events)
-- and a null actor there would be meaningless and unauditable. These RPCs
-- now require a real authenticated platform admin session, even when called
-- with the service_role key. require_platform_admin() itself is unchanged
-- and still performs the platform_admins privilege check when a uid is present.

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
  if admin_id is null then
    raise exception 'Audited World admin actions require an authenticated platform admin actor';
  end if;
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
  if admin_id is null then
    raise exception 'Audited World admin actions require an authenticated platform admin actor';
  end if;
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
  if admin_id is null then
    raise exception 'Audited World admin actions require an authenticated platform admin actor';
  end if;
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
  if admin_id is null then
    raise exception 'Audited World admin actions require an authenticated platform admin actor';
  end if;
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

-- Signatures are unchanged from Phase 2, so previously granted EXECUTE
-- privileges on these four functions remain intact after CREATE OR REPLACE.

-- ---------------------------------------------------------------------------
-- 9) world_place_links URL scheme: https, tel, mailto only (never http)
-- ---------------------------------------------------------------------------
-- Replace the inline `url ~ '^https://'` CHECK with a trigger so the scheme
-- allow-list can include tel:/mailto: for contact links without giving up
-- CHECK-level length validation. The inline check's auto-generated name is
-- not assumed; it is located dynamically and dropped.

do $$
declare
  con record;
begin
  for con in
    select conname
    from pg_constraint
    where conrelid = 'public.world_place_links'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%url%https%'
  loop
    execute format('alter table public.world_place_links drop constraint %I', con.conname);
  end loop;
end;
$$;

alter table public.world_place_links
  drop constraint if exists world_place_links_url_length_check;
alter table public.world_place_links
  add constraint world_place_links_url_length_check
  check (char_length(url) between 10 and 1000);

create or replace function public.sanitize_world_place_link_url()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.url is null then
    raise exception 'World place link URL is required';
  end if;
  if new.url ~ '^https://' or new.url ~ '^tel:' or new.url ~ '^mailto:' then
    return new;
  end if;
  raise exception 'World place link URL must use https, tel, or mailto';
end;
$$;

drop trigger if exists world_place_links_sanitize_url on public.world_place_links;
create trigger world_place_links_sanitize_url
  before insert or update on public.world_place_links
  for each row execute function public.sanitize_world_place_link_url();

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------
-- - is_platform_admin() EXECUTE remains granted only to authenticated and
--   service_role; anon is never granted EXECUTE on it (unchanged by design).
-- - Helper functions used inside anon-facing visibility policies
--   (is_public_world_place, can_manage_world_place, world_layer_enabled)
--   already have EXECUTE granted to anon and are untouched by this migration.
