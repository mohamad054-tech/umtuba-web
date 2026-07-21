-- =============================================================================
-- UMTUBA Store remote E2E sandbox — cleanup
-- Namespace: UMTUBA_E2E_20260721
--
-- Deletes ONLY rows tied to:
--   - fixed store id e2e02107-2026-4001-8000-000000000001
--   - SKU marker UMTUBA_E2E_20260721-*
--   - coupon code E2E20260721 / coupon id ...000041
--   - seller_application id ...000002
--
-- Never DELETE without sandbox identifiers.
-- Never truncate.
-- Never delete platform_admins unless umtuba.e2e_cleanup_admin=1.
--
-- If orders / payment_attempts are immutable and DELETE fails, NOTICE and leave
-- marked rows (do not truncate).
-- =============================================================================

do $$
declare
  v_ns text := 'UMTUBA_E2E_20260721';
  v_store_id uuid := 'e2e02107-2026-4001-8000-000000000001';
  v_app_id uuid := 'e2e02107-2026-4001-8000-000000000002';
  v_coupon_id uuid := 'e2e02107-2026-4001-8000-000000000041';
  v_cleanup_admin text;
  v_order_ids uuid[];
  v_variant_ids uuid[];
  v_product_ids uuid[];
  v_cart_ids uuid[];
  v_res_ids uuid[];
  v_deleted int;
