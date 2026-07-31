-- UMTUBA Store — Commission Policy Foundation V1
-- Additive. Durable versioned commission policy registry.
-- Does NOT: payout execution, settlement amount changes, Dashboard/Admin UI,
-- client-trusted percentages, auto-activate policies, or invent merchant share.

-- ---------------------------------------------------------------------------
-- 1) Policy registry (currency-isolated, versioned, effective-dated)
-- ---------------------------------------------------------------------------

create table if not exists public.store_commission_policies (
  id uuid primary key default gen_random_uuid(),
  policy_code text not null
    constraint store_commission_policies_code_len check (
      char_length(btrim(policy_code)) between 1 and 120
      and policy_code = lower(btrim(policy_code))
    ),
  version integer not null
    constraint store_commission_policies_version_positive check (version >= 1),
  status text not null
    constraint store_commission_policies_status_check check (
      status in ('draft', 'active', 'superseded', 'disabled')
    ),
  currency text not null
    constraint store_commission_policies_currency_check check (
      currency = upper(currency)
      and char_length(currency) = 3
    ),
  effective_from timestamptz not null,
  effective_to timestamptz
    constraint store_commission_policies_effective_window check (
      effective_to is null or effective_to > effective_from
    ),
  basis_kind text not null
    constraint store_commission_policies_basis_check check (
      basis_kind in ('merchandise_net', 'grand_total')
    ),
  -- Basis points per party. Null roles mean 0. Sum of non-null must be 10000.
  platform_bps integer not null default 0
    constraint store_commission_policies_platform_bps_check check (
      platform_bps >= 0 and platform_bps <= 10000
    ),
  seller_bps integer not null default 0
    constraint store_commission_policies_seller_bps_check check (
      seller_bps >= 0 and seller_bps <= 10000
    ),
  supplier_bps integer not null default 0
    constraint store_commission_policies_supplier_bps_check check (
      supplier_bps >= 0 and supplier_bps <= 10000
    ),
  affiliate_bps integer not null default 0
    constraint store_commission_policies_affiliate_bps_check check (
      affiliate_bps >= 0 and affiliate_bps <= 10000
    ),
  partner_bps integer not null default 0
    constraint store_commission_policies_partner_bps_check check (
      partner_bps >= 0 and partner_bps <= 10000
    ),
  description text not null default ''
    constraint store_commission_policies_description_len check (
      char_length(description) <= 500
    ),
  metadata jsonb not null default '{}'::jsonb
    constraint store_commission_policies_metadata_object check (
      jsonb_typeof(metadata) = 'object'
    ),
  created_at timestamptz not null default now(),
  constraint store_commission_policies_code_version_uidx unique (policy_code, version),
  constraint store_commission_policies_bps_sum_check check (
    platform_bps + seller_bps + supplier_bps + affiliate_bps + partner_bps = 10000
  ),
  constraint store_commission_policies_platform_seller_required check (
    platform_bps >= 0 and seller_bps >= 0
  )
);

comment on table public.store_commission_policies is
  'Commission Policy Foundation V1 — versioned currency-isolated commission contracts. No active seed; missing policy fails closed.';

create index if not exists store_commission_policies_lookup_idx
  on public.store_commission_policies (currency, status, effective_from desc, version desc);

alter table public.store_commission_policies enable row level security;
alter table public.store_commission_policies force row level security;
revoke all on public.store_commission_policies from public, anon, authenticated;
-- Service role manages policies; authenticated has no client-facing policy shopping.
grant select, insert, update, delete on public.store_commission_policies to service_role;

-- ---------------------------------------------------------------------------
-- 2) Resolve active policy (service_role) — no client money / rates
-- ---------------------------------------------------------------------------

