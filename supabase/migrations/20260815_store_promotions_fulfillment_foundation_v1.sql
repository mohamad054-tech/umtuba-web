-- UMTUBA Store — Promotions & Fulfillment Foundation V1
-- Additive after 20260814. No payment gateways or carrier APIs.
--
-- Promotions: extends store_coupons (free shipping, targeting, campaigns metadata)
-- Fulfillment: order_fulfillments + timeline events (detailed lifecycle)
-- Shipping admin: providers, zones, rates
-- Tracking: order_shipments with delivery confirmation foundation
--
-- Trust boundaries:
--   checkout_validate_coupon — amount/eligibility server-side only
--   admin_* RPCs — store owner/manager or platform admin
--   update_order_fulfillment_lifecycle — seller/admin; syncs orders.status where mapped
--   upsert_order_shipment_tracking — seller/admin; no client money fields

-- ---------------------------------------------------------------------------
-- 1) Promotions — extend coupons + targeting
-- ---------------------------------------------------------------------------

alter table public.store_coupons
  add column if not exists promotion_name text
    check (promotion_name is null or char_length(btrim(promotion_name)) between 1 and 120),
  add column if not exists promotion_description text
    check (
      promotion_description is null
      or char_length(promotion_description) <= 500
    );

alter table public.store_coupons
  drop constraint if exists store_coupons_type_fields_check;

alter table public.store_coupons
  drop constraint if exists store_coupons_discount_type_check;

alter table public.store_coupons
  add constraint store_coupons_discount_type_check
  check (discount_type in ('percent', 'fixed', 'free_shipping'));

alter table public.store_coupons
  add constraint store_coupons_type_fields_check check (
    (
      discount_type = 'percent'
      and percent_bps is not null
      and fixed_amount_minor is null
    )
    or (
      discount_type = 'fixed'
      and fixed_amount_minor is not null
      and currency is not null
      and percent_bps is null
    )
    or (
      discount_type = 'free_shipping'
      and percent_bps is null
      and fixed_amount_minor is null
    )
  );

create table if not exists public.store_coupon_products (
  coupon_id uuid not null references public.store_coupons (id) on delete cascade,
  product_id uuid not null references public.store_products (id) on delete cascade,
  primary key (coupon_id, product_id)
);

create index if not exists store_coupon_products_product_idx
  on public.store_coupon_products (product_id);

create table if not exists public.store_coupon_categories (
  coupon_id uuid not null references public.store_coupons (id) on delete cascade,
  category_id uuid not null references public.product_categories (id) on delete cascade,
  primary key (coupon_id, category_id)
);

create index if not exists store_coupon_categories_category_idx
  on public.store_coupon_categories (category_id);

create table if not exists public.store_coupon_regions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.store_coupons (id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  region text check (region is null or char_length(btrim(region)) <= 80),
  unique (coupon_id, country_code, region)
);

create index if not exists store_coupon_regions_coupon_idx
  on public.store_coupon_regions (coupon_id);

alter table public.store_coupon_products enable row level security;
alter table public.store_coupon_products force row level security;
alter table public.store_coupon_categories enable row level security;
alter table public.store_coupon_categories force row level security;
alter table public.store_coupon_regions enable row level security;
alter table public.store_coupon_regions force row level security;

revoke all on public.store_coupon_products from anon, public, authenticated;
revoke all on public.store_coupon_categories from anon, public, authenticated;
revoke all on public.store_coupon_regions from anon, public, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Fulfillment lifecycle + timeline
-- ---------------------------------------------------------------------------

create table if not exists public.order_fulfillments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  store_id uuid not null references public.stores (id) on delete restrict,
  buyer_id uuid not null references auth.users (id) on delete restrict,
  lifecycle_stage text not null default 'pending'
    check (
      lifecycle_stage in (
        'pending',
        'confirmed',
        'preparing',
        'packed',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
        'refunded'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_fulfillments_order_uidx unique (order_id)
);

create index if not exists order_fulfillments_store_stage_idx
  on public.order_fulfillments (store_id, lifecycle_stage, updated_at desc);

create table if not exists public.order_fulfillment_events (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references public.order_fulfillments (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  from_stage text
    check (
      from_stage is null
      or from_stage in (
        'pending','confirmed','preparing','packed','shipped',
        'out_for_delivery','delivered','cancelled','returned','refunded'
      )
    ),
  to_stage text not null
    check (
      to_stage in (
        'pending','confirmed','preparing','packed','shipped',
        'out_for_delivery','delivered','cancelled','returned','refunded'
      )
    ),
  actor_user_id uuid references auth.users (id) on delete set null,
  note text check (note is null or char_length(note) <= 500),
  source text not null default 'seller'
    check (source in ('seller', 'system', 'admin', 'buyer')),
  created_at timestamptz not null default now()
);

create index if not exists order_fulfillment_events_order_created_idx
  on public.order_fulfillment_events (order_id, created_at asc);

drop trigger if exists order_fulfillments_set_updated_at on public.order_fulfillments;
create trigger order_fulfillments_set_updated_at
  before update on public.order_fulfillments
  for each row execute function public.set_row_updated_at();

alter table public.order_fulfillments enable row level security;
alter table public.order_fulfillments force row level security;
alter table public.order_fulfillment_events enable row level security;
alter table public.order_fulfillment_events force row level security;

revoke all on public.order_fulfillments from anon, public;
grant select on public.order_fulfillments to authenticated;
revoke insert, update, delete on public.order_fulfillments from authenticated;

revoke all on public.order_fulfillment_events from anon, public;
grant select on public.order_fulfillment_events to authenticated;
revoke insert, update, delete on public.order_fulfillment_events from authenticated;

drop policy if exists "Read order fulfillments via parent order"
  on public.order_fulfillments;
create policy "Read order fulfillments via parent order"
  on public.order_fulfillments for select to authenticated
  using (public.can_read_store_order(order_id));

drop policy if exists "Read fulfillment events via parent order"
  on public.order_fulfillment_events;
create policy "Read fulfillment events via parent order"
  on public.order_fulfillment_events for select to authenticated
  using (public.can_read_store_order(order_id));

-- ---------------------------------------------------------------------------
-- 3) Shipping providers / zones / rates (admin foundation)
-- ---------------------------------------------------------------------------

create table if not exists public.store_shipping_providers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  provider_key text not null
    check (
      provider_key in (
        'manual','local_courier','ups','fedex','dhl','aramex','custom'
      )
    ),
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 80),
  enabled boolean not null default true,
  supports_tracking boolean not null default false,
  supports_pickup boolean not null default false,
  supports_international boolean not null default false,
  config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, provider_key)
);

