-- =============================================================================
-- UMTUBA Commerce — Commission Decomposition Bridge Apply V1
-- Migration: 20260890_store_commission_decomposition_bridge_apply_v1.sql
-- Local file only — do NOT remote-apply without explicit approval.
--
-- Persists authoritative commission decomposition after trusted capture +
-- settlement allocate. Reuses Commission Policy Foundation roles/rounding.
-- Does NOT alter settlement posting amounts or enable payout execution.
-- =============================================================================

create table if not exists public.store_commission_decomposition_events (
  event_key text primary key,
  payment_attempt_id uuid not null references public.payment_attempts (id),
  capture_event_id uuid not null references public.store_payment_outcome_events (id),
  order_id uuid not null references public.orders (id),
  store_id uuid not null references public.stores (id),
  seller_user_id uuid references auth.users (id),
  correlation_id text not null,
  lifecycle_status text not null
    check (lifecycle_status in ('applied', 'not_configured', 'superseded_by_refund')),
  policy_status text not null
    check (policy_status in ('applied', 'not_configured')),
  policy_code text,
  policy_version integer,
  basis_kind text
    check (basis_kind is null or basis_kind in ('merchandise_net', 'grand_total')),
  basis_minor bigint,
  capture_amount_minor bigint not null check (capture_amount_minor > 0),
  currency text not null
    check (currency = upper(currency) and char_length(currency) = 3),
  platform_commission_minor bigint,
  seller_amount_minor bigint,
  supplier_amount_minor bigint,
  affiliate_amount_minor bigint,
  partner_amount_minor bigint,
  calculation_fingerprint text,
  lines jsonb not null default '[]'::jsonb
    check (jsonb_typeof(lines) = 'array'),
  order_items_snapshot jsonb not null default '[]'::jsonb
    check (jsonb_typeof(order_items_snapshot) = 'array'),
  supplier_store_ids uuid[] not null default '{}'::uuid[],
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  superseded_at timestamptz,
  constraint store_commission_decomposition_attempt_uidx unique (payment_attempt_id),
  constraint store_commission_decomposition_capture_uidx unique (capture_event_id),
  constraint store_commission_decomposition_applied_shape check (
    (
      policy_status = 'not_configured'
      and policy_code is null
      and policy_version is null
      and basis_kind is null
      and basis_minor is null
      and platform_commission_minor is null
      and seller_amount_minor is null
      and supplier_amount_minor is null
      and affiliate_amount_minor is null
      and partner_amount_minor is null
      and calculation_fingerprint is null
    )
    or (
      policy_status = 'applied'
      and policy_code is not null
      and policy_version is not null
      and basis_kind is not null
      and basis_minor is not null
      and basis_minor >= 0
      and platform_commission_minor is not null
      and seller_amount_minor is not null
      and supplier_amount_minor is not null
      and affiliate_amount_minor is not null
      and partner_amount_minor is not null
      and calculation_fingerprint is not null
      and (
        platform_commission_minor
        + seller_amount_minor
        + supplier_amount_minor
        + affiliate_amount_minor
        + partner_amount_minor
      ) = basis_minor
    )
  )
);

create index if not exists store_commission_decomposition_events_order_idx
  on public.store_commission_decomposition_events (order_id);
create index if not exists store_commission_decomposition_events_store_idx
  on public.store_commission_decomposition_events (store_id, created_at desc);

comment on table public.store_commission_decomposition_events is
  'Commission Decomposition Bridge Apply V1 — immutable applied/not_configured commission ledger per trusted capture. Historical rows are not deleted.';

alter table public.store_commission_decomposition_events enable row level security;
alter table public.store_commission_decomposition_events force row level security;

revoke all on public.store_commission_decomposition_events
  from public, anon, authenticated;
grant select on public.store_commission_decomposition_events to service_role;

-- ---------------------------------------------------------------------------
-- Apply after trusted capture (service_role)
-- ---------------------------------------------------------------------------

