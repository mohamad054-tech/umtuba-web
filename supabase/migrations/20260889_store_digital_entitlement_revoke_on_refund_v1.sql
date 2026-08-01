-- =============================================================================
-- UMTUBA Commerce — Digital Entitlement Revoke on Refund V1
-- Migration: 20260889_store_digital_entitlement_revoke_on_refund_v1.sql
-- Local file only — do NOT remote-apply without explicit approval.
-- =============================================================================

alter table public.store_digital_entitlements
  add column if not exists revoked_at timestamptz;

comment on column public.store_digital_entitlements.revoked_at is
  'UTC timestamp when entitlement was revoked after trusted refund (null while active).';

create table if not exists public.store_digital_entitlement_revoke_events (
  event_key text primary key,
  payment_attempt_id uuid not null references public.payment_attempts (id),
  order_id uuid not null references public.orders (id),
  correlation_id text not null,
  entitlements_revoked integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists store_digital_entitlement_revoke_events_attempt_idx
  on public.store_digital_entitlement_revoke_events (payment_attempt_id);

comment on table public.store_digital_entitlement_revoke_events is
  'Idempotency ledger for digital entitlement revoke after trusted refund.';

alter table public.store_digital_entitlement_revoke_events enable row level security;
alter table public.store_digital_entitlement_revoke_events force row level security;

revoke all on public.store_digital_entitlement_revoke_events
  from public, anon, authenticated;

create or replace function public.revoke_store_digital_entitlements_after_refund(
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
  v_refund public.store_payment_outcome_events%rowtype;
  v_existing public.store_digital_entitlement_revoke_events%rowtype;
  v_revoked int := 0;
  v_active_left int := 0;
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
    ('x' || substr(md5('store_digital_revoke:' || v_event_key), 1, 16))::bit(64)::bigint
  );

  select * into v_existing
  from public.store_digital_entitlement_revoke_events
  where event_key = v_event_key
  for share;
  if found then
    if v_existing.payment_attempt_id is distinct from p_payment_attempt_id
       or v_existing.correlation_id is distinct from v_correlation_id then
      raise exception
        'idempotency conflict for digital entitlement revoke event_key %',
        v_event_key;
    end if;

    -- Fail closed: a prior revoke event must leave zero active rows for this attempt.
    select count(*)::int into v_active_left
    from public.store_digital_entitlements e
    where e.payment_attempt_id = p_payment_attempt_id
      and e.status = 'active';
    if v_active_left > 0 then
      raise exception
        'digital entitlement revoke replay blocked: % active entitlement(s) remain',
        v_active_left;
    end if;

    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'order_id', v_existing.order_id,
      'payment_attempt_id', v_existing.payment_attempt_id,
      'entitlements_revoked', v_existing.entitlements_revoked
    );
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

  -- Fail closed: revoke only after a trusted refunded outcome exists.
  select * into v_refund
  from public.store_payment_outcome_events e
  where e.payment_attempt_id = v_attempt.id
    and e.outcome = 'refunded'
  order by e.created_at asc
  limit 1
  for share;
  if not found then
    raise exception
      'digital entitlement revoke requires a trusted refunded outcome event';
  end if;
  if v_refund.order_id is distinct from v_order.id then
    raise exception 'refund order diverges from locked order';
  end if;
  if v_refund.correlation_id is distinct from v_correlation_id then
    raise exception
      'digital entitlement revoke correlation_id must match refund correlation_id';
  end if;

  if v_order.payment_status is distinct from 'refunded'
     and v_attempt.status is distinct from 'refunded' then
    raise exception
      'digital entitlement revoke requires refunded payment attempt or order';
  end if;

  update public.store_digital_entitlements e
  set
    status = 'revoked',
    revoked_at = coalesce(e.revoked_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where e.payment_attempt_id = v_attempt.id
    and e.order_id = v_order.id
    and e.status = 'active';

  get diagnostics v_revoked = row_count;

  -- Fail closed: after update, no active entitlements may remain for this attempt.
  select count(*)::int into v_active_left
  from public.store_digital_entitlements e
  where e.payment_attempt_id = v_attempt.id
    and e.status = 'active';
  if v_active_left > 0 then
    raise exception
      'digital entitlement revoke failed closed: % active entitlement(s) remain',
      v_active_left;
  end if;

  insert into public.store_digital_entitlement_revoke_events (
    event_key, payment_attempt_id, order_id, correlation_id, entitlements_revoked
  ) values (
    v_event_key, v_attempt.id, v_order.id, v_correlation_id, v_revoked
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'order_id', v_order.id,
    'payment_attempt_id', v_attempt.id,
    'entitlements_revoked', v_revoked
  );
end;
$$;

comment on function public.revoke_store_digital_entitlements_after_refund(uuid, text, text) is
  'Service-role only. After trusted refund, revoke active digital entitlements for the payment attempt. Idempotent.';

revoke all on function public.revoke_store_digital_entitlements_after_refund(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.revoke_store_digital_entitlements_after_refund(uuid, text, text)
  to service_role;