create table if not exists public.store_shipping_zones (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  country_codes text[] not null default '{}'::text[],
  region_codes text[] not null default '{}'::text[],
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_shipping_zones_store_idx
  on public.store_shipping_zones (store_id, enabled);

create table if not exists public.store_shipping_rates (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.store_shipping_zones (id) on delete cascade,
  provider_id uuid references public.store_shipping_providers (id) on delete set null,
  service_type text not null default 'standard'
    check (
      service_type in (
        'local','international','pickup','standard','express'
      )
    ),
  fee_minor bigint not null check (fee_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  min_subtotal_minor bigint check (min_subtotal_minor is null or min_subtotal_minor >= 0),
  max_subtotal_minor bigint check (max_subtotal_minor is null or max_subtotal_minor >= 0),
  free_above_subtotal_minor bigint
    check (
      free_above_subtotal_minor is null
      or free_above_subtotal_minor >= 0
    ),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_shipping_rates_zone_idx
  on public.store_shipping_rates (zone_id, enabled);

drop trigger if exists store_shipping_providers_set_updated_at on public.store_shipping_providers;
create trigger store_shipping_providers_set_updated_at
  before update on public.store_shipping_providers
  for each row execute function public.set_row_updated_at();

drop trigger if exists store_shipping_zones_set_updated_at on public.store_shipping_zones;
create trigger store_shipping_zones_set_updated_at
  before update on public.store_shipping_zones
  for each row execute function public.set_row_updated_at();

drop trigger if exists store_shipping_rates_set_updated_at on public.store_shipping_rates;
create trigger store_shipping_rates_set_updated_at
  before update on public.store_shipping_rates
  for each row execute function public.set_row_updated_at();

alter table public.store_shipping_providers enable row level security;
alter table public.store_shipping_providers force row level security;
alter table public.store_shipping_zones enable row level security;
alter table public.store_shipping_zones force row level security;
alter table public.store_shipping_rates enable row level security;
alter table public.store_shipping_rates force row level security;

revoke all on public.store_shipping_providers from anon, public, authenticated;
revoke all on public.store_shipping_zones from anon, public, authenticated;
revoke all on public.store_shipping_rates from anon, public, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Shipment tracking
-- ---------------------------------------------------------------------------

create table if not exists public.order_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  fulfillment_id uuid references public.order_fulfillments (id) on delete set null,
  provider_key text not null
    check (
      provider_key in (
        'manual','local_courier','ups','fedex','dhl','aramex','custom'
      )
    ),
  tracking_number text not null
    check (
      char_length(btrim(tracking_number)) between 4 and 64
      and upper(tracking_number) ~ '^[A-Z0-9-]+$'
    ),
  tracking_status text not null default 'pending'
    check (
      tracking_status in (
        'pending','label_created','picked_up','in_transit',
        'out_for_delivery','delivered','exception','returned','cancelled'
      )
    ),
  estimated_delivery_at timestamptz,
  last_update_at timestamptz,
  delivered_at timestamptz,
  delivery_confirmed_by text
    check (
      delivery_confirmed_by is null
      or delivery_confirmed_by in ('carrier','seller','buyer','system')
    ),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_shipments_order_tracking_uidx unique (order_id, tracking_number)
);

create index if not exists order_shipments_order_status_idx
  on public.order_shipments (order_id, tracking_status, updated_at desc);

drop trigger if exists order_shipments_set_updated_at on public.order_shipments;
create trigger order_shipments_set_updated_at
  before update on public.order_shipments
  for each row execute function public.set_row_updated_at();

alter table public.order_shipments enable row level security;
alter table public.order_shipments force row level security;
revoke all on public.order_shipments from anon, public;
grant select on public.order_shipments to authenticated;
revoke insert, update, delete on public.order_shipments from authenticated;

drop policy if exists "Read order shipments via parent order" on public.order_shipments;
create policy "Read order shipments via parent order"
  on public.order_shipments for select to authenticated
  using (public.can_read_store_order(order_id));

-- ---------------------------------------------------------------------------
-- 5) Internal helpers (not client-callable)
-- ---------------------------------------------------------------------------

create or replace function public.store_fulfillment_lifecycle_transition_allowed(
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
    when p_from = 'confirmed' and p_to in ('preparing', 'cancelled') then true
    when p_from = 'preparing' and p_to in ('packed', 'cancelled') then true
    when p_from = 'packed' and p_to in ('shipped', 'cancelled') then true
    when p_from = 'shipped' and p_to in ('out_for_delivery', 'delivered', 'cancelled') then true
    when p_from = 'out_for_delivery' and p_to in ('delivered', 'cancelled') then true
    when p_from = 'delivered' and p_to = 'returned' then true
    when p_from = 'returned' and p_to = 'refunded' then true
    else false
  end;
$$;

revoke all on function public.store_fulfillment_lifecycle_transition_allowed(text, text)
  from public, anon, authenticated;
grant execute on function public.store_fulfillment_lifecycle_transition_allowed(text, text)
  to service_role;

create or replace function public.promotion_coupon_targets_ok(
  p_coupon_id uuid,
  p_product_ids uuid[],
  p_category_ids uuid[],
  p_country_code text,
  p_region text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  has_products boolean;
  has_categories boolean;
  has_regions boolean;
begin
  select exists (
    select 1 from public.store_coupon_products cp where cp.coupon_id = p_coupon_id
  ) into has_products;
  select exists (
    select 1 from public.store_coupon_categories cc where cc.coupon_id = p_coupon_id
  ) into has_categories;
  select exists (
    select 1 from public.store_coupon_regions cr where cr.coupon_id = p_coupon_id
  ) into has_regions;

  if has_products and not exists (
    select 1 from public.store_coupon_products cp
    where cp.coupon_id = p_coupon_id
      and cp.product_id = any(coalesce(p_product_ids, '{}'::uuid[]))
  ) then
    return false;
  end if;

  if has_categories and not exists (
    select 1 from public.store_coupon_categories cc
    where cc.coupon_id = p_coupon_id
      and cc.category_id = any(coalesce(p_category_ids, '{}'::uuid[]))
  ) then
    return false;
  end if;

  if has_regions then
    if p_country_code is null or btrim(p_country_code) = '' then
      return false;
    end if;
    if not exists (
      select 1 from public.store_coupon_regions cr
      where cr.coupon_id = p_coupon_id
        and cr.country_code = upper(btrim(p_country_code))
        and (
          cr.region is null
          or btrim(cr.region) = ''
          or lower(btrim(cr.region)) = lower(btrim(coalesce(p_region, '')))
        )
    ) then
      return false;
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.promotion_coupon_targets_ok(uuid, uuid[], uuid[], text, text)
  from public, anon, authenticated;
grant execute on function public.promotion_coupon_targets_ok(uuid, uuid[], uuid[], text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 6) Checkout coupon + shipping patches
-- ---------------------------------------------------------------------------

create or replace function public.checkout_validate_coupon(
  p_code text,
  p_store_id uuid,
  p_buyer_id uuid,
  p_currency text,
  p_subtotal_minor bigint,
  p_product_ids uuid[] default '{}'::uuid[],
  p_category_ids uuid[] default '{}'::uuid[],
  p_country_code text default null,
  p_region text default null
)
returns table (
  coupon_id uuid,
  discount_minor bigint,
  snapshot jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  code_norm text := upper(btrim(coalesce(p_code, '')));
  c public.store_coupons%rowtype;
  discount bigint := 0;
  user_redemptions integer := 0;
  free_ship boolean := false;
begin
  if code_norm = '' then
    return;
  end if;
  if p_subtotal_minor is null or p_subtotal_minor < 0 then
    raise exception 'Subtotal is invalid for coupon';
  end if;

  select * into c
  from public.store_coupons sc
  where upper(sc.code) = code_norm
    and (sc.store_id is null or sc.store_id = p_store_id)
  order by case when sc.store_id = p_store_id then 0 else 1 end
  limit 1
  for update;

  if not found then
    if exists (
      select 1 from public.store_coupons sc2 where upper(sc2.code) = code_norm
    ) then
      return;
    end if;
    raise exception 'Coupon not found';
  end if;
  if c.status is distinct from 'active' then
    raise exception 'Coupon is not active';
  end if;
  if c.starts_at is not null and c.starts_at > timezone('utc', now()) then
    raise exception 'Coupon is not active yet';
  end if;
  if c.ends_at is not null and c.ends_at <= timezone('utc', now()) then
    raise exception 'Coupon has expired';
  end if;
  if p_subtotal_minor < c.min_subtotal_minor then
    raise exception 'Cart does not meet coupon minimum';
  end if;
  if c.discount_type = 'fixed' and c.currency is distinct from p_currency then
    raise exception 'Coupon currency mismatch';
  end if;
  if c.total_usage_limit is not null and c.usage_count >= c.total_usage_limit then
    raise exception 'Coupon usage limit reached';
  end if;

  select count(*)::integer into user_redemptions
  from public.store_coupon_redemptions r
  where r.coupon_id = c.id and r.user_id = p_buyer_id;

  if c.per_user_usage_limit is not null
     and user_redemptions >= c.per_user_usage_limit then
    raise exception 'Coupon per-user limit reached';
  end if;

  if not public.promotion_coupon_targets_ok(
    c.id, p_product_ids, p_category_ids, p_country_code, p_region
  ) then
    raise exception 'Coupon does not apply to this cart';
  end if;

  if c.discount_type = 'percent' then
    discount := (p_subtotal_minor * c.percent_bps) / 10000;
  elsif c.discount_type = 'fixed' then
    discount := c.fixed_amount_minor;
  elsif c.discount_type = 'free_shipping' then
    discount := 0;
    free_ship := true;
  end if;

  if c.max_discount_minor is not null and discount > c.max_discount_minor then
    discount := c.max_discount_minor;
  end if;
  if discount > p_subtotal_minor then
    discount := p_subtotal_minor;
  end if;
  if discount < 0 then
    discount := 0;
  end if;

  coupon_id := c.id;
  discount_minor := discount;
  snapshot := jsonb_build_object(
    'coupon_id', c.id,
    'code', c.code,
    'discount_type', c.discount_type,
    'percent_bps', c.percent_bps,
    'fixed_amount_minor', c.fixed_amount_minor,
    'currency', c.currency,
    'discount_minor', discount,
    'free_shipping', free_ship,
    'store_id', c.store_id,
    'promotion_name', c.promotion_name
  );
  return next;
end;
$$;

revoke all on function public.checkout_validate_coupon(text, uuid, uuid, text, bigint, uuid[], uuid[], text, text)
  from public, anon;
grant execute on function public.checkout_validate_coupon(text, uuid, uuid, text, bigint, uuid[], uuid[], text, text)
  to service_role;

-- Drop old 5-arg overload grant path (replaced by extended signature).
revoke all on function public.checkout_validate_coupon(text, uuid, uuid, text, bigint)
  from public, anon, authenticated;

create or replace function public.checkout_compute_shipping_fee(
  p_store_id uuid,
  p_currency text,
  p_subtotal_minor bigint,
  p_method_code text,
  p_discount_snapshot jsonb default null
)
returns table (
  fee_minor bigint,
  method_code text,
  method_name text,
  estimate_text text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  code text := lower(btrim(coalesce(p_method_code, 'standard')));
  method public.store_shipping_methods%rowtype;
  fee bigint;
  has_any boolean;
begin
  if p_subtotal_minor is null or p_subtotal_minor < 0 then
    raise exception 'Subtotal is invalid for shipping';
  end if;

  select exists (
    select 1 from public.store_shipping_methods m
    where m.store_id = p_store_id and m.is_active = true
  ) into has_any;

  if not has_any then
    if code is distinct from 'standard' then
      raise exception 'Shipping method not available';
    end if;
    fee_minor := 0;
    method_code := 'standard';
    method_name := 'Standard shipping';
    estimate_text := 'Estimated delivery shared after order review';
    if coalesce((p_discount_snapshot->>'free_shipping')::boolean, false) then
      fee_minor := 0;
    end if;
    return next;
    return;
  end if;

  select * into method
  from public.store_shipping_methods m
  where m.store_id = p_store_id
    and m.code = code
    and m.is_active = true;

  if not found then
    raise exception 'Shipping method not found';
  end if;

  if method.currency is distinct from p_currency then
    raise exception 'Shipping method currency mismatch';
  end if;

  fee := method.fee_minor;
  if method.free_above_subtotal_minor is not null
     and p_subtotal_minor >= method.free_above_subtotal_minor then
    fee := 0;
  end if;
  if coalesce((p_discount_snapshot->>'free_shipping')::boolean, false) then
    fee := 0;
  end if;

  fee_minor := fee;
  method_code := method.code;
  method_name := method.name;
  estimate_text := method.estimate_text;
  return next;
end;
$$;

revoke all on function public.checkout_compute_shipping_fee(uuid, text, bigint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.checkout_compute_shipping_fee(uuid, text, bigint, text, jsonb)
  to service_role;

revoke all on function public.checkout_compute_shipping_fee(uuid, text, bigint, text)
  from public, anon, authenticated;

-- Drop legacy overloads replaced by extended signatures.
drop function if exists public.checkout_validate_coupon(text, uuid, uuid, text, bigint);
drop function if exists public.checkout_compute_shipping_fee(uuid, text, bigint, text);

-- ---------------------------------------------------------------------------
-- 7) Fulfillment init trigger + lifecycle RPC
-- ---------------------------------------------------------------------------

create or replace function public.init_order_fulfillment_on_order_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
begin
  insert into public.order_fulfillments (
    order_id, store_id, buyer_id, lifecycle_stage
  ) values (
    new.id, new.store_id, new.buyer_id, 'pending'
  )
  on conflict (order_id) do nothing
  returning id into fid;

  if fid is not null then
    insert into public.order_fulfillment_events (
      fulfillment_id, order_id, from_stage, to_stage, source, note
    ) values (
      fid, new.id, null, 'pending', 'system', 'Fulfillment initialized'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.init_order_fulfillment_on_order_insert()
  from public, anon, authenticated;

drop trigger if exists orders_init_fulfillment on public.orders;
create trigger orders_init_fulfillment
  after insert on public.orders
  for each row execute function public.init_order_fulfillment_on_order_insert();

create or replace function public.update_order_fulfillment_lifecycle(
  p_order_id uuid,
  p_lifecycle_stage text,
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
  f public.order_fulfillments%rowtype;
  note_text text := nullif(btrim(coalesce(p_note, '')), '');
  mapped_status text;
  from_stage text;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_order_id is null or p_lifecycle_stage is null then
    raise exception 'order_id and lifecycle_stage are required';
  end if;
  if p_lifecycle_stage not in (
    'pending','confirmed','preparing','packed','shipped',
    'out_for_delivery','delivered','cancelled','returned','refunded'
  ) then
    raise exception 'Invalid fulfillment lifecycle stage';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if not (
    public.is_platform_admin()
    or public.is_store_member_with_role(o.store_id, array['owner', 'manager'])
  ) then
    raise exception 'Not authorized';
  end if;

  select * into f from public.order_fulfillments where order_id = o.id for update;
  if not found then
    raise exception 'Fulfillment not found';
  end if;

  from_stage := f.lifecycle_stage;

  if from_stage in ('cancelled', 'refunded') then
    raise exception 'Fulfillment is in a terminal state';
  end if;

  if from_stage = p_lifecycle_stage then
    return jsonb_build_object(
      'order_id', o.id,
      'lifecycle_stage', p_lifecycle_stage,
      'unchanged', true
    );
  end if;

  if not public.store_fulfillment_lifecycle_transition_allowed(
    from_stage, p_lifecycle_stage
  ) then
    raise exception 'Invalid fulfillment lifecycle transition';
  end if;

  update public.order_fulfillments
  set lifecycle_stage = p_lifecycle_stage
  where id = f.id;

  insert into public.order_fulfillment_events (
    fulfillment_id, order_id, from_stage, to_stage, actor_user_id, note, source
  ) values (
    f.id, o.id, from_stage, p_lifecycle_stage, uid, note_text,
    case when public.is_platform_admin() then 'admin' else 'seller' end
  );

  mapped_status := case p_lifecycle_stage
    when 'confirmed' then 'confirmed'
    when 'preparing' then 'processing'
    when 'packed' then 'packed'
    when 'shipped' then 'shipped'
    when 'out_for_delivery' then 'shipped'
    when 'delivered' then 'delivered'
    when 'cancelled' then 'cancelled'
    when 'refunded' then 'refunded'
    else null
  end;

  if mapped_status is not null
     and o.status is distinct from mapped_status
     and public.store_order_status_transition_allowed(o.status, mapped_status) then
    perform public.update_store_order_status(
      o.id, mapped_status, null, coalesce(note_text, 'Synced from fulfillment lifecycle')
    );
  end if;

  return jsonb_build_object(
    'order_id', o.id,
    'lifecycle_stage', p_lifecycle_stage
  );
end;
$$;

revoke all on function public.update_order_fulfillment_lifecycle(uuid, text, text)
  from public, anon;
grant execute on function public.update_order_fulfillment_lifecycle(uuid, text, text)
  to authenticated, service_role;

create or replace function public.get_order_fulfillment(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o public.orders%rowtype;
  f public.order_fulfillments%rowtype;
  events jsonb;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  select * into o from public.orders where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;
  if not public.can_read_store_order(p_order_id) then
    raise exception 'Not authorized';
  end if;

  select * into f from public.order_fulfillments where order_id = p_order_id;
  if not found then
    raise exception 'Fulfillment not found';
  end if;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at asc), '[]'::jsonb)
    into events
  from public.order_fulfillment_events e
  where e.order_id = p_order_id;

  return jsonb_build_object('fulfillment', to_jsonb(f), 'events', events);
end;
$$;

revoke all on function public.get_order_fulfillment(uuid)
  from public, anon;
grant execute on function public.get_order_fulfillment(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) Tracking RPCs
-- ---------------------------------------------------------------------------

create or replace function public.upsert_order_shipment_tracking(
  p_order_id uuid,
  p_provider_key text,
  p_tracking_number text,
  p_tracking_status text default 'pending',
  p_estimated_delivery_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o public.orders%rowtype;
  f public.order_fulfillments%rowtype;
  tracking_id uuid;
  tracking_norm text := upper(regexp_replace(btrim(coalesce(p_tracking_number, '')), '\s+', '', 'g'));
  from_stage text;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  if p_provider_key not in (
    'manual','local_courier','ups','fedex','dhl','aramex','custom'
  ) then
    raise exception 'Invalid shipping provider';
  end if;
  if coalesce(p_tracking_status, 'pending') not in (
    'pending','label_created','picked_up','in_transit',
    'out_for_delivery','delivered','exception','returned','cancelled'
  ) then
    raise exception 'Invalid tracking status';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if not (
    public.is_platform_admin()
    or public.is_store_member_with_role(o.store_id, array['owner', 'manager'])
  ) then
    raise exception 'Not authorized';
  end if;
  if char_length(tracking_norm) < 4 or char_length(tracking_norm) > 64 then
    raise exception 'Tracking number is invalid';
  end if;
  if tracking_norm !~ '^[A-Z0-9-]+$' then
    raise exception 'Tracking number contains invalid characters';
  end if;

  select * into f from public.order_fulfillments where order_id = o.id;

  insert into public.order_shipments (
    order_id, fulfillment_id, provider_key, tracking_number,
    tracking_status, estimated_delivery_at, last_update_at
  ) values (
    o.id, f.id, p_provider_key, tracking_norm,
    coalesce(p_tracking_status, 'pending'), p_estimated_delivery_at, timezone('utc', now())
  )
  on conflict (order_id, tracking_number) do update set
    provider_key = excluded.provider_key,
    tracking_status = excluded.tracking_status,
    estimated_delivery_at = excluded.estimated_delivery_at,
    last_update_at = timezone('utc', now())
  returning id into tracking_id;

  return jsonb_build_object('tracking_id', tracking_id, 'tracking_number', tracking_norm);
end;
$$;

revoke all on function public.upsert_order_shipment_tracking(uuid, text, text, text, timestamptz)
  from public, anon;
grant execute on function public.upsert_order_shipment_tracking(uuid, text, text, text, timestamptz)
  to authenticated, service_role;

create or replace function public.confirm_order_delivery(
  p_tracking_id uuid,
  p_confirmed_by text default 'seller'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s public.order_shipments%rowtype;
  o public.orders%rowtype;
  f public.order_fulfillments%rowtype;
  confirmed_by text;
  from_stage text;
  mapped_status text;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  select * into s from public.order_shipments where id = p_tracking_id for update;
  if not found then
    raise exception 'Shipment tracking not found';
  end if;

  select * into o from public.orders where id = s.order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if s.delivered_at is not null then
    return jsonb_build_object(
      'tracking_id', s.id,
      'delivered', true,
      'idempotent', true
    );
  end if;

  if public.is_platform_admin() then
    confirmed_by := 'admin';
  elsif public.is_store_member_with_role(o.store_id, array['owner', 'manager']) then
    confirmed_by := 'seller';
  elsif o.buyer_id = uid then
    if s.tracking_status not in (
      'in_transit', 'out_for_delivery', 'picked_up', 'delivered'
    ) then
      raise exception 'Shipment is not ready for buyer confirmation';
    end if;
    confirmed_by := 'buyer';
  else
    raise exception 'Not authorized';
  end if;

  update public.order_shipments set
    tracking_status = 'delivered',
    delivered_at = timezone('utc', now()),
    delivery_confirmed_by = confirmed_by,
    last_update_at = timezone('utc', now())
  where id = s.id;

  select * into f from public.order_fulfillments where order_id = o.id for update;
  if found then
    from_stage := f.lifecycle_stage;
    if from_stage is distinct from 'delivered'
       and from_stage not in ('cancelled', 'refunded')
       and public.store_fulfillment_lifecycle_transition_allowed(from_stage, 'delivered') then
      update public.order_fulfillments
      set lifecycle_stage = 'delivered'
      where id = f.id;

      insert into public.order_fulfillment_events (
        fulfillment_id, order_id, from_stage, to_stage, actor_user_id, note, source
      ) values (
        f.id, o.id, from_stage, 'delivered', uid,
        'Delivery confirmed', confirmed_by
      );

      mapped_status := 'delivered';
      if o.status is distinct from mapped_status
         and public.store_order_status_transition_allowed(o.status, mapped_status) then
        perform public.update_store_order_status(
          o.id, mapped_status, null, 'Delivery confirmed'
        );
      end if;
    end if;
  end if;

  return jsonb_build_object('tracking_id', s.id, 'delivered', true);
end;
$$;

revoke all on function public.confirm_order_delivery(uuid, text)
  from public, anon;
grant execute on function public.confirm_order_delivery(uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9) Admin / seller promotion + shipping management RPCs
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_store_coupons(p_store_id uuid)
returns setof public.store_coupons
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not (
    public.is_platform_admin()
    or public.is_store_member_with_role(p_store_id, array['owner', 'manager'])
  ) then
    raise exception 'Not authorized';
  end if;
  return query
  select * from public.store_coupons sc
  where sc.store_id = p_store_id or (sc.store_id is null and public.is_platform_admin())
  order by sc.created_at desc;
end;
$$;

revoke all on function public.admin_list_store_coupons(uuid)
  from public, anon;
grant execute on function public.admin_list_store_coupons(uuid)
  to authenticated, service_role;

create or replace function public.admin_upsert_store_coupon(
  p_store_id uuid,
  p_code text,
  p_discount_type text,
  p_status text default 'active',
  p_percent_bps integer default null,
  p_fixed_amount_minor bigint default null,
  p_currency text default null,
  p_min_subtotal_minor bigint default 0,
  p_max_discount_minor bigint default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_total_usage_limit integer default null,
  p_per_user_usage_limit integer default null,
  p_promotion_name text default null,
  p_promotion_description text default null,
  p_coupon_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  code_norm text := upper(btrim(coalesce(p_code, '')));
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if not (
    public.is_platform_admin()
    or public.is_store_member_with_role(p_store_id, array['owner', 'manager'])
  ) then
    raise exception 'Not authorized';
  end if;
  if code_norm = '' then
    raise exception 'Coupon code is required';
  end if;
  if p_discount_type not in ('percent', 'fixed', 'free_shipping') then
    raise exception 'Invalid discount type';
  end if;
  if p_status not in ('active', 'disabled', 'expired') then
    raise exception 'Invalid coupon status';
  end if;
  if p_discount_type = 'percent' then
    if p_percent_bps is null or p_percent_bps < 1 or p_percent_bps > 10000 then
      raise exception 'percent_bps must be between 1 and 10000';
    end if;
  elsif p_discount_type = 'fixed' then
    if p_fixed_amount_minor is null or p_fixed_amount_minor < 0 then
      raise exception 'fixed_amount_minor must be non-negative';
    end if;
    if p_currency is null or p_currency !~ '^[A-Z]{3}$' then
      raise exception 'Fixed discount requires a valid currency';
    end if;
  end if;
  if coalesce(p_min_subtotal_minor, 0) < 0 then
    raise exception 'min_subtotal_minor must be non-negative';
  end if;
  if p_max_discount_minor is not null and p_max_discount_minor < 0 then
    raise exception 'max_discount_minor must be non-negative';
  end if;

  if p_coupon_id is null then
    insert into public.store_coupons (
      store_id, code, status, discount_type, percent_bps, fixed_amount_minor,
      currency, min_subtotal_minor, max_discount_minor, starts_at, ends_at,
      total_usage_limit, per_user_usage_limit, promotion_name, promotion_description
    ) values (
      p_store_id, code_norm, p_status, p_discount_type, p_percent_bps,
      p_fixed_amount_minor, p_currency, coalesce(p_min_subtotal_minor, 0),
      p_max_discount_minor, p_starts_at, p_ends_at, p_total_usage_limit,
      p_per_user_usage_limit, p_promotion_name, p_promotion_description
    ) returning id into cid;
  else
    update public.store_coupons sc set
      code = code_norm,
      status = p_status,
      discount_type = p_discount_type,
      percent_bps = p_percent_bps,
      fixed_amount_minor = p_fixed_amount_minor,
      currency = p_currency,
      min_subtotal_minor = coalesce(p_min_subtotal_minor, 0),
      max_discount_minor = p_max_discount_minor,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      total_usage_limit = p_total_usage_limit,
      per_user_usage_limit = p_per_user_usage_limit,
      promotion_name = p_promotion_name,
      promotion_description = p_promotion_description
    where sc.id = p_coupon_id
      and sc.store_id = p_store_id
    returning sc.id into cid;
    if cid is null then
      raise exception 'Coupon not found';
    end if;
  end if;

  return jsonb_build_object('coupon_id', cid);
end;
$$;

revoke all on function public.admin_upsert_store_coupon(
  uuid, text, text, text, integer, bigint, text, bigint, bigint,
  timestamptz, timestamptz, integer, integer, text, text, uuid
) from public, anon;
grant execute on function public.admin_upsert_store_coupon(
  uuid, text, text, text, integer, bigint, text, bigint, bigint,
  timestamptz, timestamptz, integer, integer, text, text, uuid
) to authenticated, service_role;

create or replace function public.admin_upsert_shipping_provider(
  p_store_id uuid,
  p_provider_key text,
  p_display_name text,
  p_enabled boolean default true,
  p_supports_tracking boolean default false,
  p_supports_pickup boolean default false,
  p_supports_international boolean default false,
  p_provider_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not (
    public.is_platform_admin()
    or public.is_store_member_with_role(p_store_id, array['owner', 'manager'])
  ) then
    raise exception 'Not authorized';
  end if;

  if p_provider_id is null then
    insert into public.store_shipping_providers (
      store_id, provider_key, display_name, enabled,
      supports_tracking, supports_pickup, supports_international
    ) values (
      p_store_id, p_provider_key, p_display_name, coalesce(p_enabled, true),
      coalesce(p_supports_tracking, false), coalesce(p_supports_pickup, false),
      coalesce(p_supports_international, false)
    )
    on conflict (store_id, provider_key) do update set
      display_name = excluded.display_name,
      enabled = excluded.enabled,
      supports_tracking = excluded.supports_tracking,
      supports_pickup = excluded.supports_pickup,
      supports_international = excluded.supports_international
    returning id into pid;
  else
    update public.store_shipping_providers sp set
      provider_key = p_provider_key,
      display_name = p_display_name,
      enabled = coalesce(p_enabled, true),
      supports_tracking = coalesce(p_supports_tracking, false),
      supports_pickup = coalesce(p_supports_pickup, false),
      supports_international = coalesce(p_supports_international, false)
    where sp.id = p_provider_id and sp.store_id = p_store_id
    returning sp.id into pid;
  end if;

  return jsonb_build_object('provider_id', pid);
end;
$$;

revoke all on function public.admin_upsert_shipping_provider(
  uuid, text, text, boolean, boolean, boolean, boolean, uuid
) from public, anon;
grant execute on function public.admin_upsert_shipping_provider(
  uuid, text, text, boolean, boolean, boolean, boolean, uuid
) to authenticated, service_role;

create or replace function public.admin_upsert_shipping_zone(
  p_store_id uuid,
  p_name text,
  p_country_codes text[],
  p_region_codes text[] default '{}'::text[],
  p_enabled boolean default true,
  p_zone_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  zid uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not (
    public.is_platform_admin()
    or public.is_store_member_with_role(p_store_id, array['owner', 'manager'])
  ) then
    raise exception 'Not authorized';
  end if;

  if p_zone_id is null then
    insert into public.store_shipping_zones (
      store_id, name, country_codes, region_codes, enabled
    ) values (
      p_store_id, p_name, coalesce(p_country_codes, '{}'::text[]),
      coalesce(p_region_codes, '{}'::text[]), coalesce(p_enabled, true)
    ) returning id into zid;
  else
    update public.store_shipping_zones z set
      name = p_name,
      country_codes = coalesce(p_country_codes, '{}'::text[]),
      region_codes = coalesce(p_region_codes, '{}'::text[]),
      enabled = coalesce(p_enabled, true)
    where z.id = p_zone_id and z.store_id = p_store_id
    returning z.id into zid;
  end if;

  return jsonb_build_object('zone_id', zid);
end;
$$;

revoke all on function public.admin_upsert_shipping_zone(
  uuid, text, text[], text[], boolean, uuid
) from public, anon;
grant execute on function public.admin_upsert_shipping_zone(
  uuid, text, text[], text[], boolean, uuid
) to authenticated, service_role;

create or replace function public.admin_upsert_shipping_rate(
  p_zone_id uuid,
  p_service_type text,
  p_fee_minor bigint,
  p_currency text,
  p_provider_id uuid default null,
  p_min_subtotal_minor bigint default null,
  p_max_subtotal_minor bigint default null,
  p_free_above_subtotal_minor bigint default null,
  p_enabled boolean default true,
  p_rate_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  sid uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select z.store_id into sid
  from public.store_shipping_zones z where z.id = p_zone_id;
  if sid is null then
    raise exception 'Shipping zone not found';
  end if;
  if not (
    public.is_platform_admin()
    or public.is_store_member_with_role(sid, array['owner', 'manager'])
  ) then
    raise exception 'Not authorized';
  end if;

  if p_rate_id is null then
    insert into public.store_shipping_rates (
      zone_id, provider_id, service_type, fee_minor, currency,
      min_subtotal_minor, max_subtotal_minor, free_above_subtotal_minor, enabled
    ) values (
      p_zone_id, p_provider_id, p_service_type, p_fee_minor, p_currency,
      p_min_subtotal_minor, p_max_subtotal_minor, p_free_above_subtotal_minor,
      coalesce(p_enabled, true)
    ) returning id into rid;
  else
    update public.store_shipping_rates r set
      provider_id = p_provider_id,
      service_type = p_service_type,
      fee_minor = p_fee_minor,
      currency = p_currency,
      min_subtotal_minor = p_min_subtotal_minor,
      max_subtotal_minor = p_max_subtotal_minor,
      free_above_subtotal_minor = p_free_above_subtotal_minor,
      enabled = coalesce(p_enabled, true)
    where r.id = p_rate_id and r.zone_id = p_zone_id
    returning r.id into rid;
  end if;

  return jsonb_build_object('rate_id', rid);
end;
$$;

revoke all on function public.admin_upsert_shipping_rate(
  uuid, text, bigint, text, uuid, bigint, bigint, bigint, boolean, uuid
) from public, anon;
grant execute on function public.admin_upsert_shipping_rate(
  uuid, text, bigint, text, uuid, bigint, bigint, bigint, boolean, uuid
) to authenticated, service_role;

-- CHECKOUT QUOTE/CONFIRM PATCHES appended below by build script

-- ---------------------------------------------------------------------------
-- 10) Checkout quote/confirm promotion integration
-- ---------------------------------------------------------------------------

create or replace function public.create_store_checkout_quote(
  p_address jsonb,
  p_billing jsonb,
  p_shipping_selections jsonb,
  p_coupon_code text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cart_row public.carts%rowtype;
  addr jsonb;
  billing jsonb;
  idem text;
  existing_id uuid;
  quote_id uuid;
  currency_code text;
  selections jsonb := coalesce(p_shipping_selections, '{}'::jsonb);
  coupon_in text := nullif(btrim(coalesce(p_coupon_code, '')), '');
  groups jsonb := '[]'::jsonb;
  store_ids uuid[];
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
  disc_snap jsonb;
  items_json jsonb;
  line record;
  inv_available integer;
  inv_on_hand integer;
  inv_reserved integer;
  inv_safety integer;
  inv_backorder boolean;
  payload jsonb;
  expires_at timestamptz := timezone('utc', now()) + interval '15 minutes';
  coupon_applied boolean := false;
  product_ids uuid[] := '{}';
  category_ids uuid[] := '{}';
  buyer_country text;
  buyer_region text;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  idem := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  if idem is null or char_length(idem) < 8 or char_length(idem) > 128 then
    raise exception 'idempotency_key must be 8-128 characters';
  end if;

  select q.id into existing_id
  from public.checkout_quotes q
  where q.idempotency_key = idem
  for update;
  if existing_id is not null then
    -- Only open, non-expired quotes are reusable under the same key.
    if exists (
      select 1 from public.checkout_quotes q
      where q.id = existing_id
        and q.status = 'open'
        and q.expires_at > timezone('utc', now())
    ) then
      return (
        select jsonb_build_object(
          'quote_id', q.id,
          'expires_at', q.expires_at,
          'status', q.status,
          'payload', q.quote_payload,
          'reused', true
        )
        from public.checkout_quotes q where q.id = existing_id
      );
    end if;
    if exists (
      select 1 from public.checkout_quotes q
      where q.id = existing_id and q.status = 'open'
        and q.expires_at <= timezone('utc', now())
    ) then
      update public.checkout_quotes set status = 'expired' where id = existing_id;
    end if;
    raise exception 'Checkout quote idempotency key already used';
  end if;

  addr := public.checkout_normalize_address(p_address);
  buyer_country := nullif(btrim(coalesce(addr->>'country_code', '')), '');
  buyer_region := nullif(btrim(coalesce(addr->>'region', '')), '');
  billing := public.checkout_normalize_address(coalesce(p_billing, p_address));

  select * into cart_row
  from public.carts c
  where c.user_id = uid and c.status = 'active'
  order by c.updated_at desc
  limit 1;

  if not found then
    raise exception 'Cart is empty';
  end if;

  currency_code := cart_row.currency;

  select coalesce(array_agg(distinct ci.store_id), '{}'::uuid[])
    into store_ids
  from public.cart_items ci
  where ci.cart_id = cart_row.id;

  if store_ids is null or coalesce(array_length(store_ids, 1), 0) < 1 then
    raise exception 'Cart is empty';
  end if;

  foreach sid in array store_ids
  loop
    store_subtotal := 0;
    items_json := '[]'::jsonb;
    product_ids := '{}';
    category_ids := '{}';

    for line in
      select
        ci.quantity,
        ci.variant_id,
        ci.store_id,
        p.id as product_id,
        p.primary_category_id as category_id,
        p.status as product_status,
        p.moderation_status,
        s.status as store_status,
        v.status as variant_status,
        v.sku,
        p.title as product_title,
        v.title as variant_title,
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
          and pp1.currency = currency_code
          and pp1.status = 'active'
          and (pp1.starts_at is null or pp1.starts_at <= timezone('utc', now()))
          and (pp1.ends_at is null or pp1.ends_at > timezone('utc', now()))
        order by pp1.updated_at desc, pp1.created_at desc
        limit 1
      ) pp on true
      left join public.product_inventory inv
        on inv.variant_id = v.id and inv.warehouse_key = 'default'
      where ci.cart_id = cart_row.id and ci.store_id = sid
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
      if line.price_currency is distinct from currency_code then
        raise exception 'Currency mismatch in cart';
      end if;

      -- Serialize inventory checks against concurrent checkout confirmations.
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

    store_discount := 0;
    disc_snap := null;
    -- At most one coupon redemption per checkout quote (first eligible store).
    if coupon_in is not null and not coupon_applied then
      select * into coupon from public.checkout_validate_coupon(
        coupon_in, sid, uid, currency_code, store_subtotal,
        product_ids, category_ids, buyer_country, buyer_region
      );
      if found then
        store_discount := coupon.discount_minor;
        disc_snap := coupon.snapshot;
        coupon_applied := true;
      end if;
    end if;

    select * into ship from public.checkout_compute_shipping_fee(
      sid,
      currency_code,
      store_subtotal - store_discount,
      coalesce(selections->>sid::text, selections->>'default', 'standard'),
      disc_snap
    );
    store_shipping := ship.fee_minor;

    select c.inclusive, c.rate_bps, c.tax_minor, c.snapshot
      into tax_incl, tax_rate, store_tax, tax_snap
      from public.checkout_compute_tax(sid, store_subtotal - store_discount) as c;

    -- Exclusive: add tax. Inclusive: tax is display-only portion already in merchandise.
    if tax_incl then
      store_grand := store_subtotal - store_discount + store_shipping;
    else
      store_grand := store_subtotal - store_discount + store_tax + store_shipping;
    end if;
    if store_grand < 0 then
      raise exception 'Grand total cannot be negative';
    end if;

    groups := groups || jsonb_build_array(jsonb_build_object(
      'store_id', sid,
      'items', items_json,
      'subtotal_minor', store_subtotal,
      'discount_total_minor', store_discount,
      'tax_total_minor', store_tax,
      'shipping_total_minor', store_shipping,
      'grand_total_minor', store_grand,
      'shipping_method_code', ship.method_code,
      'shipping_method_name', ship.method_name,
      'shipping_estimate_text', ship.estimate_text,
      'tax_snapshot', tax_snap,
      'discount_snapshot', disc_snap,
      'tax_inclusive', tax_incl
    ));
  end loop;

  payload := jsonb_build_object(
    'currency', currency_code,
    'cart_id', cart_row.id,
    'groups', groups,
    'coupon_code', coupon_in,
    'payment_note',
      'Payment collection is not enabled yet. Placing an order records a pending-payment order only.'
  );

  insert into public.checkout_quotes (
    buyer_id, cart_id, currency, status, idempotency_key, expires_at,
    address_snapshot, billing_contact_snapshot, coupon_code,
    shipping_selections, quote_payload
  ) values (
    uid, cart_row.id, currency_code, 'open', idem, expires_at,
    addr, billing, coupon_in, selections, payload
  ) returning id into quote_id;

  return jsonb_build_object(
    'quote_id', quote_id,
    'expires_at', expires_at,
    'status', 'open',
    'payload', payload,
    'reused', false
  );
end;
$$;

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
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

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

  ship_addr := q.address_snapshot;
  buyer_country := nullif(btrim(coalesce(ship_addr->>'country_code', '')), '');
  buyer_region := nullif(btrim(coalesce(ship_addr->>'region', '')), '');
  bill_addr := q.billing_contact_snapshot;

  -- Recalculate from live catalog, create orders, redeem coupons — all in one
  -- transaction. Any failure rolls back every store (no partial corruption).
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
      'grand_total_minor', store_grand
    ));
  end loop;

  delete from public.cart_items ci where ci.cart_id = q.cart_id;
  update public.carts c set status = 'converted' where c.id = q.cart_id;

  update public.checkout_quotes
    set status = 'confirmed',
        confirmed_at = timezone('utc', now()),
        quote_payload = quote_payload || jsonb_build_object('orders', orders_out)
  where id = q.id;

  return jsonb_build_object(
    'status', 'confirmed',
    'orders', orders_out,
    'payment_note',
      'Payment collection is not enabled yet. Your order is recorded as pending payment.',
    'idempotent', false
  );
end;
$$;
