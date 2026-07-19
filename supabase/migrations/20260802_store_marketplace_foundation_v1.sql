-- UMTUBA Store Marketplace Foundation V1
-- Additive on Product/Cart/Video Commerce foundations.
-- Seller applications, store public profile fields, category sort,
-- product logistics fields, wishlist. Fail-closed RLS.
-- No checkout / orders / shipping / payments.

-- ---------------------------------------------------------------------------
-- 1) Seller applications
-- ---------------------------------------------------------------------------

create table if not exists public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  proposed_store_name text not null
    check (char_length(trim(proposed_store_name)) between 2 and 80),
  proposed_store_slug text not null
    check (proposed_store_slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  proposed_description text
    check (proposed_description is null or char_length(proposed_description) <= 2000),
  country_code text
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  city text
    check (city is null or char_length(trim(city)) between 1 and 80),
  public_contact_email text
    check (public_contact_email is null or char_length(public_contact_email) <= 160),
  public_contact_phone text
    check (public_contact_phone is null or char_length(public_contact_phone) <= 40),
  default_currency text not null default 'USD'
    check (default_currency ~ '^[A-Z]{3}$'),
  store_id uuid references public.stores (id) on delete set null,
  review_note text
    check (review_note is null or char_length(review_note) <= 1000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists seller_applications_one_open_per_user_uidx
  on public.seller_applications (user_id)
  where status in ('pending', 'approved', 'suspended');

create unique index if not exists seller_applications_pending_slug_uidx
  on public.seller_applications (lower(proposed_store_slug))
  where status = 'pending';

create index if not exists seller_applications_user_id_idx
  on public.seller_applications (user_id);
create index if not exists seller_applications_status_idx
  on public.seller_applications (status);

drop trigger if exists seller_applications_set_updated_at on public.seller_applications;
create trigger seller_applications_set_updated_at
  before update on public.seller_applications
  for each row execute function public.set_row_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Store public profile fields
-- ---------------------------------------------------------------------------

alter table public.stores
  add column if not exists city text
    check (city is null or char_length(trim(city)) between 1 and 80);

alter table public.stores
  add column if not exists public_contact_email text
    check (public_contact_email is null or char_length(public_contact_email) <= 160);

alter table public.stores
  add column if not exists public_contact_phone text
    check (public_contact_phone is null or char_length(public_contact_phone) <= 40);

alter table public.stores
  add column if not exists public_contact_url text
    check (public_contact_url is null or (
      char_length(public_contact_url) between 1 and 300
      and public_contact_url !~ '\s'
    ));

-- Preserve prior-phase sellers so existing draft catalogs remain usable.
update public.stores
set verification_status = 'verified'
where status = 'active'
  and verification_status = 'unverified';

-- ---------------------------------------------------------------------------
-- 3) Category sort order
-- ---------------------------------------------------------------------------

alter table public.product_categories
  add column if not exists sort_order integer not null default 0
    check (sort_order >= 0 and sort_order <= 999999);

create index if not exists product_categories_sort_order_idx
  on public.product_categories (sort_order, name);

-- ---------------------------------------------------------------------------
-- 4) Product logistics + type/status expansions
-- ---------------------------------------------------------------------------

alter table public.store_products
  drop constraint if exists store_products_product_type_check;

alter table public.store_products
  add constraint store_products_product_type_check
  check (product_type in (
    'physical', 'digital', 'service', 'subscription', 'bundle', 'booking'
  ));

alter table public.store_products
  add column if not exists item_type text;

update public.store_products
set item_type = product_type
where item_type is null;

alter table public.store_products
  alter column item_type set default 'physical';

alter table public.store_products
  alter column item_type set not null;

alter table public.store_products
  drop constraint if exists store_products_item_type_check;

alter table public.store_products
  add constraint store_products_item_type_check
  check (item_type in (
    'physical', 'digital', 'service', 'subscription', 'bundle', 'booking'
  ));

alter table public.store_products
  drop constraint if exists store_products_status_check;

alter table public.store_products
  add constraint store_products_status_check
  check (status in (
    'draft', 'in_review', 'pending_review', 'active', 'rejected',
    'paused', 'hidden', 'blocked', 'archived'
  ));

alter table public.store_products
  add column if not exists weight_grams integer
    check (weight_grams is null or weight_grams >= 0);

alter table public.store_products
  add column if not exists length_mm integer
    check (length_mm is null or length_mm >= 0);

alter table public.store_products
  add column if not exists width_mm integer
    check (width_mm is null or width_mm >= 0);

alter table public.store_products
  add column if not exists height_mm integer
    check (height_mm is null or height_mm >= 0);

alter table public.store_products
  add column if not exists origin_country_code text
    check (
      origin_country_code is null
      or origin_country_code ~ '^[A-Z]{2}$'
    );

