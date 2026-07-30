-- =============================================================================
-- UMTUBA Commerce — Live Payment Capture Adapter V1 (Stripe test-mode)
-- Migration: 20260876_store_live_payment_capture_adapter_v1.sql
--
-- Adds authenticated RPCs to create/resume Stripe payment attempts and attach
-- provider references. Amount/currency always from locked order rows.
-- Digital-first: rejects orders that include physical product lines.
-- Does NOT grant apply_store_payment_outcome to authenticated (service_role only).
-- Local file only — do NOT remote-apply without explicit approval.
-- =============================================================================

-- Lookup uniqueness for provider payment identifiers (PI / session refs).
create unique index if not exists payment_attempts_provider_reference_uidx
  on public.payment_attempts (provider, provider_reference)
  where provider_reference is not null;

-- ---------------------------------------------------------------------------
-- create_my_store_stripe_payment_attempt
-- ---------------------------------------------------------------------------

create or replace function public.create_my_store_stripe_payment_attempt(
  p_order_id uuid,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o public.orders%rowtype;
  idem text;
  existing public.payment_attempts%rowtype;
  attempt_id uuid;
  physical_count int;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_order_id is null then
    raise exception 'order_id is required';
  end if;

  idem := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  if idem is null then
    idem := 'stripe-' || replace(p_order_id::text, '-', '');
  end if;
  if char_length(idem) < 8 or char_length(idem) > 128 then
    raise exception 'idempotency_key must be 8-128 characters';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if o.buyer_id is distinct from uid then
    raise exception 'Not authorized';
  end if;

  if o.payment_status in ('paid', 'refunded') then
    raise exception 'Order is already paid';
  end if;
  if o.status in ('cancelled', 'refunded') then
    raise exception 'Order is not payable';
  end if;
  if o.payment_status = 'failed' and o.status = 'cancelled' then
    raise exception 'Order is not payable';
  end if;
  if o.grand_total_minor is null or o.grand_total_minor < 0 then
    raise exception 'Order total is invalid';
  end if;
  if o.currency is null or o.currency !~ '^[A-Z]{3}$' then
    raise exception 'Order currency is invalid';
  end if;

  -- Digital-first: reject any physical line (product_snapshot.product_type).
  select count(*)::int into physical_count
  from public.order_items oi
  where oi.order_id = o.id
    and lower(coalesce(oi.product_snapshot->>'product_type', 'physical')) = 'physical';
  if physical_count > 0 then
    raise exception 'Live Stripe capture is limited to digital checkout orders';
  end if;
  if not exists (select 1 from public.order_items oi where oi.order_id = o.id) then
    raise exception 'Order has no line items';
  end if;

  -- Reuse active stripe attempt for this order (pending/authorized).
  select * into existing
  from public.payment_attempts pa
  where pa.order_id = o.id
    and pa.provider = 'stripe'
    and pa.status in ('pending', 'authorized')
  order by pa.created_at desc
  limit 1
  for update;
  if found then
    if existing.buyer_id is distinct from uid then
      raise exception 'Not authorized';
    end if;
    if existing.amount_minor is distinct from o.grand_total_minor
       or existing.currency is distinct from o.currency then
      raise exception 'Existing payment attempt amount mismatch';
    end if;
    return jsonb_build_object(
      'attempt_id', existing.id,
      'order_id', existing.order_id,
      'status', existing.status,
      'provider', existing.provider,
      'method_kind', existing.method_kind,
      'amount_minor', existing.amount_minor,
      'currency', existing.currency,
      'provider_reference', existing.provider_reference,
      'idempotency_key', existing.idempotency_key,
      'reused', true
    );
  end if;

  -- Block new charge when a captured attempt already exists.
  if exists (
    select 1 from public.payment_attempts pa
    where pa.order_id = o.id and pa.status = 'captured'
  ) then
    raise exception 'Order is already paid';
  end if;

  select * into existing
  from public.payment_attempts pa
  where pa.idempotency_key = idem
  for update;
  if found then
    if existing.buyer_id is distinct from uid
       or existing.order_id is distinct from o.id then
      raise exception 'idempotency_key already used';
    end if;
    if existing.provider is distinct from 'stripe' then
      raise exception 'idempotency_key already used by a different provider';
    end if;
    return jsonb_build_object(
      'attempt_id', existing.id,
      'order_id', existing.order_id,
      'status', existing.status,
      'provider', existing.provider,
      'method_kind', existing.method_kind,
      'amount_minor', existing.amount_minor,
      'currency', existing.currency,
      'provider_reference', existing.provider_reference,
      'idempotency_key', existing.idempotency_key,
      'reused', true
    );
  end if;

  begin
    insert into public.payment_attempts (
      order_id,
      buyer_id,
      provider,
      method_kind,
      status,
      amount_minor,
      currency,
      idempotency_key,
      provider_reference,
      metadata
    ) values (
      o.id,
      uid,
      'stripe',
      'card',
      'pending',
      o.grand_total_minor,
      o.currency,
      idem,
      null,
      jsonb_build_object(
        'adapter', 'commerce.payments.live_capture_adapter_v1',
        'mode', 'test'
      )
    )
    returning id into attempt_id;
  exception
    when unique_violation then
      select * into existing
      from public.payment_attempts pa
      where pa.idempotency_key = idem
        and pa.buyer_id = uid
        and pa.order_id = o.id;
      if not found then
        raise;
      end if;
      return jsonb_build_object(
        'attempt_id', existing.id,
        'order_id', existing.order_id,
        'status', existing.status,
        'provider', existing.provider,
        'method_kind', existing.method_kind,
        'amount_minor', existing.amount_minor,
        'currency', existing.currency,
        'provider_reference', existing.provider_reference,
        'idempotency_key', existing.idempotency_key,
        'reused', true
      );
  end;

  return jsonb_build_object(
    'attempt_id', attempt_id,
    'order_id', o.id,
    'status', 'pending',
    'provider', 'stripe',
    'method_kind', 'card',
    'amount_minor', o.grand_total_minor,
    'currency', o.currency,
    'provider_reference', null,
    'idempotency_key', idem,
    'reused', false
  );
end;
$$;

comment on function public.create_my_store_stripe_payment_attempt(uuid, text) is
  'Create or resume a Stripe (card) payment attempt for the buyer. Amount/currency from order. Digital-first: rejects physical product lines. Does not charge.';

revoke all on function public.create_my_store_stripe_payment_attempt(uuid, text)
  from public, anon;
grant execute on function public.create_my_store_stripe_payment_attempt(uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- attach_my_store_stripe_provider_reference
-- ---------------------------------------------------------------------------

create or replace function public.attach_my_store_stripe_provider_reference(
  p_attempt_id uuid,
  p_provider_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  attempt public.payment_attempts%rowtype;
  ref text := nullif(btrim(coalesce(p_provider_reference, '')), '');
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_attempt_id is null then
    raise exception 'attempt_id is required';
  end if;
  if ref is null or char_length(ref) < 1 or char_length(ref) > 200 then
    raise exception 'provider_reference is invalid';
  end if;

  select * into attempt
  from public.payment_attempts
  where id = p_attempt_id
  for update;
  if not found then
    raise exception 'Payment attempt not found';
  end if;
  if attempt.buyer_id is distinct from uid then
    raise exception 'Not authorized';
  end if;
  if attempt.provider is distinct from 'stripe' then
    raise exception 'Attempt is not a Stripe payment attempt';
  end if;
  if attempt.status not in ('pending', 'authorized') then
    raise exception 'Attempt is not attachable';
  end if;

  if attempt.provider_reference is not null
     and attempt.provider_reference is distinct from ref then
    raise exception 'provider_reference already set';
  end if;

  update public.payment_attempts
  set provider_reference = ref,
      updated_at = now()
  where id = attempt.id;

  return jsonb_build_object(
    'attempt_id', attempt.id,
    'order_id', attempt.order_id,
    'provider_reference', ref,
    'status', attempt.status
  );
end;
$$;

comment on function public.attach_my_store_stripe_provider_reference(uuid, text) is
  'Attach Stripe Checkout Session / PaymentIntent id to a buyer-owned pending Stripe attempt.';

revoke all on function public.attach_my_store_stripe_provider_reference(uuid, text)
  from public, anon;
grant execute on function public.attach_my_store_stripe_provider_reference(uuid, text)
  to authenticated, service_role;
