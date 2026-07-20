-- Store Commerce Safety & Inventory Reservation V1
-- Additive on Store Hardening V1 (20260818) + checkout/payments/orders foundations.
--
-- Scope:
--   - DB-authoritative commerce confirm gate (default OFF / fail-closed)
--   - Inventory reservation ledger + append-only events
--   - Safe checkout confirmation (ACTIVE holds only; no on_hand consume)
--   - Release on cancel; expiry RPC contract (manual/ops — no GHA schedule here)
--   - Narrow buyer cancel for unpaid pre-fulfillment orders
--
-- NOT in scope: Stripe/PayPal/webhooks/capture/refunds/payouts/commissions/carrier APIs.
--
-- Filename note: next unused Store version after 20260818_store_hardening_v1.sql.

-- ---------------------------------------------------------------------------
-- 1) Commerce config (DB primary gate + centralized TTL)
-- ---------------------------------------------------------------------------

create table if not exists public.store_commerce_config (
  key text primary key,
  value integer not null,
  description text,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.store_commerce_config (key, value, description) values
  (
    'commerce_confirm_enabled',
    0,
    'When 1, checkout confirm / direct order create allowed (subject to server kill switch). Default 0 = fail closed.'
  ),
  (
    'reservation_ttl_minutes',
    30,
    'Active/pending_capture reservation hold TTL in minutes. Read by RPCs — never hard-code TTL in confirm/expire bodies.'
  )
on conflict (key) do nothing;

alter table public.store_commerce_config enable row level security;

drop policy if exists "Store commerce config is readable" on public.store_commerce_config;
create policy "Store commerce config is readable"
  on public.store_commerce_config
  for select
  to authenticated, anon
  using (true);

revoke insert, update, delete on public.store_commerce_config from anon, authenticated;
grant select on public.store_commerce_config to anon, authenticated, service_role;

-- Append-only audit for emergency commerce gate toggles.
create table if not exists public.store_commerce_config_audit (
  id uuid primary key default gen_random_uuid(),
  config_key text not null,
  old_value integer,
  new_value integer not null,
  actor_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists store_commerce_config_audit_created_idx
  on public.store_commerce_config_audit (created_at desc);

alter table public.store_commerce_config_audit enable row level security;
alter table public.store_commerce_config_audit force row level security;

drop policy if exists "Platform admins read commerce config audit"
  on public.store_commerce_config_audit;
create policy "Platform admins read commerce config audit"
  on public.store_commerce_config_audit
  for select
  to authenticated
  using (public.is_platform_admin());

revoke insert, update, delete on public.store_commerce_config_audit
  from anon, authenticated;
grant select on public.store_commerce_config_audit to authenticated, service_role;

create or replace function public.store_commerce_config_value(
  p_key text,
  p_default integer default 0
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select c.value from public.store_commerce_config c where c.key = p_key),
    p_default
  );
$$;

revoke all on function public.store_commerce_config_value(text, integer) from public;
grant execute on function public.store_commerce_config_value(text, integer)
  to authenticated, service_role;

-- DB gate only. App layer may additionally deny via server-only kill switch.
-- Precedence (app): env kill ON → deny; else DB OFF → deny; else allow.
-- Env can never force-enable when DB is OFF.
create or replace function public.store_commerce_confirm_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.store_commerce_config_value('commerce_confirm_enabled', 0) = 1;
$$;

revoke all on function public.store_commerce_confirm_enabled() from public;
grant execute on function public.store_commerce_confirm_enabled()
  to authenticated, service_role;

create or replace function public.assert_store_commerce_confirm_allowed()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.store_commerce_confirm_enabled() then
    raise exception 'Commerce confirmation is disabled';
  end if;
end;
$$;

revoke all on function public.assert_store_commerce_confirm_allowed() from public;
-- Callable only from DEFINER siblings / service_role tooling.
grant execute on function public.assert_store_commerce_confirm_allowed()
  to service_role;

create or replace function public.admin_set_commerce_confirm_enabled(
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
  next_val integer;
  old_val integer;
begin
  admin_id := public.require_platform_admin();
  if p_enabled is null then
    raise exception 'enabled flag is required';
  end if;
  next_val := case when p_enabled then 1 else 0 end;

  select c.value into old_val
  from public.store_commerce_config c
  where c.key = 'commerce_confirm_enabled';

  insert into public.store_commerce_config (key, value, description, updated_at)
  values (
    'commerce_confirm_enabled',
    next_val,
    'When 1, checkout confirm / direct order create allowed (subject to server kill switch). Default 0 = fail closed.',
    timezone('utc', now())
  )
  on conflict (key) do update
    set value = excluded.value,
        updated_at = timezone('utc', now());

  insert into public.store_commerce_config_audit (
    config_key, old_value, new_value, actor_id
  ) values (
    'commerce_confirm_enabled', old_val, next_val, admin_id
  );

  return jsonb_build_object(
    'commerce_confirm_enabled', next_val = 1,
    'updated_by', admin_id,
    'updated_at', timezone('utc', now()),
    'audited', true
  );
end;
$$;

revoke all on function public.admin_set_commerce_confirm_enabled(boolean)
  from public, anon;
grant execute on function public.admin_set_commerce_confirm_enabled(boolean)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Quote session column
-- ---------------------------------------------------------------------------

alter table public.checkout_quotes
  add column if not exists checkout_session_id uuid;

create unique index if not exists checkout_quotes_checkout_session_id_uidx
  on public.checkout_quotes (checkout_session_id)
  where checkout_session_id is not null;

-- ---------------------------------------------------------------------------
-- 3) Reservation ledger + append-only events
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users (id) on delete restrict,
  cart_id uuid references public.carts (id) on delete set null,
  checkout_quote_id uuid references public.checkout_quotes (id) on delete set null,
  checkout_session_id uuid not null,
  order_id uuid references public.orders (id) on delete set null,
  store_id uuid not null references public.stores (id) on delete restrict,
  product_id uuid not null references public.store_products (id) on delete restrict,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  warehouse_key text not null default 'default'
    constraint inventory_reservations_warehouse_key_chk
      check (warehouse_key ~ '^[a-z0-9][a-z0-9_-]{0,62}$'),
  quantity integer not null
    constraint inventory_reservations_quantity_chk check (quantity > 0),
  status text not null default 'active'
    constraint inventory_reservations_status_chk check (
      status in ('active', 'pending_capture', 'consumed', 'released', 'expired')
    ),
  idempotency_key text not null
    constraint inventory_reservations_idempotency_key_chk check (
      char_length(idempotency_key) between 8 and 160
    ),
  expires_at timestamptz not null,
  release_reason text,
  released_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inventory_reservations_idempotency_key_uidx unique (idempotency_key)
);

