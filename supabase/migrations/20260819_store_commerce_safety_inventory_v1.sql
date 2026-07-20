-- UMTUBA Store — Commerce Safety & Inventory Reservation V1
-- Additive. Safe to re-run where noted. Ops-owned apply (not applied by app).
--
-- Scope:
-- 1) DB-authoritative commerce checkout gate (default OFF)
-- 2) Inventory reservations with reservation_token + reserved counter
-- 3) Release on cancel; expire releases inventory only (orders untouched)
-- 4) Gate on every *new* server-side order creation path (order core)
-- 5) Audit events: created / released / expired / consumed (consume = future settle)
-- Quotes remain available when the gate is off; confirm/order-create is blocked.
-- Idempotency key is mandatory on every new order create (core + service_role).
-- product_inventory.reserved is system-managed (trigger + GUC-gated helpers).
--
-- Out of scope: live payments, finance, payouts, carrier APIs.

-- ---------------------------------------------------------------------------
-- 1) Commerce settings (DB source of truth for checkout confirm / order create)
-- ---------------------------------------------------------------------------

create table if not exists public.store_commerce_settings (
  id smallint primary key default 1 check (id = 1),
  checkout_confirm_enabled boolean not null default false,
  reservation_ttl_minutes integer not null default 45
    check (reservation_ttl_minutes >= 5 and reservation_ttl_minutes <= 24 * 60),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.store_commerce_settings (id, checkout_confirm_enabled, reservation_ttl_minutes)
values (1, false, 45)
on conflict (id) do nothing;

alter table public.store_commerce_settings enable row level security;
alter table public.store_commerce_settings force row level security;

revoke all on public.store_commerce_settings from anon, public, authenticated;
-- No direct client writes; platform admin mutates via SECURITY DEFINER RPC only.

drop policy if exists "Platform admins read commerce settings"
  on public.store_commerce_settings;
create policy "Platform admins read commerce settings"
  on public.store_commerce_settings for select to authenticated
  using (public.is_platform_admin());

create or replace function public.assert_store_commerce_checkout_enabled()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.store_commerce_settings s
    where s.id = 1
      and s.checkout_confirm_enabled is true
  ) then
    raise exception 'Store commerce checkout is disabled';
  end if;
end;
$$;

revoke all on function public.assert_store_commerce_checkout_enabled()
  from public, anon, authenticated, service_role;

create or replace function public.get_store_commerce_checkout_enabled()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  enabled boolean;
begin
  select s.checkout_confirm_enabled
    into enabled
  from public.store_commerce_settings s
  where s.id = 1;
  return coalesce(enabled, false);
end;
$$;

revoke all on function public.get_store_commerce_checkout_enabled()
  from public, anon;
grant execute on function public.get_store_commerce_checkout_enabled()
  to authenticated, service_role;

create or replace function public.admin_set_store_commerce_checkout_enabled(
  p_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_platform_admin();

  if p_enabled is null then
    raise exception 'enabled flag is required';
  end if;

  update public.store_commerce_settings
  set
    checkout_confirm_enabled = p_enabled,
    updated_at = timezone('utc', now()),
    updated_by = auth.uid()
  where id = 1;

  if not found then
    insert into public.store_commerce_settings (
      id, checkout_confirm_enabled, reservation_ttl_minutes, updated_by
    ) values (1, p_enabled, 45, auth.uid());
  end if;

  return p_enabled;
end;
$$;

revoke all on function public.admin_set_store_commerce_checkout_enabled(boolean)
  from public, anon;
grant execute on function public.admin_set_store_commerce_checkout_enabled(boolean)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Inventory reservations + audit events
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_token uuid not null unique default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  order_item_id uuid not null references public.order_items (id) on delete restrict,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  warehouse_key text not null default 'default'
    check (warehouse_key ~ '^[a-z0-9][a-z0-9_-]{0,62}$'),
  quantity integer not null check (quantity > 0 and quantity <= 9999),
  status text not null default 'active'
    check (status in ('active', 'released', 'expired', 'consumed')),
  reserved_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  released_at timestamptz,
  release_reason text
    check (release_reason is null or char_length(release_reason) <= 120),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inventory_reservations_order_item_uidx unique (order_item_id),
  constraint inventory_reservations_release_consistency check (
    (status = 'active' and released_at is null)
    or (status in ('released', 'expired', 'consumed') and released_at is not null)
  )
);

