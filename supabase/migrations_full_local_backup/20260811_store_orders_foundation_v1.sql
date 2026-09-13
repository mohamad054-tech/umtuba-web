-- UMTUBA Store — Orders Foundation V1
-- Additive. Fail-closed RLS + FORCE RLS. No payment gateways.
-- Prepares order headers/lines with immutable product snapshots.
-- Buyers read own orders; store members read own-store orders only.
-- Writes are service_role / SECURITY DEFINER only (checkout comes later).
--
-- Trust boundary for create_store_order_foundation:
--   Caller supplies buyer_id, store_id, currency, line product/variant/qty,
--   and optional discount/tax/shipping/notes/idempotency_key.
--   Unit prices, titles, SKUs, and product_snapshot are ALWAYS derived from
--   live catalog rows (product_prices / store_products / product_variants).
--   Subtotal is ALWAYS computed from derived line totals (never trusted input).
--   This RPC is service_role-only (trusted server/checkout automation).

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users (id) on delete restrict,
  store_id uuid not null references public.stores (id) on delete restrict,
  order_number text not null,
  -- Optional server-side dedupe key for safe create retries (service_role).
  idempotency_key text,
  status text not null default 'pending'
    check (status in (
      'pending',
      'confirmed',
      'processing',
      'packed',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    )),
  payment_status text not null default 'pending'
    check (payment_status in (
      'pending',
      'authorized',
      'paid',
      'failed',
      'refunded'
    )),
  fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in (
      'unfulfilled',
      'partial',
      'fulfilled'
    )),
  -- Exact integer minor units (never float/numeric money).
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  discount_total_minor bigint not null default 0
    check (discount_total_minor >= 0),
  tax_total_minor bigint not null default 0
    check (tax_total_minor >= 0),
  shipping_total_minor bigint not null default 0
    check (shipping_total_minor >= 0),
  grand_total_minor bigint not null check (grand_total_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  notes text
    check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_order_number_format_check
    check (order_number ~ '^UMT-[0-9]{8}-[A-Z0-9]{6}$'),
  constraint orders_discount_lte_subtotal_check
    check (discount_total_minor <= subtotal_minor),
  constraint orders_grand_total_math_check
    check (
      grand_total_minor
        = subtotal_minor
          - discount_total_minor
          + tax_total_minor
          + shipping_total_minor
    ),
  constraint orders_idempotency_key_len_check
    check (
      idempotency_key is null
      or char_length(btrim(idempotency_key)) between 8 and 128
    )
);

create unique index if not exists orders_order_number_uidx
  on public.orders (order_number);

create unique index if not exists orders_idempotency_key_uidx
  on public.orders (idempotency_key)
  where idempotency_key is not null;

-- Operational list indexes (composites cover single-column buyer/store filters).
create index if not exists orders_buyer_created_at_idx
  on public.orders (buyer_id, created_at desc);