create index if not exists inventory_reservations_session_idx
  on public.inventory_reservations (checkout_session_id, status);

create index if not exists inventory_reservations_order_idx
  on public.inventory_reservations (order_id, status)
  where order_id is not null;

create index if not exists inventory_reservations_store_status_idx
  on public.inventory_reservations (store_id, status, expires_at);

create index if not exists inventory_reservations_expiry_idx
  on public.inventory_reservations (expires_at)
  where status in ('active', 'pending_capture');

create index if not exists inventory_reservations_buyer_idx
  on public.inventory_reservations (buyer_id, created_at desc);

create table if not exists public.inventory_reservation_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.inventory_reservations (id) on delete cascade,
  checkout_session_id uuid not null,
  order_id uuid,
  from_status text,
  to_status text not null
    constraint inventory_reservation_events_to_status_chk check (
      to_status in ('active', 'pending_capture', 'consumed', 'released', 'expired')
    ),
  reason text,
  actor_type text not null
    constraint inventory_reservation_events_actor_type_chk check (
      actor_type in ('system', 'buyer', 'seller', 'admin', 'job')
    ),
  actor_id uuid,
  quantity integer not null check (quantity > 0),
  reserved_delta integer not null default 0,
  idempotency_key text
    constraint inventory_reservation_events_idempotency_key_chk check (
      idempotency_key is null
      or char_length(idempotency_key) between 8 and 180
    ),
  created_at timestamptz not null default timezone('utc', now()),
  constraint inventory_reservation_events_idempotency_key_uidx unique (idempotency_key)
);

create index if not exists inventory_reservation_events_reservation_idx
  on public.inventory_reservation_events (reservation_id, created_at);

create index if not exists inventory_reservation_events_session_idx
  on public.inventory_reservation_events (checkout_session_id, created_at desc);

alter table public.inventory_reservations enable row level security;
alter table public.inventory_reservations force row level security;
alter table public.inventory_reservation_events enable row level security;
alter table public.inventory_reservation_events force row level security;

drop policy if exists "Buyers read own inventory reservations" on public.inventory_reservations;
create policy "Buyers read own inventory reservations"
  on public.inventory_reservations
  for select
  to authenticated
  using (
    buyer_id = (select auth.uid())
    or public.is_platform_admin()
    or public.is_store_member_with_role(store_id, array['owner', 'manager'])
  );

drop policy if exists "Buyers read own inventory reservation events" on public.inventory_reservation_events;
create policy "Buyers read own inventory reservation events"
  on public.inventory_reservation_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.inventory_reservations r
      where r.id = reservation_id
        and (
          r.buyer_id = (select auth.uid())
          or public.is_platform_admin()
          or public.is_store_member_with_role(r.store_id, array['owner', 'manager'])
        )
    )
  );

revoke insert, update, delete on public.inventory_reservations
  from anon, authenticated;
revoke insert, update, delete on public.inventory_reservation_events
  from anon, authenticated;
grant select on public.inventory_reservations to authenticated, service_role;
grant select on public.inventory_reservation_events to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3b) Protect product_inventory.reserved from client/seller writes
-- Reservation helpers set a transaction-local GUC before mutating reserved.
-- ---------------------------------------------------------------------------

create or replace function public.allow_product_inventory_reserved_write()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('umtuba.allow_inventory_reserved_write', '1', true);
end;
$$;

revoke all on function public.allow_product_inventory_reserved_write()
  from public, anon, authenticated;
grant execute on function public.allow_product_inventory_reserved_write()
  to service_role;

create or replace function public.protect_product_inventory_reserved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed text := coalesce(
    nullif(current_setting('umtuba.allow_inventory_reserved_write', true), ''),
    '0'
  );
begin
  if tg_op = 'INSERT' then
    if coalesce(new.reserved, 0) <> 0 and allowed is distinct from '1' then
      raise exception 'Reserved inventory is system-managed';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.reserved is distinct from old.reserved
       and allowed is distinct from '1' then
      raise exception 'Reserved inventory is system-managed';
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists product_inventory_protect_reserved on public.product_inventory;
create trigger product_inventory_protect_reserved
  before insert or update on public.product_inventory
  for each row
  execute function public.protect_product_inventory_reserved();

