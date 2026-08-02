-- =============================================================================
-- UMTUBA Commerce — Refund Stock Restock Runtime V1
-- Migration: 20260894_store_purchase_stock_restock_runtime_v1.sql
-- Local file only — do NOT remote-apply without explicit approval.
--
-- After trusted Sync refunded: for finite lines previously purchase-decremented,
-- increment product_inventory.on_hand in one transaction with persisted idempotency.
-- Unlimited product types are skipped (noop). Partial refunds are out of scope.
-- =============================================================================

create table if not exists public.store_purchase_stock_restock_events (
  event_key text primary key
    constraint store_purchase_stock_restock_events_event_key_len_chk
      check (char_length(event_key) between 8 and 160),
  payment_attempt_id uuid not null references public.payment_attempts (id),
  order_id uuid not null references public.orders (id),
  correlation_id text not null
    constraint store_purchase_stock_restock_events_correlation_len_chk
      check (char_length(correlation_id) between 8 and 128),
  prior_decrement_event_key text null,
  lines_restocked integer not null default 0
    check (lines_restocked >= 0),
  quantity_restocked integer not null default 0
    check (quantity_restocked >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists store_purchase_stock_restock_events_attempt_idx
  on public.store_purchase_stock_restock_events (payment_attempt_id);

create index if not exists store_purchase_stock_restock_events_order_idx
  on public.store_purchase_stock_restock_events (order_id);

comment on table public.store_purchase_stock_restock_events is
  'Persisted idempotency for purchase stock restock after trusted Sync refunded. Not a general movement ledger.';

alter table public.store_purchase_stock_restock_events enable row level security;
alter table public.store_purchase_stock_restock_events force row level security;

revoke all on public.store_purchase_stock_restock_events
  from public, anon, authenticated;

create or replace function public.restock_store_purchase_stock_after_refund(
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
  v_refund public.store_payment_outcome_events%rowtype;
  v_prior public.store_purchase_stock_decrement_events%rowtype;
  v_existing public.store_purchase_stock_restock_events%rowtype;
  v_res public.inventory_reservations%rowtype;
  v_inv public.product_inventory%rowtype;
  v_product_type text;
  v_prior_key text;
  v_lines int := 0;
  v_qty int := 0;
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
    ('x' || substr(md5('store_purchase_stock_restock:' || v_event_key), 1, 16))::bit(64)::bigint
  );

  select * into v_existing
  from public.store_purchase_stock_restock_events
  where event_key = v_event_key
  for share;
  if found then
    if v_existing.payment_attempt_id is distinct from p_payment_attempt_id
       or v_existing.correlation_id is distinct from v_correlation_id then
      raise exception
        'idempotency conflict for purchase stock restock event_key %',
        v_event_key;
    end if;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'order_id', v_existing.order_id,
      'payment_attempt_id', v_existing.payment_attempt_id,
      'lines_restocked', v_existing.lines_restocked,
      'quantity_restocked', v_existing.quantity_restocked,
      'prior_decrement_event_key', v_existing.prior_decrement_event_key
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

  select * into v_refund
  from public.store_payment_outcome_events e
  where e.payment_attempt_id = v_attempt.id
    and e.outcome = 'refunded'
  order by e.created_at asc
  limit 1
  for share;
  if not found then
    raise exception 'purchase stock restock requires a trusted refunded outcome event';
  end if;
  if v_refund.correlation_id is distinct from v_correlation_id then
    raise exception
      'purchase stock restock correlation_id must match refund correlation_id';
  end if;
  if v_refund.order_id is distinct from v_order.id then
    raise exception 'refund order diverges from locked order';
  end if;

  select * into v_capture
  from public.store_payment_outcome_events e
  where e.payment_attempt_id = v_attempt.id
    and e.outcome = 'captured'
  order by e.created_at asc
  limit 1
  for share;
  if not found then
    raise exception 'purchase stock restock requires a trusted capture outcome event';
  end if;
  if v_capture.order_id is distinct from v_order.id then
    raise exception 'capture order diverges from locked order';
  end if;

  v_prior_key := v_capture.event_key || ':purchase_stock';
  if char_length(v_prior_key) > 160 then
    raise exception 'prior purchase stock decrement event_key too long';
  end if;

  -- Restock event_key must be capture:purchase_stock:restock
  if v_event_key is distinct from (v_prior_key || ':restock') then
    raise exception
      'purchase stock restock event_key must equal capture purchase_stock restock key';
  end if;

  select * into v_prior
  from public.store_purchase_stock_decrement_events
  where event_key = v_prior_key
  for share;
  if not found then
    raise exception
      'purchase stock restock requires prior purchase stock decrement event';
  end if;

  if v_prior.payment_attempt_id is distinct from v_attempt.id
     or v_prior.order_id is distinct from v_order.id then
    raise exception
      'prior purchase stock decrement does not match payment attempt/order';
  end if;

  -- Prior decrement noop (all unlimited / zero finite qty): restock is also noop.
  -- Do not invent on_hand when purchase-stock never took finite units.
  if coalesce(v_prior.quantity_decremented, 0) = 0 then
    insert into public.store_purchase_stock_restock_events (
      event_key, payment_attempt_id, order_id, correlation_id,
      prior_decrement_event_key, lines_restocked, quantity_restocked
    ) values (
      v_event_key, v_attempt.id, v_order.id, v_correlation_id,
      v_prior_key, 0, 0
    );
    return jsonb_build_object(
      'ok', true,
      'replayed', false,
      'order_id', v_order.id,
      'payment_attempt_id', v_attempt.id,
      'lines_restocked', 0,
      'quantity_restocked', 0,
      'prior_decrement_event_key', v_prior_key
    );
  end if;

  for v_res in
    select *
    from public.inventory_reservations
    where order_id = v_order.id
      and status = 'consumed'
    order by created_at asc, id asc
    for update
  loop
    if v_res.store_id is distinct from v_order.store_id then
      raise exception
        'purchase stock restock blocked: reservation store diverges from order store';
    end if;
    if v_res.quantity is null or v_res.quantity <= 0 then
      raise exception 'purchase stock restock blocked: invalid reservation quantity';
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
        'purchase stock restock blocked: unable to resolve product type for reservation %',
        v_res.id;
    end if;

    if v_product_type in ('digital', 'service', 'subscription', 'bundle') then
      continue;
    end if;

    if v_product_type not in ('physical', 'booking') then
      raise exception
        'purchase stock restock blocked: unsupported product type %',
        v_product_type;
    end if;

    select * into v_inv
    from public.product_inventory
    where variant_id = v_res.variant_id
      and warehouse_key = v_res.warehouse_key
    for update;
    if not found then
      raise exception
        'purchase stock restock blocked: inventory row missing for variant %',
        v_res.variant_id;
    end if;

    if v_inv.reserved < 0 then
      raise exception 'purchase stock restock blocked: reserved already negative';
    end if;
    if v_inv.reserved > (v_inv.on_hand + v_res.quantity) then
      raise exception
        'purchase stock restock blocked: reserved would exceed on_hand after restock';
    end if;

    update public.product_inventory
      set on_hand = on_hand + v_res.quantity,
          updated_at = timezone('utc', now())
    where id = v_inv.id;

    v_lines := v_lines + 1;
    v_qty := v_qty + v_res.quantity;
  end loop;

  if v_qty is distinct from v_prior.quantity_decremented then
    raise exception
      'purchase stock restock blocked: restock quantity % diverges from prior decrement %',
      v_qty, v_prior.quantity_decremented;
  end if;

  insert into public.store_purchase_stock_restock_events (
    event_key, payment_attempt_id, order_id, correlation_id,
    prior_decrement_event_key, lines_restocked, quantity_restocked
  ) values (
    v_event_key, v_attempt.id, v_order.id, v_correlation_id,
    v_prior_key, v_lines, v_qty
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'order_id', v_order.id,
    'payment_attempt_id', v_attempt.id,
    'lines_restocked', v_lines,
    'quantity_restocked', v_qty,
    'prior_decrement_event_key', v_prior_key
  );
end;
$$;

comment on function public.restock_store_purchase_stock_after_refund(uuid, text, text) is
  'Service-role only. After trusted Sync refunded, restock on_hand for finite lines previously purchase-decremented. Idempotent via store_purchase_stock_restock_events.';

revoke all on function public.restock_store_purchase_stock_after_refund(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.restock_store_purchase_stock_after_refund(uuid, text, text)
  to service_role;
