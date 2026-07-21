-- =============================================================================
-- UMTUBA Store remote E2E — Gate-OFF checks (read-only + safe RPC probes)
-- Namespace: UMTUBA_E2E_20260721
--
-- Safe to run without buyer JWT for catalog/gate assertions.
-- Authenticated quote/confirm MUST be run separately with a buyer session
-- (JWT). This script does not call confirm-order paths that require buyer auth.
--
-- Payment note: simulation path is provider='none' + method_kind='deferred'
-- only (map DEFERRED_TEST label → none/deferred). No DEFERRED_TEST enum exists.
-- =============================================================================

with
params as (
  select
    'UMTUBA_E2E_20260721'::text as ns,
    'e2e02107-2026-4001-8000-000000000001'::uuid as store_id
),
gate as (
  select
    public.store_commerce_confirm_enabled() as confirm_on,
    public.store_commerce_config_value('commerce_confirm_enabled', 0) as gate_val
),
catalog as (
  select
    exists(
      select 1 from public.stores s
      cross join params p
      where s.id = p.store_id and s.status = 'active'
    ) as store_ok,
    (
      select count(*)::int
      from public.store_products sp
      cross join params p
      where sp.store_id = p.store_id
        and sp.title like '%' || p.ns || '%'
        and sp.status = 'active'
        and sp.moderation_status = 'approved'
    ) as product_cnt,
    (
      select count(*)::int
      from public.product_variants pv
      where pv.sku like 'UMTUBA_E2E_20260721-%'
        and pv.status = 'active'
    ) as variant_cnt
)
-- Static assertions (SEED_REQUIRED / gate off)
select * from (
  select
    'gate_off_commerce_confirm_enabled'::text as check_name,
    (select gate_val = 0 and confirm_on = false from gate) as ok,
    format(
      'commerce_confirm_enabled=%s store_commerce_confirm_enabled=%s',
      (select gate_val from gate),
      (select confirm_on from gate)
    ) as detail
  union all
  select
    'sandbox_catalog_or_seed_required',
    (select store_ok and product_cnt = 3 and variant_cnt = 4 from catalog),
    case
      when (select store_ok and product_cnt = 3 and variant_cnt = 4 from catalog)
        then format(
          'sandbox catalog ok store=%s products=%s variants=%s',
          (select store_id from params),
          (select product_cnt from catalog),
          (select variant_cnt from catalog)
        )
      else format(
        'SEED_REQUIRED: sandbox catalog incomplete (store_ok=%s products=%s variants=%s). Run seed-store-sandbox.sql after config.local.sql.',
        (select store_ok from catalog),
        (select product_cnt from catalog),
        (select variant_cnt from catalog)
      )
    end
  union all
  select
    'buyer_jwt_quote_confirm_out_of_band',
    true,
    'Authenticated create_checkout_quote / confirm must be exercised with buyer JWT in a separate session. This Gate-OFF script does not require buyer JWT.'
  union all
  select
    'payment_path_deferred_none_documented',
    true,
    'DEFERRED_TEST label maps to payment_attempts.provider=none + method_kind=deferred only. cash_on_delivery provider exists but confirm path uses deferred/none — not a real COD PSP.'
) checks
order by check_name;

-- Probe: assert_store_commerce_confirm_allowed() must FAIL when gate is OFF.
-- Callable as service_role (or DEFINER sibling). Catch exception and report.
do $$
declare
  v_ok boolean := false;
  v_detail text;
begin
  if public.store_commerce_confirm_enabled() then
    raise exception 'GATE_ON: refuse Gate-OFF probe while commerce confirm is enabled';
  end if;

  begin
    perform public.assert_store_commerce_confirm_allowed();
    v_ok := false;
    v_detail := 'assert_store_commerce_confirm_allowed unexpectedly succeeded while gate OFF';
  exception when others then
    v_ok := (SQLERRM ilike '%Commerce confirmation is disabled%');
    v_detail := format('assert failed as expected (ok=%s): %s', v_ok, SQLERRM);
  end;

  raise notice 'check_name=assert_confirm_blocked_when_gate_off ok=% detail=%', v_ok, v_detail;

  if not v_ok then
    raise exception '%', v_detail;
  end if;
end;
$$;