revoke all on function public.protect_product_inventory_reserved()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Reservation transition helper (pointer + event in one transaction)
-- ---------------------------------------------------------------------------

create or replace function public.transition_inventory_reservation(
  p_reservation_id uuid,
  p_to_status text,
  p_reason text,
  p_actor_type text,
  p_actor_id uuid,
  p_event_idempotency_key text default null,
  p_reserved_delta integer default null
)
returns public.inventory_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.inventory_reservations%rowtype;
  from_st text;
  delta integer;
  inv public.product_inventory%rowtype;
begin
  if p_reservation_id is null then
    raise exception 'reservation_id is required';
  end if;
  if p_to_status is null or p_to_status not in (
    'active', 'pending_capture', 'consumed', 'released', 'expired'
  ) then
    raise exception 'Invalid reservation status';
  end if;
  if p_actor_type is null or p_actor_type not in (
    'system', 'buyer', 'seller', 'admin', 'job'
  ) then
    raise exception 'Invalid actor_type';
  end if;

  select * into r
  from public.inventory_reservations
  where id = p_reservation_id
  for update;
  if not found then
    raise exception 'Reservation not found';
  end if;

  from_st := r.status;

  -- Idempotent terminal no-op: already in target terminal state.
  if from_st = p_to_status
     and p_to_status in ('released', 'expired', 'consumed') then
    return r;
  end if;

  -- Allowed transitions.
  if from_st = 'active' and p_to_status in (
    'pending_capture', 'consumed', 'released', 'expired'
  ) then
    null;
  elsif from_st = 'pending_capture' and p_to_status in (
    'consumed', 'released', 'expired'
  ) then
    null;
  elsif from_st = p_to_status then
    return r;
  else
    raise exception 'Invalid reservation transition from % to %', from_st, p_to_status;
  end if;

  -- Counter adjustment: releasing/expiring active holds decrements reserved.
  if p_reserved_delta is not null then
    delta := p_reserved_delta;
  elsif from_st in ('active', 'pending_capture')
        and p_to_status in ('released', 'expired') then
    delta := -r.quantity;
  elsif from_st in ('active', 'pending_capture')
        and p_to_status = 'consumed' then
    -- Consume: drop reserved hold; on_hand decrement is payment-phase only (not V1).
    delta := -r.quantity;
  else
    delta := 0;
  end if;

  if delta <> 0 then
    perform public.allow_product_inventory_reserved_write();
    select * into inv
    from public.product_inventory
    where variant_id = r.variant_id
      and warehouse_key = r.warehouse_key
    for update;
    if not found then
      raise exception 'Inventory row missing for reservation release';
    end if;
    if inv.reserved + delta < 0 then
      raise exception 'Reserved inventory counter would go negative';
    end if;
    if inv.reserved + delta > inv.on_hand then
      raise exception 'Reserved inventory counter would exceed on_hand';
    end if;
    update public.product_inventory
      set reserved = reserved + delta,
          updated_at = timezone('utc', now())
    where id = inv.id;
  end if;

  update public.inventory_reservations
    set status = p_to_status,
        release_reason = case
          when p_to_status in ('released', 'expired')
            then coalesce(nullif(btrim(coalesce(p_reason, '')), ''), release_reason)
          else release_reason
        end,
        released_at = case
          when p_to_status in ('released', 'expired')
            then coalesce(released_at, timezone('utc', now()))
          else released_at
        end,
        consumed_at = case
          when p_to_status = 'consumed'
            then coalesce(consumed_at, timezone('utc', now()))
          else consumed_at
        end,
        updated_at = timezone('utc', now())
  where id = r.id
  returning * into r;

  insert into public.inventory_reservation_events (
    reservation_id,
    checkout_session_id,
    order_id,
    from_status,
    to_status,
    reason,
    actor_type,
    actor_id,
    quantity,
    reserved_delta,
    idempotency_key
  ) values (
    r.id,
    r.checkout_session_id,
    r.order_id,
    from_st,
    p_to_status,
    nullif(btrim(coalesce(p_reason, '')), ''),
    p_actor_type,
    p_actor_id,
    r.quantity,
    delta,
    p_event_idempotency_key
  );

  return r;
end;
$$;

revoke all on function public.transition_inventory_reservation(
  uuid, text, text, text, uuid, text, integer
) from public, anon, authenticated;
grant execute on function public.transition_inventory_reservation(
  uuid, text, text, text, uuid, text, integer
) to service_role;

-- ---------------------------------------------------------------------------
-- 5) Create ACTIVE reservation (confirm / direct order create)
-- ---------------------------------------------------------------------------

create or replace function public.create_active_inventory_reservation(
  p_buyer_id uuid,
  p_cart_id uuid,
  p_checkout_quote_id uuid,
  p_checkout_session_id uuid,
  p_order_id uuid,
  p_store_id uuid,
  p_product_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_idempotency_key text,
  p_actor_type text default 'system',
  p_actor_id uuid default null
)
returns public.inventory_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.inventory_reservations%rowtype;
  inv public.product_inventory%rowtype;
  ttl_minutes integer;
  expires_at timestamptz;
  available integer;
  r public.inventory_reservations%rowtype;
