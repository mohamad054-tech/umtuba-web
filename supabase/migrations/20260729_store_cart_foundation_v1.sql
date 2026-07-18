-- UMTUBA Store — Cart Foundation V1
-- Additive. Fail-closed RLS. No checkout/orders/payments.
-- Buyers own carts only; sellers have no cart access via RLS.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'abandoned', 'converted', 'archived')),
  currency text not null
    check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active cart per user per currency
create unique index if not exists carts_one_active_per_user_currency_uidx
  on public.carts (user_id, currency)
  where status = 'active';

create index if not exists carts_user_id_idx on public.carts (user_id);
create index if not exists carts_status_idx on public.carts (status);

drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at
  before update on public.carts
  for each row execute function public.set_row_updated_at();

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  quantity integer not null check (quantity > 0 and quantity <= 9999),
  unit_price_minor_snapshot bigint not null check (unit_price_minor_snapshot >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  store_id uuid not null references public.stores (id) on delete restrict,
  product_title_snapshot text not null
    check (char_length(trim(product_title_snapshot)) between 1 and 160),
  variant_title_snapshot text not null
    check (char_length(trim(variant_title_snapshot)) between 1 and 120),
  media_snapshot text
    check (media_snapshot is null or (
      char_length(media_snapshot) between 1 and 512
      and media_snapshot !~ '\.\.'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_items_unique_variant_per_cart unique (cart_id, variant_id)
);

create index if not exists cart_items_cart_id_idx on public.cart_items (cart_id);
create index if not exists cart_items_variant_id_idx on public.cart_items (variant_id);
create index if not exists cart_items_store_id_idx on public.cart_items (store_id);

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_row_updated_at();

-- Item currency must match cart currency (prevents cross-currency mixing)
create or replace function public.enforce_cart_item_currency_match()
returns trigger
language plpgsql
as $$
declare
  cart_currency text;
begin
  select c.currency into cart_currency
  from public.carts c
  where c.id = new.cart_id;

  if cart_currency is null then
    raise exception 'Cart not found';
  end if;

  if new.currency is distinct from cart_currency then
    raise exception 'Cart item currency must match cart currency';
  end if;

  return new;
end;
$$;

drop trigger if exists cart_items_enforce_currency on public.cart_items;
create trigger cart_items_enforce_currency
  before insert or update of currency, cart_id on public.cart_items
  for each row execute function public.enforce_cart_item_currency_match();

-- ---------------------------------------------------------------------------
-- Ownership helpers
-- ---------------------------------------------------------------------------

create or replace function public.owns_active_cart(p_cart_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.carts c
    where c.id = p_cart_id
      and c.user_id = (select auth.uid())
      and c.status = 'active'
  );
$$;

revoke all on function public.owns_active_cart(uuid) from public;
grant execute on function public.owns_active_cart(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS (fail-closed: no anon access, no seller privilege)
-- ---------------------------------------------------------------------------

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

revoke all on public.carts from anon;
revoke all on public.cart_items from anon;
revoke all on public.carts from public;
revoke all on public.cart_items from public;

grant select, insert, update on public.carts to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
-- Soft-status carts: no delete for buyers
revoke delete on public.carts from authenticated;

drop policy if exists "Users select own active carts" on public.carts;
create policy "Users select own active carts"
  on public.carts for select to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and status = 'active'
  );

drop policy if exists "Users insert own active carts" on public.carts;
create policy "Users insert own active carts"
  on public.carts for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and status = 'active'
  );

drop policy if exists "Users update own active carts" on public.carts;
create policy "Users update own active carts"
  on public.carts for update to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and status = 'active'
  )
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  );

drop policy if exists "Users select own active cart items" on public.cart_items;
create policy "Users select own active cart items"
  on public.cart_items for select to authenticated
  using (public.owns_active_cart(cart_id));

drop policy if exists "Users insert own active cart items" on public.cart_items;
create policy "Users insert own active cart items"
  on public.cart_items for insert to authenticated
  with check (public.owns_active_cart(cart_id));

drop policy if exists "Users update own active cart items" on public.cart_items;
create policy "Users update own active cart items"
  on public.cart_items for update to authenticated
  using (public.owns_active_cart(cart_id))
  with check (public.owns_active_cart(cart_id));

drop policy if exists "Users delete own active cart items" on public.cart_items;
create policy "Users delete own active cart items"
  on public.cart_items for delete to authenticated
  using (public.owns_active_cart(cart_id));

-- No public policies for anon — fail closed.
-- Administrative recovery: service_role bypasses RLS (Supabase default).