create index if not exists inventory_reservations_order_status_idx
  on public.inventory_reservations (order_id, status);

create index if not exists inventory_reservations_active_expires_idx
  on public.inventory_reservations (expires_at)
  where status = 'active';

create index if not exists inventory_reservations_variant_status_idx
  on public.inventory_reservations (variant_id, status);

create table if not exists public.inventory_reservation_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null
    references public.inventory_reservations (id) on delete restrict,
  reservation_token uuid not null,
  order_id uuid not null references public.orders (id) on delete restrict,
  event_type text not null
    check (event_type in ('created', 'released', 'expired', 'consumed')),
  actor_user_id uuid references auth.users (id) on delete set null,
  reason text check (reason is null or char_length(reason) <= 120),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists inventory_reservation_events_reservation_created_idx
  on public.inventory_reservation_events (reservation_id, created_at asc);

create index if not exists inventory_reservation_events_order_created_idx
  on public.inventory_reservation_events (order_id, created_at asc);

drop trigger if exists inventory_reservations_set_updated_at
  on public.inventory_reservations;
create trigger inventory_reservations_set_updated_at
  before update on public.inventory_reservations
  for each row execute function public.set_row_updated_at();

alter table public.inventory_reservations enable row level security;
alter table public.inventory_reservations force row level security;
alter table public.inventory_reservation_events enable row level security;
alter table public.inventory_reservation_events force row level security;

revoke all on public.inventory_reservations from anon, public;
grant select on public.inventory_reservations to authenticated;
revoke insert, update, delete on public.inventory_reservations from authenticated;

revoke all on public.inventory_reservation_events from anon, public;
grant select on public.inventory_reservation_events to authenticated;
revoke insert, update, delete on public.inventory_reservation_events
  from authenticated;

drop policy if exists "Read inventory reservations via parent order"
  on public.inventory_reservations;
create policy "Read inventory reservations via parent order"
  on public.inventory_reservations for select to authenticated
  using (public.can_read_store_order(order_id));

drop policy if exists "Read inventory reservation events via parent order"
  on public.inventory_reservation_events;
create policy "Read inventory reservation events via parent order"
  on public.inventory_reservation_events for select to authenticated
  using (public.can_read_store_order(order_id));

-- Protect product_inventory.reserved from direct client/seller writes.
-- Authoritative mutations set umtuba.allow_inventory_reserved_mutation=1
-- (transaction-local) inside reservation lifecycle SECURITY DEFINER helpers.
-- Ops maintenance (documented): set the same GUC in-session, then UPDATE;
-- there is no broad authenticated bypass.

create or replace function public.store_allow_inventory_reserved_mutation()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('umtuba.allow_inventory_reserved_mutation', '1', true);
end;
$$;

revoke all on function public.store_allow_inventory_reserved_mutation()
  from public, anon, authenticated, service_role;

create or replace function public.product_inventory_protect_reserved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allow_mut text;
begin
  allow_mut := current_setting('umtuba.allow_inventory_reserved_mutation', true);
  if allow_mut is not distinct from '1' then
    return NEW;
  end if;

  if TG_OP = 'INSERT' then
    if coalesce(NEW.reserved, 0) is distinct from 0 then
      raise exception 'product_inventory.reserved is system-managed';
    end if;
    NEW.reserved := 0;
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if NEW.reserved is distinct from OLD.reserved then
      raise exception 'product_inventory.reserved is system-managed';
    end if;
    NEW.reserved := OLD.reserved;
    return NEW;
  end if;

  return NEW;
