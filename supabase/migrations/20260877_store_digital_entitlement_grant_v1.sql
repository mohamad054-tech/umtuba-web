-- =============================================================================
-- UMTUBA Commerce — Post-Capture Digital Entitlement Grant V1
-- Migration: 20260877_store_digital_entitlement_grant_v1.sql
-- Local file only — do NOT remote-apply without explicit approval.
-- =============================================================================

create table if not exists public.store_digital_entitlements (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users (id),
  order_id uuid not null references public.orders (id),
  order_item_id uuid not null references public.order_items (id),
  product_id uuid not null,
  store_id uuid not null references public.stores (id),
  payment_attempt_id uuid not null references public.payment_attempts (id),
  grant_event_key text not null,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  title_snapshot text,
  sku_snapshot text,
  granted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_digital_entitlements_order_item_uidx unique (order_item_id),
  constraint store_digital_entitlements_grant_item_uidx
    unique (grant_event_key, order_item_id)
);

create index if not exists store_digital_entitlements_buyer_idx
  on public.store_digital_entitlements (buyer_id, granted_at desc);
create index if not exists store_digital_entitlements_order_idx
  on public.store_digital_entitlements (order_id);
create index if not exists store_digital_entitlements_attempt_idx
  on public.store_digital_entitlements (payment_attempt_id);

comment on table public.store_digital_entitlements is
  'Buyer digital access grants issued after trusted payment capture. Not a download CDN.';

drop trigger if exists store_digital_entitlements_set_updated_at
  on public.store_digital_entitlements;
create trigger store_digital_entitlements_set_updated_at
  before update on public.store_digital_entitlements
  for each row
  execute function public.set_updated_at();

alter table public.store_digital_entitlements enable row level security;
alter table public.store_digital_entitlements force row level security;

revoke all on public.store_digital_entitlements from public, anon;
grant select on public.store_digital_entitlements to authenticated;
revoke insert, update, delete on public.store_digital_entitlements from authenticated;

drop policy if exists "Buyers select own digital entitlements"
  on public.store_digital_entitlements;
create policy "Buyers select own digital entitlements"
  on public.store_digital_entitlements
  for select
  to authenticated
  using (buyer_id = auth.uid());

