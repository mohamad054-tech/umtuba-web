-- UMTUBA Store — Seller Orders Dashboard + Buyer Order History V1
-- Additive after 20260812. Fail-closed. No payment gateways.
-- Adds lifecycle timestamps, status audit history, and a seller-safe
-- status/fulfillment update RPC. payment_status is never seller-editable.
--
-- Trust boundary for update_store_order_status:
--   Caller supplies order_id + optional status / fulfillment_status / note.
--   Store authority is derived from the order row + is_store_member_with_role
--   (owner/manager) or is_platform_admin(). Client store_id is never trusted.
--   payment_status is never mutated by this RPC.
--
-- Fulfillment consistency (intentional):
--   delivered forces fulfillment = fulfilled.
--   fulfilled → partial is allowed only while order is pre-ship
--   (pending/confirmed/processing/packed) for packing corrections.
--   shipped/delivered/cancelled reject fulfillment downgrades to unfulfilled
--   and reject fulfilled → partial.

-- ---------------------------------------------------------------------------
-- 1) Lifecycle timestamps on orders
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists confirmed_at timestamptz,
  add column if not exists processing_at timestamptz,
  add column if not exists packed_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists cancelled_at timestamptz;

-- Set-once lifecycle stamps (null → value allowed; never clear/rewrite).
create or replace function public.enforce_order_lifecycle_timestamps_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if (old.confirmed_at is not null
        and new.confirmed_at is distinct from old.confirmed_at)
       or (old.processing_at is not null
        and new.processing_at is distinct from old.processing_at)
       or (old.packed_at is not null
        and new.packed_at is distinct from old.packed_at)
       or (old.shipped_at is not null
        and new.shipped_at is distinct from old.shipped_at)
       or (old.delivered_at is not null
        and new.delivered_at is distinct from old.delivered_at)
       or (old.cancelled_at is not null
        and new.cancelled_at is distinct from old.cancelled_at)
    then
      raise exception 'Order lifecycle timestamps are immutable once set';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_lifecycle_timestamps_immutable on public.orders;
create trigger orders_lifecycle_timestamps_immutable
  before update on public.orders
  for each row
  execute function public.enforce_order_lifecycle_timestamps_immutable();

-- Listing helpers (status filters on hot buyer/seller paths).
-- orders_buyer_created_at_idx / orders_store_created_at_idx already exist
-- from Orders Foundation; these composites add status for filtered lists.
create index if not exists orders_store_status_created_idx
  on public.orders (store_id, status, created_at desc);

create index if not exists orders_buyer_status_created_idx
  on public.orders (buyer_id, status, created_at desc);

create index if not exists orders_store_fulfillment_created_idx
  on public.orders (store_id, fulfillment_status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2) Order status audit history
-- ---------------------------------------------------------------------------

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  -- RESTRICT: deleting an order must not silently wipe audit history.
  order_id uuid not null references public.orders (id) on delete restrict,
  actor_user_id uuid references auth.users (id) on delete set null,
  from_status text
    check (
      from_status is null
      or from_status in (
        'pending','confirmed','processing','packed','shipped','delivered','cancelled','refunded'
      )
    ),
  to_status text
    check (
      to_status is null
      or to_status in (
        'pending','confirmed','processing','packed','shipped','delivered','cancelled','refunded'
      )
    ),
  from_fulfillment_status text
    check (
      from_fulfillment_status is null
      or from_fulfillment_status in ('unfulfilled','partial','fulfilled')
    ),
  to_fulfillment_status text
    check (
      to_fulfillment_status is null
      or to_fulfillment_status in ('unfulfilled','partial','fulfilled')
    ),
  from_payment_status text
    check (
      from_payment_status is null
      or from_payment_status in ('pending','authorized','paid','failed','refunded')
    ),
  to_payment_status text
    check (
      to_payment_status is null
      or to_payment_status in ('pending','authorized','paid','failed','refunded')
    ),
  note text check (note is null or char_length(note) <= 500),
  source text not null default 'seller'
    check (source in ('seller', 'system', 'admin', 'buyer')),
  created_at timestamptz not null default now(),
  constraint order_status_history_change_check check (
    to_status is not null
    or to_fulfillment_status is not null
    or to_payment_status is not null
  )
);

create index if not exists order_status_history_order_created_idx
  on public.order_status_history (order_id, created_at asc);

