-- UMTUBA Store — Commerce Safety Integrity Fix B1
-- Additive. Ops-owned apply (not applied by app).
--
-- Blocker B1:
--   create_store_order_foundation always minted session_id := gen_random_uuid()
--   and built reservation idempotency keys from that fresh session id.
--   On retry, create_store_order_foundation_core correctly returned the existing
--   order, but the wrapper still created a new reservation set → double reserve.
--
-- Fix:
--   1) Stable checkout_session_id tied to the order (order_id) for the direct path.
--   2) Stable reservation idempotency keys: direct:{order_id}:{variant_id}
--   3) create_active_inventory_reservation remains the DB authority for dedupe
--      (unique idempotency_key + FOR UPDATE replay).
--
-- Preserves: commerce gate, buyer auth on other RPCs, expiry, release, cancel,
-- inventory events, admin visibility, confirm_store_checkout_quote path.

create or replace function public.create_store_order_foundation(
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
  order_id uuid;
  session_id uuid;
  item jsonb;
  product_id uuid;
  variant_id uuid;
  qty integer;
  idem text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service_role required to create store orders';
  end if;

  perform public.assert_store_commerce_confirm_allowed();

  order_id := public.create_store_order_foundation_core(
    p_buyer_id,
    p_store_id,
    p_currency,
    p_items,
    p_discount_total_minor,
    p_tax_total_minor,
    p_shipping_total_minor,
    p_notes,
    p_idempotency_key
  );

  -- Direct-path session identity is the order id (stable across retries).
  -- Preserves uuid-typed checkout_session_id compatibility for reservation rows.
  session_id := order_id;

  for item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    variant_id := nullif(item->>'variant_id', '')::uuid;
    product_id := nullif(item->>'product_id', '')::uuid;
    qty := coalesce((item->>'quantity')::integer, 0);
    if variant_id is null or product_id is null or qty < 1 then
      raise exception 'Invalid order item for reservation';
    end if;

    -- Stable per (order, variant): replay hits unique idempotency_key and returns
    -- the existing active reservation without incrementing reserved again.
    idem := left(
      'direct:' || order_id::text || ':' || variant_id::text,
      160
    );

    perform public.create_active_inventory_reservation(
      p_buyer_id,
      null,
      null,
      session_id,
      order_id,
      p_store_id,
      product_id,
      variant_id,
      qty,
      idem,
      'system',
      null
    );
  end loop;

  return order_id;
end;
$$;

revoke all on function public.create_store_order_foundation(
  uuid, uuid, text, jsonb, bigint, bigint, bigint, text, text
) from public, anon, authenticated;
grant execute on function public.create_store_order_foundation(
  uuid, uuid, text, jsonb, bigint, bigint, bigint, text, text
) to service_role;
