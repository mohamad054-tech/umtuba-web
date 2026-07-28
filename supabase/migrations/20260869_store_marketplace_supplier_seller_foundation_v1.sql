-- UMTUBA Store Marketplace Supplier / Seller Foundation V1
-- Additive, fail-closed. Supplier-enabled stores + seller listings bridge.
-- Does NOT rewrite create_store_checkout_quote / create_store_order_foundation.
-- App-layer cart must set cart_items.seller_listing_id for supplier lines;
-- a follow-up migration may patch quote / order RPCs to honor listings.
-- No remote apply in this handoff.

-- ---------------------------------------------------------------------------
-- 1) Store + product marketplace flags
-- ---------------------------------------------------------------------------

alter table public.stores
  add column if not exists marketplace_supplier_enabled boolean not null default false;

comment on column public.stores.marketplace_supplier_enabled is
  'When true (and store active+verified), other verified sellers may list this store''s marketplace_eligible products.';

alter table public.store_products
  add column if not exists marketplace_eligible boolean not null default false;

comment on column public.store_products.marketplace_eligible is
  'Supplier opt-in: product may appear on other sellers'' storefronts via store_seller_listings.';

-- ---------------------------------------------------------------------------
-- 2) Seller listings (seller storefronts supplier-owned catalog)
-- ---------------------------------------------------------------------------

create table if not exists public.store_seller_listings (
  id uuid primary key default gen_random_uuid(),
  seller_store_id uuid not null references public.stores (id) on delete cascade,
  source_product_id uuid not null references public.store_products (id) on delete restrict,
  supplier_store_id uuid not null references public.stores (id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'hidden', 'archived')),
  display_title_override text
    check (
      display_title_override is null
      or char_length(display_title_override) <= 200
    ),
  marketing_description text
    check (
      marketing_description is null
      or char_length(marketing_description) <= 5000
    ),
  primary_category_id uuid references public.product_categories (id) on delete set null,
  inventory_owner_store_id uuid references public.stores (id) on delete set null,
  fulfillment_party_store_id uuid references public.stores (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_seller_listings_seller_ne_supplier_check
    check (supplier_store_id <> seller_store_id),
  constraint store_seller_listings_unique_seller_source
    unique (seller_store_id, source_product_id)
);

comment on table public.store_seller_listings is
  'Seller-storefront listing of a supplier-owned product. Unique per (seller, source product); soft-archive via status.';

create index if not exists store_seller_listings_seller_store_id_idx
  on public.store_seller_listings (seller_store_id);
create index if not exists store_seller_listings_source_product_id_idx
  on public.store_seller_listings (source_product_id);
create index if not exists store_seller_listings_supplier_store_id_idx
  on public.store_seller_listings (supplier_store_id);
create index if not exists store_seller_listings_status_idx
  on public.store_seller_listings (status);

drop trigger if exists store_seller_listings_set_updated_at
  on public.store_seller_listings;
create trigger store_seller_listings_set_updated_at
  before update on public.store_seller_listings
  for each row execute function public.set_row_updated_at();

-- ---------------------------------------------------------------------------
-- 3) RLS FORCE on store_seller_listings
-- ---------------------------------------------------------------------------

alter table public.store_seller_listings enable row level security;
alter table public.store_seller_listings force row level security;

revoke all on table public.store_seller_listings from anon, public;
grant select, insert, update on table public.store_seller_listings to authenticated;
revoke delete on table public.store_seller_listings from authenticated, anon, public;

drop policy if exists "Seller catalog members select own listings"
  on public.store_seller_listings;
create policy "Seller catalog members select own listings"
  on public.store_seller_listings for select to authenticated
  using (
    public.is_store_member_with_role(
      seller_store_id,
      array['owner', 'manager', 'catalog_editor']
    )
    or public.is_platform_admin()
  );

drop policy if exists "Supplier members select listings of their products"
  on public.store_seller_listings;
create policy "Supplier members select listings of their products"
  on public.store_seller_listings for select to authenticated
  using (
    public.is_store_member(supplier_store_id)
    or public.is_platform_admin()
  );

drop policy if exists "Seller catalog members insert listings"
  on public.store_seller_listings;
