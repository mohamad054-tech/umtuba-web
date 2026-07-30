-- =============================================================================
-- UMTUBA Commerce — Digital Product Versioning & Update Delivery V1
-- Migration: 20260880_store_digital_product_versioning_update_delivery_v1.sql
-- Local file only — do NOT remote-apply without explicit approval.
-- =============================================================================
-- Additive version history + single active pointer per product.
-- Delivery policy V1: always-latest (resolve active version at mint time).
-- Does not pin entitlements; does not redesign grant / mint security model.

create table if not exists public.store_digital_product_asset_versions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  product_id uuid not null references public.store_products (id) on delete cascade,
  storage_path text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'inactive')),
  version_number integer not null
    check (version_number >= 1),
  title text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_digital_product_asset_versions_product_number_uidx
    unique (product_id, version_number),
  constraint store_digital_product_asset_versions_path_uidx
    unique (store_id, storage_path),
  constraint store_digital_product_asset_versions_path_len_chk
    check (char_length(btrim(storage_path)) between 16 and 512)
);

create unique index if not exists store_digital_product_asset_versions_one_active_uidx
  on public.store_digital_product_asset_versions (product_id)
  where status = 'active';

create index if not exists store_digital_product_asset_versions_product_idx
  on public.store_digital_product_asset_versions (product_id, version_number desc);

create index if not exists store_digital_product_asset_versions_store_idx
  on public.store_digital_product_asset_versions (store_id);

comment on table public.store_digital_product_asset_versions is
  'Immutable digital deliverable versions per product. Upload creates draft; activate selects the single active version for always-latest delivery.';

drop trigger if exists store_digital_product_asset_versions_set_updated_at
  on public.store_digital_product_asset_versions;
create trigger store_digital_product_asset_versions_set_updated_at
  before update on public.store_digital_product_asset_versions
  for each row
  execute function public.set_row_updated_at();

alter table public.store_digital_product_asset_versions enable row level security;
alter table public.store_digital_product_asset_versions force row level security;

revoke all on public.store_digital_product_asset_versions
  from public, anon, authenticated;

drop policy if exists "Catalog editors manage digital product asset versions"
  on public.store_digital_product_asset_versions;
create policy "Catalog editors manage digital product asset versions"
  on public.store_digital_product_asset_versions
  for all
  to authenticated
  using (
    public.is_store_member_with_role(
      store_id,
      array['owner', 'manager', 'catalog_editor']
    )
  )
  with check (
    public.is_store_member_with_role(
      store_id,
      array['owner', 'manager', 'catalog_editor']
    )
  );

-- Active pointer on the existing one-row-per-product asset container.
alter table public.store_digital_product_assets
  add column if not exists active_version_id uuid;

-- storage_path / title / status remain denormalized mirrors of the active
-- version only. Nullable path allows draft-only products with no active yet.
alter table public.store_digital_product_assets
  alter column storage_path drop not null;

comment on column public.store_digital_product_assets.active_version_id is
  'FK to the single active digital asset version. Null means fail-closed delivery.';

comment on table public.store_digital_product_assets is
  'Per-product digital asset container with active_version_id pointer. Version history lives in store_digital_product_asset_versions. Not a CDN.';

