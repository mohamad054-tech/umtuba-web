-- =============================================================================
-- UMTUBA Commerce — Commission Policy Activation V1
-- Migration: 20260887_store_commission_policy_activation_v1.sql
-- Capability: commerce.revenue.commission_policy_activation_v1
-- Local file only — do NOT remote-apply without explicit approval.
-- =============================================================================
-- Seeds safe default ACTIVE commission policies for UEOS fiat_minor currencies
-- (USD, EUR, ILS, JOD, SAR, AED, EGP). Does NOT invent currencies.
-- Idempotent: skips currency when any active policy already exists.
-- Never overwrites / updates an existing active row.
-- Does NOT: Stripe, payout rails, wallet mutations, settlement amount changes.

-- ---------------------------------------------------------------------------
-- 1) Guard: at most one distinct active policy_code per currency
--    (multiple versions of the SAME code remain allowed for resolve-by-version)
-- ---------------------------------------------------------------------------

create or replace function public.store_commission_assert_no_conflicting_active()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_other_code text;
begin
  if new.status is distinct from 'active' then
    return new;
  end if;

  select p.policy_code into v_other_code
  from public.store_commission_policies p
  where p.status = 'active'
    and p.currency = new.currency
    and p.policy_code is distinct from new.policy_code
    and p.id is distinct from new.id
  limit 1;

  if found then
    raise exception
      'Conflicting active commission policy for currency %: existing code % vs %',
      new.currency, v_other_code, new.policy_code;
  end if;

  return new;
end;
$$;

drop trigger if exists store_commission_policies_no_conflict_active
  on public.store_commission_policies;
create trigger store_commission_policies_no_conflict_active
  before insert or update on public.store_commission_policies
  for each row
  execute function public.store_commission_assert_no_conflicting_active();

comment on function public.store_commission_assert_no_conflicting_active() is
  'Commission Policy Activation V1 — reject a second distinct active policy_code for the same currency.';

-- ---------------------------------------------------------------------------
-- 2) Idempotent launch seed helper
-- ---------------------------------------------------------------------------

create or replace function public.store_commission_activate_launch_policy_v1(
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_currency text;
  v_exists boolean;
  v_id uuid;
begin
  if p_currency is null or btrim(p_currency) = '' then
    raise exception 'currency is required';
  end if;
  v_currency := upper(btrim(p_currency));
  if char_length(v_currency) <> 3 then
    raise exception 'currency is invalid';
  end if;

  -- Only seed currencies that exist as active fiat_minor in UEOS ledger.
  if not exists (
    select 1
    from public.ueos_assets a
    where a.code = v_currency
      and a.kind = 'fiat_minor'
      and a.lifecycle_status = 'active'
  ) then
    raise exception 'currency % is not an active UEOS fiat_minor asset', v_currency;
  end if;

  select exists (
    select 1
    from public.store_commission_policies p
    where p.status = 'active'
      and p.currency = v_currency
  ) into v_exists;

  if v_exists then
    return jsonb_build_object(
      'ok', true,
      'inserted', false,
      'skipped', true,
      'reason', 'active_policy_already_present',
      'currency', v_currency,
      'capability', 'commerce.revenue.commission_policy_activation_v1'
    );
  end if;

  insert into public.store_commission_policies (
    policy_code,
    version,
    status,
    currency,
    effective_from,
    effective_to,
    basis_kind,
    platform_bps,
    seller_bps,
    supplier_bps,
    affiliate_bps,
    partner_bps,
    description,
    metadata
  )
  values (
    'store.launch.commission.v1',
    1,
    'active',
    v_currency,
    timestamptz '2026-01-01 00:00:00+00',
    null,
    'merchandise_net',
    1000,  -- platform 10%
    8500,  -- seller 85%
    500,   -- supplier 5%
    0,
    0,
    'Launch default commission activation V1 (platform 10% / seller 85% / supplier 5%).',
    jsonb_build_object(
      'capability', 'commerce.revenue.commission_policy_activation_v1',
      'seed', 'launch_v1'
    )
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'inserted', true,
    'skipped', false,
    'id', v_id,
    'currency', v_currency,
    'policy_code', 'store.launch.commission.v1',
    'version', 1,
    'capability', 'commerce.revenue.commission_policy_activation_v1'
  );
end;
$$;

comment on function public.store_commission_activate_launch_policy_v1(text) is
  'Commission Policy Activation V1 — idempotent active launch seed per currency; skips when active exists.';

revoke all on function public.store_commission_activate_launch_policy_v1(text)
  from public, anon, authenticated;
grant execute on function public.store_commission_activate_launch_policy_v1(text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3) Apply launch seeds for UEOS fiat_minor actives
-- ---------------------------------------------------------------------------

select public.store_commission_activate_launch_policy_v1('USD');
select public.store_commission_activate_launch_policy_v1('EUR');
select public.store_commission_activate_launch_policy_v1('ILS');
select public.store_commission_activate_launch_policy_v1('JOD');
select public.store_commission_activate_launch_policy_v1('SAR');
select public.store_commission_activate_launch_policy_v1('AED');
select public.store_commission_activate_launch_policy_v1('EGP');
