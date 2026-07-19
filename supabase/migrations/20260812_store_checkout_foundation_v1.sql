-- UMTUBA Store — Checkout Foundation V1
-- Additive on Orders Foundation V1. Fail-closed RLS + FORCE RLS.
-- No payment gateways. Authoritative cart→quote→order orchestration.
-- Multi-store: one order per store; confirm is ATOMIC across all store groups.
-- Tax/shipping/coupon are provider-neutral foundations (not legal/carrier integrations).

-- ---------------------------------------------------------------------------
-- 1) Order checkout snapshot columns + immutability
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists shipping_address_snapshot jsonb,
  add column if not exists billing_contact_snapshot jsonb,
  add column if not exists shipping_method_code text,
  add column if not exists shipping_method_name text,
  add column if not exists shipping_estimate_text text,
  add column if not exists coupon_code_snapshot text,
  add column if not exists checkout_quote_id uuid,
  add column if not exists tax_snapshot jsonb,
  add column if not exists discount_snapshot jsonb;

alter table public.orders
  drop constraint if exists orders_shipping_address_snapshot_obj_check;
alter table public.orders
  add constraint orders_shipping_address_snapshot_obj_check
  check (
    shipping_address_snapshot is null
    or jsonb_typeof(shipping_address_snapshot) = 'object'
  );

alter table public.orders
  drop constraint if exists orders_billing_contact_snapshot_obj_check;
alter table public.orders
  add constraint orders_billing_contact_snapshot_obj_check
  check (
    billing_contact_snapshot is null
    or jsonb_typeof(billing_contact_snapshot) = 'object'
  );

alter table public.orders
  drop constraint if exists orders_tax_snapshot_obj_check;
alter table public.orders
  add constraint orders_tax_snapshot_obj_check
  check (tax_snapshot is null or jsonb_typeof(tax_snapshot) = 'object');

alter table public.orders
  drop constraint if exists orders_discount_snapshot_obj_check;
alter table public.orders
  add constraint orders_discount_snapshot_obj_check
  check (
    discount_snapshot is null
    or jsonb_typeof(discount_snapshot) = 'object'
  );

alter table public.orders
  drop constraint if exists orders_shipping_method_code_format_check;
alter table public.orders
  add constraint orders_shipping_method_code_format_check
  check (
    shipping_method_code is null
    or shipping_method_code ~ '^[a-z0-9][a-z0-9_-]{0,62}$'
  );

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

    -- Checkout snapshots: set-once (null → value), then immutable.
    if (old.shipping_address_snapshot is not null
        and new.shipping_address_snapshot is distinct from old.shipping_address_snapshot)
       or (old.billing_contact_snapshot is not null
        and new.billing_contact_snapshot is distinct from old.billing_contact_snapshot)
       or (old.shipping_method_code is not null
        and new.shipping_method_code is distinct from old.shipping_method_code)
       or (old.shipping_method_name is not null
        and new.shipping_method_name is distinct from old.shipping_method_name)
       or (old.shipping_estimate_text is not null
        and new.shipping_estimate_text is distinct from old.shipping_estimate_text)
       or (old.coupon_code_snapshot is not null
        and new.coupon_code_snapshot is distinct from old.coupon_code_snapshot)
       or (old.checkout_quote_id is not null
        and new.checkout_quote_id is distinct from old.checkout_quote_id)
       or (old.tax_snapshot is not null
        and new.tax_snapshot is distinct from old.tax_snapshot)
       or (old.discount_snapshot is not null
        and new.discount_snapshot is distinct from old.discount_snapshot)
    then
      raise exception 'Order checkout snapshots are immutable once set';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Buyer addresses
-- ---------------------------------------------------------------------------

create table if not exists public.buyer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text check (label is null or char_length(btrim(label)) between 1 and 40),
  full_name text not null
    check (char_length(btrim(full_name)) between 2 and 120),
  phone text not null
    check (
      char_length(btrim(phone)) between 1 and 40
      and phone ~ '^[0-9+()[:space:].-]+$'
    ),
  email text
    check (
      email is null
      or (
        char_length(btrim(email)) between 3 and 254
        and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
      )
    ),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  region text check (region is null or char_length(btrim(region)) <= 80),
  city text not null check (char_length(btrim(city)) between 1 and 80),
  postal_code text
    check (postal_code is null or char_length(btrim(postal_code)) between 1 and 20),
  address_line1 text not null
    check (char_length(btrim(address_line1)) between 1 and 160),
  address_line2 text
    check (address_line2 is null or char_length(btrim(address_line2)) <= 160),
  delivery_instructions text
    check (
      delivery_instructions is null
      or char_length(delivery_instructions) <= 500
    ),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_addresses_user_id_idx
  on public.buyer_addresses (user_id);