create policy "Seller catalog members insert listings"
  on public.store_seller_listings for insert to authenticated
  with check (
    public.is_store_member_with_role(
      seller_store_id,
      array['owner', 'manager', 'catalog_editor']
    )
    or public.is_platform_admin()
  );

drop policy if exists "Seller catalog members update listings"
  on public.store_seller_listings;
create policy "Seller catalog members update listings"
  on public.store_seller_listings for update to authenticated
  using (
    public.is_store_member_with_role(
      seller_store_id,
      array['owner', 'manager', 'catalog_editor']
    )
    or public.is_platform_admin()
  )
  with check (
    public.is_store_member_with_role(
      seller_store_id,
      array['owner', 'manager', 'catalog_editor']
    )
    or public.is_platform_admin()
  );

-- No anon / public direct table access. Public catalog remains via
-- SECURITY DEFINER helpers or app joins under existing product RLS.

-- ---------------------------------------------------------------------------
-- 4) Cart + order item marketplace columns
-- ---------------------------------------------------------------------------

alter table public.cart_items
  add column if not exists seller_listing_id uuid
    references public.store_seller_listings (id) on delete set null;

create index if not exists cart_items_seller_listing_id_idx
  on public.cart_items (seller_listing_id)
  where seller_listing_id is not null;

comment on column public.cart_items.seller_listing_id is
  'When set, line is a supplier listing sold by cart store; quote/order RPCs must honor (follow-up).';

alter table public.order_items
  add column if not exists seller_listing_id uuid
    references public.store_seller_listings (id) on delete set null;

alter table public.order_items
  add column if not exists supplier_store_id uuid
    references public.stores (id) on delete set null;

alter table public.order_items
  add column if not exists marketplace_source_type text
    check (
      marketplace_source_type is null
      or marketplace_source_type in ('owned', 'supplier_listing')
    );

alter table public.order_items
  add column if not exists fulfillment_party_store_id uuid
    references public.stores (id) on delete set null;

alter table public.order_items
  add column if not exists inventory_owner_store_id uuid
    references public.stores (id) on delete set null;

create index if not exists order_items_seller_listing_id_idx
  on public.order_items (seller_listing_id)
  where seller_listing_id is not null;
create index if not exists order_items_supplier_store_id_idx
  on public.order_items (supplier_store_id)
  where supplier_store_id is not null;

comment on column public.order_items.marketplace_source_type is
  'owned = product belongs to order store; supplier_listing = sold via store_seller_listings.';

-- ---------------------------------------------------------------------------
-- 5) Sale eligibility helper
-- ---------------------------------------------------------------------------

