-- =============================================================================
-- UMTUBA Store remote E2E sandbox seed
-- Namespace: UMTUBA_E2E_20260721
-- Project: tgucwnjwoyeqoxqaxmew
--
-- Prerequisites (same session):
--   \i scripts/store-e2e/config.local.sql
--
-- Safety:
--   - Aborts ACCOUNT_BLOCKER if GUCs missing or auth.users rows missing
--   - Aborts SAFETY_ABORT if commerce_confirm_enabled <> 0
--   - Aborts COLLISION if slug/name owned by another store id
--   - Does NOT INSERT INTO auth.users
--   - Does NOT enable commerce_confirm / does NOT set commerce_confirm_enabled = 1
--   - Does NOT truncate; touches only fixed sandbox ids / marker rows
--
-- Payment simulation (docs): DEFERRED_TEST maps to provider='none' + method_kind='deferred'
-- (schema has no DEFERRED_TEST enum). Seed does not create payment_attempts.
-- =============================================================================

do $$
declare
  v_ns text := 'UMTUBA_E2E_20260721';
  v_store_id uuid := 'e2e02107-2026-4001-8000-000000000001';
  v_app_id uuid := 'e2e02107-2026-4001-8000-000000000002';
  v_prod_simple uuid := 'e2e02107-2026-4001-8000-000000000011';
  v_prod_tee uuid := 'e2e02107-2026-4001-8000-000000000012';
  v_prod_low uuid := 'e2e02107-2026-4001-8000-000000000013';
  v_var_simple uuid := 'e2e02107-2026-4001-8000-000000000021';
  v_var_tee_s uuid := 'e2e02107-2026-4001-8000-000000000022';
  v_var_tee_l uuid := 'e2e02107-2026-4001-8000-000000000023';
  v_var_low uuid := 'e2e02107-2026-4001-8000-000000000024';
  v_ship_std uuid := 'e2e02107-2026-4001-8000-000000000031';
  v_ship_pickup uuid := 'e2e02107-2026-4001-8000-000000000032';
  v_coupon_id uuid := 'e2e02107-2026-4001-8000-000000000041';
  v_cat_id uuid := 'e2e02107-2026-4001-8000-000000000050';
  v_slug text := 'umtuba-e2e-20260721';
  v_name text := 'UMTUBA_E2E_20260721 Sandbox';
  v_seller uuid;
  v_buyer uuid;
  v_admin uuid;
  v_buyer2 uuid;
  v_gate integer;
  v_conflict_id uuid;
  v_seller_ok boolean;
  v_buyer_ok boolean;
  v_admin_ok boolean;