create index if not exists orders_store_created_at_idx
  on public.orders (store_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_fulfillment_status_idx
  on public.orders (fulfillment_status);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_row_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- RESTRICT: hard-delete of catalog rows is blocked while referenced so the
  -- live FK remains; historical display uses snapshot columns below.
  product_id uuid not null references public.store_products (id) on delete restrict,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  seller_user_id uuid not null references auth.users (id) on delete restrict,
  quantity integer not null check (quantity > 0 and quantity <= 9999),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  total_price_minor bigint not null check (total_price_minor >= 0),
  -- Historical integrity: frozen at order time even if catalog changes later.
  product_snapshot jsonb not null,
  sku_snapshot text not null
    check (char_length(trim(sku_snapshot)) between 1 and 64),
  title_snapshot text not null
    check (char_length(trim(title_snapshot)) between 1 and 200),
  variant_title_snapshot text
    check (
      variant_title_snapshot is null
      or char_length(trim(variant_title_snapshot)) between 1 and 120
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_line_total_math_check
    check (total_price_minor = unit_price_minor * quantity),
  constraint order_items_product_snapshot_object_check
    check (jsonb_typeof(product_snapshot) = 'object')
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);
create index if not exists order_items_variant_id_idx on public.order_items (variant_id);
create index if not exists order_items_seller_user_id_idx
  on public.order_items (seller_user_id);

drop trigger if exists order_items_set_updated_at on public.order_items;
create trigger order_items_set_updated_at
  before update on public.order_items
  for each row execute function public.set_row_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Integrity triggers (identity + snapshots + store alignment)
-- ---------------------------------------------------------------------------

-- Identity / priced totals are immutable after create.
-- Status / payment_status / fulfillment_status / notes remain mutable for
-- future trusted status-transition RPCs (none exposed to authenticated yet).
create or replace function public.enforce_order_header_identity_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.buyer_id is distinct from old.buyer_id
       or new.store_id is distinct from old.store_id
       or new.order_number is distinct from old.order_number
       or new.currency is distinct from old.currency
       or new.idempotency_key is distinct from old.idempotency_key
       or new.subtotal_minor is distinct from old.subtotal_minor
       or new.discount_total_minor is distinct from old.discount_total_minor
       or new.tax_total_minor is distinct from old.tax_total_minor
       or new.shipping_total_minor is distinct from old.shipping_total_minor
       or new.grand_total_minor is distinct from old.grand_total_minor
    then
      raise exception
        'Order identity, currency, and money totals are immutable after create';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_identity_immutable on public.orders;
create trigger orders_identity_immutable
  before update on public.orders
  for each row execute function public.enforce_order_header_identity_immutable();

create or replace function public.enforce_order_item_snapshot_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.order_id is distinct from old.order_id
       or new.product_id is distinct from old.product_id
       or new.variant_id is distinct from old.variant_id
       or new.seller_user_id is distinct from old.seller_user_id
       or new.unit_price_minor is distinct from old.unit_price_minor
       or new.total_price_minor is distinct from old.total_price_minor
       or new.quantity is distinct from old.quantity
       or new.product_snapshot is distinct from old.product_snapshot
       or new.sku_snapshot is distinct from old.sku_snapshot
       or new.title_snapshot is distinct from old.title_snapshot
       or new.variant_title_snapshot is distinct from old.variant_title_snapshot
    then
      raise exception
        'Order item catalog snapshots and priced quantities are immutable';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_snapshot_immutable on public.order_items;
create trigger order_items_snapshot_immutable
  before update on public.order_items
  for each row execute function public.enforce_order_item_snapshot_immutable();

create or replace function public.enforce_order_item_store_alignment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  order_store_id uuid;
  product_store_id uuid;
  store_owner_id uuid;
begin
  select o.store_id into order_store_id
  from public.orders o
  where o.id = new.order_id;

  if order_store_id is null then
    raise exception 'Order not found';
  end if;

  select p.store_id into product_store_id
  from public.store_products p
  where p.id = new.product_id;

  if product_store_id is null then
    raise exception 'Product not found';
  end if;

  if product_store_id is distinct from order_store_id then
    raise exception 'Order item product must belong to the order store';
  end if;

  if not exists (
    select 1
    from public.product_variants v
    where v.id = new.variant_id
      and v.product_id = new.product_id
  ) then
    raise exception 'Order item variant must belong to the product';
  end if;

  select s.owner_user_id into store_owner_id
  from public.stores s
  where s.id = order_store_id;

  if store_owner_id is null then
    raise exception 'Store not found';
  end if;

  if new.seller_user_id is distinct from store_owner_id then
    raise exception 'Order item seller_user_id must match store owner';
  end if;

  return new;
end;
$$;

drop trigger if exists order_items_store_alignment on public.order_items;
create trigger order_items_store_alignment
  before insert or update of order_id, product_id, variant_id, seller_user_id
  on public.order_items
  for each row execute function public.enforce_order_item_store_alignment();

-- ---------------------------------------------------------------------------
-- 3) Helpers + order number generator
-- ---------------------------------------------------------------------------