create or replace function public.apply_store_commission_decomposition_after_capture(
  p_payment_attempt_id uuid,
  p_event_key text,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_key text := nullif(btrim(coalesce(p_event_key, '')), '');
  v_correlation_id text := nullif(btrim(coalesce(p_correlation_id, '')), '');
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_capture public.store_payment_outcome_events%rowtype;
  v_existing public.store_commission_decomposition_events%rowtype;
  v_policy jsonb;
  v_split jsonb;
  v_basis_minor bigint;
  v_platform bigint;
  v_seller bigint;
  v_supplier bigint;
  v_affiliate bigint;
  v_partner bigint;
  v_seller_user_id uuid;
  v_supplier_ids uuid[] := '{}'::uuid[];
  v_items jsonb := '[]'::jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_fingerprint text;
  v_supplier_bps integer;
  v_has_supplier boolean := false;
begin
  if p_payment_attempt_id is null then
    raise exception 'payment_attempt_id is required';
  end if;
  if v_event_key is null
     or char_length(v_event_key) < 8
     or char_length(v_event_key) > 160 then
    raise exception 'event_key must be 8..160 characters';
  end if;
  if v_correlation_id is null
     or char_length(v_correlation_id) < 8
     or char_length(v_correlation_id) > 128 then
    raise exception 'correlation_id must be 8..128 characters';
  end if;

  perform pg_advisory_xact_lock(
    ('x' || substr(md5('store_commission_apply:' || v_event_key), 1, 16))::bit(64)::bigint
  );

  select * into v_existing
  from public.store_commission_decomposition_events
  where event_key = v_event_key
  for share;
  if found then
    if v_existing.payment_attempt_id is distinct from p_payment_attempt_id
       or v_existing.correlation_id is distinct from v_correlation_id then
      raise exception
        'idempotency conflict for commission decomposition event_key %',
        v_event_key;
    end if;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'policy_status', v_existing.policy_status,
      'lifecycle_status', v_existing.lifecycle_status,
      'order_id', v_existing.order_id,
      'payment_attempt_id', v_existing.payment_attempt_id,
      'capture_event_id', v_existing.capture_event_id,
      'store_id', v_existing.store_id,
      'policy_code', v_existing.policy_code,
      'policy_version', v_existing.policy_version,
      'basis_kind', v_existing.basis_kind,
      'basis_minor', v_existing.basis_minor,
      'capture_amount_minor', v_existing.capture_amount_minor,
      'currency', v_existing.currency,
      'platform_commission_minor', v_existing.platform_commission_minor,
      'seller_amount_minor', v_existing.seller_amount_minor,
      'supplier_amount_minor', v_existing.supplier_amount_minor,
      'affiliate_amount_minor', v_existing.affiliate_amount_minor,
      'partner_amount_minor', v_existing.partner_amount_minor,
      'calculation_fingerprint', v_existing.calculation_fingerprint
    );
  end if;

  -- One decomposition per payment attempt / capture (fail closed on key mismatch).
  if exists (
    select 1 from public.store_commission_decomposition_events e
    where e.payment_attempt_id = p_payment_attempt_id
  ) then
    raise exception
      'commission decomposition already exists for payment_attempt_id %',
      p_payment_attempt_id;
  end if;

  select * into v_attempt
  from public.payment_attempts
  where id = p_payment_attempt_id
  for update;
  if not found then
    raise exception 'payment attempt not found';
  end if;

  select * into v_order
  from public.orders
  where id = v_attempt.order_id
  for update;
  if not found then
    raise exception 'order not found';
  end if;

  if v_attempt.buyer_id is distinct from v_order.buyer_id then
    raise exception 'payment attempt buyer diverges from order buyer';
  end if;
  if v_attempt.status is distinct from 'captured' then
    raise exception 'commission decomposition requires payment_attempt.status=captured';
  end if;
  if v_order.payment_status is distinct from 'paid' then
    raise exception 'commission decomposition requires order payment_status=paid';
  end if;
  if v_order.status in ('cancelled', 'refunded') then
    raise exception 'commission decomposition blocked for closed orders';
  end if;
  if v_attempt.currency is distinct from v_order.currency then
    raise exception 'payment attempt currency diverges from order currency';
  end if;
  if v_attempt.amount_minor is distinct from v_order.grand_total_minor then
    raise exception 'payment attempt amount diverges from order grand_total';
  end if;

  select * into v_capture
  from public.store_payment_outcome_events e
  where e.payment_attempt_id = v_attempt.id
    and e.outcome = 'captured'
  order by e.created_at asc
  limit 1
  for share;
  if not found then
    raise exception 'commission decomposition requires a trusted capture outcome event';
  end if;
  if v_capture.order_id is distinct from v_order.id then
    raise exception 'capture order diverges from locked order';
  end if;
  if v_capture.correlation_id is distinct from v_correlation_id then
    raise exception
      'commission decomposition correlation_id must match capture correlation_id';
  end if;
  if v_capture.amount_minor is distinct from v_attempt.amount_minor
     or v_capture.currency is distinct from v_attempt.currency then
    raise exception 'capture amount/currency diverges from payment attempt';
  end if;

  -- Fail closed: allocate must already exist for this capture.
  if not exists (
    select 1
    from public.store_settlement_events s
    where s.capture_event_id = v_capture.id
      and s.action = 'allocate'
  ) then
    raise exception
      'commission decomposition requires prior settlement allocate for capture';
  end if;

  select oi.seller_user_id into v_seller_user_id
  from public.order_items oi
  where oi.order_id = v_order.id
  order by oi.created_at asc, oi.id asc
  limit 1;

  if v_seller_user_id is null then
    raise exception 'commission decomposition requires order items with seller_user_id';
  end if;

  if exists (
    select 1 from public.order_items oi
    where oi.order_id = v_order.id
      and oi.seller_user_id is distinct from v_seller_user_id
  ) then
    raise exception 'order item seller_user_id linkage is inconsistent';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'order_item_id', oi.id,
        'product_id', oi.product_id,
        'seller_user_id', oi.seller_user_id,
        'supplier_store_id', oi.supplier_store_id,
        'marketplace_source_type', oi.marketplace_source_type,
        'line_total_minor', oi.line_total_minor,
        'quantity', oi.quantity
      )
      order by oi.created_at asc, oi.id asc
    ),
    '[]'::jsonb
  )
  into v_items
  from public.order_items oi
  where oi.order_id = v_order.id;

  select coalesce(array_agg(distinct oi.supplier_store_id)
    filter (where oi.supplier_store_id is not null), '{}'::uuid[])
  into v_supplier_ids
  from public.order_items oi
  where oi.order_id = v_order.id;

  v_has_supplier := coalesce(cardinality(v_supplier_ids), 0) > 0;

  v_policy := public.resolve_store_commission_policy(
    v_order.currency,
    coalesce(v_capture.created_at, timezone('utc', now()))
  );

  if coalesce((v_policy->>'found')::boolean, false) is not true then
    insert into public.store_commission_decomposition_events (
      event_key, payment_attempt_id, capture_event_id, order_id, store_id,
      seller_user_id, correlation_id, lifecycle_status, policy_status,
      capture_amount_minor, currency, lines, order_items_snapshot,
      supplier_store_ids, metadata
    ) values (
      v_event_key, v_attempt.id, v_capture.id, v_order.id, v_order.store_id,
      v_seller_user_id, v_correlation_id, 'not_configured', 'not_configured',
      v_capture.amount_minor, v_order.currency, '[]'::jsonb, v_items,
      v_supplier_ids,
      jsonb_build_object(
        'note', 'commerce.revenue.commission_decomposition_bridge_apply_v1',
        'reason', 'no_active_commission_policy'
      )
    );

    return jsonb_build_object(
      'ok', true,
      'replayed', false,
      'policy_status', 'not_configured',
      'lifecycle_status', 'not_configured',
      'order_id', v_order.id,
      'payment_attempt_id', v_attempt.id,
      'capture_event_id', v_capture.id,
      'store_id', v_order.store_id,
      'capture_amount_minor', v_capture.amount_minor,
      'currency', v_order.currency
    );
  end if;

  if (v_policy->>'currency') is distinct from v_order.currency then
    raise exception 'resolved commission policy currency diverges from order';
  end if;

  v_supplier_bps := coalesce((v_policy->>'supplier_bps')::integer, 0);
  if v_supplier_bps > 0 and not v_has_supplier then
    raise exception
      'commission policy includes supplier share but order has no supplier_store_id linkage';
  end if;

  if (v_policy->>'basis_kind') = 'merchandise_net' then
    v_basis_minor := greatest(
      0,
      coalesce(v_order.subtotal_minor, 0) - coalesce(v_order.discount_total_minor, 0)
    );
  elsif (v_policy->>'basis_kind') = 'grand_total' then
    v_basis_minor := v_order.grand_total_minor;
  else
    raise exception 'unsupported commission basis_kind';
  end if;

  v_split := public.compute_store_commission_split(
    v_basis_minor,
    (v_policy->>'platform_bps')::integer,
    (v_policy->>'seller_bps')::integer,
    coalesce((v_policy->>'supplier_bps')::integer, 0),
    coalesce((v_policy->>'affiliate_bps')::integer, 0),
    coalesce((v_policy->>'partner_bps')::integer, 0)
  );

  v_platform := (v_split->>'platform_commission_minor')::bigint;
  v_seller := (v_split->>'seller_amount_minor')::bigint;
  v_supplier := (v_split->>'supplier_amount_minor')::bigint;
  v_affiliate := (v_split->>'affiliate_amount_minor')::bigint;
  v_partner := (v_split->>'partner_amount_minor')::bigint;

  if (v_platform + v_seller + v_supplier + v_affiliate + v_partner)
     is distinct from v_basis_minor then
    raise exception 'commission decomposition does not reconcile to basis_minor';
  end if;

  -- When basis is grand_total, authoritative capture amount must match basis.
  if (v_policy->>'basis_kind') = 'grand_total'
     and v_basis_minor is distinct from v_capture.amount_minor then
    raise exception
      'grand_total commission basis diverges from trusted capture amount';
  end if;

  v_lines := jsonb_build_array(
    jsonb_build_object(
      'role', 'platform',
      'bps', (v_policy->>'platform_bps')::integer,
      'amount_minor', v_platform
    ),
    jsonb_build_object(
      'role', 'seller',
      'bps', (v_policy->>'seller_bps')::integer,
      'amount_minor', v_seller
    ),
    jsonb_build_object(
      'role', 'supplier',
      'bps', coalesce((v_policy->>'supplier_bps')::integer, 0),
      'amount_minor', v_supplier
    ),
    jsonb_build_object(
      'role', 'affiliate',
      'bps', coalesce((v_policy->>'affiliate_bps')::integer, 0),
      'amount_minor', v_affiliate
    ),
    jsonb_build_object(
      'role', 'partner',
      'bps', coalesce((v_policy->>'partner_bps')::integer, 0),
      'amount_minor', v_partner
    )
  );

  -- Mirror TS fingerprint key order (sorted).
  v_fingerprint := concat_ws(
    '|',
    'affiliate=' || v_affiliate::text,
    'basisKind=' || (v_policy->>'basis_kind'),
    'basisMinor=' || v_basis_minor::text,
    'capability=commerce.revenue.commission_policy_foundation_v1',
    'currency=' || v_order.currency,
    'partner=' || v_partner::text,
    'platform=' || v_platform::text,
    'policyCode=' || (v_policy->>'policy_code'),
    'policyVersion=' || (v_policy->>'version'),
    'seller=' || v_seller::text,
    'supplier=' || v_supplier::text
  );

  insert into public.store_commission_decomposition_events (
    event_key, payment_attempt_id, capture_event_id, order_id, store_id,
    seller_user_id, correlation_id, lifecycle_status, policy_status,
    policy_code, policy_version, basis_kind, basis_minor, capture_amount_minor,
    currency, platform_commission_minor, seller_amount_minor,
    supplier_amount_minor, affiliate_amount_minor, partner_amount_minor,
    calculation_fingerprint, lines, order_items_snapshot, supplier_store_ids,
    metadata
  ) values (
    v_event_key, v_attempt.id, v_capture.id, v_order.id, v_order.store_id,
    v_seller_user_id, v_correlation_id, 'applied', 'applied',
    v_policy->>'policy_code', (v_policy->>'version')::integer,
    v_policy->>'basis_kind', v_basis_minor, v_capture.amount_minor,
    v_order.currency, v_platform, v_seller, v_supplier, v_affiliate, v_partner,
    v_fingerprint, v_lines, v_items, v_supplier_ids,
    jsonb_build_object(
      'note', 'commerce.revenue.commission_decomposition_bridge_apply_v1',
      'policy_description', coalesce(v_policy->>'description', '')
    )
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'policy_status', 'applied',
    'lifecycle_status', 'applied',
    'order_id', v_order.id,
    'payment_attempt_id', v_attempt.id,
    'capture_event_id', v_capture.id,
    'store_id', v_order.store_id,
    'seller_user_id', v_seller_user_id,
    'policy_code', v_policy->>'policy_code',
    'policy_version', (v_policy->>'version')::integer,
    'basis_kind', v_policy->>'basis_kind',
    'basis_minor', v_basis_minor,
    'capture_amount_minor', v_capture.amount_minor,
    'currency', v_order.currency,
    'platform_commission_minor', v_platform,
    'seller_amount_minor', v_seller,
    'supplier_amount_minor', v_supplier,
    'affiliate_amount_minor', v_affiliate,
    'partner_amount_minor', v_partner,
    'calculation_fingerprint', v_fingerprint,
    'lines', v_lines,
    'supplier_store_ids', to_jsonb(v_supplier_ids)
  );
