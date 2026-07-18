-- UMTUBA Store — Product Foundation V1
-- Additive. Fail-closed RLS. No public seed data.
-- Sellers cannot self-approve products; approve_store_product is service_role only.

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  logo_path text,
  cover_path text,
  status text not null default 'active'
    check (status in ('draft', 'active', 'suspended', 'archived')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  default_currency text not null default 'USD'
    check (default_currency ~ '^[A-Z]{3}$'),
  country_code text
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  constraint stores_name_len check (char_length(trim(name)) between 2 and 80)
);

create unique index if not exists stores_slug_uidx on public.stores (lower(slug));
create index if not exists stores_owner_user_id_idx on public.stores (owner_user_id);
create index if not exists stores_status_idx on public.stores (status);

drop trigger if exists stores_set_updated_at on public.stores;
create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function public.set_row_updated_at();

create table if not exists public.store_members (
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null
    check (role in ('owner', 'manager', 'catalog_editor', 'viewer')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'revoked')),
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create index if not exists store_members_user_id_idx on public.store_members (user_id);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.product_categories (id) on delete set null,
  slug text not null,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'hidden', 'deprecated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_categories_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$'),
  constraint product_categories_name_len check (char_length(trim(name)) between 1 and 80)
);

create unique index if not exists product_categories_slug_uidx
  on public.product_categories (lower(slug));

drop trigger if exists product_categories_set_updated_at on public.product_categories;
create trigger product_categories_set_updated_at
  before update on public.product_categories
  for each row execute function public.set_row_updated_at();

create table if not exists public.product_brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_brands_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$'),
  constraint product_brands_name_len check (char_length(trim(name)) between 1 and 80)
);

create unique index if not exists product_brands_slug_uidx
  on public.product_brands (lower(slug));

drop trigger if exists product_brands_set_updated_at on public.product_brands;
create trigger product_brands_set_updated_at
  before update on public.product_brands
  for each row execute function public.set_row_updated_at();

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  slug text not null,
  title text not null,
  short_description text,
  description text,
  product_type text not null
    check (product_type in ('physical', 'digital', 'service', 'subscription', 'bundle')),
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'active', 'hidden', 'blocked', 'archived')),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected', 'needs_changes')),
  primary_category_id uuid references public.product_categories (id) on delete set null,
  brand_id uuid references public.product_brands (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint store_products_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  constraint store_products_title_len check (char_length(trim(title)) between 2 and 160)
);

create unique index if not exists store_products_store_slug_uidx
  on public.store_products (store_id, lower(slug));
create index if not exists store_products_store_id_idx on public.store_products (store_id);
create index if not exists store_products_status_idx on public.store_products (status);
create index if not exists store_products_moderation_idx on public.store_products (moderation_status);
create index if not exists store_products_primary_category_idx
  on public.store_products (primary_category_id);

drop trigger if exists store_products_set_updated_at on public.store_products;
create trigger store_products_set_updated_at
  before update on public.store_products
  for each row execute function public.set_row_updated_at();

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products (id) on delete cascade,
  sku text not null,
  title text not null default 'Default',
  option_values jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'hidden', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_sku_format check (sku ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  constraint product_variants_title_len check (char_length(trim(title)) between 1 and 120)
);

create unique index if not exists product_variants_product_sku_uidx
  on public.product_variants (product_id, lower(sku));
create index if not exists product_variants_product_id_idx on public.product_variants (product_id);

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_row_updated_at();

create table if not exists public.product_prices (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  currency text not null
    check (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null
    check (amount_minor >= 0),
  compare_at_amount_minor bigint
    check (compare_at_amount_minor is null or compare_at_amount_minor >= 0),
  country_code text
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'scheduled', 'expired', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_prices_compare_gt_amount check (
    compare_at_amount_minor is null or compare_at_amount_minor >= amount_minor
  ),
  constraint product_prices_window check (
    starts_at is null or ends_at is null or ends_at > starts_at
  )
);

create index if not exists product_prices_variant_id_idx on public.product_prices (variant_id);
create index if not exists product_prices_status_idx on public.product_prices (status);

drop trigger if exists product_prices_set_updated_at on public.product_prices;
create trigger product_prices_set_updated_at
  before update on public.product_prices
  for each row execute function public.set_row_updated_at();

create table if not exists public.product_inventory (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  warehouse_key text not null default 'default',
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  safety_stock integer not null default 0 check (safety_stock >= 0),
  allow_backorder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_inventory_reserved_le_on_hand check (reserved <= on_hand),
  constraint product_inventory_warehouse_key_format
    check (warehouse_key ~ '^[a-z0-9][a-z0-9_-]{0,62}$')
);

create unique index if not exists product_inventory_variant_warehouse_uidx
  on public.product_inventory (variant_id, warehouse_key);

drop trigger if exists product_inventory_set_updated_at on public.product_inventory;
create trigger product_inventory_set_updated_at
  before update on public.product_inventory
  for each row execute function public.set_row_updated_at();

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  media_type text not null
    check (media_type in ('image', 'video', 'document')),
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  role text not null default 'gallery'
    check (role in ('cover', 'gallery', 'detail', 'swatch')),
  status text not null default 'active'
    check (status in ('active', 'hidden', 'archived')),
  created_at timestamptz not null default now(),
  constraint product_media_storage_path_safe
    check (storage_path !~ '\.\.' and char_length(storage_path) between 1 and 512)
);