begin
  if p_buyer_id is null or p_checkout_session_id is null
     or p_store_id is null or p_product_id is null or p_variant_id is null then
    raise exception 'Reservation identity fields are required';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Reservation quantity must be positive';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) < 8 then
    raise exception 'Reservation idempotency_key is required';
  end if;

  select * into existing
  from public.inventory_reservations
  where idempotency_key = p_idempotency_key
  for update;
  if found then
    if existing.status in ('active', 'pending_capture')
       and existing.quantity = p_quantity
       and existing.variant_id = p_variant_id
       and existing.checkout_session_id = p_checkout_session_id then
      if p_order_id is not null and existing.order_id is null then
        update public.inventory_reservations
          set order_id = p_order_id,
              updated_at = timezone('utc', now())
        where id = existing.id
        returning * into existing;
        insert into public.inventory_reservation_events (
          reservation_id, checkout_session_id, order_id,
          from_status, to_status, reason, actor_type, actor_id,
          quantity, reserved_delta, idempotency_key
        ) values (
          existing.id, existing.checkout_session_id, p_order_id,
          existing.status, existing.status, 'order_attached', p_actor_type, p_actor_id,
          existing.quantity, 0,
          left('attach:' || existing.id::text || ':' || p_order_id::text, 180)
        );
      end if;
      return existing;
    end if;
    raise exception 'Reservation idempotency conflict';
  end if;

  ttl_minutes := public.store_commerce_config_value('reservation_ttl_minutes', 30);
  if ttl_minutes < 1 then
    ttl_minutes := 30;
  end if;
  expires_at := timezone('utc', now()) + make_interval(mins => ttl_minutes);

  select * into inv
  from public.product_inventory
  where variant_id = p_variant_id
    and warehouse_key = 'default'
  for update;

  if not found then
    raise exception 'Insufficient inventory for checkout';
  end if;

  available := greatest(inv.on_hand - inv.reserved - inv.safety_stock, 0);
  if not inv.allow_backorder and p_quantity > available then
    raise exception 'Insufficient inventory for checkout';
  end if;

  if inv.reserved + p_quantity > inv.on_hand then
    raise exception 'Insufficient inventory for checkout';
  end if;

  perform public.allow_product_inventory_reserved_write();
  update public.product_inventory
    set reserved = reserved + p_quantity,
        updated_at = timezone('utc', now())
  where id = inv.id;

  insert into public.inventory_reservations (
    buyer_id,
    cart_id,
    checkout_quote_id,
    checkout_session_id,
    order_id,
    store_id,
    product_id,
    variant_id,
    warehouse_key,
    quantity,
    status,
    idempotency_key,
    expires_at
  ) values (
    p_buyer_id,
    p_cart_id,
    p_checkout_quote_id,
    p_checkout_session_id,
    p_order_id,
    p_store_id,
    p_product_id,
    p_variant_id,
    'default',
    p_quantity,
    'active',
    p_idempotency_key,
    expires_at
  )
  returning * into r;

  insert into public.inventory_reservation_events (
    reservation_id,
    checkout_session_id,
    order_id,
    from_status,
    to_status,
    reason,
    actor_type,
    actor_id,
    quantity,
    reserved_delta,
    idempotency_key
  ) values (
    r.id,
    r.checkout_session_id,
    r.order_id,
    null,
    'active',
    'checkout_confirm_reserve',
    coalesce(nullif(p_actor_type, ''), 'system'),
    p_actor_id,
    r.quantity,
    p_quantity,
    left('create:' || p_idempotency_key, 180)
  );

  return r;
end;
$$;

revoke all on function public.create_active_inventory_reservation(
  uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.create_active_inventory_reservation(
  uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer, text, text, uuid
) to service_role;

-- ---------------------------------------------------------------------------
-- 6) Release helpers (idempotent)
-- ---------------------------------------------------------------------------

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
begin
  if p_order_id is null then
    raise exception 'order_id is required';
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

create or replace function public.order_has_consumed_reservations(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.inventory_reservations r
    where r.order_id = p_order_id
      and r.status = 'consumed'
  );
$$;

revoke all on function public.order_has_consumed_reservations(uuid)
  from public, anon, authenticated;
grant execute on function public.order_has_consumed_reservations(uuid)
  to service_role;

create or replace function public.order_eligible_for_reservation_expiry_cancel(
  p_order public.orders
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_order.id is null then
    return false;
  end if;
  if p_order.status = 'cancelled' then
    return false;
  end if;
  if p_order.payment_status in ('paid', 'authorized') then
    return false;
  end if;
  if p_order.status in ('shipped', 'delivered', 'refunded') then
    return false;
  end if;
  if public.order_has_consumed_reservations(p_order.id) then
    return false;
  end if;
  -- Unpaid pending-payment orders in pre-fulfillment states only.
  if p_order.payment_status is distinct from 'pending' then
    return false;
  end if;
  if p_order.status not in ('pending', 'confirmed', 'processing', 'packed') then
    return false;
  end if;
  return true;
end;
$$;

revoke all on function public.order_eligible_for_reservation_expiry_cancel(public.orders)
  from public, anon, authenticated;
grant execute on function public.order_eligible_for_reservation_expiry_cancel(public.orders)
  to service_role;

-- ---------------------------------------------------------------------------
-- 7) Expiry cleanup RPC (contract only — no automatic schedule in this phase)
-- ---------------------------------------------------------------------------