alter table public.order_status_history enable row level security;
alter table public.order_status_history force row level security;
revoke all on public.order_status_history from anon, public;
grant select on public.order_status_history to authenticated;
revoke insert, update, delete on public.order_status_history from authenticated;

drop policy if exists "Read order status history via parent order"
  on public.order_status_history;
create policy "Read order status history via parent order"
  on public.order_status_history for select to authenticated
  using (public.can_read_store_order(order_id));

-- ---------------------------------------------------------------------------
-- 3) Transition helpers (not callable by clients)
-- ---------------------------------------------------------------------------

create or replace function public.store_order_status_transition_allowed(
  p_from text,
  p_to text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when p_from is null or p_to is null then false
    when p_from = p_to then true
    when p_from = 'pending' and p_to in ('confirmed', 'cancelled') then true
    when p_from = 'confirmed' and p_to in ('processing', 'cancelled') then true
    when p_from = 'processing' and p_to in ('packed', 'cancelled') then true
    when p_from = 'packed' and p_to in ('shipped', 'cancelled') then true
    when p_from = 'shipped' and p_to = 'delivered' then true
    -- refunded is admin/payment-system only (not seller-callable).
    when p_from = 'delivered' and p_to = 'refunded' then true
    else false
  end;
$$;

create or replace function public.store_order_fulfillment_transition_allowed(
  p_from text,
  p_to text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when p_from is null or p_to is null then false
    when p_from = p_to then true
    when p_from = 'unfulfilled' and p_to in ('partial', 'fulfilled') then true
    when p_from = 'partial' and p_to in ('unfulfilled', 'fulfilled') then true
    -- fulfilled → partial only for pre-ship corrections (enforced in RPC).
    when p_from = 'fulfilled' and p_to = 'partial' then true
    else false
  end;
$$;

revoke all on function public.store_order_status_transition_allowed(text, text)
  from public, anon, authenticated;
grant execute on function public.store_order_status_transition_allowed(text, text)
  to service_role;

revoke all on function public.store_order_fulfillment_transition_allowed(text, text)
  from public, anon, authenticated;
grant execute on function public.store_order_fulfillment_transition_allowed(text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 4) Seller-safe order status update RPC
-- ---------------------------------------------------------------------------

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

  -- Lock first, then authorize against locked row (no TOCTOU on status).
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  -- Authority from order.store_id only — never from client-supplied store_id.
  -- Re-checked after lock so membership revocation wins races.
  if not (
    public.is_store_member_with_role(o.store_id, array['owner', 'manager'])
    or public.is_platform_admin()
  ) then
    raise exception 'Not authorized to update this order';
  end if;

  -- Terminal states: no seller mutations (refunded is admin/payment path).
  if o.status in ('cancelled', 'refunded') then
    raise exception 'Order is in a terminal state';
  end if;

  -- Delivered is terminal for sellers (no further status/fulfillment edits).
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

  -- Delivered always implies fulfilled (auto-correct if needed).
  if next_status = 'delivered' and next_fulfillment is distinct from 'fulfilled' then
    next_fulfillment := 'fulfilled';
    fulfillment_changed := next_fulfillment is distinct from o.fulfillment_status;
  end if;

  pre_ship := next_status in ('pending', 'confirmed', 'processing', 'packed');

  -- Block fulfillment downgrades after ship / on cancel / after deliver.
  if not pre_ship then
    if next_fulfillment = 'unfulfilled'
       and o.fulfillment_status is distinct from 'unfulfilled' then
      raise exception 'Cannot mark shipped/delivered/cancelled orders unfulfilled';
    end if;
    if o.fulfillment_status = 'fulfilled' and next_fulfillment = 'partial' then
      raise exception 'Cannot reopen fulfillment after ship/deliver/cancel';
    end if;
  end if;

  -- fulfilled → partial only while still pre-ship.
  if o.fulfillment_status = 'fulfilled'
     and next_fulfillment = 'partial'
     and not pre_ship then
    raise exception 'Cannot reopen fulfillment after ship/deliver/cancel';
  end if;

  -- Same-state retry: no write, no audit row.
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
    -- payment_status intentionally omitted — never seller-editable.
    -- buyer_id / store_id / money / snapshots untouched.
  where id = o.id;

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
    case when public.is_platform_admin() then 'admin' else 'seller' end
  );

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
