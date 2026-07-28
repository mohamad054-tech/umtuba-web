-- UMTUBA Store Marketplace Listing Checkout Alignment V1
-- Additive follow-up to 20260869. Local file only; do not remote-apply in this handoff.
--
-- Depends on:
--   * 20260869 store_seller_listings + store_listing_allows_seller_sale
--   * Latest create_store_checkout_quote body from 20260815
--   * Latest create_store_order_foundation_core body from 20260812
--   * Latest confirm_store_checkout_quote body from 20260819
--   * create_store_order_foundation wrapper remains 20260820 (reservation idempotency);
--     marketplace stamping lives in create_store_order_foundation_core.
--
-- Changes:
--   1) Quote / confirm cart loops join stores on ci.store_id (seller/cart store).
--   2) Cross-store cart lines require store_listing_allows_seller_sale(...).
--   3) items_json includes seller_listing_id when present / selected.
--   4) Order core allows product_store_id <> p_store_id when listing allows sale;
--      stamps marketplace_source_type, supplier_store_id, seller_listing_id.

create or replace function public.create_store_checkout_quote(
  p_address jsonb,
  p_billing jsonb,
  p_shipping_selections jsonb,
  p_coupon_code text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cart_row public.carts%rowtype;
  addr jsonb;
  billing jsonb;
  idem text;
  existing_id uuid;
  quote_id uuid;
  currency_code text;
  selections jsonb := coalesce(p_shipping_selections, '{}'::jsonb);
  coupon_in text := nullif(btrim(coalesce(p_coupon_code, '')), '');
  groups jsonb := '[]'::jsonb;
  store_ids uuid[];
  sid uuid;
  store_subtotal bigint;
  store_discount bigint;
  store_tax bigint;
  store_shipping bigint;
  store_grand bigint;
  tax_incl boolean;
  tax_rate integer;
  tax_snap jsonb;
  ship record;
  coupon record;
  disc_snap jsonb;
  items_json jsonb;
  line record;
  inv_available integer;
  inv_on_hand integer;
  inv_reserved integer;
  inv_safety integer;
  inv_backorder boolean;
  payload jsonb;
  expires_at timestamptz := timezone('utc', now()) + interval '15 minutes';
  coupon_applied boolean := false;
  product_ids uuid[] := '{}';
  category_ids uuid[] := '{}';
  buyer_country text;
  buyer_region text;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  idem := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  if idem is null or char_length(idem) < 8 or char_length(idem) > 128 then
    raise exception 'idempotency_key must be 8-128 characters';
  end if;

  select q.id into existing_id
  from public.checkout_quotes q
  where q.idempotency_key = idem
  for update;
  if existing_id is not null then
    -- Only open, non-expired quotes are reusable under the same key.
    if exists (
      select 1 from public.checkout_quotes q
      where q.id = existing_id
        and q.status = 'open'
        and q.expires_at > timezone('utc', now())
    ) then
      return (
        select jsonb_build_object(
          'quote_id', q.id,
          'expires_at', q.expires_at,
          'status', q.status,
          'payload', q.quote_payload,
          'reused', true
        )
        from public.checkout_quotes q where q.id = existing_id
      );
    end if;
    if exists (
      select 1 from public.checkout_quotes q
      where q.id = existing_id and q.status = 'open'
        and q.expires_at <= timezone('utc', now())
    ) then
      update public.checkout_quotes set status = 'expired' where id = existing_id;
    end if;
    raise exception 'Checkout quote idempotency key already used';
  end if;

  addr := public.checkout_normalize_address(p_address);
  buyer_country := nullif(btrim(coalesce(addr->>'country_code', '')), '');
  buyer_region := nullif(btrim(coalesce(addr->>'region', '')), '');
  billing := public.checkout_normalize_address(coalesce(p_billing, p_address));

  select * into cart_row
  from public.carts c
  where c.user_id = uid and c.status = 'active'
  order by c.updated_at desc
  limit 1;

  if not found then
    raise exception 'Cart is empty';
  end if;

  currency_code := cart_row.currency;

  select coalesce(array_agg(distinct ci.store_id), '{}'::uuid[])
    into store_ids
  from public.cart_items ci
  where ci.cart_id = cart_row.id;

  if store_ids is null or coalesce(array_length(store_ids, 1), 0) < 1 then
    raise exception 'Cart is empty';
  end if;

  foreach sid in array store_ids
  loop
    store_subtotal := 0;
    items_json := '[]'::jsonb;
    product_ids := '{}';
    category_ids := '{}';

    for line in
      select
        ci.quantity,
        ci.variant_id,
        ci.store_id,
        ci.seller_listing_id,
        p.id as product_id,
        p.store_id as product_store_id,
        p.primary_category_id as category_id,
        p.status as product_status,
        p.moderation_status,
        s.status as store_status,
        v.status as variant_status,
        v.sku,
        p.title as product_title,
        v.title as variant_title,
        pp.amount_minor as unit_price,
        pp.currency as price_currency,
        pp.status as price_status,
        coalesce(inv.on_hand, 0) as on_hand,
        coalesce(inv.reserved, 0) as reserved,
        coalesce(inv.safety_stock, 0) as safety_stock,
        coalesce(inv.allow_backorder, false) as allow_backorder
      from public.cart_items ci
      join public.product_variants v on v.id = ci.variant_id
      join public.store_products p on p.id = v.product_id
      join public.stores s on s.id = ci.store_id
      left join lateral (
        select pp1.amount_minor, pp1.currency, pp1.status
        from public.product_prices pp1
        where pp1.variant_id = v.id
          and pp1.currency = currency_code
          and pp1.status = 'active'
          and (pp1.starts_at is null or pp1.starts_at <= timezone('utc', now()))
          and (pp1.ends_at is null or pp1.ends_at > timezone('utc', now()))
        order by pp1.updated_at desc, pp1.created_at desc
        limit 1
      ) pp on true
      left join public.product_inventory inv
        on inv.variant_id = v.id and inv.warehouse_key = 'default'
      where ci.cart_id = cart_row.id and ci.store_id = sid
    loop
      if line.store_status is distinct from 'active' then
        raise exception 'Store is not active';
      end if;
      -- Owned catalog: product.store_id = cart line store.
      -- Marketplace: product belongs to supplier; require active seller listing.
      if line.product_store_id is distinct from line.store_id then
        if not public.store_listing_allows_seller_sale(
          line.store_id,
          line.product_id,
          line.seller_listing_id
        ) then
          raise exception 'Marketplace listing is not active for this cart line';
        end if;
      end if;
      if line.product_status is distinct from 'active'
         or line.moderation_status is distinct from 'approved' then
        raise exception 'Product is not available for checkout';
      end if;
      if line.variant_status is distinct from 'active' then
        raise exception 'Variant is not available for checkout';
      end if;
      if line.unit_price is null or line.price_status is distinct from 'active' then
        raise exception 'Active price not found for cart item';
      end if;
      if line.price_currency is distinct from currency_code then
        raise exception 'Currency mismatch in cart';
      end if;

      -- Serialize inventory checks against concurrent checkout confirmations.
      select
        coalesce(inv.on_hand, 0),
        coalesce(inv.reserved, 0),
        coalesce(inv.safety_stock, 0),
        coalesce(inv.allow_backorder, false)
      into
        inv_on_hand,
        inv_reserved,
        inv_safety,
        inv_backorder
      from public.product_inventory inv
      where inv.variant_id = line.variant_id
        and inv.warehouse_key = 'default'
      for update;

      if not found then
        inv_on_hand := 0;
        inv_reserved := 0;
        inv_safety := 0;
        inv_backorder := false;
      end if;

      inv_available := greatest(inv_on_hand - inv_reserved - inv_safety, 0);
      if not inv_backorder and line.quantity > inv_available then
        raise exception 'Insufficient inventory for checkout';
      end if;

      store_subtotal := store_subtotal + (line.unit_price * line.quantity);
      product_ids := array_append(product_ids, line.product_id);
      if line.category_id is not null then
        category_ids := array_append(category_ids, line.category_id);
      end if;
      items_json := items_json || jsonb_build_array(jsonb_build_object(
        'product_id', line.product_id,
        'variant_id', line.variant_id,
        'quantity', line.quantity,
        'seller_listing_id', line.seller_listing_id
      ));
    end loop;

    if jsonb_array_length(items_json) < 1 then
      raise exception 'Store group has no items';
    end if;

    store_discount := 0;
    disc_snap := null;
    -- At most one coupon redemption per checkout quote (first eligible store).
    if coupon_in is not null and not coupon_applied then
      select * into coupon from public.checkout_validate_coupon(
        coupon_in, sid, uid, currency_code, store_subtotal,
        product_ids, category_ids, buyer_country, buyer_region
      );
      if found then
        store_discount := coupon.discount_minor;
        disc_snap := coupon.snapshot;
        coupon_applied := true;
      end if;
    end if;

    select * into ship from public.checkout_compute_shipping_fee(
      sid,
      currency_code,
      store_subtotal - store_discount,
      coalesce(selections->>sid::text, selections->>'default', 'standard'),
      disc_snap
    );
    store_shipping := ship.fee_minor;

    select c.inclusive, c.rate_bps, c.tax_minor, c.snapshot
      into tax_incl, tax_rate, store_tax, tax_snap
      from public.checkout_compute_tax(sid, store_subtotal - store_discount) as c;

    -- Exclusive: add tax. Inclusive: tax is display-only portion already in merchandise.
    if tax_incl then
      store_grand := store_subtotal - store_discount + store_shipping;
    else
      store_grand := store_subtotal - store_discount + store_tax + store_shipping;
    end if;
    if store_grand < 0 then
      raise exception 'Grand total cannot be negative';
    end if;

    groups := groups || jsonb_build_array(jsonb_build_object(
      'store_id', sid,
      'items', items_json,
      'subtotal_minor', store_subtotal,
      'discount_total_minor', store_discount,
      'tax_total_minor', store_tax,
      'shipping_total_minor', store_shipping,
      'grand_total_minor', store_grand,
      'shipping_method_code', ship.method_code,
      'shipping_method_name', ship.method_name,
      'shipping_estimate_text', ship.estimate_text,
      'tax_snapshot', tax_snap,
      'discount_snapshot', disc_snap,
      'tax_inclusive', tax_incl
    ));
  end loop;

  payload := jsonb_build_object(
    'currency', currency_code,
    'cart_id', cart_row.id,
    'groups', groups,
    'coupon_code', coupon_in,
    'payment_note',
      'Payment collection is not enabled yet. Placing an order records a pending-payment order only.'
  );

  insert into public.checkout_quotes (
    buyer_id, cart_id, currency, status, idempotency_key, expires_at,
    address_snapshot, billing_contact_snapshot, coupon_code,
    shipping_selections, quote_payload
  ) values (
    uid, cart_row.id, currency_code, 'open', idem, expires_at,
    addr, billing, coupon_in, selections, payload
  ) returning id into quote_id;

  return jsonb_build_object(
    'quote_id', quote_id,
    'expires_at', expires_at,
    'status', 'open',
    'payload', payload,
    'reused', false
  );
end;
$$;

create or replace function public.create_store_order_foundation_core(
  p_buyer_id uuid,
  p_store_id uuid,
  p_currency text,
  p_items jsonb,
  p_discount_total_minor bigint default 0,
  p_tax_total_minor bigint default 0,
  p_shipping_total_minor bigint default 0,
  p_notes text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  existing_order_id uuid;
  store_owner uuid;
  store_status text;
  currency_code text;
  idem_key text;
  item jsonb;
  prepared jsonb;
  prepared_items jsonb := '[]'::jsonb;
  item_product_id uuid;
  item_variant_id uuid;
  item_qty integer;
  item_unit bigint;
  item_line_total bigint;
  item_sku text;
  item_title text;
  item_variant_title text;
  item_snapshot jsonb;
  product_slug text;
  product_type text;
  product_store_id uuid;
  product_status text;
  product_moderation text;
  item_seller_listing_id uuid;
  line_marketplace_source text;
  line_supplier_store_id uuid;
  computed_subtotal bigint := 0;
  computed_grand bigint;
  lines_sum bigint;
  order_number_value text;
  insert_attempts integer := 0;
  snapshotted_at timestamptz := timezone('utc', now());
begin
  -- Core create: no role gate. EXECUTE revoked from all roles; only SECURITY DEFINER
  -- siblings owned by the same role (service_role wrapper + checkout confirm) may call it.

  if p_buyer_id is null then
    raise exception 'buyer_id is required';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_buyer_id) then
    raise exception 'buyer_id is invalid';
  end if;

  currency_code := upper(btrim(coalesce(p_currency, '')));
  if currency_code !~ '^[A-Z]{3}$' then
    raise exception 'currency must be a 3-letter ISO code';
  end if;

  if p_discount_total_minor is null or p_discount_total_minor < 0
     or p_tax_total_minor is null or p_tax_total_minor < 0
     or p_shipping_total_minor is null or p_shipping_total_minor < 0 then
    raise exception 'Order money amounts must be non-negative integers';
  end if;

  if p_items is null or jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) < 1 then
    raise exception 'At least one order item is required';
  end if;

  -- Reject client-supplied priced/snapshot/total fields on line payloads.
  if exists (
    select 1
    from jsonb_array_elements(p_items) as e(value)
    where e.value ? 'unit_price_minor'
       or e.value ? 'total_price_minor'
       or e.value ? 'sku_snapshot'
       or e.value ? 'title_snapshot'
       or e.value ? 'variant_title_snapshot'
       or e.value ? 'product_snapshot'
       or e.value ? 'seller_user_id'
       or e.value ? 'marketplace_source_type'
       or e.value ? 'supplier_store_id'
       or e.value ? 'subtotal_minor'
       or e.value ? 'grand_total_minor'
  ) then
    raise exception
      'Order item prices and snapshots must be derived server-side; do not pass priced or snapshot fields';
  end if;

  idem_key := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  if idem_key is not null then
    if char_length(idem_key) < 8 or char_length(idem_key) > 128 then
      raise exception 'idempotency_key length must be between 8 and 128';
    end if;

    select o.id into existing_order_id
    from public.orders o
    where o.idempotency_key = idem_key;

    if existing_order_id is not null then
      return existing_order_id;
    end if;
  end if;

  select s.owner_user_id, s.status
    into store_owner, store_status
  from public.stores s
  where s.id = p_store_id;

  if store_owner is null then
    raise exception 'Store not found';
  end if;
  if store_status is distinct from 'active' then
    raise exception 'Store must be active to create orders';
  end if;

  -- Single authoritative pass: freeze DB-derived prices/snapshots before insert
  -- so header subtotal cannot drift from line totals under concurrent catalog edits.
  for item in
    select value from jsonb_array_elements(p_items)
  loop
    begin
      item_product_id := nullif(item->>'product_id', '')::uuid;
      item_variant_id := nullif(item->>'variant_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Order item product_id/variant_id must be UUIDs';
    end;

    begin
      item_qty := (item->>'quantity')::integer;
    exception when others then
      raise exception 'Order item quantity must be an integer';
    end;

    if item_product_id is null or item_variant_id is null then
      raise exception 'Order item product_id and variant_id are required';
    end if;
    if item_qty is null or item_qty < 1 or item_qty > 9999 then
      raise exception 'Order item quantity must be between 1 and 9999';
    end if;

    select
      p.store_id,
      p.slug,
      p.title,
      p.product_type,
      p.status,
      p.moderation_status
      into
        product_store_id,
        product_slug,
        item_title,
        product_type,
        product_status,
        product_moderation
    from public.store_products p
    where p.id = item_product_id;

    if product_store_id is null then
      raise exception 'Product not found';
    end if;

    begin
      item_seller_listing_id := nullif(item->>'seller_listing_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Order item seller_listing_id must be a UUID';
    end;

    line_marketplace_source := null;
    line_supplier_store_id := null;

    if product_store_id = p_store_id then
      -- Owned catalog path.
      if item_seller_listing_id is not null then
        raise exception 'Owned order items must not reference a seller listing';
      end if;
      line_marketplace_source := 'owned';
    else
      -- Marketplace: product belongs to supplier; order store is seller.
      if not public.store_listing_allows_seller_sale(
        p_store_id,
        item_product_id,
        item_seller_listing_id
      ) then
        raise exception 'Marketplace listing is not active for this cart line';
      end if;

      line_marketplace_source := 'supplier_listing';
      line_supplier_store_id := product_store_id;

      -- Stamp concrete listing id (required by order_items alignment trigger).
      if item_seller_listing_id is null then
        select l.id into item_seller_listing_id
        from public.store_seller_listings l
        where l.seller_store_id = p_store_id
          and l.source_product_id = item_product_id
          and l.status = 'active'
        order by l.updated_at desc, l.created_at desc
        limit 1;
      end if;

      if item_seller_listing_id is null then
        raise exception 'Marketplace listing is not active for this cart line';
      end if;
    end if;

    if product_status is distinct from 'active'
       or product_moderation is distinct from 'approved' then
      raise exception 'Product must be active and approved to order';
    end if;

    select v.sku, v.title
      into item_sku, item_variant_title
    from public.product_variants v
    where v.id = item_variant_id
      and v.product_id = item_product_id
      and v.status = 'active';

    if item_sku is null then
      raise exception 'Order item variant not found or not active for product';
    end if;

    item_unit := public.store_order_active_unit_price_minor(
      item_variant_id,
      currency_code
    );

    if item_unit is null then
      raise exception 'No active price for variant in requested currency';
    end if;

    if item_unit > (9223372036854775807::bigint / item_qty) then
      raise exception 'Order item line total overflow';
    end if;

    item_line_total := item_unit * item_qty;
    computed_subtotal := computed_subtotal + item_line_total;

    item_snapshot := jsonb_build_object(
      'product_id', item_product_id,
      'store_id', p_store_id,
      'slug', product_slug,
      'title', item_title,
      'product_type', product_type,
      'sku', item_sku,
      'variant_id', item_variant_id,
      'variant_title', item_variant_title,
      'unit_price_minor', item_unit,
      'currency', currency_code,
      'snapshotted_at', snapshotted_at
    );

    prepared_items := prepared_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', item_product_id,
        'variant_id', item_variant_id,
        'quantity', item_qty,
        'unit_price_minor', item_unit,
        'total_price_minor', item_line_total,
        'sku_snapshot', item_sku,
        'title_snapshot', item_title,
        'variant_title_snapshot', item_variant_title,
        'product_snapshot', item_snapshot,
        'seller_listing_id', item_seller_listing_id,
        'marketplace_source_type', line_marketplace_source,
        'supplier_store_id', line_supplier_store_id
      )
    );
  end loop;

  if p_discount_total_minor > computed_subtotal then
    raise exception 'discount_total cannot exceed subtotal';
  end if;

  computed_grand :=
    computed_subtotal
    - p_discount_total_minor
    + p_tax_total_minor
    + p_shipping_total_minor;

  if computed_grand < 0 then
    raise exception 'Grand total cannot be negative';
  end if;

  -- Insert header with order_number collision retry (unique index is source of truth).
  loop
    insert_attempts := insert_attempts + 1;
    order_number_value := public.next_store_order_number();

    begin
      insert into public.orders (
        buyer_id,
        store_id,
        order_number,
        idempotency_key,
        status,
        payment_status,
        fulfillment_status,
        subtotal_minor,
        discount_total_minor,
        tax_total_minor,
        shipping_total_minor,
        grand_total_minor,
        currency,
        notes
      ) values (
        p_buyer_id,
        p_store_id,
        order_number_value,
        idem_key,
        'pending',
        'pending',
        'unfulfilled',
        computed_subtotal,
        p_discount_total_minor,
        p_tax_total_minor,
        p_shipping_total_minor,
        computed_grand,
        currency_code,
        nullif(btrim(coalesce(p_notes, '')), '')
      )
      returning id into new_order_id;

      exit;
    exception
      when unique_violation then
        -- Idempotent retry won the race: return the existing row.
        if idem_key is not null then
          select o.id into existing_order_id
          from public.orders o
          where o.idempotency_key = idem_key;
          if existing_order_id is not null then
            return existing_order_id;
          end if;
        end if;

        if insert_attempts >= 20 then
          raise exception 'Unable to allocate unique order number';
        end if;
        -- else retry (order_number collision)
    end;
  end loop;

  -- Insert frozen prepared lines (no second catalog price lookup).
  for prepared in
    select value from jsonb_array_elements(prepared_items)
  loop
    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      seller_user_id,
      quantity,
      unit_price_minor,
      total_price_minor,
      product_snapshot,
      sku_snapshot,
      title_snapshot,
      variant_title_snapshot,
      marketplace_source_type,
      supplier_store_id,
      seller_listing_id
    ) values (
      new_order_id,
      (prepared->>'product_id')::uuid,
      (prepared->>'variant_id')::uuid,
      store_owner,
      (prepared->>'quantity')::integer,
      (prepared->>'unit_price_minor')::bigint,
      (prepared->>'total_price_minor')::bigint,
      prepared->'product_snapshot',
      prepared->>'sku_snapshot',
      prepared->>'title_snapshot',
      nullif(prepared->>'variant_title_snapshot', ''),
      nullif(prepared->>'marketplace_source_type', ''),
      nullif(prepared->>'supplier_store_id', '')::uuid,
      nullif(prepared->>'seller_listing_id', '')::uuid
    );
  end loop;

  select coalesce(sum(oi.total_price_minor), 0)
    into lines_sum
  from public.order_items oi
  where oi.order_id = new_order_id;

  if lines_sum is distinct from computed_subtotal then
    raise exception 'Order line totals do not match computed subtotal';
  end if;

  return new_order_id;