create or replace function public.expire_inventory_reservations(
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer := greatest(1, least(coalesce(p_limit, 100), 500));
  r public.inventory_reservations%rowtype;
  o public.orders%rowtype;
  expired_count integer := 0;
  cancelled_orders integer := 0;
  skipped_protected integer := 0;
  order_ids uuid[] := '{}';
  oid uuid;
begin
  -- Manual / ops invocation foundation. Do not claim a live scheduler here.
  for r in
    select *
    from public.inventory_reservations
    where status in ('active', 'pending_capture')
      and expires_at <= timezone('utc', now())
    order by expires_at asc
    limit lim
    for update skip locked
  loop
    o := null;
    if r.order_id is not null then
      select * into o from public.orders where id = r.order_id for update;
      if found then
        if o.payment_status in ('paid', 'authorized')
           or o.status in ('shipped', 'delivered', 'refunded')
           or public.order_has_consumed_reservations(o.id) then
          skipped_protected := skipped_protected + 1;
          continue;
        end if;
      end if;
    end if;

    perform public.transition_inventory_reservation(
      r.id,
      'expired',
      'reservation_ttl_expired',
      'job',
      null,
      left('expire:' || r.id::text || ':' || r.expires_at::text, 180),
      null
    );
    expired_count := expired_count + 1;

    if r.order_id is not null and not (r.order_id = any (order_ids)) then
      order_ids := array_append(order_ids, r.order_id);
    end if;
  end loop;

  foreach oid in array order_ids
  loop
    select * into o from public.orders where id = oid for update;
    if not found then
      continue;
    end if;
    -- Already cancelled: safe no-op for cancel; reservations already released/expired.
    if o.status = 'cancelled' then
      continue;
    end if;
    if not public.order_eligible_for_reservation_expiry_cancel(o) then
      continue;
    end if;
    -- Only auto-cancel when no remaining active/pending_capture holds on the order.
    if exists (
      select 1 from public.inventory_reservations ir
      where ir.order_id = oid
        and ir.status in ('active', 'pending_capture')
    ) then
      continue;
    end if;

    update public.orders
      set status = 'cancelled',
          cancelled_at = coalesce(cancelled_at, timezone('utc', now()))
    where id = oid;

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
      oid,
      null,
      o.status,
      'cancelled',
      null,
      null,
      null,
      null,
      'system:reservation_ttl_expired',
      'system'
    );

    cancelled_orders := cancelled_orders + 1;
  end loop;

  return jsonb_build_object(
    'expired_reservations', expired_count,
    'cancelled_orders', cancelled_orders,
    'skipped_protected', skipped_protected,
    'limit', lim
  );
end;
$$;

revoke all on function public.expire_inventory_reservations(integer)
  from public, anon, authenticated;
grant execute on function public.expire_inventory_reservations(integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- 8) Buyer cancel (narrow)
-- ---------------------------------------------------------------------------

create or replace function public.buyer_cancel_store_order(
  p_order_id uuid,
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
  note_text text := nullif(btrim(coalesce(p_note, '')), '');
  released integer;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_order_id is null then
    raise exception 'order_id is required';
  end if;
  if note_text is not null and char_length(note_text) > 500 then
    raise exception 'Note is too long';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if o.buyer_id is distinct from uid then
    raise exception 'Order access denied';
  end if;

  -- Idempotent: already cancelled.
  if o.status = 'cancelled' then
    perform public.release_inventory_reservations_for_order(
      o.id, 'buyer_cancel', 'buyer', uid
    );
    return jsonb_build_object(
      'order_id', o.id,
      'status', 'cancelled',
      'payment_status', o.payment_status,
      'unchanged', true
    );
  end if;

  if o.payment_status is distinct from 'pending' then
    raise exception 'Only pending-payment orders can be cancelled by the buyer';
  end if;
  if o.status not in ('pending', 'confirmed', 'processing', 'packed') then
    raise exception 'Order is not eligible for buyer cancellation';
  end if;
  if o.status in ('shipped', 'delivered', 'refunded') then
    raise exception 'Order is not eligible for buyer cancellation';
  end if;
  if public.order_has_consumed_reservations(o.id) then
    raise exception 'Order is not eligible for buyer cancellation';
  end if;
  if not exists (
    select 1 from public.inventory_reservations r
    where r.order_id = o.id
      and r.status in ('active', 'pending_capture')
  ) then
    -- Allow cancel of unpaid orders even if holds already released (e.g. race),
    -- but still require pre-fulfillment unpaid state above.
    null;
  end if;

  update public.orders
    set status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, timezone('utc', now()))
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
    o.status,
    'cancelled',
    null,
    null,
    null,
    null,
    coalesce(note_text, 'buyer_cancel'),
    'buyer'
  );

  released := public.release_inventory_reservations_for_order(
    o.id, 'buyer_cancel', 'buyer', uid
  );

  return jsonb_build_object(
    'order_id', o.id,
    'status', 'cancelled',
    'payment_status', o.payment_status,
    'reservations_released', released,
    'unchanged', false
  );
end;
$$;

revoke all on function public.buyer_cancel_store_order(uuid, text)
  from public, anon;
grant execute on function public.buyer_cancel_store_order(uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9) Seller/admin status update — release on cancel
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

-- ---------------------------------------------------------------------------
-- 10) Direct order create — same gate + ACTIVE reservations
-- ---------------------------------------------------------------------------

