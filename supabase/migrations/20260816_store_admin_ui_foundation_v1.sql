-- UMTUBA Store — Admin UI Foundation V1
-- Additive after 20260815. Read/list RPCs + provider priority for seller admin UI.
-- No payment gateways. No carrier APIs.

-- ---------------------------------------------------------------------------
-- 1) Provider priority for ordered admin lists
-- ---------------------------------------------------------------------------

alter table public.store_shipping_providers
  add column if not exists sort_priority integer not null default 100
    check (sort_priority >= 0 and sort_priority <= 100000);

create index if not exists store_shipping_providers_store_priority_idx
  on public.store_shipping_providers (store_id, sort_priority asc, provider_key asc);

-- ---------------------------------------------------------------------------
-- 2) List shipping providers / zones / rates (RPC-only tables)
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_shipping_providers(p_store_id uuid)
returns setof public.store_shipping_providers
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
  select *
  from public.store_shipping_providers sp
  where sp.store_id = p_store_id
  order by sp.sort_priority asc, sp.provider_key asc, sp.created_at asc;
end;
$$;

revoke all on function public.admin_list_shipping_providers(uuid)
  from public, anon;
grant execute on function public.admin_list_shipping_providers(uuid)
  to authenticated, service_role;

create or replace function public.admin_list_shipping_zones(p_store_id uuid)
returns setof public.store_shipping_zones
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
  select *
  from public.store_shipping_zones z
  where z.store_id = p_store_id
  order by z.name asc, z.created_at asc;
end;
$$;

revoke all on function public.admin_list_shipping_zones(uuid)
  from public, anon;
grant execute on function public.admin_list_shipping_zones(uuid)
  to authenticated, service_role;

create or replace function public.admin_list_shipping_rates(p_zone_id uuid)
returns setof public.store_shipping_rates
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  select z.store_id into sid
  from public.store_shipping_zones z
  where z.id = p_zone_id;
  if sid is null then
    raise exception 'Shipping zone not found';
  end if;
  if not (
    public.is_platform_admin()
    or public.is_store_member_with_role(sid, array['owner', 'manager'])
  ) then
    raise exception 'Not authorized';
  end if;
  return query
  select *
  from public.store_shipping_rates r
  where r.zone_id = p_zone_id
  order by r.service_type asc, r.fee_minor asc, r.created_at asc;
end;
$$;

revoke all on function public.admin_list_shipping_rates(uuid)
  from public, anon;