end;
$$;

create or replace function public.confirm_store_checkout_quote(
  p_quote_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  q public.checkout_quotes%rowtype;
  grp jsonb;
  order_id uuid;
  orders_out jsonb := '[]'::jsonb;
  order_number text;
  items jsonb;
  ship_addr jsonb;
  bill_addr jsonb;
  coupon_id uuid;
  disc_snap jsonb;
  sid uuid;
  store_subtotal bigint;
  store_discount bigint;
  store_tax bigint;
  store_shipping bigint;
  store_grand bigint;
  tax_incl boolean;
  tax_rate integer;
  tax_snap jsonb;
  ship record;
  coupon record;
  items_json jsonb;
  line record;
  inv_available integer;
  inv_on_hand integer;
  inv_reserved integer;
  inv_safety integer;
  inv_backorder boolean;
  method_code text;
  quoted_subtotal bigint;
  quoted_grand bigint;
  coupon_applied boolean := false;
  product_ids uuid[] := '{}';
  category_ids uuid[] := '{}';
  buyer_country text;
  buyer_region text;
  session_id uuid;
  res_idem text;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  perform public.assert_store_commerce_confirm_allowed();

  select * into q from public.checkout_quotes where id = p_quote_id for update;
  if not found then
    raise exception 'Checkout quote not found';
  end if;
  if q.buyer_id is distinct from uid then
    raise exception 'Checkout quote access denied';
  end if;
  if q.status = 'confirmed' then
    return jsonb_build_object(
      'status', 'confirmed',
      'orders', coalesce(q.quote_payload->'orders', '[]'::jsonb),
      'checkout_session_id', q.checkout_session_id,
      'payment_note', coalesce(
        q.quote_payload->>'payment_note',
        'Payment collection is not enabled yet. Your order is recorded as pending payment.'
      ),
      'idempotent', true
    );
  end if;
  if q.status is distinct from 'open' then
    raise exception 'Checkout quote is not open';
  end if;
  if q.expires_at <= timezone('utc', now()) then
    update public.checkout_quotes set status = 'expired' where id = q.id;
    raise exception 'Checkout quote has expired';
  end if;

  if not exists (
    select 1 from public.carts c
    where c.id = q.cart_id and c.user_id = uid and c.status = 'active'
  ) then
    raise exception 'Cart is no longer active for this quote';
  end if;

  -- One server-side session per confirmation attempt; reuse on in-txn retries only.
  session_id := coalesce(q.checkout_session_id, gen_random_uuid());
  if q.checkout_session_id is null then
    update public.checkout_quotes
      set checkout_session_id = session_id,
          updated_at = timezone('utc', now())
    where id = q.id;
  end if;

  ship_addr := q.address_snapshot;
  buyer_country := nullif(btrim(coalesce(ship_addr->>'country_code', '')), '');
  buyer_region := nullif(btrim(coalesce(ship_addr->>'region', '')), '');
  bill_addr := q.billing_contact_snapshot;

  for grp in select value from jsonb_array_elements(q.quote_payload->'groups')
  loop
    sid := (grp->>'store_id')::uuid;
    store_subtotal := 0;
    items_json := '[]'::jsonb;
    product_ids := '{}';
    category_ids := '{}';
    method_code := coalesce(
      q.shipping_selections->>sid::text,
      grp->>'shipping_method_code',
      'standard'
    );

    for line in
      select
        ci.quantity,
        ci.variant_id,
        ci.store_id,
        ci.seller_listing_id,
        p.id as product_id,
        p.store_id as product_store_id,
        p.primary_category_id as category_id,
        p.status as product_status,
        p.moderation_status,
        s.status as store_status,
        v.status as variant_status,
        pp.amount_minor as unit_price,
        pp.currency as price_currency,
        pp.status as price_status,
        coalesce(inv.on_hand, 0) as on_hand,
        coalesce(inv.reserved, 0) as reserved,
        coalesce(inv.safety_stock, 0) as safety_stock,
        coalesce(inv.allow_backorder, false) as allow_backorder
      from public.cart_items ci
      join public.product_variants v on v.id = ci.variant_id
      join public.store_products p on p.id = v.product_id
      join public.stores s on s.id = ci.store_id
      left join lateral (
        select pp1.amount_minor, pp1.currency, pp1.status
        from public.product_prices pp1
        where pp1.variant_id = v.id
          and pp1.currency = q.currency
          and pp1.status = 'active'
          and (pp1.starts_at is null or pp1.starts_at <= timezone('utc', now()))
          and (pp1.ends_at is null or pp1.ends_at > timezone('utc', now()))
        order by pp1.updated_at desc, pp1.created_at desc
        limit 1
      ) pp on true
      left join public.product_inventory inv
        on inv.variant_id = v.id and inv.warehouse_key = 'default'
      where ci.cart_id = q.cart_id and ci.store_id = sid
    loop
      if line.store_status is distinct from 'active' then
        raise exception 'Store is not active';
      end if;
      if line.product_store_id is distinct from line.store_id then
        if not public.store_listing_allows_seller_sale(
          line.store_id,
          line.product_id,
          line.seller_listing_id
        ) then
          raise exception 'Marketplace listing is not active for this cart line';
        end if;
      end if;
      if line.product_status is distinct from 'active'
         or line.moderation_status is distinct from 'approved' then
        raise exception 'Product is not available for checkout';
      end if;
      if line.variant_status is distinct from 'active' then
        raise exception 'Variant is not available for checkout';
      end if;
      if line.unit_price is null or line.price_status is distinct from 'active' then
        raise exception 'Active price not found for cart item';
      end if;
      if line.price_currency is distinct from q.currency then
        raise exception 'Currency mismatch in cart';
      end if;

      select
        coalesce(inv.on_hand, 0),
        coalesce(inv.reserved, 0),
        coalesce(inv.safety_stock, 0),
        coalesce(inv.allow_backorder, false)
      into
        inv_on_hand,
        inv_reserved,
        inv_safety,
        inv_backorder
      from public.product_inventory inv
      where inv.variant_id = line.variant_id
        and inv.warehouse_key = 'default'
      for update;

      if not found then
        inv_on_hand := 0;
        inv_reserved := 0;
        inv_safety := 0;
        inv_backorder := false;
      end if;

      inv_available := greatest(inv_on_hand - inv_reserved - inv_safety, 0);
      if not inv_backorder and line.quantity > inv_available then
        raise exception 'Insufficient inventory for checkout';
      end if;

      store_subtotal := store_subtotal + (line.unit_price * line.quantity);
      product_ids := array_append(product_ids, line.product_id);
      if line.category_id is not null then
        category_ids := array_append(category_ids, line.category_id);
      end if;
      items_json := items_json || jsonb_build_array(jsonb_build_object(
        'product_id', line.product_id,
        'variant_id', line.variant_id,
        'quantity', line.quantity,
        'seller_listing_id', line.seller_listing_id
      ));
    end loop;

    if jsonb_array_length(items_json) < 1 then
      raise exception 'Store group has no items';
    end if;

    quoted_subtotal := coalesce((grp->>'subtotal_minor')::bigint, -1);
    if store_subtotal is distinct from quoted_subtotal then
      raise exception 'Catalog prices changed since quote; refresh checkout';
    end if;

    store_discount := 0;
    disc_snap := null;
    if q.coupon_code is not null and not coupon_applied then
      select * into coupon from public.checkout_validate_coupon(
        q.coupon_code, sid, uid, q.currency, store_subtotal,
        product_ids, category_ids, buyer_country, buyer_region
      );
      if found then
        store_discount := coupon.discount_minor;
        disc_snap := coupon.snapshot;
        coupon_applied := true;
      end if;
    end if;
    if store_discount is distinct from coalesce((grp->>'discount_total_minor')::bigint, 0) then
      raise exception 'Coupon totals changed since quote; refresh checkout';
    end if;

    select * into ship from public.checkout_compute_shipping_fee(
      sid, q.currency, store_subtotal - store_discount, method_code, disc_snap
    );
    store_shipping := ship.fee_minor;
    if store_shipping is distinct from coalesce((grp->>'shipping_total_minor')::bigint, 0) then
      raise exception 'Shipping fee changed since quote; refresh checkout';
    end if;

    select c.inclusive, c.rate_bps, c.tax_minor, c.snapshot
      into tax_incl, tax_rate, store_tax, tax_snap
      from public.checkout_compute_tax(sid, store_subtotal - store_discount) as c;
    if store_tax is distinct from coalesce((grp->>'tax_total_minor')::bigint, 0) then
      raise exception 'Tax changed since quote; refresh checkout';
    end if;

    if tax_incl then
      store_grand := store_subtotal - store_discount + store_shipping;
    else
      store_grand := store_subtotal - store_discount + store_tax + store_shipping;
    end if;
    if store_grand < 0 then
      raise exception 'Grand total cannot be negative';
    end if;
    quoted_grand := coalesce((grp->>'grand_total_minor')::bigint, -1);
    if store_grand is distinct from quoted_grand then
      raise exception 'Checkout totals changed since quote; refresh checkout';
    end if;

    items := items_json;
    order_id := public.create_store_order_foundation_core(
      uid,
      sid,
      q.currency,
      items,
      store_discount,
      store_tax,
      store_shipping,
      null,
      left(replace(q.id::text, '-', '') || replace(sid::text, '-', ''), 128)
    );

    -- ACTIVE reservations only — do not consume on_hand in V1.
    for line in
      select
        (e->>'product_id')::uuid as product_id,
        (e->>'variant_id')::uuid as variant_id,
        (e->>'quantity')::integer as quantity
      from jsonb_array_elements(items_json) e
    loop
      res_idem := left(
        'confirm:' || session_id::text || ':' || line.variant_id::text,
        160
      );
      perform public.create_active_inventory_reservation(
        uid,
        q.cart_id,
        q.id,
        session_id,
        order_id,
        sid,
        line.product_id,
        line.variant_id,
        line.quantity,
        res_idem,
        'buyer',
        uid
      );
    end loop;

    update public.orders o set
      shipping_address_snapshot = coalesce(o.shipping_address_snapshot, ship_addr),
      billing_contact_snapshot = coalesce(o.billing_contact_snapshot, bill_addr),
      shipping_method_code = coalesce(o.shipping_method_code, ship.method_code),
      shipping_method_name = coalesce(o.shipping_method_name, ship.method_name),
      shipping_estimate_text = coalesce(o.shipping_estimate_text, ship.estimate_text),
      coupon_code_snapshot = coalesce(o.coupon_code_snapshot, q.coupon_code),
      checkout_quote_id = coalesce(o.checkout_quote_id, q.id),
      tax_snapshot = coalesce(o.tax_snapshot, tax_snap),
      discount_snapshot = coalesce(o.discount_snapshot, disc_snap)
    where o.id = order_id;

    if disc_snap is not null
       and jsonb_typeof(disc_snap) = 'object'
       and (store_discount > 0 or coalesce((disc_snap->>'free_shipping')::boolean, false)) then
      begin
        coupon_id := nullif(disc_snap->>'coupon_id', '')::uuid;
      exception when others then
        coupon_id := null;
      end;

      insert into public.order_discounts (
        order_id, code_snapshot, discount_type_snapshot, amount_minor, metadata
      ) values (
        order_id,
        disc_snap->>'code',
        disc_snap->>'discount_type',
        store_discount,
        disc_snap
      );

      if coupon_id is not null then
        perform 1 from public.store_coupons sc where sc.id = coupon_id for update;
        update public.store_coupons sc
          set usage_count = usage_count + 1
        where sc.id = coupon_id
          and (sc.total_usage_limit is null or sc.usage_count < sc.total_usage_limit);
        if not found then
          raise exception 'Coupon usage limit race';
        end if;

        insert into public.store_coupon_redemptions (
          coupon_id, user_id, order_id, store_id, discount_minor, code_snapshot
        ) values (
          coupon_id, uid, order_id, sid,
          store_discount,
          coalesce(disc_snap->>'code', q.coupon_code)
        );
      end if;
    end if;

    select o.order_number into order_number from public.orders o where o.id = order_id;
    orders_out := orders_out || jsonb_build_array(jsonb_build_object(
      'store_id', sid,
      'order_id', order_id,
      'order_number', order_number,
      'grand_total_minor', store_grand,
      'checkout_session_id', session_id
    ));
  end loop;

  delete from public.cart_items ci where ci.cart_id = q.cart_id;
  update public.carts c set status = 'converted' where c.id = q.cart_id;

  update public.checkout_quotes
    set status = 'confirmed',
        confirmed_at = timezone('utc', now()),
        checkout_session_id = session_id,
        quote_payload = quote_payload || jsonb_build_object(
          'orders', orders_out,
          'checkout_session_id', session_id
        )
  where id = q.id;

  return jsonb_build_object(
    'status', 'confirmed',
    'orders', orders_out,
    'checkout_session_id', session_id,
    'payment_note',
      'Payment collection is not enabled yet. Your order is recorded as pending payment.',
    'idempotent', false
  );
end;
$$;

revoke all on function public.create_store_order_foundation_core(
  uuid, uuid, text, jsonb, bigint, bigint, bigint, text, text
) from public, anon, authenticated, service_role;

revoke all on function public.confirm_store_checkout_quote(uuid) from public, anon;
grant execute on function public.confirm_store_checkout_quote(uuid)
  to authenticated, service_role;

comment on function public.create_store_checkout_quote(jsonb, jsonb, jsonb, text, text) is
  'Checkout quote; cart lines may be owned catalog or active marketplace seller listings.';

comment on function public.create_store_order_foundation_core(uuid, uuid, text, jsonb, bigint, bigint, bigint, text, text) is
  'Order create core; stamps marketplace columns for supplier listing lines.';
