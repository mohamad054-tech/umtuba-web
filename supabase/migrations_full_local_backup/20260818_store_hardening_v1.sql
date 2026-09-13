-- UMTUBA Store Hardening V1
-- Browse-beta hardening on top of alpha Store foundations.
-- Additive. Safe to re-run. Does not change Orders/Checkout/Payments.
--
-- Filename note: 20260811_* is already store_orders_foundation_v1 on alpha-0.2,
-- so this hardening migration uses 20260818_*.
--
-- 1) Close residual authenticated store INSERT RLS
-- 2) Product review_note + reject / return-for-revision admin RPCs
-- 3) Dedicated Storage bucket store-product-media

-- ---------------------------------------------------------------------------
-- 1) Residual store creation RLS
--    App createStoreForUser is fail-closed; stores are created only via
--    approve_seller_application / admin_approve_seller_application.
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can create stores" on public.stores;

revoke insert on public.stores from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Product moderation notes + reject / return RPCs
-- ---------------------------------------------------------------------------

alter table public.store_products
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz;

alter table public.store_products
  drop constraint if exists store_products_review_note_len;

alter table public.store_products
  add constraint store_products_review_note_len
  check (review_note is null or char_length(review_note) <= 1000);

create or replace function public.admin_reject_store_product(
  p_product_id uuid,
  p_note text
)
returns public.store_products
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.store_products;
  note text;
begin
  perform public.require_platform_admin();

  note := nullif(btrim(coalesce(p_note, '')), '');
  if note is null or char_length(note) < 3 then
    raise exception 'Rejection reason is required';
  end if;
  if char_length(note) > 1000 then
    raise exception 'Rejection reason is too long';
  end if;

  select * into row
  from public.store_products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  if row.status not in ('in_review', 'pending_review')
     or row.moderation_status is distinct from 'pending' then
    raise exception 'Product is not awaiting moderation';
  end if;

  update public.store_products
  set
    status = 'rejected',
    moderation_status = 'rejected',
    review_note = note,
    reviewed_at = now(),
    updated_at = now()
  where id = p_product_id
  returning * into row;

  return row;
end;
$$;

create or replace function public.admin_return_store_product_for_revision(
  p_product_id uuid,
  p_note text
)
returns public.store_products
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.store_products;
  note text;
begin
  perform public.require_platform_admin();

  note := nullif(btrim(coalesce(p_note, '')), '');
  if note is null or char_length(note) < 3 then
    raise exception 'Revision reason is required';
  end if;
  if char_length(note) > 1000 then
    raise exception 'Revision reason is too long';
  end if;

  select * into row
  from public.store_products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  if row.status not in ('in_review', 'pending_review')
     or row.moderation_status is distinct from 'pending' then
    raise exception 'Product is not awaiting moderation';
  end if;

  update public.store_products
  set
    status = 'draft',
    moderation_status = 'needs_changes',
    review_note = note,
    reviewed_at = now(),
    updated_at = now()
  where id = p_product_id
  returning * into row;

  return row;
end;
$$;

revoke all on function public.admin_reject_store_product(uuid, text) from public, anon;
revoke all on function public.admin_return_store_product_for_revision(uuid, text) from public, anon;
grant execute on function public.admin_reject_store_product(uuid, text) to authenticated, service_role;
grant execute on function public.admin_return_store_product_for_revision(uuid, text) to authenticated, service_role;

create or replace function public.admin_approve_store_product(p_product_id uuid)
returns public.store_products
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.store_products;
  store_status text;
  store_verification text;
begin
  perform public.require_platform_admin();

  select * into row
  from public.store_products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  select s.status, s.verification_status
  into store_status, store_verification
  from public.stores s
  where s.id = row.store_id
  for update;

  if not found then
    raise exception 'Store not found';
  end if;

  if row.status not in ('in_review', 'pending_review')
     or row.moderation_status is distinct from 'pending' then
    raise exception 'Product is not awaiting moderation';
  end if;

  if store_status is distinct from 'active'
     or store_verification is distinct from 'verified' then
    raise exception 'Store is not eligible for product approval';
  end if;

  update public.store_products
  set
    status = 'active',
    moderation_status = 'approved',
    published_at = coalesce(published_at, now()),
    review_note = null,
    reviewed_at = now(),
    updated_at = now()
  where id = p_product_id
  returning * into row;

  return row;
end;
$$;

revoke all on function public.admin_approve_store_product(uuid) from public, anon;
grant execute on function public.admin_approve_store_product(uuid) to authenticated, service_role;

drop function if exists public.admin_list_store_products_for_moderation(text, integer, integer);