begin
  begin
    v_cleanup_admin := coalesce(
      nullif(current_setting('umtuba.e2e_cleanup_admin', true), ''),
      '0'
    );
  exception when others then
    v_cleanup_admin := '0';
  end;

  select coalesce(array_agg(pv.id), array[]::uuid[])
  into v_variant_ids
  from public.product_variants pv
  where pv.sku like v_ns || '-%'
     or pv.id in (
       'e2e02107-2026-4001-8000-000000000021'::uuid,
       'e2e02107-2026-4001-8000-000000000022'::uuid,
       'e2e02107-2026-4001-8000-000000000023'::uuid,
       'e2e02107-2026-4001-8000-000000000024'::uuid
     );

  select coalesce(array_agg(sp.id), array[]::uuid[])
  into v_product_ids
  from public.store_products sp
  where sp.store_id = v_store_id
     or sp.id in (
       'e2e02107-2026-4001-8000-000000000011'::uuid,
       'e2e02107-2026-4001-8000-000000000012'::uuid,
       'e2e02107-2026-4001-8000-000000000013'::uuid
     );

  select coalesce(array_agg(o.id), array[]::uuid[])
  into v_order_ids
  from public.orders o
  where o.store_id = v_store_id
     or (o.notes is not null and o.notes like '%' || v_ns || '%');

  -- Carts that reference sandbox store via cart_items (carts have no notes column)
  select coalesce(array_agg(distinct ci.cart_id), array[]::uuid[])
  into v_cart_ids
  from public.cart_items ci
  where ci.store_id = v_store_id
     or ci.variant_id = any (v_variant_ids)
     or (ci.product_title_snapshot like '%' || v_ns || '%');

  select coalesce(array_agg(r.id), array[]::uuid[])
  into v_res_ids
  from public.inventory_reservations r
  where r.store_id = v_store_id
     or r.variant_id = any (v_variant_ids)
     or r.product_id = any (v_product_ids)
     or (r.order_id is not null and r.order_id = any (v_order_ids));

  -- 1) reservation events -> reservations
  if cardinality(v_res_ids) > 0 then
    delete from public.inventory_reservation_events e
    where e.reservation_id = any (v_res_ids);
    get diagnostics v_deleted = row_count;
    raise notice 'cleanup reservation_events deleted=%', v_deleted;

    delete from public.inventory_reservations r
    where r.id = any (v_res_ids);
    get diagnostics v_deleted = row_count;
    raise notice 'cleanup reservations deleted=%', v_deleted;
  end if;

  -- 2) payment_attempts / fulfillments / order_items / orders (sandbox order ids only)
  begin
    if cardinality(v_order_ids) > 0 then
      delete from public.payment_attempts pa
      where pa.order_id = any (v_order_ids);
      get diagnostics v_deleted = row_count;
      raise notice 'cleanup payment_attempts deleted=%', v_deleted;

      -- fulfillment events before fulfillments
      delete from public.order_fulfillment_events fe
      where fe.order_id = any (v_order_ids);
      get diagnostics v_deleted = row_count;
      raise notice 'cleanup order_fulfillment_events deleted=%', v_deleted;

      delete from public.order_shipments os
      where os.order_id = any (v_order_ids);
      get diagnostics v_deleted = row_count;
      raise notice 'cleanup order_shipments deleted=%', v_deleted;

      delete from public.order_fulfillments f
      where f.order_id = any (v_order_ids);
      get diagnostics v_deleted = row_count;
      raise notice 'cleanup order_fulfillments deleted=%', v_deleted;

      delete from public.store_coupon_redemptions cr
      where cr.order_id = any (v_order_ids)
         or cr.store_id = v_store_id
         or cr.coupon_id = v_coupon_id;
      get diagnostics v_deleted = row_count;
      raise notice 'cleanup coupon_redemptions (order-scoped) deleted=%', v_deleted;

      delete from public.order_items oi
      where oi.order_id = any (v_order_ids);
      get diagnostics v_deleted = row_count;
      raise notice 'cleanup order_items deleted=%', v_deleted;

      delete from public.orders o
      where o.id = any (v_order_ids);
      get diagnostics v_deleted = row_count;
      raise notice 'cleanup orders deleted=%', v_deleted;
    end if;
  exception when others then
    raise notice
      'CLEANUP_NOTICE: orders/payment_attempts (or dependents) could not be deleted for sandbox store % (%). Leave marked rows; do not truncate. SQLSTATE=% MSG=%',
      v_store_id, v_ns, SQLSTATE, SQLERRM;
  end;

  -- 3) checkout quotes tied to marker (coupon code / sandbox cart / payload)
  begin
    delete from public.checkout_quotes cq
    where cq.coupon_code = 'E2E20260721'
       or cq.cart_id = any (v_cart_ids)
       or cq.idempotency_key like '%' || v_ns || '%'
       or cq.quote_payload::text like '%' || v_ns || '%';
    get diagnostics v_deleted = row_count;
    raise notice 'cleanup checkout_quotes deleted=%', v_deleted;
  exception when others then
    raise notice
      'CLEANUP_NOTICE: checkout_quotes delete failed (%). Leave marked; do not truncate. SQLSTATE=% MSG=%',
      v_ns, SQLSTATE, SQLERRM;
  end;

  -- 4) cart_items / carts for sandbox markers
  if cardinality(v_cart_ids) > 0 then
    delete from public.cart_items ci
    where ci.cart_id = any (v_cart_ids)
       or ci.store_id = v_store_id
       or ci.variant_id = any (v_variant_ids);
    get diagnostics v_deleted = row_count;
    raise notice 'cleanup cart_items deleted=%', v_deleted;

    delete from public.carts c
    where c.id = any (v_cart_ids)
      and not exists (select 1 from public.cart_items ci where ci.cart_id = c.id);
    get diagnostics v_deleted = row_count;
    raise notice 'cleanup empty sandbox carts deleted=%', v_deleted;
  end if;

  -- 5) remaining coupon redemptions -> coupons
  delete from public.store_coupon_redemptions cr
  where cr.coupon_id = v_coupon_id
     or cr.store_id = v_store_id
     or cr.code_snapshot = 'E2E20260721';
  get diagnostics v_deleted = row_count;
  raise notice 'cleanup coupon_redemptions deleted=%', v_deleted;

  delete from public.store_coupons c
  where c.id = v_coupon_id
     or (c.store_id = v_store_id and c.code = 'E2E20260721');
  get diagnostics v_deleted = row_count;
  raise notice 'cleanup coupons deleted=%', v_deleted;

  -- 6) shipping + tax
  delete from public.store_shipping_methods m
  where m.store_id = v_store_id
     or m.id in (
       'e2e02107-2026-4001-8000-000000000031'::uuid,
       'e2e02107-2026-4001-8000-000000000032'::uuid
     );
  get diagnostics v_deleted = row_count;
  raise notice 'cleanup shipping_methods deleted=%', v_deleted;

  delete from public.store_tax_configs t
  where t.store_id = v_store_id;
  get diagnostics v_deleted = row_count;
  raise notice 'cleanup tax_configs deleted=%', v_deleted;

  -- 7) inventory -> prices -> variants -> products
  if cardinality(v_variant_ids) > 0 then
    delete from public.product_inventory pi
    where pi.variant_id = any (v_variant_ids);
    get diagnostics v_deleted = row_count;
    raise notice 'cleanup inventory deleted=%', v_deleted;

    delete from public.product_prices pp
    where pp.variant_id = any (v_variant_ids);
    get diagnostics v_deleted = row_count;
    raise notice 'cleanup prices deleted=%', v_deleted;

    delete from public.product_variants pv
    where pv.id = any (v_variant_ids);
    get diagnostics v_deleted = row_count;
    raise notice 'cleanup variants deleted=%', v_deleted;
  end if;

  if cardinality(v_product_ids) > 0 then
    delete from public.product_media pm
    where pm.product_id = any (v_product_ids);
    delete from public.product_category_links pcl
    where pcl.product_id = any (v_product_ids);

    begin
      delete from public.store_products sp
      where sp.id = any (v_product_ids)
         or sp.store_id = v_store_id;
      get diagnostics v_deleted = row_count;
      raise notice 'cleanup products deleted=%', v_deleted;
    exception when others then
      raise notice
        'CLEANUP_NOTICE: store_products delete blocked (likely order_items FK). Leave marked products for %. SQLSTATE=% MSG=%',
        v_ns, SQLSTATE, SQLERRM;
    end;
  end if;

  -- 8) members -> store -> application
  delete from public.store_members sm
  where sm.store_id = v_store_id;
  get diagnostics v_deleted = row_count;
  raise notice 'cleanup store_members deleted=%', v_deleted;

  begin
    delete from public.stores s
    where s.id = v_store_id;
    get diagnostics v_deleted = row_count;
    raise notice 'cleanup store deleted=%', v_deleted;
  exception when others then
    raise notice
      'CLEANUP_NOTICE: store delete failed for % (dependent rows remain). Leave marked; do not truncate. SQLSTATE=% MSG=%',
      v_store_id, SQLSTATE, SQLERRM;
  end;

  delete from public.seller_applications a
  where a.id = v_app_id
     or (a.proposed_store_slug = 'umtuba-e2e-20260721'
         and a.review_note like '%' || v_ns || '%');
  get diagnostics v_deleted = row_count;
  raise notice 'cleanup seller_applications deleted=%', v_deleted;

  -- 9) platform_admins only when explicitly flagged
  if v_cleanup_admin = '1' then
    delete from public.platform_admins pa
    where pa.note like '%' || v_ns || '%';
    get diagnostics v_deleted = row_count;
    raise notice 'cleanup platform_admins deleted=% (umtuba.e2e_cleanup_admin=1)', v_deleted;
  else
    raise notice
      'cleanup platform_admins skipped (default). Set umtuba.e2e_cleanup_admin=1 to remove sandbox admin note rows.';
  end if;

  raise notice 'CLEANUP_DONE namespace=% store=%', v_ns, v_store_id;
end;
$$;