create or replace function public.create_store_order_foundation(
  p_buyer_id uuid,
  p_store_id uuid,
  p_currency text,
  p_items jsonb,
  p_discount_total_minor bigint default 0,
  p_tax_total_minor bigint default 0,
  p_shipping_total_minor bigint default 0,
  p_notes text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  order_id uuid;
  session_id uuid := gen_random_uuid();
  item jsonb;
  product_id uuid;
  variant_id uuid;
  qty integer;
  idem text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service_role required to create store orders';
  end if;

  perform public.assert_store_commerce_confirm_allowed();

  order_id := public.create_store_order_foundation_core(
    p_buyer_id,
    p_store_id,
    p_currency,
    p_items,
    p_discount_total_minor,
    p_tax_total_minor,
    p_shipping_total_minor,
    p_notes,
    p_idempotency_key
  );

  for item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    variant_id := nullif(item->>'variant_id', '')::uuid;
    product_id := nullif(item->>'product_id', '')::uuid;
    qty := coalesce((item->>'quantity')::integer, 0);
    if variant_id is null or product_id is null or qty < 1 then
      raise exception 'Invalid order item for reservation';
    end if;
    idem := left(
      'direct:' || session_id::text || ':' || variant_id::text,
      160
    );
    perform public.create_active_inventory_reservation(
      p_buyer_id,
      null,
      null,
      session_id,
      order_id,
      p_store_id,
      product_id,
      variant_id,
      qty,
      idem,
      'system',
      null
    );
  end loop;

  return order_id;
end;
$$;

revoke all on function public.create_store_order_foundation(
  uuid, uuid, text, jsonb, bigint, bigint, bigint, text, text
) from public, anon, authenticated;
grant execute on function public.create_store_order_foundation(
  uuid, uuid, text, jsonb, bigint, bigint, bigint, text, text
) to service_role;

-- ---------------------------------------------------------------------------
-- 11) Safe checkout confirmation
-- ---------------------------------------------------------------------------

