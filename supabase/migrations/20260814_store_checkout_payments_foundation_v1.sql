-- UMTUBA Store — Checkout & Payments Foundation V1
-- Additive after 20260813. Extends Checkout Foundation with payment attempts
-- and shipping service-type metadata. No live payment gateway calls.
--
-- Existing 20260812 already provides: buyer_addresses, store_shipping_methods,
-- store_tax_configs, store_coupons, checkout_quotes, order snapshots.
-- This migration adds payment_attempts + shipping classification columns.
--
-- Trust boundary for create_deferred_payment_attempt:
--   Caller supplies order_id + optional idempotency_key only.
--   buyer_id, amount_minor, currency ALWAYS from the locked order row.
--   Idempotent reuse requires matching order_id + buyer_id.

-- ---------------------------------------------------------------------------
-- 1) Shipping method classification (future carriers / pickup / intl)
-- ---------------------------------------------------------------------------

alter table public.store_shipping_methods
  add column if not exists service_type text not null default 'standard';

alter table public.store_shipping_methods
  drop constraint if exists store_shipping_methods_service_type_check;
alter table public.store_shipping_methods
  add constraint store_shipping_methods_service_type_check
  check (
    service_type in (
      'local',
      'international',
      'pickup',
      'standard',
      'express'
    )
  );

alter table public.store_shipping_methods
  add column if not exists provider_key text not null default 'manual';

alter table public.store_shipping_methods
  drop constraint if exists store_shipping_methods_provider_key_check;
alter table public.store_shipping_methods
  add constraint store_shipping_methods_provider_key_check
  check (
    provider_key in (
      'manual',
      'local_courier',
      'ups',
      'fedex',
      'dhl',
      'aramex',
      'custom'
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Payment attempts (deferred / future gateways)
-- ---------------------------------------------------------------------------

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  buyer_id uuid not null references auth.users (id) on delete restrict,
  provider text not null
    check (
      provider in (
        'none',
        'stripe',
        'paypal',
        'apple_pay',
        'google_pay',
        'hyperpay',
        'paytabs',
        'tap',
        'paymob',
        'cash_on_delivery',
        'bank_transfer'
      )
    ),
  method_kind text not null
    check (
      method_kind in (
        'deferred',
        'card',
        'wallet',
        'cash_on_delivery',
        'bank_transfer'
      )
    ),
  status text not null default 'deferred'
    check (
      status in (
        'deferred',
        'pending',
        'authorized',
        'captured',
        'failed',
        'cancelled',
        'refunded'
      )
    ),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  idempotency_key text not null
    check (char_length(btrim(idempotency_key)) between 8 and 128),
  provider_reference text
    check (
      provider_reference is null
      or char_length(btrim(provider_reference)) between 1 and 200
    ),
  -- Non-secret provider metadata only (never card PANs, CVVs, or tokens).
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_attempts_idempotency_key_uidx unique (idempotency_key)
);

-- At most one deferred (provider=none) attempt per order (recovery-safe).
create unique index if not exists payment_attempts_order_deferred_uidx
  on public.payment_attempts (order_id)
  where provider = 'none' and method_kind = 'deferred';

create index if not exists payment_attempts_order_created_idx
  on public.payment_attempts (order_id, created_at desc);

create index if not exists payment_attempts_buyer_created_idx
  on public.payment_attempts (buyer_id, created_at desc);

drop trigger if exists payment_attempts_set_updated_at on public.payment_attempts;
create trigger payment_attempts_set_updated_at
  before update on public.payment_attempts
  for each row execute function public.set_row_updated_at();

-- Defense: amount/currency/buyer cannot diverge from order after insert;
-- payment_attempts rows are append-oriented (no authenticated UPDATE grant).

alter table public.payment_attempts enable row level security;
alter table public.payment_attempts force row level security;
revoke all on public.payment_attempts from anon, public;
grant select on public.payment_attempts to authenticated;
revoke insert, update, delete on public.payment_attempts from authenticated;

drop policy if exists "Buyers read own payment attempts" on public.payment_attempts;
create policy "Buyers read own payment attempts"
  on public.payment_attempts for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or public.can_read_store_order(order_id)
  );

-- ---------------------------------------------------------------------------
-- 3) Deferred payment attempt RPC (no gateway charge)
-- ---------------------------------------------------------------------------

create or replace function public.create_deferred_payment_attempt(
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
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_order_id is null then
    raise exception 'order_id is required';
  end if;

  idem := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  if idem is null then
    idem := 'deferred-' || replace(p_order_id::text, '-', '');
  end if;
  if char_length(idem) < 8 or char_length(idem) > 128 then
    raise exception 'idempotency_key must be 8-128 characters';
  end if;

  -- Lock order first (ownership + amount authority).
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if o.buyer_id is distinct from uid then
    raise exception 'Not authorized';
  end if;

  -- Prefer existing deferred row for this order (recovery / concurrency).
  select * into existing
  from public.payment_attempts pa
  where pa.order_id = o.id
    and pa.provider = 'none'
    and pa.method_kind = 'deferred'
  for update;
  if found then
    if existing.buyer_id is distinct from uid then
      raise exception 'Not authorized';
    end if;
    return jsonb_build_object(
      'attempt_id', existing.id,
      'order_id', existing.order_id,
      'status', existing.status,
      'provider', existing.provider,
      'amount_minor', existing.amount_minor,
      'currency', existing.currency,
      'reused', true
    );
  end if;

  -- Idempotency key reuse must belong to this buyer + this order.
  select * into existing
  from public.payment_attempts pa
  where pa.idempotency_key = idem
  for update;
  if found then
    if existing.buyer_id is distinct from uid
       or existing.order_id is distinct from o.id then
      raise exception 'idempotency_key already used';
    end if;
    return jsonb_build_object(
      'attempt_id', existing.id,
      'order_id', existing.order_id,
      'status', existing.status,
      'provider', existing.provider,
      'amount_minor', existing.amount_minor,
      'currency', existing.currency,
      'reused', true
    );
  end if;

  -- Amount always from order row — never from client.
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
      'none',
      'deferred',
      'deferred',
      o.grand_total_minor,
      o.currency,
      idem,
      null,
      jsonb_build_object(
        'note', 'Payment collection is not enabled yet.',
        'payment_status_on_order', o.payment_status
      )
    )
    returning id into attempt_id;
  exception
    when unique_violation then
      -- Concurrent insert won; return the winner for this order.
      select * into existing
      from public.payment_attempts pa
      where pa.order_id = o.id
        and pa.provider = 'none'
        and pa.method_kind = 'deferred';
      if not found then
        select * into existing
        from public.payment_attempts pa
        where pa.idempotency_key = idem
          and pa.buyer_id = uid
          and pa.order_id = o.id;
      end if;
      if not found then
        raise;
      end if;
      return jsonb_build_object(
        'attempt_id', existing.id,
        'order_id', existing.order_id,
        'status', existing.status,
        'provider', existing.provider,
        'amount_minor', existing.amount_minor,
        'currency', existing.currency,
        'reused', true
      );
  end;

  return jsonb_build_object(
    'attempt_id', attempt_id,
    'order_id', o.id,
    'status', 'deferred',
    'provider', 'none',
    'amount_minor', o.grand_total_minor,
    'currency', o.currency,
    'reused', false
  );
end;
$$;

revoke all on function public.create_deferred_payment_attempt(uuid, text)
  from public, anon;
grant execute on function public.create_deferred_payment_attempt(uuid, text)
  to authenticated, service_role;