end;
$$;

comment on function public.apply_store_commission_decomposition_after_capture(uuid, text, text) is
  'Service-role only. After trusted capture + allocate, persist commission decomposition (or explicit not_configured). Idempotent.';

revoke all on function public.apply_store_commission_decomposition_after_capture(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_store_commission_decomposition_after_capture(uuid, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Mark superseded after trusted full-order refund (historical preserve)
-- ---------------------------------------------------------------------------

create or replace function public.mark_store_commission_decomposition_after_refund(
  p_payment_attempt_id uuid,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correlation_id text := nullif(btrim(coalesce(p_correlation_id, '')), '');
  v_row public.store_commission_decomposition_events%rowtype;
  v_refund_exists boolean := false;
begin
  if p_payment_attempt_id is null then
    raise exception 'payment_attempt_id is required';
  end if;
  if v_correlation_id is null
     or char_length(v_correlation_id) < 8
     or char_length(v_correlation_id) > 128 then
    raise exception 'correlation_id must be 8..128 characters';
  end if;

  perform pg_advisory_xact_lock(
    ('x' || substr(md5('store_commission_refund_mark:' || p_payment_attempt_id::text), 1, 16))::bit(64)::bigint
  );

  select exists (
    select 1
    from public.store_payment_outcome_events e
    where e.payment_attempt_id = p_payment_attempt_id
      and e.outcome = 'refunded'
  ) into v_refund_exists;

  if not v_refund_exists then
    raise exception
      'commission decomposition refund mark requires trusted refunded outcome';
  end if;

  select * into v_row
  from public.store_commission_decomposition_events e
  where e.payment_attempt_id = p_payment_attempt_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', true,
      'skipped', true,
      'reason', 'no_commission_decomposition_for_attempt'
    );
  end if;

  if v_row.correlation_id is distinct from v_correlation_id then
    raise exception
      'commission decomposition refund mark correlation_id mismatch';
  end if;

  if v_row.lifecycle_status = 'superseded_by_refund' then
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'skipped', false,
      'lifecycle_status', v_row.lifecycle_status,
      'policy_status', v_row.policy_status,
      'event_key', v_row.event_key,
      'payment_attempt_id', v_row.payment_attempt_id
    );
  end if;

  update public.store_commission_decomposition_events
  set
    lifecycle_status = 'superseded_by_refund',
    superseded_at = timezone('utc', now()),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'superseded_by', 'full_order_refund',
      'superseded_capability', 'commerce.payments.full_order_refund_path_v1'
    )
  where event_key = v_row.event_key;

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'skipped', false,
    'lifecycle_status', 'superseded_by_refund',
    'policy_status', v_row.policy_status,
    'event_key', v_row.event_key,
    'payment_attempt_id', v_row.payment_attempt_id,
    'platform_commission_minor', v_row.platform_commission_minor,
    'seller_amount_minor', v_row.seller_amount_minor,
    'supplier_amount_minor', v_row.supplier_amount_minor,
    'affiliate_amount_minor', v_row.affiliate_amount_minor,
    'partner_amount_minor', v_row.partner_amount_minor,
    'calculation_fingerprint', v_row.calculation_fingerprint
  );