create or replace function public.confirm_store_checkout_quote(
  p_quote_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  q public.checkout_quotes%rowtype;
  grp jsonb;
  order_id uuid;
  orders_out jsonb := '[]'::jsonb;
  order_number text;
  items jsonb;
  ship_addr jsonb;
  bill_addr jsonb;
  coupon_id uuid;
  disc_snap jsonb;
  sid uuid;
  store_subtotal bigint;
  store_discount bigint;
  store_tax bigint;
  store_shipping bigint;
  store_grand bigint;
  tax_incl boolean;
  tax_rate integer;
  tax_snap jsonb;
  ship record;
  coupon record;
  items_json jsonb;
  line record;
  inv_available integer;
  inv_on_hand integer;
  inv_reserved integer;
  inv_safety integer;
  inv_backorder boolean;
  method_code text;
  quoted_subtotal bigint;
  quoted_grand bigint;
  coupon_applied boolean := false;
  product_ids uuid[] := '{}';
  category_ids uuid[] := '{}';
  buyer_country text;
  buyer_region text;
  session_id uuid;
  res_idem text;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  perform public.assert_store_commerce_confirm_allowed();

  select * into q from public.checkout_quotes where id = p_quote_id for update;
  if not found then
    raise exception 'Checkout quote not found';
  end if;
  if q.buyer_id is distinct from uid then
    raise exception 'Checkout quote access denied';
  end if;
  if q.status = 'confirmed' then
    return jsonb_build_object(
      'status', 'confirmed',
      'orders', coalesce(q.quote_payload->'orders', '[]'::jsonb),
      'checkout_session_id', q.checkout_session_id,
      'payment_note', coalesce(
        q.quote_payload->>'payment_note',
        'Payment collection is not enabled yet. Your order is recorded as pending payment.'
      ),
      'idempotent', true
    );
  end if;
  if q.status is distinct from 'open' then
    raise exception 'Checkout quote is not open';
  end if;
  if q.expires_at <= timezone('utc', now()) then
    update public.checkout_quotes set status = 'expired' where id = q.id;
    raise exception 'Checkout quote has expired';
  end if;

  if not exists (
    select 1 from public.carts c
    where c.id = q.cart_id and c.user_id = uid and c.status = 'active'
  ) then
    raise exception 'Cart is no longer active for this quote';
  end if;

  -- One server-side session per confirmation attempt; reuse on in-txn retries only.
  session_id := coalesce(q.checkout_session_id, gen_random_uuid());
  if q.checkout_session_id is null then
    update public.checkout_quotes
      set checkout_session_id = session_id,
          updated_at = timezone('utc', now())
    where id = q.id;
  end if;

  ship_addr := q.address_snapshot;
  buyer_country := nullif(btrim(coalesce(ship_addr->>'country_code', '')), '');
  buyer_region := nullif(btrim(coalesce(ship_addr->>'region', '')), '');
  bill_addr := q.billing_contact_snapshot;

  for grp in select value from jsonb_array_elements(q.quote_payload->'groups')
  loop
    sid := (grp->>'store_id')::uuid;
    store_subtotal := 0;
    items_json := '[]'::jsonb;
    product_ids := '{}';
    category_ids := '{}';
    method_code := coalesce(
      q.shipping_selections->>sid::text,
      grp->>'shipping_method_code',
      'standard'
    );

    for line in
      select
        ci.quantity,
        ci.variant_id,
        p.id as product_id,
        p.primary_category_id as category_id,
        p.status as product_status,
        p.moderation_status,
        s.status as store_status,
        v.status as variant_status,
        pp.amount_minor as unit_price,
        pp.currency as price_currency,
        pp.status as price_status,
        coalesce(inv.on_hand, 0) as on_hand,
        coalesce(inv.reserved, 0) as reserved,
        coalesce(inv.safety_stock, 0) as safety_stock,
        coalesce(inv.allow_backorder, false) as allow_backorder
      from public.cart_items ci
      join public.product_variants v on v.id = ci.variant_id
      join public.store_products p on p.id = v.product_id
      join public.stores s on s.id = p.store_id
      left join lateral (
        select pp1.amount_minor, pp1.currency, pp1.status
        from public.product_prices pp1
        where pp1.variant_id = v.id
          and pp1.currency = q.currency
          and pp1.status = 'active'
          and (pp1.starts_at is null or pp1.starts_at <= timezone('utc', now()))
          and (pp1.ends_at is null or pp1.ends_at > timezone('utc', now()))
        order by pp1.updated_at desc, pp1.created_at desc
        limit 1
      ) pp on true
      left join public.product_inventory inv
        on inv.variant_id = v.id and inv.warehouse_key = 'default'
      where ci.cart_id = q.cart_id and ci.store_id = sid
    loop
      if line.store_status is distinct from 'active' then
        raise exception 'Store is not active';
      end if;
      if line.product_status is distinct from 'active'
         or line.moderation_status is distinct from 'approved' then
        raise exception 'Product is not available for checkout';
      end if;
      if line.variant_status is distinct from 'active' then
        raise exception 'Variant is not available for checkout';
      end if;
      if line.unit_price is null or line.price_status is distinct from 'active' then
        raise exception 'Active price not found for cart item';
      end if;
      if line.price_currency is distinct from q.currency then
        raise exception 'Currency mismatch in cart';
      end if;

      select
        coalesce(inv.on_hand, 0),
        coalesce(inv.reserved, 0),
        coalesce(inv.safety_stock, 0),
        coalesce(inv.allow_backorder, false)
      into
        inv_on_hand,
        inv_reserved,
        inv_safety,
        inv_backorder
      from public.product_inventory inv
      where inv.variant_id = line.variant_id
        and inv.warehouse_key = 'default'
      for update;

      if not found then
        inv_on_hand := 0;
        inv_reserved := 0;
        inv_safety := 0;
        inv_backorder := false;
      end if;

      inv_available := greatest(inv_on_hand - inv_reserved - inv_safety, 0);
      if not inv_backorder and line.quantity > inv_available then
        raise exception 'Insufficient inventory for checkout';
      end if;

      store_subtotal := store_subtotal + (line.unit_price * line.quantity);
      product_ids := array_append(product_ids, line.product_id);
      if line.category_id is not null then
        category_ids := array_append(category_ids, line.category_id);
      end if;
      items_json := items_json || jsonb_build_array(jsonb_build_object(
        'product_id', line.product_id,
        'variant_id', line.variant_id,
        'quantity', line.quantity
      ));
    end loop;

    if jsonb_array_length(items_json) < 1 then
      raise exception 'Store group has no items';
    end if;

    quoted_subtotal := coalesce((grp->>'subtotal_minor')::bigint, -1);
    if store_subtotal is distinct from quoted_subtotal then
      raise exception 'Catalog prices changed since quote; refresh checkout';
    end if;

    store_discount := 0;
    disc_snap := null;
    if q.coupon_code is not null and not coupon_applied then
      select * into coupon from public.checkout_validate_coupon(
        q.coupon_code, sid, uid, q.currency, store_subtotal,
        product_ids, category_ids, buyer_country, buyer_region
      );
      if found then
        store_discount := coupon.discount_minor;
        disc_snap := coupon.snapshot;
        coupon_applied := true;
      end if;
    end if;
    if store_discount is distinct from coalesce((grp->>'discount_total_minor')::bigint, 0) then
      raise exception 'Coupon totals changed since quote; refresh checkout';
    end if;

    select * into ship from public.checkout_compute_shipping_fee(
      sid, q.currency, store_subtotal - store_discount, method_code, disc_snap
    );
    store_shipping := ship.fee_minor;
    if store_shipping is distinct from coalesce((grp->>'shipping_total_minor')::bigint, 0) then
      raise exception 'Shipping fee changed since quote; refresh checkout';
    end if;

    select c.inclusive, c.rate_bps, c.tax_minor, c.snapshot
      into tax_incl, tax_rate, store_tax, tax_snap
      from public.checkout_compute_tax(sid, store_subtotal - store_discount) as c;
    if store_tax is distinct from coalesce((grp->>'tax_total_minor')::bigint, 0) then
      raise exception 'Tax changed since quote; refresh checkout';
    end if;

    if tax_incl then
      store_grand := store_subtotal - store_discount + store_shipping;
    else
      store_grand := store_subtotal - store_discount + store_tax + store_shipping;
    end if;
    if store_grand < 0 then
      raise exception 'Grand total cannot be negative';
    end if;
    quoted_grand := coalesce((grp->>'grand_total_minor')::bigint, -1);
    if store_grand is distinct from quoted_grand then
      raise exception 'Checkout totals changed since quote; refresh checkout';
    end if;

    items := items_json;
    order_id := public.create_store_order_foundation_core(
      uid,
      sid,
      q.currency,
      items,
      store_discount,
      store_tax,
      store_shipping,
      null,
      left(replace(q.id::text, '-', '') || replace(sid::text, '-', ''), 128)
    );

    -- ACTIVE reservations only — do not consume on_hand in V1.
    for line in
      select
        (e->>'product_id')::uuid as product_id,
        (e->>'variant_id')::uuid as variant_id,
        (e->>'quantity')::integer as quantity
      from jsonb_array_elements(items_json) e
    loop
      res_idem := left(
        'confirm:' || session_id::text || ':' || line.variant_id::text,
        160
      );
      perform public.create_active_inventory_reservation(
        uid,
        q.cart_id,
        q.id,
        session_id,
        order_id,
        sid,
        line.product_id,
        line.variant_id,
        line.quantity,
        res_idem,
        'buyer',
        uid
      );
    end loop;

    update public.orders o set
      shipping_address_snapshot = coalesce(o.shipping_address_snapshot, ship_addr),
      billing_contact_snapshot = coalesce(o.billing_contact_snapshot, bill_addr),
      shipping_method_code = coalesce(o.shipping_method_code, ship.method_code),
      shipping_method_name = coalesce(o.shipping_method_name, ship.method_name),
      shipping_estimate_text = coalesce(o.shipping_estimate_text, ship.estimate_text),
      coupon_code_snapshot = coalesce(o.coupon_code_snapshot, q.coupon_code),
      checkout_quote_id = coalesce(o.checkout_quote_id, q.id),
      tax_snapshot = coalesce(o.tax_snapshot, tax_snap),
      discount_snapshot = coalesce(o.discount_snapshot, disc_snap)
    where o.id = order_id;

    if disc_snap is not null
       and jsonb_typeof(disc_snap) = 'object'
       and (store_discount > 0 or coalesce((disc_snap->>'free_shipping')::boolean, false)) then
      begin
        coupon_id := nullif(disc_snap->>'coupon_id', '')::uuid;
      exception when others then
        coupon_id := null;
      end;

      insert into public.order_discounts (
        order_id, code_snapshot, discount_type_snapshot, amount_minor, metadata
      ) values (
        order_id,
        disc_snap->>'code',
        disc_snap->>'discount_type',
        store_discount,
        disc_snap
      );

      if coupon_id is not null then
        perform 1 from public.store_coupons sc where sc.id = coupon_id for update;
        update public.store_coupons sc
          set usage_count = usage_count + 1
        where sc.id = coupon_id
          and (sc.total_usage_limit is null or sc.usage_count < sc.total_usage_limit);
        if not found then
          raise exception 'Coupon usage limit race';
        end if;

        insert into public.store_coupon_redemptions (
          coupon_id, user_id, order_id, store_id, discount_minor, code_snapshot
        ) values (
          coupon_id, uid, order_id, sid,
          store_discount,
          coalesce(disc_snap->>'code', q.coupon_code)
        );
      end if;
    end if;

    select o.order_number into order_number from public.orders o where o.id = order_id;
    orders_out := orders_out || jsonb_build_array(jsonb_build_object(
      'store_id', sid,
      'order_id', order_id,
      'order_number', order_number,
      'grand_total_minor', store_grand,
      'checkout_session_id', session_id
    ));
  end loop;

  delete from public.cart_items ci where ci.cart_id = q.cart_id;
  update public.carts c set status = 'converted' where c.id = q.cart_id;

  update public.checkout_quotes
    set status = 'confirmed',
        confirmed_at = timezone('utc', now()),
        checkout_session_id = session_id,
        quote_payload = quote_payload || jsonb_build_object(
          'orders', orders_out,
          'checkout_session_id', session_id
        )
  where id = q.id;

  return jsonb_build_object(
    'status', 'confirmed',
    'orders', orders_out,
    'checkout_session_id', session_id,
    'payment_note',
      'Payment collection is not enabled yet. Your order is recorded as pending payment.',
    'idempotent', false
  );
end;
$$;

revoke all on function public.confirm_store_checkout_quote(uuid) from public, anon;
grant execute on function public.confirm_store_checkout_quote(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 12) Admin operational read helpers (no PII)
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_inventory_reservations(
  p_status text default null,
  p_store_id uuid default null,
  p_stuck_only boolean default false,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer := greatest(1, least(coalesce(p_limit, 100), 200));
  status_filter text := nullif(lower(btrim(coalesce(p_status, ''))), '');
begin
  perform public.require_platform_admin();

  if status_filter is not null
     and status_filter not in (
       'active', 'pending_capture', 'consumed', 'released', 'expired', 'stuck'
     ) then
    raise exception 'Invalid reservation status filter';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
    from (
      select
        r.id,
        r.checkout_session_id,
        r.order_id,
        r.store_id,
        r.product_id,
        r.variant_id,
        r.quantity,
        r.status,
        r.expires_at,
        r.release_reason,
        r.created_at,
        r.updated_at,
        r.released_at,
        (
          r.status in ('active', 'pending_capture')
          and r.expires_at <= timezone('utc', now())
        ) as is_stuck_past_expiry
      from public.inventory_reservations r
      where (p_store_id is null or r.store_id = p_store_id)
        and (
          case
            when coalesce(p_stuck_only, false) or status_filter = 'stuck' then
              r.status in ('active', 'pending_capture')
              and r.expires_at <= timezone('utc', now())
            when status_filter is null then true
            else r.status = status_filter
          end
        )
      order by r.created_at desc
      limit lim
    ) x
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_list_inventory_reservations(text, uuid, boolean, integer)
  from public, anon;
grant execute on function public.admin_list_inventory_reservations(text, uuid, boolean, integer)
  to authenticated, service_role;