create index if not exists product_media_product_id_idx on public.product_media (product_id);
create index if not exists product_media_variant_id_idx on public.product_media (variant_id);

create table if not exists public.product_category_links (
  product_id uuid not null references public.store_products (id) on delete cascade,
  category_id uuid not null references public.product_categories (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create unique index if not exists product_category_links_one_primary_uidx
  on public.product_category_links (product_id)
  where is_primary = true;

create index if not exists product_category_links_category_id_idx
  on public.product_category_links (category_id);

-- ---------------------------------------------------------------------------
-- Membership / visibility helpers (security definer, fail-closed)
-- ---------------------------------------------------------------------------

create or replace function public.is_store_member(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.store_members m
    where m.store_id = p_store_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function public.is_store_member_with_role(
  p_store_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.store_members m
    where m.store_id = p_store_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any (p_roles)
  );
$$;

create or replace function public.can_manage_store_catalog(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_store_member_with_role(
    p_store_id,
    array['owner', 'manager', 'catalog_editor']
  );
$$;

create or replace function public.is_store_owner(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_store_member_with_role(p_store_id, array['owner']);
$$;

create or replace function public.is_public_store_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.store_products p
    join public.stores s on s.id = p.store_id
    where p.id = p_product_id
      and s.status = 'active'
      and p.status = 'active'
      and p.moderation_status = 'approved'
  );
$$;

revoke all on function public.is_store_member(uuid) from public;
revoke all on function public.is_store_member_with_role(uuid, text[]) from public;
revoke all on function public.can_manage_store_catalog(uuid) from public;
revoke all on function public.is_store_owner(uuid) from public;
revoke all on function public.is_public_store_product(uuid) from public;
grant execute on function public.is_store_member(uuid) to anon, authenticated;
grant execute on function public.is_store_member_with_role(uuid, text[]) to anon, authenticated;
grant execute on function public.can_manage_store_catalog(uuid) to anon, authenticated;
grant execute on function public.is_store_owner(uuid) to anon, authenticated;
grant execute on function public.is_public_store_product(uuid) to anon, authenticated;

-- Auto-create owner membership
create or replace function public.handle_store_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.store_members (store_id, user_id, role, status)
  values (new.id, new.owner_user_id, 'owner', 'active')
  on conflict (store_id, user_id) do update
    set role = 'owner', status = 'active';
  return new;
end;
$$;

drop trigger if exists stores_owner_membership on public.stores;
create trigger stores_owner_membership
  after insert on public.stores
  for each row execute function public.handle_store_owner_membership();

-- Active products require exactly one primary category
create or replace function public.enforce_active_product_primary_category()
returns trigger
language plpgsql
as $$
declare
  primary_count integer;
begin
  if new.status = 'active' then
    if new.primary_category_id is null then
      raise exception 'Active products require a primary_category_id';
    end if;
    select count(*) into primary_count
    from public.product_category_links l
    where l.product_id = new.id and l.is_primary = true;
    if primary_count <> 1 then
      raise exception 'Active products require exactly one primary category link';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists store_products_enforce_primary_category on public.store_products;
create trigger store_products_enforce_primary_category
  before insert or update of status, primary_category_id on public.store_products
  for each row execute function public.enforce_active_product_primary_category();

-- Sellers cannot self-verify stores/brands or self-approve products
create or replace function public.guard_store_verification_self_service()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.verification_status is distinct from old.verification_status
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Store verification_status can only be changed by operators';
  end if;
  if tg_op = 'INSERT'
     and new.verification_status is distinct from 'unverified'
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'New stores must start unverified';
  end if;
  return new;
end;
$$;

drop trigger if exists stores_guard_verification on public.stores;
create trigger stores_guard_verification
  before insert or update of verification_status on public.stores
  for each row execute function public.guard_store_verification_self_service();

create or replace function public.guard_brand_verification_self_service()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.verification_status is distinct from old.verification_status
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Brand verification_status can only be changed by operators';
  end if;
  if tg_op = 'INSERT'
     and new.verification_status is distinct from 'unverified'
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'New brands must start unverified';
  end if;
  return new;
end;
$$;

drop trigger if exists product_brands_guard_verification on public.product_brands;
create trigger product_brands_guard_verification
  before insert or update of verification_status on public.product_brands
  for each row execute function public.guard_brand_verification_self_service();

create or replace function public.guard_product_seller_lifecycle()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'in_review') then
      raise exception 'Sellers may only create draft or in_review products';
    end if;
    if new.moderation_status <> 'pending' then
      raise exception 'Sellers may only create products with pending moderation';
    end if;
    return new;
  end if;

  if new.moderation_status = 'approved'
     and old.moderation_status is distinct from 'approved' then
    raise exception 'Sellers cannot approve product moderation';
  end if;

  if new.status = 'active'
     and old.status is distinct from 'active' then
    raise exception 'Sellers cannot activate products directly';
  end if;

  if old.status = 'active'
     and new.status = 'active'
     and new.moderation_status is distinct from old.moderation_status
     and new.moderation_status <> 'approved' then
    -- allow demotion paths only via service_role (handled above)
    null;
  end if;

  return new;
end;
$$;

drop trigger if exists store_products_guard_seller_lifecycle on public.store_products;
create trigger store_products_guard_seller_lifecycle
  before insert or update of status, moderation_status on public.store_products
  for each row execute function public.guard_product_seller_lifecycle();

-- Service-role approval path
create or replace function public.approve_store_product(p_product_id uuid)
returns public.store_products
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.store_products;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'approve_store_product requires service_role';
  end if;

  update public.store_products
  set
    status = 'active',
    moderation_status = 'approved',
    published_at = coalesce(published_at, now()),
    updated_at = now()
  where id = p_product_id
  returning * into row;

  if row.id is null then
    raise exception 'Product not found';
  end if;

  return row;
end;
$$;

revoke all on function public.approve_store_product(uuid) from public;
revoke all on function public.approve_store_product(uuid) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.store_products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_prices enable row level security;
alter table public.product_inventory enable row level security;
alter table public.product_media enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_brands enable row level security;
alter table public.product_category_links enable row level security;

-- stores
drop policy if exists "Public can view active stores" on public.stores;
create policy "Public can view active stores"
  on public.stores for select
  using (
    status = 'active'
    or public.is_store_member(id)
  );

drop policy if exists "Authenticated users can create stores" on public.stores;
create policy "Authenticated users can create stores"
  on public.stores for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and owner_user_id = (select auth.uid())
    and verification_status = 'unverified'
  );

drop policy if exists "Store managers can update store basics" on public.stores;
create policy "Store managers can update store basics"
  on public.stores for update to authenticated
  using (public.is_store_member_with_role(id, array['owner', 'manager']))
  with check (public.is_store_member_with_role(id, array['owner', 'manager']));

-- store_members
drop policy if exists "Members can view store membership" on public.store_members;
create policy "Members can view store membership"
  on public.store_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_store_member(store_id)
  );

drop policy if exists "Owners can manage store members" on public.store_members;
create policy "Owners can manage store members"
  on public.store_members for all to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

-- Allow trigger insert of owner membership (security definer bypasses RLS)

-- store_products
drop policy if exists "Public can view active approved products" on public.store_products;
create policy "Public can view active approved products"
  on public.store_products for select
  using (
    public.is_public_store_product(id)
    or public.is_store_member(store_id)
  );

drop policy if exists "Catalog editors can insert products" on public.store_products;
create policy "Catalog editors can insert products"
  on public.store_products for insert to authenticated
  with check (
    public.can_manage_store_catalog(store_id)
    and created_by = (select auth.uid())
  );

drop policy if exists "Catalog editors can update products" on public.store_products;
create policy "Catalog editors can update products"
  on public.store_products for update to authenticated
  using (public.can_manage_store_catalog(store_id))
  with check (public.can_manage_store_catalog(store_id));

-- product_variants
drop policy if exists "Public can view active variants of public products" on public.product_variants;
create policy "Public can view active variants of public products"
  on public.product_variants for select
  using (
    (
      status = 'active'
      and public.is_public_store_product(product_id)
    )
    or exists (
      select 1 from public.store_products p
      where p.id = product_id and public.is_store_member(p.store_id)
    )
  );

drop policy if exists "Catalog editors manage variants" on public.product_variants;
create policy "Catalog editors manage variants"
  on public.product_variants for all to authenticated
  using (
    exists (
      select 1 from public.store_products p
      where p.id = product_id and public.can_manage_store_catalog(p.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.store_products p
      where p.id = product_id and public.can_manage_store_catalog(p.store_id)
    )
  );

-- product_prices
drop policy if exists "Public can view active prices of public products" on public.product_prices;
create policy "Public can view active prices of public products"
  on public.product_prices for select
  using (
    (
      status = 'active'
      and exists (
        select 1 from public.product_variants v
        where v.id = variant_id
          and v.status = 'active'
          and public.is_public_store_product(v.product_id)
      )
    )
    or exists (
      select 1
      from public.product_variants v
      join public.store_products p on p.id = v.product_id
      where v.id = variant_id and public.is_store_member(p.store_id)
    )
  );

drop policy if exists "Catalog editors manage prices" on public.product_prices;
create policy "Catalog editors manage prices"
  on public.product_prices for all to authenticated
  using (
    exists (
      select 1
      from public.product_variants v
      join public.store_products p on p.id = v.product_id
      where v.id = variant_id and public.can_manage_store_catalog(p.store_id)
    )
  )
  with check (
    exists (
      select 1
      from public.product_variants v
      join public.store_products p on p.id = v.product_id
      where v.id = variant_id and public.can_manage_store_catalog(p.store_id)
    )
  );

-- product_inventory
drop policy if exists "Public can view inventory of public products" on public.product_inventory;
create policy "Public can view inventory of public products"
  on public.product_inventory for select
  using (
    exists (
      select 1 from public.product_variants v
      where v.id = variant_id
        and v.status = 'active'
        and public.is_public_store_product(v.product_id)
    )
    or exists (
      select 1
      from public.product_variants v
      join public.store_products p on p.id = v.product_id
      where v.id = variant_id and public.is_store_member(p.store_id)
    )
  );

drop policy if exists "Catalog editors manage inventory" on public.product_inventory;
create policy "Catalog editors manage inventory"
  on public.product_inventory for all to authenticated
  using (
    exists (
      select 1
      from public.product_variants v
      join public.store_products p on p.id = v.product_id
      where v.id = variant_id and public.can_manage_store_catalog(p.store_id)
    )
  )
  with check (
    exists (
      select 1
      from public.product_variants v
      join public.store_products p on p.id = v.product_id
      where v.id = variant_id and public.can_manage_store_catalog(p.store_id)
    )
  );

-- product_media
drop policy if exists "Public can view active media of public products" on public.product_media;
create policy "Public can view active media of public products"
  on public.product_media for select
  using (
    (
      status = 'active'
      and public.is_public_store_product(product_id)
    )
    or exists (
      select 1 from public.store_products p
      where p.id = product_id and public.is_store_member(p.store_id)
    )
  );

drop policy if exists "Catalog editors manage media" on public.product_media;
create policy "Catalog editors manage media"
  on public.product_media for all to authenticated
  using (
    exists (
      select 1 from public.store_products p
      where p.id = product_id and public.can_manage_store_catalog(p.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.store_products p
      where p.id = product_id and public.can_manage_store_catalog(p.store_id)
    )
  );

-- categories / brands (public read active; writes via service_role / future admin)
drop policy if exists "Public can view active categories" on public.product_categories;
create policy "Public can view active categories"
  on public.product_categories for select
  using (status = 'active');

drop policy if exists "Public can view active brands" on public.product_brands;
create policy "Public can view active brands"
  on public.product_brands for select
  using (status = 'active');

-- category links
drop policy if exists "Public can view category links for public products" on public.product_category_links;
create policy "Public can view category links for public products"
  on public.product_category_links for select
  using (
    public.is_public_store_product(product_id)
    or exists (
      select 1 from public.store_products p
      where p.id = product_id and public.is_store_member(p.store_id)
    )
  );

drop policy if exists "Catalog editors manage category links" on public.product_category_links;
create policy "Catalog editors manage category links"
  on public.product_category_links for all to authenticated
  using (
    exists (
      select 1 from public.store_products p
      where p.id = product_id and public.can_manage_store_catalog(p.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.store_products p
      where p.id = product_id and public.can_manage_store_catalog(p.store_id)
    )
  );

-- Soft-status model: no DELETE grants for catalog tables to anon/authenticated
revoke delete on public.stores from anon, authenticated;
revoke delete on public.store_products from anon, authenticated;
revoke delete on public.product_variants from anon, authenticated;
revoke delete on public.product_prices from anon, authenticated;
revoke delete on public.product_inventory from anon, authenticated;
revoke delete on public.product_media from anon, authenticated;
revoke delete on public.product_categories from anon, authenticated;
revoke delete on public.product_brands from anon, authenticated;
