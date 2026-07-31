-- =============================================================================
-- UMTUBA Commerce — Supplier Listing Create Hardening V1
-- Migration: 20260886_store_supplier_listing_create_hardening_v1.sql
-- Capability: commerce.marketplace.supplier_listing_create_hardening_v1
-- Local file only — do NOT remote-apply without explicit approval.
-- =============================================================================
-- Hardens add_store_seller_listing:
--   - owner/manager only (catalog_editor denied)
--   - reject duplicate active listings
--   - require active primary category on source product
--   - require trusted active price
--   - require valid inventory model for finite product types
--   - require digital deliverable for digital products
--   - stamp listing.primary_category_id from product
--   - revoke direct INSERT (RPC-only creates)
-- Reuses existing store_seller_listings — no duplicate listing system.

-- ---------------------------------------------------------------------------
-- 1) RPC-only inserts: revoke direct authenticated INSERT
-- ---------------------------------------------------------------------------

drop policy if exists "Seller catalog members insert listings"
  on public.store_seller_listings;

revoke insert on table public.store_seller_listings from authenticated;

-- ---------------------------------------------------------------------------
-- 2) Hardened add_store_seller_listing
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
  v_category_status text;
  v_variant_id uuid;
  v_variant_status text;
  v_price_minor bigint;
  v_price_currency text;
  v_on_hand integer;
  v_reserved integer;
  v_safety_stock integer;
  v_digital_ok boolean := false;
  v_path text;
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
      and m.role = any (array['owner', 'manager'])
      and s.status = 'active';

    if v_match_count = 0 then
      raise exception 'No seller store membership with owner/manager role';
    end if;

    if v_match_count > 1 then
      raise exception 'Multiple seller stores; pass p_seller_store_id';
    end if;

    select m.store_id into v_seller_store_id
    from public.store_members m
    join public.stores s on s.id = m.store_id
    where m.user_id = v_uid
      and m.status = 'active'
      and m.role = any (array['owner', 'manager'])
      and s.status = 'active'
    limit 1;
  end if;

  if not public.is_store_member_with_role(
    v_seller_store_id,
    array['owner', 'manager']
  ) then
    raise exception 'Only store owners or managers may create marketplace listings';
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

  -- Category must be present and active (taxonomy reuse).
  if v_product.primary_category_id is null then
    raise exception 'Product primary category is required for listing create';
  end if;

  select c.status into v_category_status
  from public.product_categories c
  where c.id = v_product.primary_category_id;

  if not found then
    raise exception 'Product primary category was not found';
  end if;

  if v_category_status is distinct from 'active' then
    raise exception 'Product primary category must be active';
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

  -- Trusted price required (first active variant).
  select v.id, v.status
    into v_variant_id, v_variant_status
  from public.product_variants v
  where v.product_id = p_source_product_id
    and v.status = 'active'
  order by v.created_at asc
  limit 1;

  if v_variant_id is null then
    raise exception 'Product requires an active variant for listing create';
  end if;

  select pr.amount_minor, pr.currency
    into v_price_minor, v_price_currency
  from public.product_prices pr
  where pr.variant_id = v_variant_id
    and pr.status = 'active'
  order by pr.created_at desc
  limit 1;

  if v_price_minor is null
     or v_price_minor < 0
     or v_price_currency is null
     or length(btrim(v_price_currency)) <> 3 then
    raise exception 'Trusted selling price is missing or invalid';
  end if;

  -- Finite inventory types require a consistent inventory row.
  if v_product.product_type in ('physical', 'booking') then
    select i.on_hand, i.reserved, i.safety_stock
      into v_on_hand, v_reserved, v_safety_stock
    from public.product_inventory i
    where i.variant_id = v_variant_id
      and i.warehouse_key = 'default'
    limit 1;

    if v_on_hand is null then
      raise exception 'Finite inventory product requires a trusted inventory row';
    end if;

    if v_on_hand < 0 or v_reserved < 0 or v_safety_stock < 0
       or v_reserved > v_on_hand then
      raise exception 'Inventory quantities are inconsistent';
    end if;
  end if;

  -- Digital publish readiness (active owned deliverable pointer).
  if v_product.product_type = 'digital' then
    select a.storage_path into v_path
    from public.store_digital_product_assets a
    where a.product_id = p_source_product_id
      and a.store_id = v_supplier.id
      and a.status = 'active'
    limit 1;

    if v_path is null then
      raise exception 'Digital product is missing an active owned deliverable for marketplace sale';
    end if;

    -- Path ownership: stores/{store_id}/products/{product_id}/digital/...
    if position(
         ('stores/' || v_supplier.id::text || '/products/' || p_source_product_id::text || '/digital/')
         in v_path
       ) <> 1 then
      raise exception 'Digital asset path failed ownership checks';
    end if;

    v_digital_ok := true;
  else
    v_digital_ok := true;
  end if;

  if not v_digital_ok then
    raise exception 'Digital product is not publish-ready for listing create';
  end if;

  select * into v_listing
  from public.store_seller_listings l
  where l.seller_store_id = v_seller_store_id
    and l.source_product_id = p_source_product_id
  for update;

  if found then
    if v_listing.supplier_store_id is distinct from v_supplier.id then
      raise exception 'Existing listing supplier does not match source product store';
    end if;

    if v_listing.status = 'active' then
      raise exception 'An active listing already exists for this product';
    end if;

    -- Reactivate archived / hidden / draft → active after full validation.
    update public.store_seller_listings
    set
      status = 'active',
      supplier_store_id = v_supplier.id,
      primary_category_id = v_product.primary_category_id,
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
      primary_category_id,
      inventory_owner_store_id,
      fulfillment_party_store_id,
      created_by
    )
    values (
      v_seller_store_id,
      p_source_product_id,
      v_supplier.id,
      'active',
      v_product.primary_category_id,
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
    'reused', false,
    'listing_id', v_listing.id,
    'status', v_listing.status,
    'seller_store_id', v_listing.seller_store_id,
    'source_product_id', v_listing.source_product_id,
    'supplier_store_id', v_listing.supplier_store_id,
    'primary_category_id', v_listing.primary_category_id
  );
end;
$$;

comment on function public.add_store_seller_listing(uuid, uuid) is
  'Hardened create/reactivate of an active seller listing. Owner/manager only. Rejects duplicate active. Requires category, price, inventory model, digital readiness. RPC-only insert.';

revoke all on function public.add_store_seller_listing(uuid, uuid)
  from public, anon;
grant execute on function public.add_store_seller_listing(uuid, uuid)
  to authenticated, service_role;