grant execute on function public.admin_list_shipping_rates(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Coupon targeting summary (empty = store-wide)
-- ---------------------------------------------------------------------------

create or replace function public.admin_coupon_targeting_summary(p_coupon_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.store_coupons%rowtype;
  product_count integer := 0;
  category_count integer := 0;
  region_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into c from public.store_coupons where id = p_coupon_id;
  if not found then
    raise exception 'Coupon not found';
  end if;
  if c.store_id is null then
    if not public.is_platform_admin() then
      raise exception 'Not authorized';
    end if;
  elsif not (
    public.is_platform_admin()
    or public.is_store_member_with_role(c.store_id, array['owner', 'manager'])
  ) then
    raise exception 'Not authorized';
  end if;

  select count(*)::integer into product_count
  from public.store_coupon_products where coupon_id = p_coupon_id;
  select count(*)::integer into category_count
  from public.store_coupon_categories where coupon_id = p_coupon_id;
  select count(*)::integer into region_count
  from public.store_coupon_regions where coupon_id = p_coupon_id;

  return jsonb_build_object(
    'coupon_id', p_coupon_id,
    'product_count', product_count,
    'category_count', category_count,
    'region_count', region_count,
    'store_wide',
      product_count = 0 and category_count = 0 and region_count = 0
  );
end;
$$;

revoke all on function public.admin_coupon_targeting_summary(uuid)
  from public, anon;
grant execute on function public.admin_coupon_targeting_summary(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Seller fulfillment dashboard counts (lifecycle)
-- ---------------------------------------------------------------------------

create or replace function public.seller_fulfillment_dashboard_counts(p_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  counts jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not (
    public.is_platform_admin()
    or public.is_store_member(p_store_id)
  ) then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'pending', count(*) filter (where f.lifecycle_stage = 'pending'),
    'confirmed', count(*) filter (where f.lifecycle_stage = 'confirmed'),
    'preparing', count(*) filter (where f.lifecycle_stage = 'preparing'),
    'packed', count(*) filter (where f.lifecycle_stage = 'packed'),
    'shipped', count(*) filter (
      where f.lifecycle_stage in ('shipped', 'out_for_delivery')
    ),
    'delivered', count(*) filter (where f.lifecycle_stage = 'delivered'),
    'cancelled', count(*) filter (where f.lifecycle_stage = 'cancelled'),
    'returned', count(*) filter (where f.lifecycle_stage = 'returned'),
    'refunded', count(*) filter (where f.lifecycle_stage = 'refunded'),
    'total', count(*)
  )
  into counts
  from public.order_fulfillments f
  where f.store_id = p_store_id;

  return coalesce(counts, jsonb_build_object(
    'pending', 0, 'confirmed', 0, 'preparing', 0, 'packed', 0,
    'shipped', 0, 'delivered', 0, 'cancelled', 0, 'returned', 0,
    'refunded', 0, 'total', 0
  ));
end;
$$;

revoke all on function public.seller_fulfillment_dashboard_counts(uuid)
  from public, anon;
grant execute on function public.seller_fulfillment_dashboard_counts(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Extend provider upsert with sort_priority
-- ---------------------------------------------------------------------------

drop function if exists public.admin_upsert_shipping_provider(
  uuid, text, text, boolean, boolean, boolean, boolean, uuid
);

create or replace function public.admin_upsert_shipping_provider(
  p_store_id uuid,
  p_provider_key text,
  p_display_name text,
  p_enabled boolean default true,
  p_supports_tracking boolean default false,
  p_supports_pickup boolean default false,
  p_supports_international boolean default false,
  p_provider_id uuid default null,
  p_sort_priority integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
  priority integer := greatest(0, least(100000, coalesce(p_sort_priority, 100)));
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
  if p_provider_key not in (
    'manual','local_courier','ups','fedex','dhl','aramex','custom'
  ) then
    raise exception 'Invalid shipping provider';
  end if;

  if p_provider_id is null then
    insert into public.store_shipping_providers (
      store_id, provider_key, display_name, enabled,
      supports_tracking, supports_pickup, supports_international, sort_priority
    ) values (
      p_store_id, p_provider_key, p_display_name, coalesce(p_enabled, true),
      coalesce(p_supports_tracking, false), coalesce(p_supports_pickup, false),
      coalesce(p_supports_international, false), priority
    )
    on conflict (store_id, provider_key) do update set
      display_name = excluded.display_name,
      enabled = excluded.enabled,
      supports_tracking = excluded.supports_tracking,
      supports_pickup = excluded.supports_pickup,
      supports_international = excluded.supports_international,
      sort_priority = excluded.sort_priority
    returning id into pid;
  else
    update public.store_shipping_providers sp set
      provider_key = p_provider_key,
      display_name = p_display_name,
      enabled = coalesce(p_enabled, true),
      supports_tracking = coalesce(p_supports_tracking, false),
      supports_pickup = coalesce(p_supports_pickup, false),
      supports_international = coalesce(p_supports_international, false),
      sort_priority = priority
    where sp.id = p_provider_id and sp.store_id = p_store_id
    returning sp.id into pid;
  end if;

  return jsonb_build_object('provider_id', pid);
end;
$$;

revoke all on function public.admin_upsert_shipping_provider(
  uuid, text, text, boolean, boolean, boolean, boolean, uuid, integer
) from public, anon;
grant execute on function public.admin_upsert_shipping_provider(
  uuid, text, text, boolean, boolean, boolean, boolean, uuid, integer
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Harden shipping rate upsert — provider must belong to zone store
-- ---------------------------------------------------------------------------

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
  currency_norm text := upper(btrim(coalesce(p_currency, '')));
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

  if p_service_type not in ('standard', 'express', 'pickup') then
    raise exception 'Invalid shipping service type';
  end if;
  if p_fee_minor is null or p_fee_minor < 0 then
    raise exception 'fee_minor must be non-negative';
  end if;
  if currency_norm !~ '^[A-Z]{3}$' then
    raise exception 'Invalid shipping rate currency';
  end if;
  if p_provider_id is not null and not exists (
    select 1
    from public.store_shipping_providers sp
    where sp.id = p_provider_id and sp.store_id = sid
  ) then
    raise exception 'Shipping provider not found for this store';
  end if;

  if p_rate_id is null then
    insert into public.store_shipping_rates (
      zone_id, provider_id, service_type, fee_minor, currency,
      min_subtotal_minor, max_subtotal_minor, free_above_subtotal_minor, enabled
    ) values (
      p_zone_id, p_provider_id, p_service_type, p_fee_minor, currency_norm,
      p_min_subtotal_minor, p_max_subtotal_minor, p_free_above_subtotal_minor,
      coalesce(p_enabled, true)
    ) returning id into rid;
  else
    update public.store_shipping_rates r set
      provider_id = p_provider_id,
      service_type = p_service_type,
      fee_minor = p_fee_minor,
      currency = currency_norm,
      min_subtotal_minor = p_min_subtotal_minor,
      max_subtotal_minor = p_max_subtotal_minor,
      free_above_subtotal_minor = p_free_above_subtotal_minor,
      enabled = coalesce(p_enabled, true)
    where r.id = p_rate_id and r.zone_id = p_zone_id
    returning r.id into rid;
    if rid is null then
      raise exception 'Shipping rate not found';
    end if;
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
