-- UMTUBA Store Admin Moderation Foundation V1
-- Additive. Platform-admin in-app console for seller applications + product review.
-- Reuses marketplace/product lifecycle semantics. Does not weaken existing
-- service_role automation RPCs. No checkout / orders / payments / shipping.

-- ---------------------------------------------------------------------------
-- 1) Allow platform admins through existing verification / lifecycle guards
--    (session auth.role() remains authenticated inside SECURITY DEFINER writes)
-- ---------------------------------------------------------------------------

create or replace function public.guard_store_verification_self_service()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() is not distinct from 'service_role'
     or public.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.verification_status is distinct from old.verification_status then
    raise exception 'Store verification_status can only be changed by operators';
  end if;
  if tg_op = 'INSERT'
     and new.verification_status is distinct from 'unverified' then
    raise exception 'New stores must start unverified';
  end if;
  return new;
end;
$$;

create or replace function public.guard_product_seller_lifecycle()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() is not distinct from 'service_role'
     or public.is_platform_admin() then
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

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Seller application admin RPCs (platform admin OR service_role)
--    Business logic mirrors approve/reject/suspend_seller_application.
-- ---------------------------------------------------------------------------

create or replace function public.admin_approve_seller_application(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.seller_applications%rowtype;
  new_store_id uuid;
begin
  perform public.require_platform_admin();

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

revoke all on function public.admin_approve_seller_application(uuid) from public, anon;
grant execute on function public.admin_approve_seller_application(uuid) to authenticated, service_role;

create or replace function public.admin_reject_seller_application(
  p_application_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform public.require_platform_admin();

  if note is null or char_length(note) < 3 then
    raise exception 'Rejection reason is required';
  end if;
  if char_length(note) > 1000 then
    raise exception 'Rejection reason is too long';
  end if;

  update public.seller_applications
  set
    status = 'rejected',
    review_note = note,
    reviewed_at = now()
  where id = p_application_id
    and status = 'pending';

  if not found then
    raise exception 'Pending seller application not found';
  end if;
end;
$$;

revoke all on function public.admin_reject_seller_application(uuid, text) from public, anon;
grant execute on function public.admin_reject_seller_application(uuid, text) to authenticated, service_role;

create or replace function public.admin_suspend_seller_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.seller_applications%rowtype;
begin
  perform public.require_platform_admin();

  select * into app
  from public.seller_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Seller application not found';
  end if;

  if app.status = 'suspended' then
    raise exception 'Seller application is already suspended';
  end if;

  if app.status not in ('pending', 'approved') then
    raise exception 'Only pending or approved seller applications can be suspended';
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

revoke all on function public.admin_suspend_seller_application(uuid) from public, anon;
grant execute on function public.admin_suspend_seller_application(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Product moderation admin RPC (approve only — mirrors approve_store_product)
--    Product reject/return-for-revision has no existing operator RPC + no
--    persisted review-note column; deferred to a later slice.
--    Store must be active + verified; ineligible products are excluded from
--    the pending queue (see list/count RPCs below).
-- ---------------------------------------------------------------------------

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

  -- Reject before any product update when the store cannot publish.
  if store_status is distinct from 'active'
     or store_verification is distinct from 'verified' then
    raise exception 'Store is not eligible for product approval';
  end if;

  update public.store_products
  set
    status = 'active',
    moderation_status = 'approved',
    published_at = coalesce(published_at, now()),
    updated_at = now()
  where id = p_product_id
  returning * into row;

  return row;
end;
$$;

revoke all on function public.admin_approve_store_product(uuid) from public, anon;
grant execute on function public.admin_approve_store_product(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Queue list / count RPCs (platform admin only)
-- ---------------------------------------------------------------------------

create or replace function public.admin_store_moderation_queue_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_platform_admin();
  return jsonb_build_object(
    'seller_applications_pending', (
      select count(*)::int
      from public.seller_applications
      where status = 'pending'
    ),
    'products_pending', (
      select count(*)::int
      from public.store_products p
      join public.stores s on s.id = p.store_id
      where p.moderation_status = 'pending'
        and p.status in ('in_review', 'pending_review')
        and s.status = 'active'
        and s.verification_status = 'verified'
    )
  );
end;
$$;

revoke all on function public.admin_store_moderation_queue_counts() from public, anon;
grant execute on function public.admin_store_moderation_queue_counts() to authenticated, service_role;

create or replace function public.admin_list_seller_applications(
  p_status text default 'pending',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  user_id uuid,
  applicant_username text,
  applicant_display_name text,
  proposed_store_name text,
  proposed_store_slug text,
  city text,
  country_code text,
  public_contact_email text,
  public_contact_phone text,
  default_currency text,
  status text,
  review_note text,
  store_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  reviewed_at timestamptz
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

  if st is not null and st not in ('pending', 'approved', 'rejected', 'suspended', 'all') then
    raise exception 'Invalid status filter';
  end if;
  if st = 'all' then
    st := null;
  end if;

  return query
  select
    a.id,
    a.user_id,
    p.username::text as applicant_username,
    coalesce(p.display_name, p.full_name)::text as applicant_display_name,
    a.proposed_store_name,
    a.proposed_store_slug,
    a.city,
    a.country_code,
    a.public_contact_email,
    a.public_contact_phone,
    a.default_currency,
    a.status,
    a.review_note,
    a.store_id,
    a.created_at,
    a.updated_at,
    a.reviewed_at
  from public.seller_applications a
  left join public.profiles p on p.id = a.user_id
  where (st is null or a.status = st)
  order by
    case when a.status = 'pending' then 0 else 1 end,
    a.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, least(coalesce(p_offset, 0), 5000));
end;
$$;

revoke all on function public.admin_list_seller_applications(text, integer, integer) from public, anon;
grant execute on function public.admin_list_seller_applications(text, integer, integer) to authenticated, service_role;

create or replace function public.admin_list_store_products_for_moderation(
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

  if st is not null and st not in ('pending', 'approved', 'rejected', 'all') then
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
      -- Approvable queue: exclude inactive / suspended / unverified stores.
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