end;
$$;

comment on function public.mark_store_commission_decomposition_after_refund(uuid, text) is
  'Service-role only. After trusted refund, mark applied decomposition superseded without deleting historical amounts.';

revoke all on function public.mark_store_commission_decomposition_after_refund(uuid, text)
  from public, anon, authenticated;
grant execute on function public.mark_store_commission_decomposition_after_refund(uuid, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Read helper for payout/refund reference (service_role)
-- ---------------------------------------------------------------------------

create or replace function public.get_store_commission_decomposition_for_attempt(
  p_payment_attempt_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.store_commission_decomposition_events%rowtype;
begin
  if p_payment_attempt_id is null then
    raise exception 'payment_attempt_id is required';
  end if;

  select * into v_row
  from public.store_commission_decomposition_events e
  where e.payment_attempt_id = p_payment_attempt_id;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  return jsonb_build_object(
    'found', true,
    'event_key', v_row.event_key,
    'payment_attempt_id', v_row.payment_attempt_id,
    'capture_event_id', v_row.capture_event_id,
    'order_id', v_row.order_id,
    'store_id', v_row.store_id,
    'seller_user_id', v_row.seller_user_id,
    'lifecycle_status', v_row.lifecycle_status,
    'policy_status', v_row.policy_status,
    'policy_code', v_row.policy_code,
    'policy_version', v_row.policy_version,
    'basis_kind', v_row.basis_kind,
    'basis_minor', v_row.basis_minor,
    'capture_amount_minor', v_row.capture_amount_minor,
    'currency', v_row.currency,
    'platform_commission_minor', v_row.platform_commission_minor,
    'seller_amount_minor', v_row.seller_amount_minor,
    'supplier_amount_minor', v_row.supplier_amount_minor,
    'affiliate_amount_minor', v_row.affiliate_amount_minor,
    'partner_amount_minor', v_row.partner_amount_minor,
    'calculation_fingerprint', v_row.calculation_fingerprint,
    'lines', v_row.lines,
    'order_items_snapshot', v_row.order_items_snapshot,
    'supplier_store_ids', to_jsonb(v_row.supplier_store_ids),
    'created_at', v_row.created_at,
    'superseded_at', v_row.superseded_at
  );
end;
$$;

comment on function public.get_store_commission_decomposition_for_attempt(uuid) is
  'Service-role only. Load persisted commission decomposition for payout/refund reference.';

revoke all on function public.get_store_commission_decomposition_for_attempt(uuid)
  from public, anon, authenticated;
grant execute on function public.get_store_commission_decomposition_for_attempt(uuid)
  to service_role;
