-- UMTUBA Store — UM Points purchase earn + reversal foundation V1
-- Candidate migration. Next unused number after 20260916.
-- DO NOT APPLY TO PRODUCTION from this task.
--
-- Reuses the existing unified wallet (um_point_balances / award_um_points_to_user).
-- Does NOT create a competing customer balance.
-- Does NOT alter the existing social/learning ledger positive-only check.
-- Does NOT replace apply_store_payment_outcome (safe interface only).
-- Store purchase events are append-only and may carry a negative points_delta.

-- ---------------------------------------------------------------------------
-- 1) store_um_points_events — auditable purchase earn / refund ledger
-- ---------------------------------------------------------------------------

create table if not exists public.store_um_points_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  order_id uuid references public.orders (id) on delete restrict,
  payment_reference text,
  event_type text not null
    constraint store_um_points_events_type_check check (
      event_type in (
        'PURCHASE_EARN',
        'REFUND_REVERSAL',
        'PARTIAL_REFUND_REVERSAL',
        'ADMIN_ADJUSTMENT'
      )
    ),
  points_delta integer not null,
  eligible_spend_original numeric(18, 6) not null default 0
    constraint store_um_points_events_eligible_original_nonneg check (
      eligible_spend_original >= 0
    ),
  original_currency text not null
    constraint store_um_points_events_currency_iso check (
      original_currency ~ '^[A-Z]{3}$'
    ),
  eligible_spend_usd numeric(18, 6) not null default 0
    constraint store_um_points_events_eligible_usd_nonneg check (
      eligible_spend_usd >= 0
    ),
  reason text not null
    constraint store_um_points_events_reason_length check (
      char_length(btrim(reason)) between 1 and 200
    ),
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint store_um_points_events_idempotency_unique unique (idempotency_key)
);

create index if not exists store_um_points_events_user_created_idx
  on public.store_um_points_events (user_id, created_at desc);

create index if not exists store_um_points_events_order_idx
  on public.store_um_points_events (order_id, created_at desc)
  where order_id is not null;

alter table public.store_um_points_events enable row level security;
alter table public.store_um_points_events force row level security;

drop policy if exists "Users can view own store UM points events"
  on public.store_um_points_events;
create policy "Users can view own store UM points events"
  on public.store_um_points_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.store_um_points_events from anon, authenticated;
revoke all on public.store_um_points_events from public;
grant select on public.store_um_points_events to authenticated;

comment on table public.store_um_points_events is
  'Append-only UMTUBA Store purchase UM Points events. Unified wallet remains um_point_balances. Negative deltas allowed for refunds.';

-- ---------------------------------------------------------------------------
-- 2) apply_store_um_points_event — trusted writer (no client points argument)
-- ---------------------------------------------------------------------------

