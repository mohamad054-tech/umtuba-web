-- =============================================================================
-- UMTUBA Store remote E2E sandbox — read-only verify
-- Namespace: UMTUBA_E2E_20260721
-- Returns: check_name, ok, detail
-- Does not mutate data. Does not require auth.users inserts.
-- =============================================================================

with
params as (
  select
    'UMTUBA_E2E_20260721'::text as ns,
    'e2e02107-2026-4001-8000-000000000001'::uuid as store_id,
    'e2e02107-2026-4001-8000-000000000002'::uuid as app_id,
    'E2E20260721'::text as coupon_code
),
gate as (
  select public.store_commerce_config_value('commerce_confirm_enabled', 0) as gate_val
),
store_row as (
  select s.*
  from public.stores s
  cross join params p
  where s.id = p.store_id
),
products as (
  select count(*)::int as cnt
  from public.store_products sp
  cross join params p
  where sp.store_id = p.store_id
    and sp.title like '%' || p.ns || '%'
    and sp.status = 'active'
    and sp.moderation_status = 'approved'
),
variants as (
  select count(*)::int as cnt
  from public.product_variants pv
  where pv.sku like 'UMTUBA_E2E_20260721-%'
    and pv.status = 'active'
),
prices as (
  select count(*)::int as cnt
  from public.product_prices pp
  join public.product_variants pv on pv.id = pp.variant_id
  where pv.sku like 'UMTUBA_E2E_20260721-%'
    and pp.status = 'active'
    and pp.currency = 'USD'
),
inventory as (
  select
    count(*)::int as cnt,
    coalesce(bool_and(pi.reserved = 0), false) as all_reserved_zero,
    coalesce(sum(pi.on_hand), 0)::int as on_hand_sum
  from public.product_inventory pi
  join public.product_variants pv on pv.id = pi.variant_id
  where pv.sku like 'UMTUBA_E2E_20260721-%'
),
shipping as (
  select count(*)::int as cnt
  from public.store_shipping_methods m
  cross join params p
  where m.store_id = p.store_id
    and m.id in (
      'e2e02107-2026-4001-8000-000000000031'::uuid,
      'e2e02107-2026-4001-8000-000000000032'::uuid
    )
    and m.is_active
),
coupon as (
  select count(*)::int as cnt
  from public.store_coupons c
  cross join params p
  where c.id = 'e2e02107-2026-4001-8000-000000000041'::uuid
    and c.store_id = p.store_id
    and c.code = p.coupon_code
    and c.status = 'active'
    and c.discount_type = 'percent'
    and c.percent_bps = 1000
),
app_row as (
  select count(*)::int as cnt
  from public.seller_applications a
  cross join params p
  where a.id = p.app_id
    and a.status = 'approved'
    and a.store_id = p.store_id
)
select * from (
  select
    'commerce_confirm_enabled_is_0'::text as check_name,
    (select gate_val = 0 from gate) as ok,
    format('commerce_confirm_enabled=%s', (select gate_val from gate)) as detail
  union all
  select
    'sandbox_store_present',
    exists(select 1 from store_row),
    case
      when exists(select 1 from store_row)
        then format('store id=%s slug=%s status=%s verified=%s',
          (select id from store_row),
          (select slug from store_row),
          (select status from store_row),
          (select verification_status from store_row))
      else 'missing sandbox store e2e02107-2026-4001-8000-000000000001'
    end
  union all
  select
    'seller_application_approved',
    (select cnt = 1 from app_row),
    format('approved application count=%s', (select cnt from app_row))
  union all
  select
    'products_namespace_count_3',
    (select cnt = 3 from products),
    format('active+approved products with namespace title=%s (expected 3)', (select cnt from products))
  union all
  select
    'variants_sku_marker_count_4',
    (select cnt = 4 from variants),
    format('active variants with SKU marker=%s (expected 4)', (select cnt from variants))
  union all
  select
    'prices_usd_active_ge_4',
    (select cnt >= 4 from prices),
    format('active USD prices on marker variants=%s (expected >=4)', (select cnt from prices))
  union all
  select
    'inventory_rows_4_reserved_0',
    (select cnt = 4 and all_reserved_zero from inventory),
    format(
      'inventory rows=%s reserved_all_zero=%s on_hand_sum=%s (expected rows=4 reserved=0 on_hand=202)',
      (select cnt from inventory),
      (select all_reserved_zero from inventory),
      (select on_hand_sum from inventory)
    )
  union all
  select
    'shipping_methods_2',
    (select cnt = 2 from shipping),
    format('active fixed shipping methods=%s (expected 2: standard+pickup)', (select cnt from shipping))
  union all
  select
    'coupon_e2e20260721',
    (select cnt = 1 from coupon),
    format('store-scoped 10%% coupon rows=%s', (select cnt from coupon))
  union all
  select
    'no_auth_users_insert_required',
    true,
    'Verify script is read-only; seed must abort ACCOUNT_BLOCKER unless Auth users already exist. Never INSERT INTO auth.users.'
) checks
order by check_name;