end;
$$;

drop trigger if exists product_inventory_protect_reserved
  on public.product_inventory;
create trigger product_inventory_protect_reserved
  before insert or update on public.product_inventory
  for each row execute function public.product_inventory_protect_reserved();

-- anon must not mutate inventory (defense in depth beyond RLS).
revoke insert, update, delete on public.product_inventory from anon;

-- ---------------------------------------------------------------------------
-- 3) Reservation lifecycle helpers (SECURITY DEFINER; no client EXECUTE)
-- ---------------------------------------------------------------------------

create or replace function public.store_record_inventory_reservation_event(
  p_reservation_id uuid,
  p_reservation_token uuid,
  p_order_id uuid,
  p_event_type text,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_type not in ('created', 'released', 'expired', 'consumed') then
    raise exception 'Invalid inventory reservation event type';
  end if;

  insert into public.inventory_reservation_events (
    reservation_id,
    reservation_token,
    order_id,
    event_type,
    actor_user_id,
    reason,
    metadata
  ) values (
    p_reservation_id,
    p_reservation_token,
    p_order_id,
    p_event_type,
    auth.uid(),
    nullif(btrim(coalesce(p_reason, '')), ''),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.store_record_inventory_reservation_event(
  uuid, uuid, uuid, text, text, jsonb
) from public, anon, authenticated, service_role;

create or replace function public.store_release_inventory_reservation_row(
  p_reservation_id uuid,
  p_event_type text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.inventory_reservations%rowtype;
  inv_reserved integer;
begin
  -- Inventory-return path only. 'consumed' must not free reserved units back
  -- to sellable stock (consume is a future settle path, not release/expire).
  if p_event_type not in ('released', 'expired') then
    raise exception 'Invalid inventory reservation release event type';
  end if;

  select * into r
  from public.inventory_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Inventory reservation not found';
  end if;

  -- Terminal rows (released/expired/consumed) never decrement reserved again.
  if r.status is distinct from 'active' then
    return;
  end if;

  perform public.store_allow_inventory_reserved_mutation();

  select coalesce(inv.reserved, 0)
    into inv_reserved
  from public.product_inventory inv
  where inv.variant_id = r.variant_id
    and inv.warehouse_key = r.warehouse_key
  for update;

  if found then
    update public.product_inventory inv
    set reserved = greatest(coalesce(inv.reserved, 0) - r.quantity, 0)
    where inv.variant_id = r.variant_id
      and inv.warehouse_key = r.warehouse_key;
  end if;

  update public.inventory_reservations
  set
    status = p_event_type,
    released_at = timezone('utc', now()),
    release_reason = left(nullif(btrim(coalesce(p_reason, '')), ''), 120)
  where id = r.id;

  perform public.store_record_inventory_reservation_event(
    r.id,
    r.reservation_token,
    r.order_id,
    p_event_type,
    p_reason,
    jsonb_build_object(
      'quantity', r.quantity,
      'variant_id', r.variant_id,
      'warehouse_key', r.warehouse_key
    )
  );
end;
$$;

revoke all on function public.store_release_inventory_reservation_row(
  uuid, text, text
) from public, anon, authenticated, service_role;

create or replace function public.store_release_inventory_reservations_for_order(
  p_order_id uuid,
  p_reason text default 'order_cancelled',
  p_event_type text default 'released'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  released_count integer := 0;
begin
  if p_order_id is null then
    raise exception 'order_id is required';
  end if;

  if p_event_type not in ('released', 'expired') then
    raise exception 'Invalid inventory reservation release event type';
  end if;

  for rid in
    select r.id
    from public.inventory_reservations r
    where r.order_id = p_order_id
      and r.status = 'active'
    order by r.created_at asc
    for update
  loop
    perform public.store_release_inventory_reservation_row(
      rid, p_event_type, p_reason
    );
    released_count := released_count + 1;
  end loop;

  return released_count;
end;
$$;

revoke all on function public.store_release_inventory_reservations_for_order(
  uuid, text, text
) from public, anon;
grant execute on function public.store_release_inventory_reservations_for_order(
  uuid, text, text
) to service_role;

create or replace function public.store_ensure_inventory_reservations_for_order(
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  has_inv boolean;
  inv_on_hand integer;
  inv_reserved integer;
  inv_safety integer;
  inv_backorder boolean;
  inv_available integer;
  reservable integer;
  ttl_minutes integer;
  expires_at timestamptz;
  new_id uuid;
  new_token uuid;
  warehouse text := 'default';
begin
  if p_order_id is null then
    raise exception 'order_id is required';
  end if;

  if exists (
    select 1
    from public.inventory_reservations r
    where r.order_id = p_order_id
  ) then
    return;
  end if;

  perform public.store_allow_inventory_reserved_mutation();

  select s.reservation_ttl_minutes
    into ttl_minutes
  from public.store_commerce_settings s
  where s.id = 1;
  ttl_minutes := coalesce(ttl_minutes, 45);
  expires_at := timezone('utc', now()) + make_interval(mins => ttl_minutes);

  for item in
    select oi.id as order_item_id, oi.variant_id, oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id
    order by oi.created_at asc, oi.id asc
  loop
    select
      true,
      coalesce(inv.on_hand, 0),
      coalesce(inv.reserved, 0),
      coalesce(inv.safety_stock, 0),
      coalesce(inv.allow_backorder, false)
    into
      has_inv,
      inv_on_hand,
      inv_reserved,
      inv_safety,
      inv_backorder
    from public.product_inventory inv
    where inv.variant_id = item.variant_id
      and inv.warehouse_key = warehouse
    for update;

    if not found then
      has_inv := false;
      inv_on_hand := 0;
      inv_reserved := 0;
      inv_safety := 0;
      inv_backorder := false;
    end if;

    inv_available := greatest(inv_on_hand - inv_reserved - inv_safety, 0);
    reservable := greatest(inv_on_hand - inv_reserved, 0);

    if not inv_backorder and item.quantity > inv_available then
      raise exception 'Insufficient inventory for reservation';
    end if;
    if item.quantity > reservable then
      raise exception 'Insufficient inventory for reservation';
    end if;
    if not has_inv then
      raise exception 'Insufficient inventory for reservation';
    end if;

    new_token := gen_random_uuid();

    insert into public.inventory_reservations (
      reservation_token,
      order_id,
      order_item_id,
      variant_id,
      warehouse_key,
      quantity,
      status,
      expires_at
    ) values (
      new_token,
      p_order_id,
      item.order_item_id,
      item.variant_id,
      warehouse,
      item.quantity,
      'active',
      expires_at
    )
    returning id into new_id;

    update public.product_inventory inv
    set reserved = coalesce(inv.reserved, 0) + item.quantity
    where inv.variant_id = item.variant_id
      and inv.warehouse_key = warehouse;

    perform public.store_record_inventory_reservation_event(
      new_id,
      new_token,
      p_order_id,
      'created',
      'order_created',
      jsonb_build_object(
        'quantity', item.quantity,
        'variant_id', item.variant_id,
        'warehouse_key', warehouse,
        'expires_at', expires_at
      )
    );
  end loop;
end;
$$;

revoke all on function public.store_ensure_inventory_reservations_for_order(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.expire_store_inventory_reservations(
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  expired_count integer := 0;
  lim integer := greatest(1, least(coalesce(p_limit, 500), 5000));
begin
  -- Inventory release only — does not cancel, delete, or mutate orders.
  for rid in
    select r.id
    from public.inventory_reservations r
    where r.status = 'active'
      and r.expires_at <= timezone('utc', now())
    order by r.expires_at asc
    limit lim
    for update skip locked
  loop
    perform public.store_release_inventory_reservation_row(
      rid, 'expired', 'reservation_expired'
    );
    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

revoke all on function public.expire_store_inventory_reservations(integer)
  from public, anon, authenticated;
grant execute on function public.expire_store_inventory_reservations(integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- 4) Order create paths — commerce gate + reservation
-- ---------------------------------------------------------------------------

create or replace function public.create_store_order_foundation_core(
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
  new_order_id uuid;
  existing_order_id uuid;
  store_owner uuid;
  store_status text;
  currency_code text;
  idem_key text;
  item jsonb;
  prepared jsonb;
  prepared_items jsonb := '[]'::jsonb;
  item_product_id uuid;
  item_variant_id uuid;
  item_qty integer;
  item_unit bigint;
  item_line_total bigint;
  item_sku text;
  item_title text;
  item_variant_title text;
  item_snapshot jsonb;
  product_slug text;
  product_type text;
  product_store_id uuid;
  product_status text;
  product_moderation text;
  computed_subtotal bigint := 0;
  computed_grand bigint;
  lines_sum bigint;
  order_number_value text;
  insert_attempts integer := 0;
  snapshotted_at timestamptz := timezone('utc', now());
begin
  -- Core create: no role gate. EXECUTE revoked from all roles; only SECURITY DEFINER
  -- siblings owned by the same role (service_role wrapper + checkout confirm) may call it.

  if p_buyer_id is null then
    raise exception 'buyer_id is required';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_buyer_id) then
    raise exception 'buyer_id is invalid';
  end if;

  currency_code := upper(btrim(coalesce(p_currency, '')));
  if currency_code !~ '^[A-Z]{3}$' then
    raise exception 'currency must be a 3-letter ISO code';
  end if;

  if p_discount_total_minor is null or p_discount_total_minor < 0
     or p_tax_total_minor is null or p_tax_total_minor < 0
     or p_shipping_total_minor is null or p_shipping_total_minor < 0 then
    raise exception 'Order money amounts must be non-negative integers';
  end if;

  if p_items is null or jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) < 1 then
    raise exception 'At least one order item is required';
  end if;

  -- Reject client-supplied priced/snapshot/total fields on line payloads.
  if exists (
    select 1
    from jsonb_array_elements(p_items) as e(value)
    where e.value ? 'unit_price_minor'
       or e.value ? 'total_price_minor'
       or e.value ? 'sku_snapshot'
       or e.value ? 'title_snapshot'
       or e.value ? 'variant_title_snapshot'
       or e.value ? 'product_snapshot'
       or e.value ? 'seller_user_id'
       or e.value ? 'subtotal_minor'
       or e.value ? 'grand_total_minor'
  ) then
    raise exception
      'Order item prices and snapshots must be derived server-side; do not pass priced or snapshot fields';
  end if;

  -- Idempotency is mandatory on every order-create path (including service_role).
  idem_key := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  if idem_key is null then
    raise exception 'idempotency_key is required';
  end if;
  if char_length(idem_key) < 8 or char_length(idem_key) > 128 then
    raise exception 'idempotency_key length must be between 8 and 128';
  end if;

  select o.id into existing_order_id
  from public.orders o
  where o.idempotency_key = idem_key;

  if existing_order_id is not null then
    -- Idempotent replay: do not re-check commerce gate or re-reserve.
    return existing_order_id;
  end if;

  -- Commerce gate (DB source of truth) on every new order creation path.
  perform public.assert_store_commerce_checkout_enabled();

  select s.owner_user_id, s.status
    into store_owner, store_status
  from public.stores s
  where s.id = p_store_id;

  if store_owner is null then
    raise exception 'Store not found';
  end if;
  if store_status is distinct from 'active' then
    raise exception 'Store must be active to create orders';
  end if;

  -- Single authoritative pass: freeze DB-derived prices/snapshots before insert
  -- so header subtotal cannot drift from line totals under concurrent catalog edits.
  for item in
    select value from jsonb_array_elements(p_items)
  loop
    begin
      item_product_id := nullif(item->>'product_id', '')::uuid;
      item_variant_id := nullif(item->>'variant_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Order item product_id/variant_id must be UUIDs';
    end;

    begin
      item_qty := (item->>'quantity')::integer;
    exception when others then
      raise exception 'Order item quantity must be an integer';
    end;

    if item_product_id is null or item_variant_id is null then
      raise exception 'Order item product_id and variant_id are required';
    end if;
    if item_qty is null or item_qty < 1 or item_qty > 9999 then
      raise exception 'Order item quantity must be between 1 and 9999';
    end if;

    select
      p.store_id,
      p.slug,
      p.title,
      p.product_type,
      p.status,
      p.moderation_status
      into
        product_store_id,
        product_slug,
        item_title,
        product_type,
        product_status,
        product_moderation
    from public.store_products p
    where p.id = item_product_id;

    if product_store_id is null then
      raise exception 'Product not found';
    end if;
    if product_store_id is distinct from p_store_id then
      raise exception 'Order item product must belong to the order store';
    end if;
    if product_status is distinct from 'active'
       or product_moderation is distinct from 'approved' then
      raise exception 'Product must be active and approved to order';
    end if;

    select v.sku, v.title
      into item_sku, item_variant_title
    from public.product_variants v
    where v.id = item_variant_id
      and v.product_id = item_product_id
      and v.status = 'active';

    if item_sku is null then
      raise exception 'Order item variant not found or not active for product';
    end if;

    item_unit := public.store_order_active_unit_price_minor(
      item_variant_id,
      currency_code
    );

    if item_unit is null then
      raise exception 'No active price for variant in requested currency';
    end if;

    if item_unit > (9223372036854775807::bigint / item_qty) then
      raise exception 'Order item line total overflow';
    end if;

    item_line_total := item_unit * item_qty;
    computed_subtotal := computed_subtotal + item_line_total;

    item_snapshot := jsonb_build_object(
      'product_id', item_product_id,
      'store_id', p_store_id,
      'slug', product_slug,
      'title', item_title,
      'product_type', product_type,
      'sku', item_sku,
      'variant_id', item_variant_id,
      'variant_title', item_variant_title,
      'unit_price_minor', item_unit,
      'currency', currency_code,
      'snapshotted_at', snapshotted_at
    );

    prepared_items := prepared_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', item_product_id,
        'variant_id', item_variant_id,
        'quantity', item_qty,
        'unit_price_minor', item_unit,
        'total_price_minor', item_line_total,
        'sku_snapshot', item_sku,
        'title_snapshot', item_title,
        'variant_title_snapshot', item_variant_title,
        'product_snapshot', item_snapshot
      )
    );
  end loop;

  if p_discount_total_minor > computed_subtotal then
    raise exception 'discount_total cannot exceed subtotal';
  end if;

  computed_grand :=
    computed_subtotal
    - p_discount_total_minor
    + p_tax_total_minor
    + p_shipping_total_minor;

  if computed_grand < 0 then
    raise exception 'Grand total cannot be negative';
  end if;

  -- Insert header with order_number collision retry (unique index is source of truth).
  loop
    insert_attempts := insert_attempts + 1;
    order_number_value := public.next_store_order_number();

    begin
      insert into public.orders (
        buyer_id,
        store_id,
        order_number,
        idempotency_key,
        status,
        payment_status,
        fulfillment_status,
        subtotal_minor,
        discount_total_minor,
        tax_total_minor,
        shipping_total_minor,
        grand_total_minor,
        currency,
        notes
      ) values (
        p_buyer_id,
        p_store_id,
        order_number_value,
        idem_key,
        'pending',
        'pending',
        'unfulfilled',
        computed_subtotal,
        p_discount_total_minor,
        p_tax_total_minor,
        p_shipping_total_minor,
        computed_grand,
        currency_code,
        nullif(btrim(coalesce(p_notes, '')), '')
      )
      returning id into new_order_id;

      exit;
    exception
      when unique_violation then
        -- Idempotent retry won the race: return the existing row.
        if idem_key is not null then
          select o.id into existing_order_id
          from public.orders o
          where o.idempotency_key = idem_key;
          if existing_order_id is not null then
            return existing_order_id;
          end if;
        end if;

        if insert_attempts >= 20 then
          raise exception 'Unable to allocate unique order number';
        end if;
        -- else retry (order_number collision)
    end;
  end loop;

  -- Insert frozen prepared lines (no second catalog price lookup).
  for prepared in
    select value from jsonb_array_elements(prepared_items)
  loop
    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      seller_user_id,
      quantity,
      unit_price_minor,
      total_price_minor,
      product_snapshot,
      sku_snapshot,
      title_snapshot,
      variant_title_snapshot
    ) values (
      new_order_id,
      (prepared->>'product_id')::uuid,
      (prepared->>'variant_id')::uuid,
      store_owner,
      (prepared->>'quantity')::integer,
      (prepared->>'unit_price_minor')::bigint,
      (prepared->>'total_price_minor')::bigint,
      prepared->'product_snapshot',
      prepared->>'sku_snapshot',
      prepared->>'title_snapshot',
      nullif(prepared->>'variant_title_snapshot', '')
    );
  end loop;

  select coalesce(sum(oi.total_price_minor), 0)
    into lines_sum
  from public.order_items oi
  where oi.order_id = new_order_id;

  if lines_sum is distinct from computed_subtotal then
    raise exception 'Order line totals do not match computed subtotal';
  end if;

  -- Reserve inventory for every new order (checkout confirm + service_role path).
  perform public.store_ensure_inventory_reservations_for_order(new_order_id);

  return new_order_id;
end;
$$;

revoke all on function public.create_store_order_foundation_core(
  uuid, uuid, text, jsonb, bigint, bigint, bigint, text, text
) from public, anon, authenticated, service_role;

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
  idem_key text;
begin
  -- Public automation entrypoint remains service_role-only (no GUC bypass).
  -- Commerce gate + reservation are enforced inside create_store_order_foundation_core
  -- for every *new* order (idempotent replays skip the gate).
  if auth.role() is distinct from 'service_role' then
    raise exception 'service_role required to create store orders';
  end if;

  -- Defense in depth: wrapper rejects missing/blank keys before core.
  idem_key := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  if idem_key is null then
    raise exception 'idempotency_key is required';
  end if;
  if char_length(idem_key) < 8 or char_length(idem_key) > 128 then
    raise exception 'idempotency_key length must be between 8 and 128';
  end if;

  return public.create_store_order_foundation_core(
    p_buyer_id,
    p_store_id,
    p_currency,
    p_items,
    p_discount_total_minor,
    p_tax_total_minor,
    p_shipping_total_minor,
    p_notes,
    idem_key
  );
end;
$$;

revoke all on function public.create_store_order_foundation(
  uuid, uuid, text, jsonb, bigint, bigint, bigint, text, text
) from public, anon, authenticated;
grant execute on function public.create_store_order_foundation(
  uuid, uuid, text, jsonb, bigint, bigint, bigint, text, text
) to service_role;

-- ---------------------------------------------------------------------------
-- 5) Cancel releases reservations (orders remain; expiry never deletes orders)
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

  -- Cancel releases active reservations; does not delete the order.
  if status_changed and next_status = 'cancelled' then
    perform public.store_release_inventory_reservations_for_order(
      o.id, 'order_cancelled', 'released'
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