create table if not exists public.store_digital_entitlement_grant_events (
  event_key text primary key,
  payment_attempt_id uuid not null references public.payment_attempts (id),
  order_id uuid not null references public.orders (id),
  correlation_id text not null,
  entitlements_granted integer not null default 0,
  reservations_consumed integer not null default 0,
  fulfillment_marked boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.store_digital_entitlement_grant_events enable row level security;
alter table public.store_digital_entitlement_grant_events force row level security;

revoke all on public.store_digital_entitlement_grant_events
  from public, anon, authenticated;

create or replace function public.grant_store_digital_entitlements_after_capture(
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
  v_existing public.store_digital_entitlement_grant_events%rowtype;
  v_item public.order_items%rowtype;
  v_product_type text;
  v_granted int := 0;
  v_inserted int;
  v_consumed int := 0;
  v_fulfillment_marked boolean := false;
  v_res public.inventory_reservations%rowtype;
  v_from_fulfillment text;
  v_digital_lines int := 0;
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
    ('x' || substr(md5('store_digital_grant:' || v_event_key), 1, 16))::bit(64)::bigint
  );

  select * into v_existing
  from public.store_digital_entitlement_grant_events
  where event_key = v_event_key
  for share;
  if found then
    if v_existing.payment_attempt_id is distinct from p_payment_attempt_id
       or v_existing.correlation_id is distinct from v_correlation_id then
      raise exception
        'idempotency conflict for digital entitlement grant event_key %',
        v_event_key;
    end if;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'order_id', v_existing.order_id,
      'payment_attempt_id', v_existing.payment_attempt_id,
      'entitlements_granted', v_existing.entitlements_granted,
      'reservations_consumed', v_existing.reservations_consumed,
      'fulfillment_marked', v_existing.fulfillment_marked
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
    raise exception 'digital entitlement grant requires payment_attempt.status=captured';
  end if;
  if v_order.payment_status is distinct from 'paid' then
    raise exception 'digital entitlement grant requires order payment_status=paid';
  end if;
  if v_order.status in ('cancelled', 'refunded') then
    raise exception 'digital entitlement grant blocked for closed orders';
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
    raise exception 'digital entitlement grant requires a trusted capture outcome event';
  end if;
  if v_capture.correlation_id is distinct from v_correlation_id then
    raise exception
      'digital entitlement grant correlation_id must match capture correlation_id';
  end if;
  if v_capture.order_id is distinct from v_order.id then
    raise exception 'capture order diverges from locked order';
  end if;

  select count(*)::int into v_digital_lines
  from public.order_items oi
  where oi.order_id = v_order.id
    and lower(coalesce(oi.product_snapshot->>'product_type', 'physical')) = 'digital';
  if v_digital_lines < 1 then
    raise exception 'digital entitlement grant requires at least one digital order line';
  end if;

  for v_item in
    select *
    from public.order_items
    where order_id = v_order.id
    order by created_at asc, id asc
  loop
    v_product_type := lower(
      coalesce(v_item.product_snapshot->>'product_type', 'physical')
    );
    if v_product_type is distinct from 'digital' then
      continue;
    end if;

    insert into public.store_digital_entitlements (
      buyer_id, order_id, order_item_id, product_id, store_id,
      payment_attempt_id, grant_event_key, status, title_snapshot, sku_snapshot
    ) values (
      v_order.buyer_id, v_order.id, v_item.id, v_item.product_id, v_order.store_id,
      v_attempt.id, v_event_key, 'active', v_item.title_snapshot, v_item.sku_snapshot
    )
    on conflict (order_item_id) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted > 0 then
      v_granted := v_granted + 1;
    elsif exists (
      select 1 from public.store_digital_entitlements e
      where e.order_item_id = v_item.id and e.status = 'active'
    ) then
      v_granted := v_granted + 1;
    end if;
  end loop;

  for v_res in
    select *
    from public.inventory_reservations
    where order_id = v_order.id
      and status in ('active', 'pending_capture')
    order by created_at asc, id asc
    for update
  loop
    perform public.transition_inventory_reservation(
      v_res.id,
      'consumed',
      'digital entitlement grant after trusted capture',
      'system',
      null,
      v_event_key || ':res:' || replace(v_res.id::text, '-', '')
    );
    v_consumed := v_consumed + 1;
  end loop;

  v_from_fulfillment := v_order.fulfillment_status;
  if v_order.fulfillment_status = 'fulfilled' then
    v_fulfillment_marked := true;
  elsif public.store_order_fulfillment_transition_allowed(
    v_order.fulfillment_status, 'fulfilled'
  ) then
    update public.orders
    set fulfillment_status = 'fulfilled',
        updated_at = timezone('utc', now())
    where id = v_order.id;

    insert into public.order_status_history (
      order_id, actor_user_id, from_status, to_status,
      from_fulfillment_status, to_fulfillment_status,
      from_payment_status, to_payment_status, note, source
    ) values (
      v_order.id, null, v_order.status, v_order.status,
      v_from_fulfillment, 'fulfilled',
      v_order.payment_status, v_order.payment_status,
      'Digital entitlement grant marked fulfillment fulfilled',
      'system'
    );
    v_fulfillment_marked := true;
  end if;

  insert into public.store_digital_entitlement_grant_events (
    event_key, payment_attempt_id, order_id, correlation_id,
    entitlements_granted, reservations_consumed, fulfillment_marked
  ) values (
    v_event_key, v_attempt.id, v_order.id, v_correlation_id,
    v_granted, v_consumed, v_fulfillment_marked
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'order_id', v_order.id,
    'payment_attempt_id', v_attempt.id,
    'entitlements_granted', v_granted,
    'reservations_consumed', v_consumed,
    'fulfillment_marked', v_fulfillment_marked
  );
end;
$$;


comment on function public.grant_store_digital_entitlements_after_capture(uuid, text, text) is
  'Service-role only. After trusted capture, grant digital entitlements, consume reservations, mark fulfillment fulfilled.';

revoke all on function public.grant_store_digital_entitlements_after_capture(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.grant_store_digital_entitlements_after_capture(uuid, text, text)
  to service_role;

create or replace function public.list_my_store_digital_entitlements(
  p_order_id uuid default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  lim integer := greatest(1, least(coalesce(p_limit, 50), 100));
  payload jsonb;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(
    jsonb_agg(row_to_json(t)::jsonb order by t.granted_at desc),
    '[]'::jsonb
  )
  into payload
  from (
    select
      e.id, e.order_id, e.order_item_id, e.product_id, e.store_id,
      e.status, e.title_snapshot, e.sku_snapshot, e.granted_at
    from public.store_digital_entitlements e
    where e.buyer_id = uid
      and e.status = 'active'
      and (p_order_id is null or e.order_id = p_order_id)
    order by e.granted_at desc
    limit lim
  ) t;

  return jsonb_build_object('ok', true, 'entitlements', payload);
end;
$$;

comment on function public.list_my_store_digital_entitlements(uuid, integer) is
  'Authenticated buyer lists own active digital entitlements (optional order filter).';

revoke all on function public.list_my_store_digital_entitlements(uuid, integer)
  from public, anon;
grant execute on function public.list_my_store_digital_entitlements(uuid, integer)
  to authenticated, service_role;
