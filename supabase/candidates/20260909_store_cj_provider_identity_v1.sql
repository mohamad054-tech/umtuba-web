-- CANDIDATE ONLY — DO NOT APPLY TO PRODUCTION.
-- UMTUBA_STORE_CJ_59_PRODUCTION_READINESS_V1
-- Adds server-side CJ identity / sync columns. Economics stay off public listing queries.
-- Apply only after owner GO and a rotated CJ_API_KEY.

alter table public.store_products
  add column if not exists provider text,
  add column if not exists provider_product_id text,
  add column if not exists provider_variant_id text,
  add column if not exists provider_sku text,
  add column if not exists launch_classification text,
  add column if not exists sync_status text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists estimated_delivery_text text,
  add column if not exists provider_available boolean;

alter table public.store_products
  drop constraint if exists store_products_provider_check;
alter table public.store_products
  add constraint store_products_provider_check
  check (provider is null or provider in ('cj', 'owned'));

alter table public.store_products
  drop constraint if exists store_products_sync_status_check;
alter table public.store_products
  add constraint store_products_sync_status_check
  check (
    sync_status is null
    or sync_status in (
      'HEALTHY',
      'PRICE_REVIEW',
      'OUT_OF_STOCK',
      'PROVIDER_UNAVAILABLE',
      'SYNC_ERROR'
    )
  );

create unique index if not exists store_products_cj_provider_uidx
  on public.store_products (provider, provider_product_id)
  where provider is not null and provider_product_id is not null;

comment on column public.store_products.provider is
  'Optional dropship provider. Customer listing must not expose this.';
comment on column public.store_products.sync_status is
  'Admin/internal sync classification. Never render on customer cards.';