create or replace function public.resolve_store_commission_policy(
  p_currency text,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_currency text;
  v_row public.store_commission_policies%rowtype;
begin
  if p_currency is null or btrim(p_currency) = '' then
    raise exception 'currency is required';
  end if;
  v_currency := upper(btrim(p_currency));
  if char_length(v_currency) <> 3 then
    raise exception 'currency is invalid';
  end if;
  if p_at is null then
    raise exception 'effective-at is required';
  end if;

  select * into v_row
  from public.store_commission_policies p
  where p.status = 'active'
    and p.currency = v_currency
    and p.effective_from <= p_at
    and (p.effective_to is null or p.effective_to > p_at)
  order by p.version desc, p.policy_code asc
  limit 1;

  if not found then
    return jsonb_build_object(
      'found', false,
      'capability', 'commerce.revenue.commission_policy_foundation_v1'
    );
  end if;

  return jsonb_build_object(
    'found', true,
    'policy_code', v_row.policy_code,
    'version', v_row.version,
    'status', v_row.status,
    'currency', v_row.currency,
    'effective_from', v_row.effective_from,
    'effective_to', v_row.effective_to,
    'basis_kind', v_row.basis_kind,
    'platform_bps', v_row.platform_bps,
    'seller_bps', v_row.seller_bps,
    'supplier_bps', v_row.supplier_bps,
    'affiliate_bps', v_row.affiliate_bps,
    'partner_bps', v_row.partner_bps,
    'description', v_row.description,
    'capability', 'commerce.revenue.commission_policy_foundation_v1'
  );
end;
$$;

comment on function public.resolve_store_commission_policy(text, timestamptz) is
  'Commission Policy Foundation V1 — resolve active currency policy at instant. Service-role only.';

revoke all on function public.resolve_store_commission_policy(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.resolve_store_commission_policy(text, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3) Pure split helper (mirrors TS SSOT; service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.compute_store_commission_split(
  p_basis_minor bigint,
  p_platform_bps integer,
  p_seller_bps integer,
  p_supplier_bps integer default 0,
  p_affiliate_bps integer default 0,
  p_partner_bps integer default 0
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_platform bigint;
  v_seller bigint;
  v_supplier bigint;
  v_affiliate bigint;
  v_partner bigint;
  v_allocated bigint;
  v_remainder bigint;
begin
  if p_basis_minor is null or p_basis_minor < 0 then
    raise exception 'basis_minor must be >= 0';
  end if;
  if coalesce(p_platform_bps, -1) < 0
     or coalesce(p_seller_bps, -1) < 0
     or coalesce(p_supplier_bps, -1) < 0
     or coalesce(p_affiliate_bps, -1) < 0
     or coalesce(p_partner_bps, -1) < 0 then
    raise exception 'bps must be >= 0';
  end if;
  if p_platform_bps + p_seller_bps + p_supplier_bps + p_affiliate_bps + p_partner_bps
     <> 10000 then
    raise exception 'bps must sum to 10000';
  end if;

  v_platform := (p_basis_minor * p_platform_bps) / 10000;
  v_seller := (p_basis_minor * p_seller_bps) / 10000;
  v_supplier := (p_basis_minor * p_supplier_bps) / 10000;
  v_affiliate := (p_basis_minor * p_affiliate_bps) / 10000;
  v_partner := (p_basis_minor * p_partner_bps) / 10000;
  v_allocated := v_platform + v_seller + v_supplier + v_affiliate + v_partner;
  v_remainder := p_basis_minor - v_allocated;
  v_seller := v_seller + v_remainder;

  return jsonb_build_object(
    'basis_minor', p_basis_minor,
    'platform_commission_minor', v_platform,
    'seller_amount_minor', v_seller,
    'supplier_amount_minor', v_supplier,
    'affiliate_amount_minor', v_affiliate,
    'partner_amount_minor', v_partner,
    'capability', 'commerce.revenue.commission_policy_foundation_v1'
  );
end;
$$;

comment on function public.compute_store_commission_split(
  bigint, integer, integer, integer, integer, integer
) is
  'Commission Policy Foundation V1 — floor split with remainder to seller. Service-role only.';

revoke all on function public.compute_store_commission_split(
  bigint, integer, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.compute_store_commission_split(
  bigint, integer, integer, integer, integer, integer
) to service_role;

-- No active policy seed: missing policy remains fail-closed / not_configured.
