-- UMTUBA Store — Analytics & Finance Foundation V1
-- Additive after 20260816. Seller reporting RPCs only — no payouts, gateways, or tax filing.
-- Money: integer minor units on authoritative order rows (not payment_attempts).

-- ---------------------------------------------------------------------------
-- 1) Analytics-friendly index
-- ---------------------------------------------------------------------------

create index if not exists orders_store_payment_created_idx
  on public.orders (store_id, payment_status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2) Shared range validation (UTC, bounded)
-- ---------------------------------------------------------------------------

create or replace function public.seller_analytics_assert_range(
  p_from timestamptz,
  p_to timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_from is null or p_to is null then
    raise exception 'Analytics date range is required';
  end if;
  if p_to < p_from then
    raise exception 'Analytics end date must be after start date';
  end if;
  if p_to - p_from > interval '366 days' then
    raise exception 'Analytics date range cannot exceed 366 days';
  end if;
end;
$$;

revoke all on function public.seller_analytics_assert_range(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.seller_analytics_assert_range(timestamptz, timestamptz)
  to service_role;

create or replace function public.seller_analytics_assert_store_access(p_store_id uuid)
returns void
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
end;
$$;

revoke all on function public.seller_analytics_assert_store_access(uuid)
  from public, anon;
grant execute on function public.seller_analytics_assert_store_access(uuid)
  to authenticated, service_role;

create or replace function public.seller_analytics_assert_single_currency(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  curr text;
  curr_count integer;
begin
  select count(distinct o.currency)::integer
  into curr_count
  from public.orders o
  where o.store_id = p_store_id
    and o.created_at >= p_from
    and o.created_at < p_to
    and o.payment_status in ('paid', 'refunded');

  if curr_count > 1 then
    raise exception 'Analytics currently supports a single currency per period';
  end if;

  select coalesce(max(o.currency), 'USD')
  into curr
  from public.orders o
  where o.store_id = p_store_id
    and o.created_at >= p_from
    and o.created_at < p_to
    and o.payment_status in ('paid', 'refunded');

  return curr;
end;
$$;

revoke all on function public.seller_analytics_assert_single_currency(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.seller_analytics_assert_single_currency(uuid, timestamptz, timestamptz)
  to authenticated, service_role;

-- Realized paid: authoritative order row; never payment_attempts (avoids duplicate counting).
-- Refunded: payment_status or status = refunded.

create or replace function public.seller_analytics_summary(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  curr text := 'USD';
begin
  perform public.seller_analytics_assert_store_access(p_store_id);
  perform public.seller_analytics_assert_range(p_from, p_to);
  curr := public.seller_analytics_assert_single_currency(p_store_id, p_from, p_to);

  select jsonb_build_object(
    'currency', curr,
    'gross_merchandise_value_minor',
      coalesce(sum(o.subtotal_minor) filter (
        where o.payment_status = 'paid'
          and o.status not in ('cancelled', 'refunded')
      ), 0),
    'merchandise_subtotal_minor',
      coalesce(sum(o.subtotal_minor) filter (
        where o.payment_status = 'paid'
          and o.status not in ('cancelled', 'refunded')
      ), 0),
    'discounts_minor',
      coalesce(sum(o.discount_total_minor) filter (
        where o.payment_status = 'paid'
          and o.status not in ('cancelled', 'refunded')
      ), 0),
    'shipping_charged_minor',
      coalesce(sum(o.shipping_total_minor) filter (
        where o.payment_status = 'paid'
          and o.status not in ('cancelled', 'refunded')
      ), 0),
    'taxes_charged_minor',
      coalesce(sum(o.tax_total_minor) filter (
        where o.payment_status = 'paid'
          and o.status not in ('cancelled', 'refunded')
      ), 0),
    'refunds_minor',
      coalesce(sum(o.grand_total_minor) filter (
        where o.payment_status = 'refunded' or o.status = 'refunded'
      ), 0),
    'net_sales_minor',
      greatest(0,
        coalesce(sum(o.subtotal_minor - o.discount_total_minor) filter (
          where o.payment_status = 'paid'
            and o.status not in ('cancelled', 'refunded')
        ), 0)
        - coalesce(sum(o.subtotal_minor - o.discount_total_minor) filter (
          where o.payment_status = 'refunded' or o.status = 'refunded'
        ), 0)
      ),
    'paid_orders',
      count(*) filter (
        where o.payment_status = 'paid'
          and o.status not in ('cancelled', 'refunded')
      ),
    'unpaid_pending_orders',
      count(*) filter (
        where o.payment_status in ('pending', 'authorized')
          and o.status not in ('cancelled', 'refunded')
      ),
    'cancelled_orders',
      count(*) filter (where o.status = 'cancelled'),
    'returned_orders',
      coalesce((
        select count(*)
        from public.order_fulfillments f
        where f.store_id = p_store_id
          and f.lifecycle_stage = 'returned'
          and f.created_at >= p_from
          and f.created_at < p_to
      ), 0),
    'refunded_orders',
      count(*) filter (
        where o.payment_status = 'refunded' or o.status = 'refunded'
      )
  )
  into result
  from public.orders o
  where o.store_id = p_store_id
    and o.created_at >= p_from
    and o.created_at < p_to;

  return coalesce(result, jsonb_build_object(
    'currency', curr,
    'gross_merchandise_value_minor', 0,
    'merchandise_subtotal_minor', 0,
    'discounts_minor', 0,
    'shipping_charged_minor', 0,
    'taxes_charged_minor', 0,
    'refunds_minor', 0,
    'net_sales_minor', 0,
    'paid_orders', 0,
    'unpaid_pending_orders', 0,
    'cancelled_orders', 0,
    'returned_orders', 0,
    'refunded_orders', 0
  ));
end;
$$;

revoke all on function public.seller_analytics_summary(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.seller_analytics_summary(uuid, timestamptz, timestamptz)
  to authenticated, service_role;

create or replace function public.seller_analytics_order_status_counts(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (status text, count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seller_analytics_assert_store_access(p_store_id);
  perform public.seller_analytics_assert_range(p_from, p_to);
  perform public.seller_analytics_assert_single_currency(p_store_id, p_from, p_to);

  return query
  select o.status, count(*)::bigint
  from public.orders o
  where o.store_id = p_store_id
    and o.created_at >= p_from
    and o.created_at < p_to
  group by o.status
  order by count(*) desc, o.status asc;
end;
$$;

revoke all on function public.seller_analytics_order_status_counts(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.seller_analytics_order_status_counts(uuid, timestamptz, timestamptz)
  to authenticated, service_role;

create or replace function public.seller_analytics_sales_series(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  period_start timestamptz,
  order_count bigint,
  merchandise_subtotal_minor bigint,
  net_sales_minor bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seller_analytics_assert_store_access(p_store_id);
  perform public.seller_analytics_assert_range(p_from, p_to);

  return query
  with days as (
    select generate_series(
      date_trunc('day', timezone('utc', p_from)),
      date_trunc('day', timezone('utc', p_to - interval '1 microsecond')),
      interval '1 day'
    ) as day_start
  ),
  daily as (
    select
      date_trunc('day', timezone('utc', o.created_at)) as day_start,
      count(*) filter (
        where o.payment_status = 'paid'
          and o.status not in ('cancelled', 'refunded')
      ) as paid_count,
      coalesce(sum(o.subtotal_minor) filter (
        where o.payment_status = 'paid'
          and o.status not in ('cancelled', 'refunded')
      ), 0)::bigint as merch,
      greatest(0,
        coalesce(sum(o.subtotal_minor - o.discount_total_minor) filter (
          where o.payment_status = 'paid'
            and o.status not in ('cancelled', 'refunded')
        ), 0)
        - coalesce(sum(o.subtotal_minor - o.discount_total_minor) filter (
          where o.payment_status = 'refunded' or o.status = 'refunded'
        ), 0)
      )::bigint as net
    from public.orders o
    where o.store_id = p_store_id
      and o.created_at >= p_from
      and o.created_at < p_to
    group by 1
  )
  select
    d.day_start,
    coalesce(daily.paid_count, 0)::bigint,
    coalesce(daily.merch, 0)::bigint,
    coalesce(daily.net, 0)::bigint
  from days d
  left join daily on daily.day_start = d.day_start
  order by d.day_start asc;
end;
$$;

revoke all on function public.seller_analytics_sales_series(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.seller_analytics_sales_series(uuid, timestamptz, timestamptz)
  to authenticated, service_role;

create or replace function public.seller_analytics_top_products(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 10
)
returns table (
  product_id uuid,
  title text,
  quantity_sold bigint,
  merchandise_subtotal_minor bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer := greatest(1, least(50, coalesce(p_limit, 10)));
begin
  perform public.seller_analytics_assert_store_access(p_store_id);
  perform public.seller_analytics_assert_range(p_from, p_to);
  perform public.seller_analytics_assert_single_currency(p_store_id, p_from, p_to);

  return query
  select
    oi.product_id,
    max(oi.title_snapshot)::text as title,
    sum(oi.quantity)::bigint as quantity_sold,
    sum(oi.total_price_minor)::bigint as merchandise_subtotal_minor
  from public.order_items oi
  inner join public.orders o on o.id = oi.order_id
  where o.store_id = p_store_id
    and o.created_at >= p_from
    and o.created_at < p_to
    and o.payment_status = 'paid'
    and o.status not in ('cancelled', 'refunded')
  group by oi.product_id
  order by sum(oi.quantity) desc, max(oi.title_snapshot) asc
  limit lim;
end;
$$;

revoke all on function public.seller_analytics_top_products(uuid, timestamptz, timestamptz, integer)
  from public, anon;
grant execute on function public.seller_analytics_top_products(uuid, timestamptz, timestamptz, integer)
  to authenticated, service_role;

create or replace function public.seller_analytics_coupon_performance(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 10
)
returns table (
  coupon_id uuid,
  code text,
  redemption_count bigint,
  discount_minor bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer := greatest(1, least(50, coalesce(p_limit, 10)));
begin
  perform public.seller_analytics_assert_store_access(p_store_id);
  perform public.seller_analytics_assert_range(p_from, p_to);
  perform public.seller_analytics_assert_single_currency(p_store_id, p_from, p_to);

  return query
  select
    c.id as coupon_id,
    c.code,
    count(r.id)::bigint as redemption_count,
    coalesce(sum(r.discount_minor), 0)::bigint as discount_minor
  from public.store_coupon_redemptions r
  inner join public.store_coupons c on c.id = r.coupon_id
  inner join public.orders o on o.id = r.order_id
  where c.store_id = p_store_id
    and o.store_id = p_store_id
    and o.created_at >= p_from
    and o.created_at < p_to
    and o.payment_status = 'paid'
    and o.status not in ('cancelled', 'refunded')
  group by c.id, c.code
  order by count(r.id) desc, c.code asc
  limit lim;
end;
$$;

revoke all on function public.seller_analytics_coupon_performance(uuid, timestamptz, timestamptz, integer)
  from public, anon;
grant execute on function public.seller_analytics_coupon_performance(uuid, timestamptz, timestamptz, integer)
  to authenticated, service_role;

create or replace function public.seller_analytics_fulfillment_summary(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  summary jsonb;
begin
  perform public.seller_analytics_assert_store_access(p_store_id);
  perform public.seller_analytics_assert_range(p_from, p_to);
  perform public.seller_analytics_assert_single_currency(p_store_id, p_from, p_to);

  select jsonb_build_object(
    'pending', count(*) filter (where f.lifecycle_stage = 'pending'),
    'preparing', count(*) filter (
      where f.lifecycle_stage in ('confirmed', 'preparing', 'packed')
    ),
    'shipped', count(*) filter (
      where f.lifecycle_stage in ('shipped', 'out_for_delivery')
    ),
    'delivered', count(*) filter (where f.lifecycle_stage = 'delivered'),
    'cancelled', count(*) filter (where f.lifecycle_stage = 'cancelled'),
    'returned', count(*) filter (where f.lifecycle_stage = 'returned'),
    'refunded', count(*) filter (where f.lifecycle_stage = 'refunded'),
    'average_ship_to_deliver_hours', (
      select round(avg(
        extract(epoch from (f.updated_at - f.created_at)) / 3600.0
      )::numeric, 2)
      from public.order_fulfillments f
      where f.store_id = p_store_id
        and f.lifecycle_stage = 'delivered'
        and f.created_at >= p_from
        and f.created_at < p_to
    )
  )
  into summary
  from public.order_fulfillments f
  where f.store_id = p_store_id
    and f.created_at >= p_from
    and f.created_at < p_to;

  return coalesce(summary, jsonb_build_object(
    'pending', 0, 'preparing', 0, 'shipped', 0, 'delivered', 0,
    'cancelled', 0, 'returned', 0, 'refunded', 0,
    'average_ship_to_deliver_hours', null
  ));
end;
$$;

revoke all on function public.seller_analytics_fulfillment_summary(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.seller_analytics_fulfillment_summary(uuid, timestamptz, timestamptz)
  to authenticated, service_role;

create or replace function public.seller_analytics_refunds_returns(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  summary jsonb;
begin
  perform public.seller_analytics_assert_store_access(p_store_id);
  perform public.seller_analytics_assert_range(p_from, p_to);

  select jsonb_build_object(
    'refunded_orders',
      count(*) filter (
        where o.payment_status = 'refunded' or o.status = 'refunded'
      ),
    'refunds_minor',
      coalesce(sum(o.grand_total_minor) filter (
        where o.payment_status = 'refunded' or o.status = 'refunded'
      ), 0),
    'returned_orders',
      coalesce((
        select count(*)
        from public.order_fulfillments f
        where f.store_id = p_store_id
          and f.lifecycle_stage = 'returned'
          and f.created_at >= p_from
          and f.created_at < p_to
      ), 0)
  )
  into summary
  from public.orders o
  where o.store_id = p_store_id
    and o.created_at >= p_from
    and o.created_at < p_to;

  return coalesce(summary, jsonb_build_object(
    'refunded_orders', 0,
    'refunds_minor', 0,
    'returned_orders', 0
  ));
end;
$$;

revoke all on function public.seller_analytics_refunds_returns(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.seller_analytics_refunds_returns(uuid, timestamptz, timestamptz)
  to authenticated, service_role;