create function public.admin_list_store_products_for_moderation(
  p_status text default 'pending',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  store_id uuid,
  store_slug text,
  store_name text,
  owner_user_id uuid,
  created_by uuid,
  title text,
  slug text,
  category_name text,
  status text,
  moderation_status text,
  currency text,
  amount_minor bigint,
  on_hand integer,
  reserved integer,
  safety_stock integer,
  allow_backorder boolean,
  media_path text,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  st text := nullif(btrim(coalesce(p_status, '')), '');
begin
  perform public.require_platform_admin();

  if st is not null and st not in ('pending', 'approved', 'rejected', 'needs_changes', 'all') then
    raise exception 'Invalid status filter';
  end if;
  if st = 'all' then
    st := null;
  end if;

  return query
  select
    p.id,
    p.store_id,
    s.slug::text as store_slug,
    s.name::text as store_name,
    s.owner_user_id,
    p.created_by,
    p.title,
    p.slug,
    c.name::text as category_name,
    p.status,
    p.moderation_status,
    pr.currency::text,
    pr.amount_minor::bigint,
    inv.on_hand,
    inv.reserved,
    inv.safety_stock,
    inv.allow_backorder,
    media.storage_path::text as media_path,
    p.review_note,
    p.reviewed_at,
    p.created_at,
    p.updated_at
  from public.store_products p
  join public.stores s on s.id = p.store_id
  left join public.product_categories c on c.id = p.primary_category_id
  left join lateral (
    select v.id
    from public.product_variants v
    where v.product_id = p.id
      and v.status = 'active'
    order by v.created_at asc
    limit 1
  ) variant on true
  left join lateral (
    select pp.currency, pp.amount_minor
    from public.product_prices pp
    where pp.variant_id = variant.id
      and pp.status = 'active'
    order by pp.created_at desc
    limit 1
  ) pr on true
  left join lateral (
    select pi.on_hand, pi.reserved, pi.safety_stock, pi.allow_backorder
    from public.product_inventory pi
    where pi.variant_id = variant.id
    order by pi.created_at asc
    limit 1
  ) inv on true
  left join lateral (
    select pm.storage_path
    from public.product_media pm
    where pm.product_id = p.id
      and pm.status = 'active'
    order by pm.sort_order asc, pm.created_at asc
    limit 1
  ) media on true
  where (
    (
      (st is null or st = 'pending')
      and p.moderation_status = 'pending'
      and p.status in ('in_review', 'pending_review')
      and s.status = 'active'
      and s.verification_status = 'verified'
    )
    or (
      (st is null or st = 'approved')
      and p.moderation_status = 'approved'
    )
    or (
      (st is null or st = 'rejected')
      and p.moderation_status = 'rejected'
    )
    or (
      (st is null or st = 'needs_changes')
      and p.moderation_status = 'needs_changes'
    )
  )
  order by
    case
      when p.moderation_status = 'pending'
        and p.status in ('in_review', 'pending_review') then 0
      else 1
    end,
    p.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, least(coalesce(p_offset, 0), 5000));
end;
$$;

revoke all on function public.admin_list_store_products_for_moderation(text, integer, integer) from public, anon;
grant execute on function public.admin_list_store_products_for_moderation(text, integer, integer) to authenticated, service_role;

-- PRIVATE bucket: no getPublicUrl; app mints short-lived signed URLs after authZ.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-product-media',
  'store-product-media',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Catalog editors upload store product media" on storage.objects;
drop policy if exists "Catalog editors update store product media" on storage.objects;
drop policy if exists "Catalog editors delete store product media" on storage.objects;
drop policy if exists "Catalog editors read own store product media" on storage.objects;
drop policy if exists "Public read store product media objects" on storage.objects;
drop policy if exists "Public catalog may select published store product media" on storage.objects;
drop policy if exists "Platform admins read store product media" on storage.objects;

create policy "Catalog editors upload store product media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'store-product-media'
    and (storage.foldername(name))[1] = 'stores'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and (storage.foldername(name))[3] = 'products'
    and (storage.foldername(name))[4] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_manage_store_catalog(((storage.foldername(name))[2])::uuid)
  );

create policy "Catalog editors update store product media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'store-product-media'
    and (storage.foldername(name))[1] = 'stores'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_manage_store_catalog(((storage.foldername(name))[2])::uuid)
  )
  with check (
    bucket_id = 'store-product-media'
    and (storage.foldername(name))[1] = 'stores'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_manage_store_catalog(((storage.foldername(name))[2])::uuid)
  );

create policy "Catalog editors delete store product media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'store-product-media'
    and (storage.foldername(name))[1] = 'stores'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_manage_store_catalog(((storage.foldername(name))[2])::uuid)
  );

create policy "Catalog editors read own store product media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'store-product-media'
    and (storage.foldername(name))[1] = 'stores'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and public.can_manage_store_catalog(((storage.foldername(name))[2])::uuid)
  );

-- SELECT only for published catalog products (enables signed URL minting).
-- Draft / rejected / needs_changes / inactive products are NOT readable here.
create policy "Public catalog may select published store product media"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'store-product-media'
    and exists (
      select 1
      from public.product_media pm
      where pm.storage_path = name
        and pm.status = 'active'
        and public.is_public_store_product(pm.product_id)
    )
  );

create policy "Platform admins read store product media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'store-product-media'
    and public.is_platform_admin()
  );