-- Random suffix (not count/max based). Uniqueness is enforced by the unique
-- index; callers that insert must retry on unique_violation.
create or replace function public.next_store_order_number()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  return
    'UMT-'
    || to_char((timezone('utc', now())), 'YYYYMMDD')
    || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
end;
$$;

revoke all on function public.next_store_order_number() from public, anon, authenticated;
grant execute on function public.next_store_order_number() to service_role;

create or replace function public.can_read_store_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and (select auth.uid()) is not null
      and (
        o.buyer_id = (select auth.uid())
        or public.is_store_member(o.store_id)
        or public.is_platform_admin()
      )
  );
$$;

revoke all on function public.can_read_store_order(uuid) from public, anon;
grant execute on function public.can_read_store_order(uuid) to authenticated, service_role;

-- Active catalog price for a variant + currency (authoritative).
create or replace function public.store_order_active_unit_price_minor(
  p_variant_id uuid,
  p_currency text
)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select pp.amount_minor
  from public.product_prices pp
  where pp.variant_id = p_variant_id
    and pp.currency = p_currency
    and pp.status = 'active'
    and (pp.starts_at is null or pp.starts_at <= timezone('utc', now()))
    and (pp.ends_at is null or pp.ends_at > timezone('utc', now()))
  order by pp.updated_at desc, pp.created_at desc
  limit 1;
$$;

revoke all on function public.store_order_active_unit_price_minor(uuid, text)
  from public, anon, authenticated;
grant execute on function public.store_order_active_unit_price_minor(uuid, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 4) Service-role create RPC (authoritative catalog derivation)
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
  -- Foundation writes are trusted server/automation only until checkout exists.
  if auth.role() is distinct from 'service_role' then
    raise exception 'service_role required to create store orders';
  end if;

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

  idem_key := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  if idem_key is not null then
    if char_length(idem_key) < 8 or char_length(idem_key) > 128 then
      raise exception 'idempotency_key length must be between 8 and 128';
    end if;

    select o.id into existing_order_id
    from public.orders o
    where o.idempotency_key = idem_key;

    if existing_order_id is not null then
      return existing_order_id;
    end if;
  end if;

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

  return new_order_id;
end;
$$;

revoke all on function public.create_store_order_foundation(
  uuid, uuid, text, jsonb, bigint, bigint, bigint, text, text
) from public, anon, authenticated;
grant execute on function public.create_store_order_foundation(
  uuid, uuid, text, jsonb, bigint, bigint, bigint, text, text
) to service_role;

-- ---------------------------------------------------------------------------
-- 5) RLS (fail-closed + FORCE)
-- ---------------------------------------------------------------------------

alter table public.orders enable row level security;
alter table public.orders force row level security;
alter table public.order_items enable row level security;
alter table public.order_items force row level security;

revoke all on public.orders from anon, public;
revoke all on public.order_items from anon, public;

-- Authenticated: read only. Mutations go through service_role / definer RPC.
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
revoke insert, update, delete on public.orders from authenticated;
revoke insert, update, delete on public.order_items from authenticated;

drop policy if exists "Buyers and store members select orders" on public.orders;
create policy "Buyers and store members select orders"
  on public.orders for select to authenticated
  using (
    (select auth.uid()) is not null
    and (
      buyer_id = (select auth.uid())
      or public.is_store_member(store_id)
      or public.is_platform_admin()
    )
  );

drop policy if exists "Buyers and store members select order items" on public.order_items;
create policy "Buyers and store members select order items"
  on public.order_items for select to authenticated
  using (public.can_read_store_order(order_id));

-- No insert/update/delete policies for authenticated — fail closed.
-- service_role has BYPASSRLS (Supabase) so FORCE RLS does not block
-- create_store_order_foundation inserts.
-- Platform admin read access is via is_platform_admin() in SELECT policies only.
-- No authenticated status-update RPC is exposed in this foundation.
