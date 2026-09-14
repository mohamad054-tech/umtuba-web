-- UMTUBA Store Seller Center commerce readiness V1
-- Additive. Fail-closed. Local-only until a later apply GO.
-- Does NOT: capture payments, execute refunds, pay sellers, activate commission,
-- connect Stripe/PayPal, weaken RLS, or expose buyer private fields.

-- ---------------------------------------------------------------------------
-- 1) Required order states: return_requested + returned
-- ---------------------------------------------------------------------------

do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'orders'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%refunded%'
    and pg_get_constraintdef(con.oid) ilike '%cancelled%'
    and pg_get_constraintdef(con.oid) not ilike '%payment_status%'
    and pg_get_constraintdef(con.oid) not ilike '%fulfillment_status%';
  if cname is not null then
    execute format('alter table public.orders drop constraint %I', cname);
  end if;
end $$;

alter table public.orders
  add constraint orders_status_check
  check (status in (
    'pending',
    'confirmed',
    'processing',
    'packed',
    'shipped',
    'delivered',
    'cancelled',
    'return_requested',
    'returned',
    'refunded'
  ));

alter table public.orders
  add column if not exists return_requested_at timestamptz;

alter table public.orders
  add column if not exists returned_at timestamptz;

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
    when p_from = 'delivered' and p_to in ('return_requested', 'refunded') then true
    when p_from = 'return_requested' and p_to in ('returned', 'refunded') then true
    when p_from = 'returned' and p_to = 'refunded' then true
    else false
  end;
$$;

revoke all on function public.store_order_status_transition_allowed(text, text)
  from public, anon, authenticated;
grant execute on function public.store_order_status_transition_allowed(text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2) Return requests (state only — no money movement)
-- ---------------------------------------------------------------------------