-- ---------------------------------------------------------------------------
-- Backfill: existing asset rows become version 1 without losing paths.
-- Active rows → active version + pointer. Inactive rows → inactive version,
-- pointer left null (fail closed until seller activates).
-- ---------------------------------------------------------------------------
insert into public.store_digital_product_asset_versions (
  id,
  store_id,
  product_id,
  storage_path,
  status,
  version_number,
  title,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  a.store_id,
  a.product_id,
  a.storage_path,
  case
    when a.status = 'active' then 'active'
    else 'inactive'
  end,
  1,
  a.title,
  a.created_at,
  a.updated_at
from public.store_digital_product_assets a
where a.storage_path is not null
  and char_length(btrim(a.storage_path)) between 16 and 512
  and not exists (
    select 1
    from public.store_digital_product_asset_versions v
    where v.product_id = a.product_id
      and v.version_number = 1
  );

update public.store_digital_product_assets a
set active_version_id = v.id
from public.store_digital_product_asset_versions v
where v.product_id = a.product_id
  and v.store_id = a.store_id
  and v.version_number = 1
  and v.status = 'active'
  and a.active_version_id is null;

alter table public.store_digital_product_assets
  drop constraint if exists store_digital_product_assets_active_version_fk;

alter table public.store_digital_product_assets
  add constraint store_digital_product_assets_active_version_fk
  foreign key (active_version_id)
  references public.store_digital_product_asset_versions (id)
  on delete set null;

create index if not exists store_digital_product_assets_active_version_idx
  on public.store_digital_product_assets (active_version_id);

-- ---------------------------------------------------------------------------
-- Atomic activate: demote previous active, promote target, sync pointer.
-- Fail closed if version missing / wrong store-product / invalid path.
-- service_role only — app authorizes catalog editor first.
-- ---------------------------------------------------------------------------
create or replace function public.activate_store_digital_product_asset_version(
  p_version_id uuid,
  p_product_id uuid,
  p_store_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.store_digital_product_asset_versions%rowtype;
  v_previous_id uuid;
begin
  if p_version_id is null or p_product_id is null or p_store_id is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  select * into v_target
  from public.store_digital_product_asset_versions
  where id = p_version_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'version_missing');
  end if;

  if v_target.product_id is distinct from p_product_id
     or v_target.store_id is distinct from p_store_id then
    return jsonb_build_object('ok', false, 'code', 'version_mismatch');
  end if;

  if v_target.status = 'active' then
    update public.store_digital_product_assets
    set
      active_version_id = v_target.id,
      storage_path = v_target.storage_path,
      title = v_target.title,
      status = 'active',
      updated_at = timezone('utc', now())
    where product_id = p_product_id
      and store_id = p_store_id;

    if not found then
      insert into public.store_digital_product_assets (
        store_id,
        product_id,
        storage_path,
        status,
        title,
        active_version_id
      ) values (
        p_store_id,
        p_product_id,
        v_target.storage_path,
        'active',
        v_target.title,
        v_target.id
      );
    end if;

    return jsonb_build_object(
      'ok', true,
      'code', 'already_active',
      'version_id', v_target.id,
      'version_number', v_target.version_number
    );
  end if;

  select id into v_previous_id
  from public.store_digital_product_asset_versions
  where product_id = p_product_id
    and status = 'active'
    and id is distinct from p_version_id
  for update;

  if v_previous_id is not null then
    update public.store_digital_product_asset_versions
    set status = 'inactive'
    where id = v_previous_id
      and product_id = p_product_id
      and status = 'active';
  end if;

  update public.store_digital_product_asset_versions
  set status = 'active'
  where id = p_version_id
    and product_id = p_product_id
    and store_id = p_store_id
    and status in ('draft', 'inactive');

  if not found then
    return jsonb_build_object('ok', false, 'code', 'activate_failed');
  end if;

  update public.store_digital_product_assets
  set
    active_version_id = p_version_id,
    storage_path = v_target.storage_path,
    title = v_target.title,
    status = 'active',
    updated_at = timezone('utc', now())
  where product_id = p_product_id
    and store_id = p_store_id;

  if not found then
    insert into public.store_digital_product_assets (
      store_id,
      product_id,
      storage_path,
      status,
      title,
      active_version_id
    ) values (
      p_store_id,
      p_product_id,
      v_target.storage_path,
      'active',
      v_target.title,
      p_version_id
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', 'activated',
    'version_id', p_version_id,
    'version_number', v_target.version_number,
    'previous_version_id', v_previous_id
  );
end;
$$;

comment on function public.activate_store_digital_product_asset_version(uuid, uuid, uuid) is
  'Atomically activate one owned digital asset version for a product. Fail closed on mismatch. service_role only.';

revoke all on function public.activate_store_digital_product_asset_version(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.activate_store_digital_product_asset_version(uuid, uuid, uuid)
  to service_role;