begin
  -- -------------------------------------------------------------------------
  -- ACCOUNT_BLOCKER: GUCs must point at real Auth users (no auth.users insert)
  -- -------------------------------------------------------------------------
  begin
    v_seller := nullif(current_setting('umtuba.e2e_seller_user_id', true), '')::uuid;
  exception when others then
    v_seller := null;
  end;
  begin
    v_buyer := nullif(current_setting('umtuba.e2e_buyer_user_id', true), '')::uuid;
  exception when others then
    v_buyer := null;
  end;
  begin
    v_admin := nullif(current_setting('umtuba.e2e_admin_user_id', true), '')::uuid;
  exception when others then
    v_admin := null;
  end;
  begin
    v_buyer2 := nullif(current_setting('umtuba.e2e_buyer2_user_id', true), '')::uuid;
  exception when others then
    v_buyer2 := null;
  end;

  if v_seller is null or v_buyer is null or v_admin is null then
    raise exception
      'ACCOUNT_BLOCKER: set umtuba.e2e_seller_user_id, umtuba.e2e_buyer_user_id, umtuba.e2e_admin_user_id via config.local.sql (real Auth UUIDs). Do not reuse personal gmails. Do not INSERT INTO auth.users.';
  end if;

  -- Linked `db query` runs as postgres with auth.uid()/auth.role() null.
  -- Lifecycle guards (verification/product) allow service_role or platform admin.
  -- Set transaction-local JWT claims so sandbox seed can create verified/active catalog
  -- without disabling triggers or touching non-sandbox rows.
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('request.jwt.claim.sub', v_admin::text, true);

  select exists(select 1 from auth.users u where u.id = v_seller) into v_seller_ok;
  select exists(select 1 from auth.users u where u.id = v_buyer) into v_buyer_ok;
  select exists(select 1 from auth.users u where u.id = v_admin) into v_admin_ok;

  if not v_seller_ok or not v_buyer_ok or not v_admin_ok then
    raise exception
      'ACCOUNT_BLOCKER: one or more configured E2E user ids are missing from auth.users (seller=% buyer=% admin=%). Create dedicated Auth accounts first; seed will not insert auth.users.',
      v_seller_ok, v_buyer_ok, v_admin_ok;
  end if;

  if v_buyer2 is not null then
    if not exists (select 1 from auth.users u where u.id = v_buyer2) then
      raise exception
        'ACCOUNT_BLOCKER: umtuba.e2e_buyer2_user_id is set but missing from auth.users (%)',
        v_buyer2;
    end if;
  end if;

  -- -------------------------------------------------------------------------
  -- SAFETY_ABORT: commerce confirm must stay OFF for sandbox seed
  -- -------------------------------------------------------------------------
  select public.store_commerce_config_value('commerce_confirm_enabled', 0)
    into v_gate;

  if v_gate is distinct from 0 then
    raise exception
      'SAFETY_ABORT: commerce_confirm_enabled=% (expected 0). Seed refuses to run while confirm gate is ON. Call admin_set_commerce_confirm_enabled(false) first.',
      v_gate;
  end if;

  -- -------------------------------------------------------------------------
  -- COLLISION: slug/name must not belong to another store
  -- -------------------------------------------------------------------------
  select s.id into v_conflict_id
  from public.stores s
  where (lower(s.slug) = lower(v_slug) or s.name = v_name)
    and s.id <> v_store_id
  limit 1;

  if v_conflict_id is not null then
    raise exception
      'COLLISION: store slug/name % / % already used by store id % (expected sandbox %)',
      v_slug, v_name, v_conflict_id, v_store_id;
  end if;

  -- -------------------------------------------------------------------------
  -- platform_admins (admin user); ON CONFLICT DO NOTHING
  -- -------------------------------------------------------------------------
  insert into public.platform_admins (user_id, note, created_by)
  values (
    v_admin,
    v_ns || ' sandbox admin',
    v_admin
  )
  on conflict (user_id) do nothing;

  -- -------------------------------------------------------------------------
  -- Sandbox primary category (required before activating products)
  -- -------------------------------------------------------------------------
  insert into public.product_categories (id, slug, name, status)
  values (
    v_cat_id,
    'umtuba-e2e-20260721',
    'UMTUBA_E2E_20260721 Category',
    'active'
  )
  on conflict (id) do update set
    slug = excluded.slug,
    name = excluded.name,
    status = 'active',
    updated_at = now();

  -- -------------------------------------------------------------------------
  -- seller_applications (columns from 20260802 + 20260810 wizard fields)
  -- -------------------------------------------------------------------------
  insert into public.seller_applications (
    id,
    user_id,
    status,
    proposed_store_name,
    proposed_store_slug,
    proposed_description,
    country_code,
    city,
    public_contact_email,
    default_currency,
    store_id,
    review_note,
    reviewed_at,
    proposed_tagline,
    store_template,
    wizard_step
  )
  values (
    v_app_id,
    v_seller,
    'approved',
    v_name,
    v_slug,
    v_ns || ' approved seller application for remote store E2E sandbox.',
    'US',
    'Sandbox City',
    'e2e-seller+20260721@example.com',
    'USD',
    null, -- store_id linked after stores insert (FK seller_applications_store_id_fkey)
    v_ns || ' seed-approved; do not use for production.',
    now(),
    v_ns || ' tagline',
    'general',
    6
  )
  on conflict (id) do update set
    user_id = excluded.user_id,
    status = 'approved',
    proposed_store_name = excluded.proposed_store_name,
    proposed_store_slug = excluded.proposed_store_slug,
    proposed_description = excluded.proposed_description,
    country_code = excluded.country_code,
    city = excluded.city,
    public_contact_email = excluded.public_contact_email,
    default_currency = excluded.default_currency,
    -- store_id set after stores upsert below
    review_note = excluded.review_note,
    reviewed_at = excluded.reviewed_at,
    proposed_tagline = excluded.proposed_tagline,
    store_template = excluded.store_template,
    wizard_step = excluded.wizard_step,
    updated_at = now();

  -- -------------------------------------------------------------------------
  -- stores + store_members owner (must precede seller_applications.store_id link)
  -- -------------------------------------------------------------------------
  insert into public.stores (
    id,
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
    store_template
  )
  values (
    v_store_id,
    v_seller,
    v_slug,
    v_name,
    v_ns || ' remote sandbox store. Catalog only until confirm gate is intentionally enabled.',
    'active',
    'verified',
    'USD',
    'US',
    'Sandbox City',
    'e2e-seller+20260721@example.com',
    'general'
  )
  on conflict (id) do update set
    owner_user_id = excluded.owner_user_id,
    slug = excluded.slug,
    name = excluded.name,
    description = excluded.description,
    status = 'active',
    verification_status = 'verified',
    default_currency = excluded.default_currency,
    country_code = excluded.country_code,
    city = excluded.city,
    public_contact_email = excluded.public_contact_email,
    store_template = excluded.store_template,
    updated_at = now();

  -- Keep application linked after store upsert
  update public.seller_applications
  set store_id = v_store_id,
      updated_at = now()
  where id = v_app_id;

  insert into public.store_members (store_id, user_id, role, status)
  values (v_store_id, v_seller, 'owner', 'active')
  on conflict (store_id, user_id) do update set
    role = 'owner',
    status = 'active';

  -- -------------------------------------------------------------------------
  -- Products: draft+pending with category, primary link, then activate
  -- (enforce_active_product_primary_category needs primary_category_id AND
  --  exactly one primary product_category_links row before status=active)
  -- -------------------------------------------------------------------------
  insert into public.store_products (
    id, store_id, slug, title, short_description, description,
    product_type, status, moderation_status, primary_category_id,
    created_by, published_at
  )
  values
    (
      v_prod_simple, v_store_id, 'e2e-simple-mug',
      v_ns || ' Simple Mug',
      'Sandbox simple product',
      v_ns || ' simple physical mug for catalog/checkout probes.',
      'physical', 'draft', 'pending', v_cat_id, v_seller, null
    ),
    (
      v_prod_tee, v_store_id, 'e2e-variant-tee',
      v_ns || ' Variant Tee',
      'Sandbox variant product',
      v_ns || ' tee with S/L variants.',
      'physical', 'draft', 'pending', v_cat_id, v_seller, null
    ),
    (
      v_prod_low, v_store_id, 'e2e-low-stock',
      v_ns || ' Low Stock Item',
      'Sandbox low-stock product',
      v_ns || ' low inventory for reservation edge cases.',
      'physical', 'draft', 'pending', v_cat_id, v_seller, null
    )
  on conflict (id) do update set
    store_id = excluded.store_id,
    slug = excluded.slug,
    title = excluded.title,
    short_description = excluded.short_description,
    description = excluded.description,
    product_type = excluded.product_type,
    primary_category_id = excluded.primary_category_id,
    created_by = excluded.created_by,
    updated_at = now();

  insert into public.product_category_links (product_id, category_id, is_primary)
  values
    (v_prod_simple, v_cat_id, true),
    (v_prod_tee, v_cat_id, true),
    (v_prod_low, v_cat_id, true)
  on conflict (product_id, category_id) do update set
    is_primary = true;

  update public.store_products
  set status = 'active',
      moderation_status = 'approved',
      published_at = coalesce(published_at, now()),
      updated_at = now()
  where id in (v_prod_simple, v_prod_tee, v_prod_low)
    and store_id = v_store_id;

  -- -------------------------------------------------------------------------
  -- Variants (SKU marker UMTUBA_E2E_20260721-*)
  -- -------------------------------------------------------------------------
  insert into public.product_variants (
    id, product_id, sku, title, option_values, status
  )
  values
    (
      v_var_simple, v_prod_simple, 'UMTUBA_E2E_20260721-MUG', 'Default',
      '{}'::jsonb, 'active'
    ),
    (
      v_var_tee_s, v_prod_tee, 'UMTUBA_E2E_20260721-TEE-S', 'Size S',
      '{"size":"S"}'::jsonb, 'active'
    ),
    (
      v_var_tee_l, v_prod_tee, 'UMTUBA_E2E_20260721-TEE-L', 'Size L',
      '{"size":"L"}'::jsonb, 'active'
    ),
    (
      v_var_low, v_prod_low, 'UMTUBA_E2E_20260721-LOW', 'Default',
      '{}'::jsonb, 'active'
    )
  on conflict (id) do update set
    product_id = excluded.product_id,
    sku = excluded.sku,
    title = excluded.title,
    option_values = excluded.option_values,
    status = 'active',
    updated_at = now();

  -- -------------------------------------------------------------------------
  -- Prices USD (modest amounts, minor units)
  -- product_prices has no unique(variant_id); upsert via update-then-insert.
  -- -------------------------------------------------------------------------
  update public.product_prices p
  set amount_minor = case p.variant_id
        when v_var_simple then 1299
        when v_var_tee_s then 2499
        when v_var_tee_l then 2499
        when v_var_low then 999
      end,
      currency = 'USD',
      status = 'active',
      updated_at = now()
  where p.variant_id in (v_var_simple, v_var_tee_s, v_var_tee_l, v_var_low)
    and p.status = 'active'
    and p.currency = 'USD';

  insert into public.product_prices (variant_id, currency, amount_minor, status)
  select v.variant_id, 'USD', v.amount_minor, 'active'
  from (
    values
      (v_var_simple, 1299),
      (v_var_tee_s, 2499),
      (v_var_tee_l, 2499),
      (v_var_low, 999)
  ) as v(variant_id, amount_minor)
  where not exists (
    select 1
    from public.product_prices pp
    where pp.variant_id = v.variant_id
      and pp.status = 'active'
      and pp.currency = 'USD'
  );

  -- -------------------------------------------------------------------------
  -- Inventory: mug 100, tee 50/50, low-stock 2; reserved=0
  -- -------------------------------------------------------------------------
  insert into public.product_inventory (
    variant_id, warehouse_key, on_hand, reserved, safety_stock, allow_backorder
  )
  values
    (v_var_simple, 'default', 100, 0, 0, false),
    (v_var_tee_s, 'default', 50, 0, 0, false),
    (v_var_tee_l, 'default', 50, 0, 0, false),
    (v_var_low, 'default', 2, 0, 0, false)
  on conflict (variant_id, warehouse_key) do update set
    on_hand = excluded.on_hand,
    reserved = 0,
    safety_stock = 0,
    allow_backorder = false,
    updated_at = now();

  -- -------------------------------------------------------------------------
  -- Shipping: standard fee 500 + pickup 0; service_type / provider_key set
  -- -------------------------------------------------------------------------
  insert into public.store_shipping_methods (
    id, store_id, code, name, fee_minor, currency,
    estimate_text, is_active, sort_order, service_type, provider_key
  )
  values
    (
      v_ship_std, v_store_id, 'standard', 'Standard shipping',
      500, 'USD', '3-5 business days', true, 10, 'standard', 'manual'
    ),
    (
      v_ship_pickup, v_store_id, 'pickup', 'Store pickup',
      0, 'USD', 'Ready same day', true, 20, 'pickup', 'manual'
    )
  on conflict (id) do update set
    store_id = excluded.store_id,
    code = excluded.code,
    name = excluded.name,
    fee_minor = excluded.fee_minor,
    currency = excluded.currency,
    estimate_text = excluded.estimate_text,
    is_active = true,
    sort_order = excluded.sort_order,
    service_type = excluded.service_type,
    provider_key = excluded.provider_key,
    updated_at = now();

  -- -------------------------------------------------------------------------
  -- Tax config: enabled, rate 0
  -- -------------------------------------------------------------------------
  insert into public.store_tax_configs (
    store_id, enabled, inclusive, rate_bps, country_code
  )
  values (v_store_id, true, false, 0, 'US')
  on conflict (store_id) do update set
    enabled = true,
    inclusive = false,
    rate_bps = 0,
    country_code = 'US',
    updated_at = now();

  -- -------------------------------------------------------------------------
  -- Coupon: E2E20260721 percent 10% store-scoped
  -- -------------------------------------------------------------------------
  insert into public.store_coupons (
    id, store_id, code, status, discount_type, percent_bps,
    min_subtotal_minor, usage_count
  )
  values (
    v_coupon_id, v_store_id, 'E2E20260721', 'active', 'percent', 1000,
    0, 0
  )
  on conflict (id) do update set
    store_id = excluded.store_id,
    code = excluded.code,
    status = 'active',
    discount_type = 'percent',
    percent_bps = 1000,
    fixed_amount_minor = null,
    currency = null,
    min_subtotal_minor = 0,
    updated_at = now();

  raise notice
    'SEED_OK namespace=% store=% seller=% buyer=% admin=% buyer2=% gate=0',
    v_ns, v_store_id, v_seller, v_buyer, v_admin, v_buyer2;
end;
$$;