create or replace function public.sync_store_product_item_type()
returns trigger
language plpgsql
as $$
begin
  if new.item_type is null then
    new.item_type := new.product_type;
  elsif new.product_type is distinct from new.item_type then
    new.product_type := new.item_type;
  end if;
  if new.status = 'pending_review' then
    new.status := 'in_review';
  end if;
  return new;
end;
$$;

drop trigger if exists store_products_sync_item_type on public.store_products;
create trigger store_products_sync_item_type
  before insert or update of product_type, item_type, status
  on public.store_products
  for each row execute function public.sync_store_product_item_type();

create or replace function public.enforce_verified_store_for_products()
returns trigger
language plpgsql
as $$
declare
  v_status text;
begin
  select s.verification_status into v_status
  from public.stores s
  where s.id = new.store_id;

  if v_status is distinct from 'verified' then
    raise exception 'Store must be verified before managing products';
  end if;
  return new;
end;
$$;

drop trigger if exists store_products_require_verified_store on public.store_products;
create trigger store_products_require_verified_store
  before insert on public.store_products
  for each row execute function public.enforce_verified_store_for_products();

-- ---------------------------------------------------------------------------
-- 5) Wishlist
-- ---------------------------------------------------------------------------

create table if not exists public.store_wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.store_products (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint store_wishlist_items_unique_product unique (user_id, product_id)
);

create index if not exists store_wishlist_items_user_id_idx
  on public.store_wishlist_items (user_id, created_at desc);
create index if not exists store_wishlist_items_product_id_idx
  on public.store_wishlist_items (product_id);

-- ---------------------------------------------------------------------------
-- 6) Approve seller application (service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.approve_seller_application(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.seller_applications%rowtype;
  new_store_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'approve_seller_application is service_role only';
  end if;

  select * into app
  from public.seller_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Seller application not found';
  end if;

  if app.status is distinct from 'pending' then
    raise exception 'Seller application is not pending';
  end if;

  if app.store_id is not null then
    raise exception 'Seller application already linked to a store';
  end if;

  insert into public.stores (
    owner_user_id,
    slug,
    name,
    description,
    status,
    verification_status,
    default_currency,
    country_code,
    city,
    public_contact_email,
    public_contact_phone
  ) values (
    app.user_id,
    app.proposed_store_slug,
    app.proposed_store_name,
    app.proposed_description,
    'active',
    'verified',
    app.default_currency,
    app.country_code,
    app.city,
    app.public_contact_email,
    app.public_contact_phone
  )
  returning id into new_store_id;

  insert into public.store_members (store_id, user_id, role, status)
  values (new_store_id, app.user_id, 'owner', 'active')
  on conflict do nothing;

  update public.seller_applications
  set
    status = 'approved',
    store_id = new_store_id,
    reviewed_at = now()
  where id = app.id;

  return new_store_id;
end;
$$;

revoke all on function public.approve_seller_application(uuid) from public;
revoke all on function public.approve_seller_application(uuid) from anon, authenticated;
grant execute on function public.approve_seller_application(uuid) to service_role;

create or replace function public.reject_seller_application(
  p_application_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'reject_seller_application is service_role only';
  end if;

  update public.seller_applications
  set
    status = 'rejected',
    review_note = nullif(trim(p_note), ''),
    reviewed_at = now()
  where id = p_application_id
    and status = 'pending';

  if not found then
    raise exception 'Pending seller application not found';
  end if;
end;
$$;

revoke all on function public.reject_seller_application(uuid, text) from public;
revoke all on function public.reject_seller_application(uuid, text) from anon, authenticated;
grant execute on function public.reject_seller_application(uuid, text) to service_role;

create or replace function public.suspend_seller_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.seller_applications%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'suspend_seller_application is service_role only';
  end if;

  select * into app
  from public.seller_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Seller application not found';
  end if;

  update public.seller_applications
  set status = 'suspended', reviewed_at = now()
  where id = app.id;

  if app.store_id is not null then
    update public.stores
    set status = 'suspended'
    where id = app.store_id;
  end if;
end;
$$;

revoke all on function public.suspend_seller_application(uuid) from public;
revoke all on function public.suspend_seller_application(uuid) from anon, authenticated;
grant execute on function public.suspend_seller_application(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 7) RLS
-- ---------------------------------------------------------------------------

alter table public.seller_applications enable row level security;
alter table public.store_wishlist_items enable row level security;

drop policy if exists "Users read own seller applications"
  on public.seller_applications;
create policy "Users read own seller applications"
  on public.seller_applications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users insert own pending seller applications"
  on public.seller_applications;
create policy "Users insert own pending seller applications"
  on public.seller_applications
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
  );

drop policy if exists "Users update own pending seller applications"
  on public.seller_applications;
create policy "Users update own pending seller applications"
  on public.seller_applications
  for update
  to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "Users manage own wishlist items"
  on public.store_wishlist_items;
create policy "Users manage own wishlist items"
  on public.store_wishlist_items
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke delete on public.seller_applications from authenticated, anon;
revoke delete on public.store_wishlist_items from anon;