create or replace function public.apply_store_um_points_event(
  p_user_id uuid,
  p_order_id uuid,
  p_payment_reference text,
  p_event_type text,
  p_eligible_spend_original numeric,
  p_original_currency text,
  p_eligible_spend_usd numeric,
  p_fx_usd_per_unit numeric,
  p_reason text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := upper(btrim(coalesce(p_event_type, '')));
  v_currency text := upper(btrim(coalesce(p_original_currency, '')));
  v_reason text := btrim(coalesce(p_reason, ''));
  v_dedupe text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_eligible_usd numeric := greatest(0, coalesce(p_eligible_spend_usd, 0));
  v_eligible_original numeric := greatest(0, coalesce(p_eligible_spend_original, 0));
  v_points integer := 0;
  v_delta integer := 0;
  v_event_id uuid;
  v_payment_status text;
  v_order_status text;
  v_buyer uuid;
  v_award jsonb;
  v_wallet_apply text := 'skipped';
  v_existing public.store_um_points_events%rowtype;
  v_balance bigint;
begin
  -- Never accept a client-chosen points amount. Floor USD eligible spend only.
  if p_user_id is null or v_dedupe is null or v_reason = '' then
    return jsonb_build_object('applied', false, 'reason', 'invalid');
  end if;

  if v_type not in (
    'PURCHASE_EARN',
    'REFUND_REVERSAL',
    'PARTIAL_REFUND_REVERSAL',
    'ADMIN_ADJUSTMENT'
  ) then
    return jsonb_build_object('applied', false, 'reason', 'invalid_event');
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    return jsonb_build_object('applied', false, 'reason', 'invalid_currency');
  end if;

  if v_currency <> 'USD' and (
    p_fx_usd_per_unit is null
    or p_fx_usd_per_unit <= 0
  ) then
    return jsonb_build_object('applied', false, 'reason', 'fx_required');
  end if;

  if v_currency = 'USD' then
    v_eligible_usd := v_eligible_original;
  end if;

  v_points := floor(v_eligible_usd)::integer;
  if v_points < 0 then
    v_points := 0;
  end if;

  if v_type = 'PURCHASE_EARN' then
    v_delta := v_points;
  else
    v_delta := -v_points;
  end if;

  if v_type = 'PURCHASE_EARN' then
    if p_order_id is null then
      return jsonb_build_object('applied', false, 'reason', 'order_required');
    end if;

    select buyer_id, payment_status, status
      into v_buyer, v_payment_status, v_order_status
    from public.orders
    where id = p_order_id;

    if v_buyer is null then
      return jsonb_build_object('applied', false, 'reason', 'order_not_found');
    end if;

    if v_buyer <> p_user_id then
      return jsonb_build_object('applied', false, 'reason', 'forbidden');
    end if;

    if lower(coalesce(v_order_status, '')) in ('cancelled', 'canceled') then
      return jsonb_build_object('applied', false, 'reason', 'cancelled_order', 'pointsDelta', 0);
    end if;

    if lower(coalesce(v_payment_status, '')) not in ('paid', 'captured') then
      return jsonb_build_object(
        'applied', false,
        'reason', 'not_paid',
        'pointsDelta', 0,
        'paymentStatus', v_payment_status
      );
    end if;
  end if;

  select * into v_existing
  from public.store_um_points_events
  where idempotency_key = v_dedupe;

  if v_existing.id is not null then
    return jsonb_build_object(
      'applied', false,
      'reason', 'deduped',
      'duplicate', true,
      'pointsDelta', v_existing.points_delta,
      'eventId', v_existing.id
    );
  end if;

  insert into public.store_um_points_events (
    user_id,
    order_id,
    payment_reference,
    event_type,
    points_delta,
    eligible_spend_original,
    original_currency,
    eligible_spend_usd,
    reason,
    idempotency_key,
    metadata
  )
  values (
    p_user_id,
    p_order_id,
    nullif(btrim(coalesce(p_payment_reference, '')), ''),
    v_type,
    v_delta,
    v_eligible_original,
    v_currency,
    v_eligible_usd,
    v_reason,
    v_dedupe,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'fxUsdPerOriginalUnit', p_fx_usd_per_unit,
      'computedPoints', v_points
    )
  )
  on conflict (idempotency_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select * into v_existing
    from public.store_um_points_events
    where idempotency_key = v_dedupe;
    return jsonb_build_object(
      'applied', false,
      'reason', 'deduped',
      'duplicate', true,
      'pointsDelta', v_existing.points_delta,
      'eventId', v_existing.id
    );
  end if;

  if v_delta > 0 then
    v_award := public.award_um_points_to_user(
      p_user_id,
      v_delta,
      v_reason,
      v_dedupe,
      jsonb_build_object(
        'category', 'store_purchase',
        'bypass_daily_cap', true,
        'skip_notification', false,
        'storeEventId', v_event_id,
        'orderId', p_order_id,
        'eventType', v_type
      ),
      null
    );
    v_wallet_apply := case
      when coalesce((v_award->>'created')::boolean, false) then 'credited'
      else coalesce(v_award->>'reason', 'award_skipped')
    end;
  elsif v_delta < 0 then
    update public.um_point_balances
    set balance = public.um_point_balances.balance + v_delta,
        updated_at = now()
    where user_id = p_user_id
      and public.um_point_balances.balance + v_delta >= 0
    returning balance into v_balance;

    if found then
      v_wallet_apply := 'debited';
    else
      -- Store ledger already recorded the full reversal. Do not invent spend.
      v_wallet_apply := 'blocked_nonneg';
    end if;
  else
    v_wallet_apply := 'zero';
  end if;

  return jsonb_build_object(
    'applied', true,
    'duplicate', false,
    'pointsDelta', v_delta,
    'eventId', v_event_id,
    'walletApply', v_wallet_apply,
    'award', v_award
  );
end;
$$;

revoke all on function public.apply_store_um_points_event(
  uuid, uuid, text, text, numeric, text, numeric, numeric, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_store_um_points_event(
  uuid, uuid, text, text, numeric, text, numeric, numeric, text, text, jsonb
) to service_role;

comment on function public.apply_store_um_points_event(
  uuid, uuid, text, text, numeric, text, numeric, numeric, text, text, jsonb
) is
  'Trusted Store UM Points writer. Computes floor(eligible USD). No client points argument. Safe to call after apply_store_payment_outcome captured/refunded — does not replace that RPC.';

-- ---------------------------------------------------------------------------
-- 3) get_my_store_um_points_activity — owner-only read
-- ---------------------------------------------------------------------------

create or replace function public.get_my_store_um_points_activity()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_balance bigint := 0;
  v_purchase integer := 0;
  v_reversed integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(balance, 0) into v_balance
  from public.um_point_balances
  where user_id = v_uid;

  select
    coalesce(sum(points_delta) filter (where event_type = 'PURCHASE_EARN'), 0)::integer,
    coalesce(sum(-points_delta) filter (
      where event_type in ('REFUND_REVERSAL', 'PARTIAL_REFUND_REVERSAL')
        and points_delta < 0
    ), 0)::integer
  into v_purchase, v_reversed
  from public.store_um_points_events
  where user_id = v_uid;

  return jsonb_build_object(
    'balance', v_balance,
    'purchaseEarned', v_purchase,
    'refundReversed', v_reversed,
    'recent', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'eventType', e.event_type,
            'pointsDelta', e.points_delta,
            'reason', e.reason,
            'orderId', e.order_id,
            'eligibleSpendUsd', e.eligible_spend_usd,
            'originalCurrency', e.original_currency,
            'createdAt', e.created_at
          )
          order by e.created_at desc
        )
        from (
          select *
          from public.store_um_points_events
          where user_id = v_uid
          order by created_at desc
          limit 20
        ) e
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.get_my_store_um_points_activity() from public, anon;
grant execute on function public.get_my_store_um_points_activity() to authenticated;

comment on function public.get_my_store_um_points_activity() is
  'Signed-in user only. Returns unified wallet balance plus own Store purchase UM Points activity.';
