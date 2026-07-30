-- =============================================================================
-- UMTUBA Commerce — Buyer Digital Access Delivery V1
-- Migration: 20260878_store_digital_access_delivery_v1.sql
-- Local file only — do NOT remote-apply without explicit approval.
-- =============================================================================
-- Smallest additive digital-asset pointer for entitlement-gated delivery.
-- Does not redesign product authoring or catalog media.

create table if not exists public.store_digital_product_assets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  product_id uuid not null references public.store_products (id) on delete cascade,
  storage_path text not null,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  title text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_digital_product_assets_product_uidx unique (product_id),
  constraint store_digital_product_assets_path_uidx unique (store_id, storage_path),
  constraint store_digital_product_assets_path_len_chk
    check (char_length(btrim(storage_path)) between 16 and 512)
);

create index if not exists store_digital_product_assets_store_idx
  on public.store_digital_product_assets (store_id);

comment on table public.store_digital_product_assets is
  'Primary digital deliverable pointer per product. Buyer access is entitlement-gated in app; not a CDN.';

drop trigger if exists store_digital_product_assets_set_updated_at
  on public.store_digital_product_assets;
create trigger store_digital_product_assets_set_updated_at
  before update on public.store_digital_product_assets
  for each row
  execute function public.set_row_updated_at();

alter table public.store_digital_product_assets enable row level security;
alter table public.store_digital_product_assets force row level security;

revoke all on public.store_digital_product_assets
  from public, anon, authenticated;

-- Catalog editors may manage assets for their store products (no public read).
drop policy if exists "Catalog editors manage digital product assets"
  on public.store_digital_product_assets;
create policy "Catalog editors manage digital product assets"
  on public.store_digital_product_assets
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
