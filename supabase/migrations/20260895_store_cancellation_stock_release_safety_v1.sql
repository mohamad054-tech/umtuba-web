-- =============================================================================
-- UMTUBA Commerce — Cancellation Stock Release & Safety Audit V1
-- Migration: 20260895_store_cancellation_stock_release_safety_v1.sql
-- Local file only — do NOT remote-apply without explicit approval.
--
-- Proven gap: seller/admin cancel of paid/authorized orders released active
-- holds (reserved -=) and could inflate sellable stock before purchase-stock
-- decrement. Unpaid cancel remains reserved-only release (never on_hand +=).
-- =============================================================================

create or replace function public.release_inventory_reservations_for_order(
  p_order_id uuid,
  p_reason text,
  p_actor_type text,
  p_actor_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.inventory_reservations%rowtype;
  released_count integer := 0;
  v_payment_status text;
begin
  if p_order_id is null then
    raise exception 'order_id is required';
  end if;

  select o.payment_status into v_payment_status
  from public.orders o
  where o.id = p_order_id
  for share;
  if not found then
    raise exception 'Order not found';
  end if;
  -- Cancellation stock safety: paid/authorized unwind must use refund restock,
  -- never release active holds (would inflate sellable stock).
  if v_payment_status in ('paid', 'authorized') then
    raise exception
      'Cannot release inventory reservations while order payment is paid or authorized';
  end if;

  for r in
    select *
    from public.inventory_reservations
    where order_id = p_order_id
      and status in ('active', 'pending_capture')
    for update
  loop
    perform public.transition_inventory_reservation(
      r.id,
      'released',
      coalesce(nullif(btrim(coalesce(p_reason, '')), ''), 'released'),
      coalesce(nullif(p_actor_type, ''), 'system'),
      p_actor_id,
      left(
        'release:' || r.id::text || ':' || coalesce(p_reason, 'released'),
        180
      ),
      null
    );
    released_count := released_count + 1;
  end loop;

  return released_count;
end;
$$;


revoke all on function public.release_inventory_reservations_for_order(
  uuid, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.release_inventory_reservations_for_order(
  uuid, text, text, uuid
) to service_role;

create or replace function public.update_store_order_status(
  p_order_id uuid,
  p_status text default null,
  p_fulfillment_status text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o public.orders%rowtype;
  next_status text;
  next_fulfillment text;
  note_text text := nullif(btrim(coalesce(p_note, '')), '');
  status_changed boolean := false;
  fulfillment_changed boolean := false;
  pre_ship boolean;
  actor_type text;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if p_order_id is null then
    raise exception 'order_id is required';
  end if;

  if p_status is null and p_fulfillment_status is null then
    raise exception 'At least one of status or fulfillment_status is required';
  end if;

  if note_text is not null and char_length(note_text) > 500 then
    raise exception 'Note is too long';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if not (
    public.is_store_member_with_role(o.store_id, array['owner', 'manager'])
    or public.is_platform_admin()
  ) then
    raise exception 'Not authorized to update this order';
  end if;

  if o.status in ('cancelled', 'refunded') then
    -- Already cancelled: ensure release is a safe no-op, then reject further edits.
    if o.status = 'cancelled' then
      perform public.release_inventory_reservations_for_order(
        o.id,
        'already_cancelled',
        case when public.is_platform_admin() then 'admin' else 'seller' end,
        uid
      );
    end if;
    raise exception 'Order is in a terminal state';
  end if;

  if o.status = 'delivered' and not public.is_platform_admin() then
    raise exception 'Order is in a terminal state';
  end if;

  next_status := o.status;
  next_fulfillment := o.fulfillment_status;

  if p_status is not null then
    next_status := lower(btrim(p_status));
    if next_status = 'refunded' and not public.is_platform_admin() then
      raise exception 'Sellers cannot set refunded status';
    end if;
    if not public.store_order_status_transition_allowed(o.status, next_status) then
      raise exception 'Invalid order status transition from % to %', o.status, next_status;
    end if;
    if next_status = 'cancelled' and o.status in ('shipped', 'delivered') then
      raise exception 'Cannot cancel a shipped or delivered order';
    end if;
    if next_status = 'cancelled'
       and o.payment_status in ('paid', 'authorized') then
      raise exception
        'Cannot cancel a paid or authorized order; use full-order refund path';
    end if;
    if next_status = 'cancelled'
       and public.order_has_consumed_reservations(o.id) then
      raise exception
        'Cannot cancel an order with consumed inventory reservations';
    end if;
    -- Commerce safety: unpaid orders must not progress to ship/deliver while
    -- deferred payment is still pending (prevents indefinite unpaid holds).
    if next_status in ('shipped', 'delivered')
       and o.payment_status is distinct from 'paid'
       and o.payment_status is distinct from 'authorized' then
      raise exception 'Cannot ship or deliver an unpaid order';
    end if;
    status_changed := next_status is distinct from o.status;
  end if;

  if p_fulfillment_status is not null then
    next_fulfillment := lower(btrim(p_fulfillment_status));
    if not public.store_order_fulfillment_transition_allowed(
      o.fulfillment_status, next_fulfillment
    ) then
      raise exception
        'Invalid fulfillment status transition from % to %',
        o.fulfillment_status, next_fulfillment;
    end if;
    fulfillment_changed := next_fulfillment is distinct from o.fulfillment_status;
  end if;

  if next_status = 'delivered' and next_fulfillment is distinct from 'fulfilled' then
    next_fulfillment := 'fulfilled';
    fulfillment_changed := next_fulfillment is distinct from o.fulfillment_status;
  end if;

  pre_ship := next_status in ('pending', 'confirmed', 'processing', 'packed');

  if not pre_ship then
    if next_fulfillment = 'unfulfilled'
       and o.fulfillment_status is distinct from 'unfulfilled' then
      raise exception 'Cannot mark shipped/delivered/cancelled orders unfulfilled';
    end if;
    if o.fulfillment_status = 'fulfilled' and next_fulfillment = 'partial' then
      raise exception 'Cannot reopen fulfillment after ship/deliver/cancel';
    end if;
  end if;

  if o.fulfillment_status = 'fulfilled'
     and next_fulfillment = 'partial'
     and not pre_ship then
    raise exception 'Cannot reopen fulfillment after ship/deliver/cancel';
  end if;

  if not status_changed and not fulfillment_changed then
    return jsonb_build_object(
      'order_id', o.id,
      'status', o.status,
      'fulfillment_status', o.fulfillment_status,
      'payment_status', o.payment_status,
      'unchanged', true
    );
  end if;

  update public.orders set
    status = next_status,
    fulfillment_status = next_fulfillment,
    confirmed_at = case
      when next_status = 'confirmed' then coalesce(confirmed_at, timezone('utc', now()))
      else confirmed_at
    end,
    processing_at = case
      when next_status = 'processing' then coalesce(processing_at, timezone('utc', now()))
      else processing_at
    end,
    packed_at = case
      when next_status = 'packed' then coalesce(packed_at, timezone('utc', now()))
      else packed_at
    end,
    shipped_at = case
      when next_status = 'shipped' then coalesce(shipped_at, timezone('utc', now()))
      else shipped_at
    end,
    delivered_at = case
      when next_status = 'delivered' then coalesce(delivered_at, timezone('utc', now()))
      else delivered_at
    end,
    cancelled_at = case
      when next_status = 'cancelled' then coalesce(cancelled_at, timezone('utc', now()))
      else cancelled_at
    end
  where id = o.id;

  actor_type := case when public.is_platform_admin() then 'admin' else 'seller' end;

  insert into public.order_status_history (
    order_id,
    actor_user_id,
    from_status,
    to_status,
    from_fulfillment_status,
    to_fulfillment_status,
    from_payment_status,
    to_payment_status,
    note,
    source
  ) values (
    o.id,
    uid,
    case when status_changed then o.status else null end,
    case when status_changed then next_status else null end,
    case when fulfillment_changed then o.fulfillment_status else null end,
    case when fulfillment_changed then next_fulfillment else null end,
    null,
    null,
    note_text,
    actor_type
  );

  if status_changed and next_status = 'cancelled' then
    perform public.release_inventory_reservations_for_order(
      o.id,
      case when actor_type = 'admin' then 'admin_cancel' else 'seller_cancel' end,
      actor_type,
      uid
    );
  end if;

  return jsonb_build_object(
    'order_id', o.id,
    'status', next_status,
    'fulfillment_status', next_fulfillment,
    'payment_status', o.payment_status,
    'unchanged', false
  );
end;
$$;


revoke all on function public.update_store_order_status(uuid, text, text, text)
  from public, anon;
grant execute on function public.update_store_order_status(uuid, text, text, text)
  to authenticated, service_role;