create table if not exists public.store_order_return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  buyer_id uuid not null references auth.users (id) on delete restrict,
  store_id uuid not null references public.stores (id) on delete restrict,
  status text not null default 'requested'
    check (status in ('requested', 'received', 'closed')),
  reason text not null check (char_length(btrim(reason)) between 8 and 2000),
  seller_note text check (seller_note is null or char_length(seller_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_order_return_requests_order_uidx unique (order_id)
);

create index if not exists store_order_return_requests_buyer_idx
  on public.store_order_return_requests (buyer_id, created_at desc);
create index if not exists store_order_return_requests_store_idx
  on public.store_order_return_requests (store_id, created_at desc);

alter table public.store_order_return_requests enable row level security;
alter table public.store_order_return_requests force row level security;
revoke all on public.store_order_return_requests from anon, public;
grant select on public.store_order_return_requests to authenticated;
revoke insert, update, delete on public.store_order_return_requests from authenticated;

drop policy if exists store_order_return_requests_select_own on public.store_order_return_requests;
create policy store_order_return_requests_select_own
  on public.store_order_return_requests for select to authenticated
  using (
    buyer_id = auth.uid()
    or exists (
      select 1
      from public.store_members m
      where m.store_id = store_order_return_requests.store_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
    or public.is_platform_admin()
  );

create or replace function public.request_store_order_return(
  p_order_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o public.orders%rowtype;
  reason_text text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_order_id is null then
    raise exception 'Order is required';
  end if;
  if reason_text is null or char_length(reason_text) < 8 then
    raise exception 'Return reason must be at least 8 characters';
  end if;
  if char_length(reason_text) > 2000 then
    raise exception 'Return reason is too long';
  end if;

  select * into o
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if o.buyer_id is distinct from uid then
    raise exception 'Only the buyer can request a return';
  end if;
  if o.status is distinct from 'delivered' then
    raise exception 'Returns can be requested only after delivery';
  end if;
  if not public.store_order_status_transition_allowed(o.status, 'return_requested') then
    raise exception 'Return request is not allowed from %', o.status;
  end if;

  insert into public.store_order_return_requests (
    order_id, buyer_id, store_id, status, reason
  ) values (
    o.id, uid, o.store_id, 'requested', reason_text
  );

  update public.orders
  set
    status = 'return_requested',
    return_requested_at = coalesce(return_requested_at, now()),
    updated_at = now()
  where id = o.id;

  insert into public.order_status_history (
    order_id,
    actor_user_id,
    from_status,
    to_status,
    note,
    source
  ) values (
    o.id,
    uid,
    o.status,
    'return_requested',
    left(reason_text, 500),
    'buyer'
  );

  return jsonb_build_object(
    'ok', true,
    'order_id', o.id,
    'status', 'return_requested',
    'refund_executed', false
  );
end;
$$;

revoke all on function public.request_store_order_return(uuid, text)
  from public, anon;
grant execute on function public.request_store_order_return(uuid, text)
  to authenticated, service_role;

create or replace function public.confirm_store_order_returned(
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
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_order_id is null then
    raise exception 'Order is required';
  end if;

  select * into o
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if not exists (
    select 1
    from public.store_members m
    where m.store_id = o.store_id
      and m.user_id = uid
      and m.role in ('owner', 'manager')
  ) then
    raise exception 'Not authorized';
  end if;
  if o.status is distinct from 'return_requested' then
    raise exception 'Seller can confirm returned only after a buyer return request';
  end if;

  update public.store_order_return_requests
  set
    status = 'received',
    seller_note = note_text,
    updated_at = now()
  where order_id = o.id;

  update public.orders
  set
    status = 'returned',
    returned_at = coalesce(returned_at, now()),
    updated_at = now()
  where id = o.id;

  insert into public.order_status_history (
    order_id,
    actor_user_id,
    from_status,
    to_status,
    note,
    source
  ) values (
    o.id,
    uid,
    o.status,
    'returned',
    note_text,
    'seller'
  );

  return jsonb_build_object(
    'ok', true,
    'order_id', o.id,
    'status', 'returned',
    'refund_executed', false,
    'payout_executed', false
  );
end;
$$;

revoke all on function public.confirm_store_order_returned(uuid, text)
  from public, anon;
grant execute on function public.confirm_store_order_returned(uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Product reviews (published after delivered/returned purchase only)
-- ---------------------------------------------------------------------------

create table if not exists public.store_product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  buyer_id uuid not null references auth.users (id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  body text check (body is null or char_length(btrim(body)) between 8 and 4000),
  status text not null default 'published'
    check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  constraint store_product_reviews_order_product_uidx unique (order_id, product_id)
);

create index if not exists store_product_reviews_product_idx
  on public.store_product_reviews (product_id, created_at desc)
  where status = 'published';

alter table public.store_product_reviews enable row level security;
alter table public.store_product_reviews force row level security;
revoke all on public.store_product_reviews from anon, public;
grant select on public.store_product_reviews to authenticated, anon;
revoke insert, update, delete on public.store_product_reviews from authenticated, anon;

drop policy if exists store_product_reviews_public_read on public.store_product_reviews;
create policy store_product_reviews_public_read
  on public.store_product_reviews for select
  using (status = 'published' or buyer_id = auth.uid() or public.is_platform_admin());

create or replace function public.submit_store_product_review(
  p_order_id uuid,
  p_product_id uuid,
  p_rating integer,
  p_body text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o public.orders%rowtype;
  body_text text := nullif(btrim(coalesce(p_body, '')), '');
  review_id uuid;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_order_id is null or p_product_id is null then
    raise exception 'Order and product are required';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be a whole number from 1 to 5';
  end if;
  if body_text is not null and char_length(body_text) < 8 then
    raise exception 'Review text must be at least 8 characters';
  end if;

  select * into o
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if o.buyer_id is distinct from uid then
    raise exception 'Only the buyer can review this order';
  end if;
  if o.status not in ('delivered', 'returned') then
    raise exception 'Reviews open after the order is delivered';
  end if;
  if exists (
    select 1
    from public.stores s
    where s.id = o.store_id
      and s.owner_user_id = uid
  ) then
    raise exception 'Sellers cannot review their own products';
  end if;
  if not exists (
    select 1
    from public.order_items i
    join public.product_variants v on v.id = i.variant_id
    where i.order_id = o.id
      and v.product_id = p_product_id
  ) then
    raise exception 'This product was not on the order';
  end if;

  insert into public.store_product_reviews (
    product_id, order_id, buyer_id, rating, body, status
  ) values (
    p_product_id, o.id, uid, p_rating, body_text, 'published'
  )
  returning id into review_id;

  return jsonb_build_object(
    'ok', true,
    'review_id', review_id,
    'rating', p_rating
  );
end;
$$;

revoke all on function public.submit_store_product_review(uuid, uuid, integer, text)
  from public, anon;
grant execute on function public.submit_store_product_review(uuid, uuid, integer, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Commission policy architecture — no default / final percentage
-- ---------------------------------------------------------------------------

create table if not exists public.store_commission_policies (
  id uuid primary key default gen_random_uuid(),
  version integer not null check (version > 0),
  status text not null
    check (status in ('draft', 'inactive')),
  rate_bps integer
    check (rate_bps is null or (rate_bps >= 0 and rate_bps <= 10000)),
  notes text not null default 'Commission policy is architectural only.',
  created_at timestamptz not null default now(),
  constraint store_commission_policies_version_uidx unique (version)
);

alter table public.store_commission_policies enable row level security;
alter table public.store_commission_policies force row level security;
revoke all on public.store_commission_policies from anon, public, authenticated;
grant select on public.store_commission_policies to service_role;

-- No seed rate. Activation is intentionally absent.

-- ---------------------------------------------------------------------------
-- 5) Seller payout state is architectural — no execution table writes
-- ---------------------------------------------------------------------------

-- REAL_SELLER_PAYOUT remains DISABLED. No payout ledger, no provider connect.