create or replace function public.store_listing_allows_seller_sale(
  p_seller_store_id uuid,
  p_product_id uuid,
  p_listing_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_product public.store_products%rowtype;
  v_supplier public.stores%rowtype;
  v_seller public.stores%rowtype;
  v_listing public.store_seller_listings%rowtype;
begin
  if p_seller_store_id is null or p_product_id is null then
    return false;
  end if;

  select * into v_product
  from public.store_products p
  where p.id = p_product_id;

  if not found then
    return false;
  end if;

  if v_product.marketplace_eligible is not true
     or v_product.status is distinct from 'active'
     or v_product.moderation_status is distinct from 'approved' then
    return false;
  end if;

  select * into v_supplier
  from public.stores s
  where s.id = v_product.store_id;

  if not found then
    return false;
  end if;

  if v_supplier.status is distinct from 'active'
     or v_supplier.verification_status is distinct from 'verified'
     or v_supplier.marketplace_supplier_enabled is not true then
    return false;
  end if;

  select * into v_seller
  from public.stores s
  where s.id = p_seller_store_id;

  if not found then
    return false;
  end if;

  if v_seller.status is distinct from 'active'
     or v_seller.verification_status is distinct from 'verified' then
    return false;
  end if;

  if v_seller.id = v_supplier.id then
    return false;
  end if;

  if p_listing_id is not null then
    select * into v_listing
    from public.store_seller_listings l
    where l.id = p_listing_id;
  else
    select * into v_listing
    from public.store_seller_listings l
    where l.seller_store_id = p_seller_store_id
      and l.source_product_id = p_product_id
      and l.status = 'active';
  end if;

  if not found then
    return false;
  end if;

  if v_listing.status is distinct from 'active'
     or v_listing.seller_store_id is distinct from p_seller_store_id
     or v_listing.source_product_id is distinct from p_product_id
     or v_listing.supplier_store_id is distinct from v_product.store_id
     or v_listing.supplier_store_id is distinct from v_supplier.id then
    return false;
  end if;

  return true;
end;
$$;

comment on function public.store_listing_allows_seller_sale(uuid, uuid, uuid) is
  'True when seller may sell supplier product via an active store_seller_listings row.';

revoke all on function public.store_listing_allows_seller_sale(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.store_listing_allows_seller_sale(uuid, uuid, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Replace order_items store alignment (owned + supplier listing paths)
-- ---------------------------------------------------------------------------

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

  -- seller_user_id always matches ORDER store owner (selling party).
  if new.seller_user_id is distinct from store_owner_id then
    raise exception 'Order item seller_user_id must match store owner';
  end if;

  if product_store_id = order_store_id then
    -- Owned path (existing): product belongs to order store.
    if new.marketplace_source_type is not null
       and new.marketplace_source_type is distinct from 'owned' then
      raise exception 'Owned order items require marketplace_source_type owned or null';
    end if;
    if new.seller_listing_id is not null then
      raise exception 'Owned order items must not reference a seller listing';
    end if;
    if new.supplier_store_id is not null
       and new.supplier_store_id is distinct from order_store_id then
      raise exception 'Owned order items supplier_store_id must be null or the order store';
    end if;
  else
    -- Supplier listing path: cross-store product requires active listing.
    if not public.store_listing_allows_seller_sale(
      order_store_id,
      new.product_id,
      new.seller_listing_id
    ) then
      raise exception 'Order item product requires an active seller listing for this store';
    end if;

    if new.marketplace_source_type is distinct from 'supplier_listing' then
      raise exception 'Cross-store order items require marketplace_source_type=supplier_listing';
    end if;

    if new.supplier_store_id is null then
      new.supplier_store_id := product_store_id;
    elsif new.supplier_store_id is distinct from product_store_id then
      raise exception 'Order item supplier_store_id must match product store';
    end if;

    if new.seller_listing_id is null then
      raise exception 'Cross-store order items require seller_listing_id';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists order_items_store_alignment on public.order_items;
create trigger order_items_store_alignment
  before insert or update of
    order_id,
    product_id,
    variant_id,
    seller_user_id,
    seller_listing_id,
    marketplace_source_type,
    supplier_store_id
  on public.order_items
  for each row execute function public.enforce_order_item_store_alignment();

-- ---------------------------------------------------------------------------
-- 7) Follow-up notes (checkout / order RPC)
-- ---------------------------------------------------------------------------
-- create_store_checkout_quote / create_store_order_foundation are intentionally
-- NOT fully rewritten here (large surface). Until a follow-up:
--   * App cart must set cart_items.seller_listing_id for supplier lines.
--   * Quote/order RPCs still assume product.store_id = cart/order store for
--     owned catalog; cross-store lines will fail alignment until patched.
--   * Prefer patching those RPCs to call store_listing_allows_seller_sale and
--     stamp order_items marketplace columns from the listing.

-- ---------------------------------------------------------------------------
-- 8) add_store_seller_listing RPC (idempotent activate)
-- ---------------------------------------------------------------------------

create or replace function public.add_store_seller_listing(
  p_source_product_id uuid,
  p_seller_store_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_seller_store_id uuid := p_seller_store_id;
  v_product public.store_products%rowtype;
  v_supplier public.stores%rowtype;
  v_seller public.stores%rowtype;
  v_listing public.store_seller_listings%rowtype;
  v_match_count integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_source_product_id is null then
    raise exception 'source_product_id is required';
  end if;

  if v_seller_store_id is null then
    select count(*)::integer into v_match_count
    from public.store_members m
    join public.stores s on s.id = m.store_id
    where m.user_id = v_uid
      and m.status = 'active'
      and m.role = any (array['owner', 'manager', 'catalog_editor'])
      and s.status = 'active';

    if v_match_count = 0 then
      raise exception 'No seller store membership with catalog role';
    end if;

    if v_match_count > 1 then
      raise exception 'Multiple seller stores; pass p_seller_store_id';
    end if;

    select m.store_id into v_seller_store_id
    from public.store_members m
    join public.stores s on s.id = m.store_id
    where m.user_id = v_uid
      and m.status = 'active'
      and m.role = any (array['owner', 'manager', 'catalog_editor'])
      and s.status = 'active'
    limit 1;
  end if;

  if not public.is_store_member_with_role(
    v_seller_store_id,
    array['owner', 'manager', 'catalog_editor']
  ) then
    raise exception 'Not authorized to manage catalog for seller store';
  end if;

  select * into v_product
  from public.store_products p
  where p.id = p_source_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  if v_product.marketplace_eligible is not true
     or v_product.status is distinct from 'active'
     or v_product.moderation_status is distinct from 'approved' then
    raise exception 'Product is not marketplace-eligible for seller listing';
  end if;

  select * into v_supplier
  from public.stores s
  where s.id = v_product.store_id
  for update;

  if not found then
    raise exception 'Supplier store not found';
  end if;

  if v_supplier.status is distinct from 'active'
     or v_supplier.verification_status is distinct from 'verified'
     or v_supplier.marketplace_supplier_enabled is not true then
    raise exception 'Supplier store is not eligible for marketplace supply';
  end if;

  select * into v_seller
  from public.stores s
  where s.id = v_seller_store_id
  for update;

  if not found then
    raise exception 'Seller store not found';
  end if;

  if v_seller.status is distinct from 'active'
     or v_seller.verification_status is distinct from 'verified' then
    raise exception 'Seller store is not eligible to list marketplace products';
  end if;

  if v_seller.id = v_supplier.id then
    raise exception 'Seller store cannot list its own product via marketplace listing';
  end if;

  select * into v_listing
  from public.store_seller_listings l
  where l.seller_store_id = v_seller_store_id
    and l.source_product_id = p_source_product_id
  for update;

  if found then
    if v_listing.status = 'active' then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'listing_id', v_listing.id,
        'status', v_listing.status,
        'seller_store_id', v_listing.seller_store_id,
        'source_product_id', v_listing.source_product_id,
        'supplier_store_id', v_listing.supplier_store_id
      );
    end if;

    -- Reactivate archived / hidden / draft → active.
    update public.store_seller_listings
    set
      status = 'active',
      supplier_store_id = v_supplier.id,
      inventory_owner_store_id = coalesce(inventory_owner_store_id, v_supplier.id),
      fulfillment_party_store_id = coalesce(fulfillment_party_store_id, v_supplier.id),
      updated_at = now()
    where id = v_listing.id
    returning * into v_listing;
  else
    insert into public.store_seller_listings (
      seller_store_id,
      source_product_id,
      supplier_store_id,
      status,
      inventory_owner_store_id,
      fulfillment_party_store_id,
      created_by
    )
    values (
      v_seller_store_id,
      p_source_product_id,
      v_supplier.id,
      'active',
      v_supplier.id,
      v_supplier.id,
      v_uid
    )
    returning * into v_listing;
  end if;

  if not public.store_listing_allows_seller_sale(
    v_seller_store_id,
    p_source_product_id,
    v_listing.id
  ) then
    raise exception 'Listing failed eligibility validation';
  end if;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'listing_id', v_listing.id,
    'status', v_listing.status,
    'seller_store_id', v_listing.seller_store_id,
    'source_product_id', v_listing.source_product_id,
    'supplier_store_id', v_listing.supplier_store_id
  );
end;
$$;

comment on function public.add_store_seller_listing(uuid, uuid) is
  'Idempotent: create or reactivate an active seller listing for a marketplace-eligible supplier product.';

revoke all on function public.add_store_seller_listing(uuid, uuid)
  from public, anon;
grant execute on function public.add_store_seller_listing(uuid, uuid)
  to authenticated, service_role;