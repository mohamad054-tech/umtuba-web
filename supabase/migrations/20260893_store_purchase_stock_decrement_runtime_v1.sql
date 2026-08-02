-- =============================================================================
-- UMTUBA Commerce — Purchase Stock Decrement Runtime V1
-- Migration: 20260893_store_purchase_stock_decrement_runtime_v1.sql
-- Local file only — do NOT remote-apply without explicit approval.
--
-- After trusted payment capture: for finite holds only, consume reservation then
-- decrement product_inventory.on_hand in one transaction with persisted idempotency.
-- Unlimited product types are skipped (no invented stock).
-- =============================================================================

create table if not exists public.store_purchase_stock_decrement_events (
  event_key text primary key
    constraint store_purchase_stock_decrement_events_event_key_len_chk
      check (char_length(event_key) between 8 and 160),
  payment_attempt_id uuid not null references public.payment_attempts (id),
  order_id uuid not null references public.orders (id),
  correlation_id text not null
    constraint store_purchase_stock_decrement_events_correlation_len_chk
      check (char_length(correlation_id) between 8 and 128),
  lines_decremented integer not null default 0
    check (lines_decremented >= 0),
  quantity_decremented integer not null default 0
    check (quantity_decremented >= 0),
  reservations_consumed integer not null default 0
    check (reservations_consumed >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists store_purchase_stock_decrement_events_attempt_idx
  on public.store_purchase_stock_decrement_events (payment_attempt_id);

create index if not exists store_purchase_stock_decrement_events_order_idx
  on public.store_purchase_stock_decrement_events (order_id);

comment on table public.store_purchase_stock_decrement_events is
  'Persisted idempotency for purchase stock decrement after trusted capture. Not a general movement ledger.';

alter table public.store_purchase_stock_decrement_events enable row level security;
alter table public.store_purchase_stock_decrement_events force row level security;

revoke all on public.store_purchase_stock_decrement_events
  from public, anon, authenticated;

create or replace function public.decrement_store_purchase_stock_after_capture(
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
  v_existing public.store_purchase_stock_decrement_events%rowtype;
  v_res public.inventory_reservations%rowtype;
  v_inv public.product_inventory%rowtype;
  v_product_type text;
  v_line_key text;
  v_lines int := 0;
  v_qty int := 0;
  v_consumed int := 0;
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
    ('x' || substr(md5('store_purchase_stock:' || v_event_key), 1, 16))::bit(64)::bigint
  );

  select * into v_existing
  from public.store_purchase_stock_decrement_events
  where event_key = v_event_key
  for share;
  if found then
    if v_existing.payment_attempt_id is distinct from p_payment_attempt_id
       or v_existing.correlation_id is distinct from v_correlation_id then
      raise exception
        'idempotency conflict for purchase stock decrement event_key %',
        v_event_key;
    end if;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'order_id', v_existing.order_id,
      'payment_attempt_id', v_existing.payment_attempt_id,
      'lines_decremented', v_existing.lines_decremented,
      'quantity_decremented', v_existing.quantity_decremented,
      'reservations_consumed', v_existing.reservations_consumed
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

  if v_attempt.status is distinct from 'captured' then
    raise exception 'purchase stock decrement requires payment_attempt.status=captured';
  end if;
  if v_order.payment_status is distinct from 'paid' then
    raise exception 'purchase stock decrement requires order payment_status=paid';
  end if;
  if v_order.status in ('cancelled', 'refunded') then
    raise exception 'purchase stock decrement blocked for closed orders';
  end if;
  if v_attempt.buyer_id is distinct from v_order.buyer_id then
    raise exception 'payment attempt buyer diverges from order buyer';
  end if;

  select * into v_capture
  from public.store_payment_outcome_events e
  where e.payment_attempt_id = v_attempt.id
    and e.outcome = 'captured'
  order by e.created_at asc
  limit 1
  for share;
  if not found then
    raise exception 'purchase stock decrement requires a trusted capture outcome event';
  end if;
  if v_capture.correlation_id is distinct from v_correlation_id then
    raise exception
      'purchase stock decrement correlation_id must match capture correlation_id';
  end if;
  if v_capture.order_id is distinct from v_order.id then
    raise exception 'capture order diverges from locked order';
  end if;

  for v_res in
    select *
    from public.inventory_reservations
    where order_id = v_order.id
      and status in ('active', 'pending_capture')
    order by created_at asc, id asc
    for update
  loop
    if v_res.store_id is distinct from v_order.store_id then
      raise exception
        'purchase stock decrement blocked: reservation store diverges from order store';
    end if;
    if v_res.quantity is null or v_res.quantity <= 0 then
      raise exception 'purchase stock decrement blocked: invalid reservation quantity';
    end if;

    select lower(
      coalesce(
        (
          select oi.product_snapshot->>'product_type'
          from public.order_items oi
          where oi.order_id = v_order.id
            and oi.product_id = v_res.product_id
            and oi.variant_id = v_res.variant_id
          order by oi.created_at asc, oi.id asc
          limit 1
        ),
        (
          select sp.product_type::text
          from public.store_products sp
          where sp.id = v_res.product_id
        ),
        ''
      )
    )
    into v_product_type;

    if v_product_type is null or v_product_type = '' then
      raise exception
        'purchase stock decrement blocked: unable to resolve product type for reservation %',
        v_res.id;
    end if;

    -- Unlimited: leave holds for digital entitlement / non-stock paths.
    if v_product_type in ('digital', 'service', 'subscription', 'bundle') then
      continue;
    end if;

    if v_product_type not in ('physical', 'booking') then
      raise exception
        'purchase stock decrement blocked: unsupported product type %',
        v_product_type;
    end if;

    v_line_key := v_event_key || ':' || replace(v_res.id::text, '-', '');
    if char_length(v_line_key) > 180 then
      raise exception 'purchase stock line idempotency key too long';
    end if;

    perform public.transition_inventory_reservation(
      v_res.id,
      'consumed',
      'purchase stock decrement after trusted capture',
      'system',
      null,
      v_line_key
    );
    v_consumed := v_consumed + 1;

    select * into v_inv
    from public.product_inventory
    where variant_id = v_res.variant_id
      and warehouse_key = v_res.warehouse_key
    for update;
    if not found then
      raise exception
        'purchase stock decrement blocked: inventory row missing for variant %',
        v_res.variant_id;
    end if;

    if v_inv.on_hand < v_res.quantity then
      raise exception
        'purchase stock decrement blocked: insufficient on_hand for reservation %',
        v_res.id;
    end if;
    if v_inv.on_hand - v_res.quantity < 0 then
      raise exception 'purchase stock decrement blocked: on_hand would go negative';
    end if;
    if v_inv.reserved < 0 then
      raise exception 'purchase stock decrement blocked: reserved already negative';
    end if;
    if v_inv.reserved > (v_inv.on_hand - v_res.quantity) then
      raise exception
        'purchase stock decrement blocked: reserved would exceed on_hand after decrement';
    end if;

    update public.product_inventory
      set on_hand = on_hand - v_res.quantity,
          updated_at = timezone('utc', now())
    where id = v_inv.id;

    v_lines := v_lines + 1;
    v_qty := v_qty + v_res.quantity;
  end loop;

  insert into public.store_purchase_stock_decrement_events (
    event_key, payment_attempt_id, order_id, correlation_id,
    lines_decremented, quantity_decremented, reservations_consumed
  ) values (
    v_event_key, v_attempt.id, v_order.id, v_correlation_id,
    v_lines, v_qty, v_consumed
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'order_id', v_order.id,
    'payment_attempt_id', v_attempt.id,
    'lines_decremented', v_lines,
    'quantity_decremented', v_qty,
    'reservations_consumed', v_consumed
  );
end;
$$;

comment on function public.decrement_store_purchase_stock_after_capture(uuid, text, text) is
  'Service-role only. After trusted capture, consume finite reservations then decrement on_hand. Idempotent via store_purchase_stock_decrement_events.';

revoke all on function public.decrement_store_purchase_stock_after_capture(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.decrement_store_purchase_stock_after_capture(uuid, text, text)
  to service_role;
