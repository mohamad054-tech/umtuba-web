-- UMTUBA Store — checkout_compute_shipping_fee ambiguous `code` fix V1
-- Additive. Replaces only public.checkout_compute_shipping_fee(+grants).
--
-- Root cause (discovered Gate-OFF E2E):
--   PL/pgSQL variable `code` collided with column `store_shipping_methods.code`
--   in `WHERE m.code = code`, raising:
--     ERROR: 42702: column reference "code" is ambiguous
--
-- Last faulty definition: 20260815_store_promotions_fulfillment_foundation_v1.sql
-- (5-arg overload with p_discount_snapshot). Not redefined in 20260816–20260820.
--
-- Behavior preserved: active method lookup, currency match, free_above threshold,
-- free_shipping coupon snapshot zeroing, empty-catalog standard fallback.

create or replace function public.checkout_compute_shipping_fee(
  p_store_id uuid,
  p_currency text,
  p_subtotal_minor bigint,
  p_method_code text,
  p_discount_snapshot jsonb default null
)
returns table (
  fee_minor bigint,
  method_code text,
  method_name text,
  estimate_text text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  -- Renamed to avoid collision with store_shipping_methods.code (and bare `code`).
  method_code_norm text := lower(btrim(coalesce(p_method_code, 'standard')));
  method public.store_shipping_methods%rowtype;
  fee bigint;
  has_any boolean;
begin
  if p_subtotal_minor is null or p_subtotal_minor < 0 then
    raise exception 'Subtotal is invalid for shipping';
  end if;

  select exists (
    select 1
    from public.store_shipping_methods m
    where m.store_id = p_store_id
      and m.is_active = true
  ) into has_any;

  if not has_any then
    if method_code_norm is distinct from 'standard' then
      raise exception 'Shipping method not available';
    end if;
    fee_minor := 0;
    method_code := 'standard';
    method_name := 'Standard shipping';
    estimate_text := 'Estimated delivery shared after order review';
    if coalesce((p_discount_snapshot->>'free_shipping')::boolean, false) then
      fee_minor := 0;
    end if;
    return next;
    return;
  end if;

  select * into method
  from public.store_shipping_methods m
  where m.store_id = p_store_id
    and m.code = method_code_norm
    and m.is_active = true;

  if not found then
    raise exception 'Shipping method not found';
  end if;

  if method.currency is distinct from p_currency then
    raise exception 'Shipping method currency mismatch';
  end if;

  fee := method.fee_minor;
  if method.free_above_subtotal_minor is not null
     and p_subtotal_minor >= method.free_above_subtotal_minor then
    fee := 0;
  end if;
  if coalesce((p_discount_snapshot->>'free_shipping')::boolean, false) then
    fee := 0;
  end if;

  fee_minor := fee;
  method_code := method.code;
  method_name := method.name;
  estimate_text := method.estimate_text;
  return next;
end;
$$;

revoke all on function public.checkout_compute_shipping_fee(uuid, text, bigint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.checkout_compute_shipping_fee(uuid, text, bigint, text, jsonb)
  to service_role;