create unique index if not exists buyer_addresses_one_default_per_user_uidx
  on public.buyer_addresses (user_id)
  where is_default = true;

drop trigger if exists buyer_addresses_set_updated_at on public.buyer_addresses;
create trigger buyer_addresses_set_updated_at
  before update on public.buyer_addresses
  for each row execute function public.set_row_updated_at();

alter table public.buyer_addresses enable row level security;
alter table public.buyer_addresses force row level security;
revoke all on public.buyer_addresses from anon, public;
grant select, insert, update, delete on public.buyer_addresses to authenticated;

drop policy if exists "Buyers manage own addresses" on public.buyer_addresses;
create policy "Buyers manage own addresses"
  on public.buyer_addresses for all to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  )
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3) Shipping methods + tax configs
-- ---------------------------------------------------------------------------

create table if not exists public.store_shipping_methods (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9][a-z0-9_-]{0,62}$'),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  fee_minor bigint not null check (fee_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  free_above_subtotal_minor bigint
    check (
      free_above_subtotal_minor is null
      or free_above_subtotal_minor >= 0
    ),
  estimate_text text
    check (estimate_text is null or char_length(estimate_text) <= 160),
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_shipping_methods_store_code_uidx unique (store_id, code)
);

create index if not exists store_shipping_methods_store_active_idx
  on public.store_shipping_methods (store_id, is_active, sort_order);

drop trigger if exists store_shipping_methods_set_updated_at
  on public.store_shipping_methods;
create trigger store_shipping_methods_set_updated_at
  before update on public.store_shipping_methods
  for each row execute function public.set_row_updated_at();

alter table public.store_shipping_methods enable row level security;
alter table public.store_shipping_methods force row level security;
revoke all on public.store_shipping_methods from anon, public;
grant select on public.store_shipping_methods to authenticated;
grant insert, update, delete on public.store_shipping_methods to authenticated;

drop policy if exists "Anyone auth can read active shipping methods"
  on public.store_shipping_methods;
create policy "Anyone auth can read active shipping methods"
  on public.store_shipping_methods for select to authenticated
  using (
    is_active = true
    or public.is_store_member(store_id)
    or public.is_platform_admin()
  );

drop policy if exists "Store managers write shipping methods"
  on public.store_shipping_methods;
create policy "Store managers write shipping methods"
  on public.store_shipping_methods for all to authenticated
  using (
    public.is_store_member_with_role(store_id, array['owner', 'manager'])
    or public.is_platform_admin()
  )
  with check (
    public.is_store_member_with_role(store_id, array['owner', 'manager'])
    or public.is_platform_admin()
  );

create table if not exists public.store_tax_configs (
  store_id uuid primary key references public.stores (id) on delete cascade,
  enabled boolean not null default false,
  inclusive boolean not null default false,
  rate_bps integer not null default 0
    check (rate_bps >= 0 and rate_bps <= 100000),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  updated_at timestamptz not null default now()
);

alter table public.store_tax_configs enable row level security;
alter table public.store_tax_configs force row level security;
revoke all on public.store_tax_configs from anon, public;
grant select on public.store_tax_configs to authenticated;
grant insert, update, delete on public.store_tax_configs to authenticated;

drop policy if exists "Auth can read tax configs" on public.store_tax_configs;
create policy "Auth can read tax configs"
  on public.store_tax_configs for select to authenticated
  using (true);

drop policy if exists "Store managers write tax configs" on public.store_tax_configs;
create policy "Store managers write tax configs"
  on public.store_tax_configs for all to authenticated
  using (
    public.is_store_member_with_role(store_id, array['owner', 'manager'])
    or public.is_platform_admin()
  )
  with check (
    public.is_store_member_with_role(store_id, array['owner', 'manager'])
    or public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 4) Coupons + redemptions
-- ---------------------------------------------------------------------------

