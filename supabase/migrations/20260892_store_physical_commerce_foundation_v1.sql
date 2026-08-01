-- =============================================================================
-- UMTUBA Commerce — Physical Commerce Foundation V1
-- Migration: 20260892_store_physical_commerce_foundation_v1.sql
-- Local file only — do NOT remote-apply without explicit Desktop/ops GO.
--
-- Depends on (already in tip lineage):
--   20260728 store product foundation (store_products, product_variants, product_inventory)
--   20260802 marketplace logistics fields (weight_grams, length/width/height_mm, origin_country)
--   20260819 commerce safety inventory reservations
-- Does NOT modify: closed money-wave migrations, Stripe capture, settlement, refund, commission.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Physical product / shipping metadata on store_products
-- ---------------------------------------------------------------------------

alter table public.store_products
  add column if not exists shipping_required boolean;

alter table public.store_products
  add column if not exists inventory_tracked boolean;

alter table public.store_products
  add column if not exists fulfillment_required boolean;

alter table public.store_products
  add column if not exists shippable boolean;

alter table public.store_products
  add column if not exists weight_unit text
    check (weight_unit is null or weight_unit in ('g', 'kg', 'oz', 'lb'));

alter table public.store_products
  add column if not exists dimension_unit text
    check (dimension_unit is null or dimension_unit in ('mm', 'cm', 'in'));

alter table public.store_products
  add column if not exists shipping_class text
    check (
      shipping_class is null
      or shipping_class in ('standard', 'oversized', 'fragile', 'special')
    );

alter table public.store_products
  add column if not exists fragile boolean not null default false;

alter table public.store_products
  add column if not exists special_handling boolean not null default false;

alter table public.store_products
  add column if not exists package_weight_grams integer
    check (package_weight_grams is null or package_weight_grams >= 0);

alter table public.store_products
  add column if not exists package_length_mm integer
    check (package_length_mm is null or package_length_mm >= 0);

alter table public.store_products
  add column if not exists package_width_mm integer
    check (package_width_mm is null or package_width_mm >= 0);

alter table public.store_products
  add column if not exists package_height_mm integer
    check (package_height_mm is null or package_height_mm >= 0);

comment on column public.store_products.shipping_required is
  'Physical Commerce Foundation V1 — when true, order classification requires shipping. Physical launch remains gated.';
comment on column public.store_products.inventory_tracked is
  'Physical Commerce Foundation V1 — when false, availability may use not_tracked semantics.';
comment on column public.store_products.fulfillment_required is
  'Physical Commerce Foundation V1 — physical fulfillment remains separate from digital entitlement.';
comment on column public.store_products.shippable is
  'Physical Commerce Foundation V1 — metadata only; does not enable carriers or live physical capture.';
comment on column public.store_products.package_weight_grams is
  'Shipping package weight metadata (grams). No carrier rate shopping in this foundation.';

-- Sensible defaults for existing physical rows (idempotent backfill).
update public.store_products
set
  shipping_required = coalesce(shipping_required, true),
  inventory_tracked = coalesce(inventory_tracked, true),
  fulfillment_required = coalesce(fulfillment_required, true),
  shippable = coalesce(shippable, true),
  weight_unit = coalesce(weight_unit, 'g'),
  dimension_unit = coalesce(dimension_unit, 'mm')
where product_type = 'physical'
  and (
    shipping_required is null
    or inventory_tracked is null
    or fulfillment_required is null
    or shippable is null
    or weight_unit is null
    or dimension_unit is null
  );

-- Digital / non-physical: shipping/fulfillment off by default when null.
update public.store_products
set
  shipping_required = coalesce(shipping_required, false),
  inventory_tracked = coalesce(inventory_tracked, false),
  fulfillment_required = coalesce(fulfillment_required, false),
  shippable = coalesce(shippable, false)
where product_type is distinct from 'physical'
  and (
    shipping_required is null
    or inventory_tracked is null
    or fulfillment_required is null
    or shippable is null
  );

-- ---------------------------------------------------------------------------
-- 2) Variant barcode + optional physical overrides
-- ---------------------------------------------------------------------------

alter table public.product_variants
  add column if not exists barcode text
    check (
      barcode is null
      or (
        char_length(trim(barcode)) between 4 and 64
        and trim(barcode) ~ '^[A-Za-z0-9][A-Za-z0-9._-]{3,63}$'
      )
    );

alter table public.product_variants
  add column if not exists weight_grams integer
    check (weight_grams is null or weight_grams >= 0);

alter table public.product_variants
  add column if not exists length_mm integer
    check (length_mm is null or length_mm >= 0);

alter table public.product_variants
  add column if not exists width_mm integer
    check (width_mm is null or width_mm >= 0);

alter table public.product_variants
  add column if not exists height_mm integer
    check (height_mm is null or height_mm >= 0);

comment on column public.product_variants.barcode is
  'Optional barcode; unique when present (case-insensitive).';

-- Unique barcode when set (global among variants).
create unique index if not exists product_variants_barcode_uidx
  on public.product_variants (lower(barcode))
  where barcode is not null and btrim(barcode) <> '';

-- ---------------------------------------------------------------------------
-- 3) Inventory low-stock threshold (available remains derived: on_hand - reserved)
-- ---------------------------------------------------------------------------

alter table public.product_inventory
  add column if not exists low_stock_threshold integer not null default 0
    check (low_stock_threshold >= 0);

comment on column public.product_inventory.low_stock_threshold is
  'Physical Commerce Foundation V1 — threshold for low_stock status. available = on_hand - reserved (- safety_stock in TS sellable math).';

-- Keep reserved <= on_hand (already constrained). No stored available column (avoids drift).
