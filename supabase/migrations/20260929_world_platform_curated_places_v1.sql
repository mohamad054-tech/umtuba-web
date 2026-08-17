-- UMTUBA World — PLATFORM_CURATED_PLACE ownership V1
-- Additive after 20260827_world_discovery_security_hardening_v1.sql.
-- Idempotent. Backward compatible. No fake auth.users. No nearby flag change.
-- Apply via: supabase db query --linked --file (not supabase db push).
--
-- MODEL
-- - User-owned places keep a real owner_user_id and curated_by='owner'.
-- - Platform-curated places use curated_by='platform', source_type='platform',
--   required provenance, and optional owner_user_id (null for catalog ingest).
-- - Draft/published remains profile_status. Rollback = unpublish, not DROP.
-- - Regular users cannot self-assign platform ownership or invent a catalog person.

-- ---------------------------------------------------------------------------
-- 1) Ownership + provenance columns
-- ---------------------------------------------------------------------------

alter table public.world_places
  alter column owner_user_id drop not null;

alter table public.world_places
  add column if not exists curated_by text not null default 'owner';

alter table public.world_places
  add column if not exists provenance_kind text;

alter table public.world_places
  add column if not exists provenance_source text;

alter table public.world_places
  add column if not exists provenance_citation text;

alter table public.world_places
  drop constraint if exists world_places_curated_by_check;

alter table public.world_places
  add constraint world_places_curated_by_check
  check (curated_by in ('owner', 'platform'));

alter table public.world_places
  drop constraint if exists world_places_provenance_kind_check;

alter table public.world_places
  add constraint world_places_provenance_kind_check
  check (
    provenance_kind is null
    or provenance_kind in ('umtuba_project_evidence', 'public_geographic_fact')
  );

alter table public.world_places
  drop constraint if exists world_places_provenance_source_check;

alter table public.world_places
  add constraint world_places_provenance_source_check
  check (
    provenance_source is null
    or char_length(btrim(provenance_source)) between 2 and 500
  );

alter table public.world_places
  drop constraint if exists world_places_provenance_citation_check;

alter table public.world_places
  add constraint world_places_provenance_citation_check
  check (
    provenance_citation is null
    or char_length(btrim(provenance_citation)) between 2 and 2000
  );

alter table public.world_places
  drop constraint if exists world_places_owner_or_platform_check;

alter table public.world_places
  add constraint world_places_owner_or_platform_check
  check (
    (
      curated_by = 'owner'
      and owner_user_id is not null
    )
    or (
      curated_by = 'platform'
      and source_type = 'platform'
      and provenance_kind is not null
      and provenance_source is not null
      and provenance_citation is not null
    )
  );

comment on column public.world_places.curated_by is
  'owner = real user-owned place; platform = UMTUBA-curated catalog entry. No fake person.';
comment on column public.world_places.owner_user_id is
  'Required for curated_by=owner. Optional for curated_by=platform. Never invent auth.users.';
comment on column public.world_places.provenance_kind is
  'Required for platform-curated places. User-owned provenance is optional.';
comment on column public.world_places.provenance_source is
  'Required for platform-curated places. Wikipedia/public-fact URL or project evidence path.';
comment on column public.world_places.provenance_citation is
  'Required for platform-curated places. Retrieval date and public-fact citation.';

create index if not exists world_places_curated_by_idx
  on public.world_places (curated_by, profile_status, city_id);

-- ---------------------------------------------------------------------------
-- 2) Authority trigger — GUC/service ingest for platform rows only
-- ---------------------------------------------------------------------------

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
  is_catalog_ingest boolean :=
    coalesce(current_setting('umtuba.world_catalog_ingest', true), '') = 'on';
begin
  if is_admin or is_service then
    return new;
  end if;

  if is_catalog_ingest then
    if tg_op = 'INSERT' then
      if new.curated_by is distinct from 'platform'
         or new.source_type is distinct from 'platform'
         or new.owner_user_id is not null then
        raise exception
          'Catalog ingest may only insert platform-curated places with a null owner';
      end if;
      new.owner_user_id := null;
      new.curated_by := 'platform';
      new.source_type := 'platform';
      if new.provenance_kind is null
         or new.provenance_source is null
         or new.provenance_citation is null then
        raise exception 'Platform-curated places require provenance';
      end if;
      if new.profile_status is null then
        new.profile_status := 'draft';
      end if;
      if new.moderation_status is null then
        new.moderation_status := 'pending';
      end if;
      if new.verification_status is null then
        new.verification_status := 'unverified';
      end if;
      return new;
    end if;

    if old.curated_by is distinct from 'platform' then
      raise exception 'Catalog ingest cannot mutate owner-curated places';
    end if;
    new.owner_user_id := old.owner_user_id;
    new.curated_by := 'platform';
    new.source_type := 'platform';
    if new.provenance_kind is null then
      new.provenance_kind := old.provenance_kind;
    end if;
    if new.provenance_source is null then
      new.provenance_source := old.provenance_source;
    end if;
    if new.provenance_citation is null then
      new.provenance_citation := old.provenance_citation;
    end if;
    return new;
  end if;

  if uid is null then
    raise exception 'Authentication required';
  end if;

  if tg_op = 'INSERT' then
    new.owner_user_id := uid;
    new.curated_by := 'owner';
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
    new.curated_by := old.curated_by;
    new.source_type := old.source_type;
    new.provider_name := old.provider_name;
    new.provider_place_id := old.provider_place_id;
    new.provenance_kind := old.provenance_kind;
    new.provenance_source := old.provenance_source;
    new.provenance_citation := old.provenance_citation;
    if old.curated_by = 'platform' and old.owner_user_id is distinct from uid then
      raise exception 'Only the optional owner or an admin may edit a platform place';
    end if;
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

drop trigger if exists world_places_protect_authority on public.world_places;
create trigger world_places_protect_authority
  before insert or update on public.world_places
  for each row execute function public.protect_world_place_authority();

revoke all on function public.protect_world_place_authority()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) RLS — public read of published places; users cannot mint platform rows
-- ---------------------------------------------------------------------------

drop policy if exists "Published world places are public" on public.world_places;
create policy "Published world places are public"
  on public.world_places for select
  to anon, authenticated
  using (public.is_public_world_place(id));

drop policy if exists "Business owners create world places" on public.world_places;
create policy "Business owners create world places"
  on public.world_places for insert
  to authenticated
  with check (
    owner_user_id = (select auth.uid())
    and curated_by = 'owner'
    and source_type is distinct from 'platform'
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
    (
      curated_by = 'owner'
      and owner_user_id = (select auth.uid())
    )
    or (
      curated_by = 'platform'
      and owner_user_id is not null
      and owner_user_id = (select auth.uid())
    )
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
    (
      curated_by = 'owner'
      and owner_user_id = (select auth.uid())
      and source_type is distinct from 'platform'
    )
    or (
      curated_by = 'platform'
      and source_type = 'platform'
      and owner_user_id is not null
      and owner_user_id = (select auth.uid())
    )
    or (
      store_id is not null
      and public.is_store_member_with_role(
        store_id,
        array['owner', 'manager', 'catalog_editor']
      )
    )
    or public.is_platform_admin()
  );

grant select on public.world_places to anon, authenticated, service_role;

-- nearby_places_enabled is intentionally untouched and remains OFF.