create table if not exists public.store_coupons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores (id) on delete cascade,
  code text not null check (char_length(btrim(code)) between 2 and 40),
  status text not null default 'active'
    check (status in ('active', 'disabled', 'expired')),
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  percent_bps integer
    check (percent_bps is null or (percent_bps >= 1 and percent_bps <= 10000)),
  fixed_amount_minor bigint
    check (fixed_amount_minor is null or fixed_amount_minor >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  min_subtotal_minor bigint not null default 0 check (min_subtotal_minor >= 0),
  max_discount_minor bigint check (max_discount_minor is null or max_discount_minor >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  total_usage_limit integer check (total_usage_limit is null or total_usage_limit > 0),
  per_user_usage_limit integer
    check (per_user_usage_limit is null or per_user_usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_coupons_type_fields_check check (
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
  ),
  constraint store_coupons_window_check check (
    starts_at is null or ends_at is null or ends_at > starts_at
  )
);

create unique index if not exists store_coupons_store_code_uidx
  on public.store_coupons (store_id, lower(code))
  where store_id is not null;

create unique index if not exists store_coupons_platform_code_uidx
  on public.store_coupons (lower(code))
  where store_id is null;

drop trigger if exists store_coupons_set_updated_at on public.store_coupons;
create trigger store_coupons_set_updated_at
  before update on public.store_coupons
  for each row execute function public.set_row_updated_at();

alter table public.store_coupons enable row level security;
alter table public.store_coupons force row level security;
revoke all on public.store_coupons from anon, public, authenticated;
-- Coupon validation/redemption only via SECURITY DEFINER RPCs.

create table if not exists public.store_coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.store_coupons (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  store_id uuid not null references public.stores (id) on delete restrict,
  discount_minor bigint not null check (discount_minor >= 0),
  code_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint store_coupon_redemptions_coupon_order_uidx unique (coupon_id, order_id)
);

create index if not exists store_coupon_redemptions_user_coupon_idx
  on public.store_coupon_redemptions (user_id, coupon_id);

alter table public.store_coupon_redemptions enable row level security;
alter table public.store_coupon_redemptions force row level security;
revoke all on public.store_coupon_redemptions from anon, public;
grant select on public.store_coupon_redemptions to authenticated;

drop policy if exists "Buyers read own coupon redemptions"
  on public.store_coupon_redemptions;
create policy "Buyers read own coupon redemptions"
  on public.store_coupon_redemptions for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_store_member(store_id)
    or public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 5) Checkout quotes + order_discounts
-- ---------------------------------------------------------------------------

create table if not exists public.checkout_quotes (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users (id) on delete cascade,
  cart_id uuid not null references public.carts (id) on delete restrict,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'open'
    check (status in ('open', 'confirmed', 'expired', 'cancelled')),
  idempotency_key text not null
    check (char_length(btrim(idempotency_key)) between 8 and 128),
  expires_at timestamptz not null,
  address_snapshot jsonb not null
    check (jsonb_typeof(address_snapshot) = 'object'),
  billing_contact_snapshot jsonb not null
    check (jsonb_typeof(billing_contact_snapshot) = 'object'),
  coupon_code text,
  shipping_selections jsonb not null default '{}'::jsonb
    check (jsonb_typeof(shipping_selections) = 'object'),
  quote_payload jsonb not null check (jsonb_typeof(quote_payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create unique index if not exists checkout_quotes_idempotency_key_uidx
  on public.checkout_quotes (idempotency_key);

create index if not exists checkout_quotes_buyer_created_idx
  on public.checkout_quotes (buyer_id, created_at desc);

drop trigger if exists checkout_quotes_set_updated_at on public.checkout_quotes;
create trigger checkout_quotes_set_updated_at
  before update on public.checkout_quotes
  for each row execute function public.set_row_updated_at();

alter table public.checkout_quotes enable row level security;
alter table public.checkout_quotes force row level security;
revoke all on public.checkout_quotes from anon, public;
grant select on public.checkout_quotes to authenticated;
revoke insert, update, delete on public.checkout_quotes from authenticated;

drop policy if exists "Buyers read own checkout quotes" on public.checkout_quotes;
create policy "Buyers read own checkout quotes"
  on public.checkout_quotes for select to authenticated
  using (buyer_id = (select auth.uid()) or public.is_platform_admin());

create table if not exists public.order_discounts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  code_snapshot text,
  discount_type_snapshot text
    check (
      discount_type_snapshot is null
      or discount_type_snapshot in ('percent', 'fixed')
    ),
  amount_minor bigint not null check (amount_minor >= 0),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists order_discounts_order_id_idx
  on public.order_discounts (order_id);

alter table public.order_discounts enable row level security;
alter table public.order_discounts force row level security;
revoke all on public.order_discounts from anon, public;
grant select on public.order_discounts to authenticated;
revoke insert, update, delete on public.order_discounts from authenticated;

drop policy if exists "Read order discounts via parent order" on public.order_discounts;
create policy "Read order discounts via parent order"
  on public.order_discounts for select to authenticated
  using (public.can_read_store_order(order_id));

alter table public.orders
  drop constraint if exists orders_checkout_quote_id_fkey;
alter table public.orders
  add constraint orders_checkout_quote_id_fkey
  foreign key (checkout_quote_id) references public.checkout_quotes (id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- 6) Calculation helpers (SECURITY DEFINER, locked search_path)
-- ---------------------------------------------------------------------------

create or replace function public.checkout_normalize_address(p_address jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  full_name text;
  phone text;
  email text;
  country_code text;
  region text;
  city text;
  postal_code text;
  line1 text;
  line2 text;
  instructions text;
begin
  if p_address is null or jsonb_typeof(p_address) is distinct from 'object' then
    raise exception 'Address is required';
  end if;

  full_name := btrim(coalesce(p_address->>'full_name', ''));
  phone := btrim(coalesce(p_address->>'phone', ''));
  email := nullif(btrim(coalesce(p_address->>'email', '')), '');
  country_code := upper(btrim(coalesce(p_address->>'country_code', '')));
  region := nullif(btrim(coalesce(p_address->>'region', '')), '');
  city := btrim(coalesce(p_address->>'city', ''));
  postal_code := nullif(btrim(coalesce(p_address->>'postal_code', '')), '');
  line1 := btrim(coalesce(p_address->>'address_line1', ''));
  line2 := nullif(btrim(coalesce(p_address->>'address_line2', '')), '');
  instructions := nullif(btrim(coalesce(p_address->>'delivery_instructions', '')), '');

  if char_length(full_name) < 2 or char_length(full_name) > 120 then
    raise exception 'Full name is invalid';
  end if;
  if phone = '' or phone !~ '^[0-9+()[:space:].-]+$' then
    raise exception 'Phone is invalid';
  end if;
  if country_code !~ '^[A-Z]{2}$' then
    raise exception 'Country code must be ISO-3166 alpha-2';
  end if;
  if city = '' or char_length(city) > 80 then
    raise exception 'City is invalid';
  end if;
  if line1 = '' or char_length(line1) > 160 then
    raise exception 'Address line 1 is invalid';
  end if;
  if email is not null and email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email is invalid';
  end if;
  if instructions is not null and char_length(instructions) > 500 then
    raise exception 'Delivery instructions are too long';
  end if;

  return jsonb_build_object(
    'full_name', full_name,
    'phone', phone,
    'email', email,
    'country_code', country_code,
    'region', region,
    'city', city,
    'postal_code', postal_code,
    'address_line1', line1,
    'address_line2', line2,
    'delivery_instructions', instructions
  );
end;
$$;

revoke all on function public.checkout_normalize_address(jsonb)
  from public, anon, authenticated;
grant execute on function public.checkout_normalize_address(jsonb) to service_role;

create or replace function public.checkout_compute_shipping_fee(
  p_store_id uuid,
  p_currency text,
  p_subtotal_minor bigint,
  p_method_code text
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

  fee_minor := fee;
  method_code := method.code;
  method_name := method.name;
  estimate_text := method.estimate_text;
  return next;
end;
$$;

revoke all on function public.checkout_compute_shipping_fee(uuid, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.checkout_compute_shipping_fee(uuid, text, bigint, text)
  to service_role;

create or replace function public.checkout_compute_tax(
  p_store_id uuid,
  p_taxable_minor bigint
)
returns table (
  tax_minor bigint,
  inclusive boolean,
  rate_bps integer,
  snapshot jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cfg public.store_tax_configs%rowtype;
  tax bigint := 0;
begin
  if p_taxable_minor is null or p_taxable_minor < 0 then
    raise exception 'Taxable amount is invalid';
  end if;

  select * into cfg from public.store_tax_configs t where t.store_id = p_store_id;

  if not found or cfg.enabled is distinct from true or cfg.rate_bps = 0 then
    tax_minor := 0;
    inclusive := false;
    rate_bps := 0;
    snapshot := jsonb_build_object(
      'enabled', false,
      'inclusive', false,
      'rate_bps', 0,
      'tax_minor', 0,
      'foundation', true,
      'not_legal_advice', true
    );
    return next;
    return;
  end if;

  if cfg.inclusive then
    -- Extract tax portion from tax-inclusive taxable amount (integer floor).
    tax := p_taxable_minor
      - ((p_taxable_minor * 10000) / (10000 + cfg.rate_bps));
  else
    tax := (p_taxable_minor * cfg.rate_bps) / 10000;
  end if;

  if tax < 0 then
    tax := 0;
  end if;

  tax_minor := tax;
  inclusive := cfg.inclusive;
  rate_bps := cfg.rate_bps;
  snapshot := jsonb_build_object(
    'enabled', true,
    'inclusive', cfg.inclusive,
    'rate_bps', cfg.rate_bps,
    'country_code', cfg.country_code,
    'tax_minor', tax,
    'taxable_minor', p_taxable_minor,
    'foundation', true,
    'not_legal_advice', true
  );
  return next;
end;
$$;

revoke all on function public.checkout_compute_tax(uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.checkout_compute_tax(uuid, bigint)
  to service_role;

create or replace function public.checkout_validate_coupon(
  p_code text,
  p_store_id uuid,
  p_buyer_id uuid,
  p_currency text,
  p_subtotal_minor bigint
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
    -- Soft miss only when the code belongs to a different store.
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

  if c.discount_type = 'percent' then
    discount := (p_subtotal_minor * c.percent_bps) / 10000;
  else
    discount := c.fixed_amount_minor;
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
    'store_id', c.store_id
  );
  return next;
end;
$$;

revoke all on function public.checkout_normalize_address(jsonb)
  from public, anon, authenticated;
grant execute on function public.checkout_normalize_address(jsonb)
  to service_role;

revoke all on function public.checkout_compute_shipping_fee(uuid, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.checkout_compute_shipping_fee(uuid, text, bigint, text)
  to service_role;

revoke all on function public.checkout_compute_tax(uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.checkout_compute_tax(uuid, bigint)
  to service_role;

revoke all on function public.checkout_validate_coupon(text, uuid, uuid, text, bigint)
  from public, anon, authenticated;
grant execute on function public.checkout_validate_coupon(text, uuid, uuid, text, bigint)
  to service_role;

-- ---------------------------------------------------------------------------
-- 7) Checkout quote + confirm RPCs (authenticated, SECURITY DEFINER)
-- Multi-store confirm is ATOMIC: all store orders succeed or the transaction
-- rolls back. Payment collection is intentionally deferred.
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

    for line in
      select
        ci.quantity,
        ci.variant_id,
        ci.store_id,
        p.id as product_id,
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
        coupon_in, sid, uid, currency_code, store_subtotal
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
      coalesce(selections->>sid::text, selections->>'default', 'standard')
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

revoke all on function public.create_store_checkout_quote(jsonb, jsonb, jsonb, text, text)
  from public, anon;
grant execute on function public.create_store_checkout_quote(jsonb, jsonb, jsonb, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) Order create core + checkout confirm
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
begin
  -- Public automation entrypoint remains service_role-only (no GUC bypass).
  if auth.role() is distinct from 'service_role' then
    raise exception 'service_role required to create store orders';
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
    p_idempotency_key
  );
end;
$$;

revoke all on function public.create_store_order_foundation(
  uuid, uuid, text, jsonb, bigint, bigint, bigint, text, text
) from public, anon, authenticated;
grant execute on function public.create_store_order_foundation(
  uuid, uuid, text, jsonb, bigint, bigint, bigint, text, text
) to service_role;


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
  bill_addr := q.billing_contact_snapshot;

  -- Recalculate from live catalog, create orders, redeem coupons — all in one
  -- transaction. Any failure rolls back every store (no partial corruption).
  for grp in select value from jsonb_array_elements(q.quote_payload->'groups')
  loop
    sid := (grp->>'store_id')::uuid;
    store_subtotal := 0;
    items_json := '[]'::jsonb;
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
        q.coupon_code, sid, uid, q.currency, store_subtotal
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
      sid, q.currency, store_subtotal - store_discount, method_code
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
       and store_discount > 0 then
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

revoke all on function public.confirm_store_checkout_quote(uuid) from public, anon;
grant execute on function public.confirm_store_checkout_quote(uuid)
  to authenticated, service_role;

