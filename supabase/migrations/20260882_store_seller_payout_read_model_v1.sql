-- UMTUBA Store — Seller Payout Read Model V1
-- Additive after Seller Payout Foundation V1 (20260881).
-- Authenticated owner/manager read RPCs over trusted settlement + payout events.
-- Does NOT: bank rails, provider adapters, Dashboard UI, write/payout booking,
-- commissions, mixed-currency totals, client-trusted money fields.

-- ---------------------------------------------------------------------------
-- 1) Access + limit helpers
-- ---------------------------------------------------------------------------

create or replace function public.store_payout_read_assert_store_access(
  p_store_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_store_id is null then
    raise exception 'store_id is required';
  end if;
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_store_member_with_role(
    p_store_id,
    array['owner', 'manager']
  ) then
    raise exception 'Not authorized';
  end if;
  if not exists (select 1 from public.stores s where s.id = p_store_id) then
    raise exception 'store not found';
  end if;
end;
$$;

comment on function public.store_payout_read_assert_store_access(uuid) is
  'Seller Payout Read Model V1 — owner/manager only. Fail closed.';

revoke all on function public.store_payout_read_assert_store_access(uuid)
  from public, anon;
grant execute on function public.store_payout_read_assert_store_access(uuid)
  to authenticated, service_role;

create or replace function public.store_payout_read_clamp_limit(
  p_limit integer
)
returns integer
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_limit is null then
    return 50;
  end if;
  if p_limit < 1 then
    raise exception 'limit must be >= 1';
  end if;
  return least(p_limit, 50);
end;
$$;

revoke all on function public.store_payout_read_clamp_limit(integer)
  from public, anon;
grant execute on function public.store_payout_read_clamp_limit(integer)
  to authenticated, service_role;

-- Safe seller-facing projection for one RELEASED capture (no fingerprints/journals/metadata).
create or replace function public.store_payout_read_project_capture(
  p_store_id uuid,
  p_capture_event_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_capture public.store_payment_outcome_events%rowtype;
  v_order public.orders%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_settlement_state text;
  v_payout_state text;
  v_last_action text;
  v_last_at timestamptz;
  v_fail_count int;
  v_status text;
begin
  if p_store_id is null or p_capture_event_id is null then
    raise exception 'store_id and capture_event_id are required';
  end if;

  select * into v_capture
  from public.store_payment_outcome_events e
  where e.id = p_capture_event_id
    and e.outcome = 'captured';

  if not found then
    return null;
  end if;

  select * into v_order
  from public.orders o
  where o.id = v_capture.order_id;

  if not found or v_order.store_id is distinct from p_store_id then
    return null;
  end if;

  if v_order.payment_status is distinct from 'paid' then
    return null;
  end if;

  select * into v_attempt
  from public.payment_attempts pa
  where pa.id = v_capture.payment_attempt_id;

  if not found or v_attempt.status is distinct from 'captured' then
    return null;
  end if;

  if exists (
    select 1
    from public.store_payment_outcome_events r
    where r.payment_attempt_id = v_capture.payment_attempt_id
      and r.outcome = 'refunded'
  ) then
    return null;
  end if;

  v_settlement_state := public.store_settlement_state_for_capture(v_capture.id);
  if v_settlement_state is distinct from 'RELEASED' then
    return null;
  end if;

  if not exists (
    select 1
    from public.store_settlement_events se
    where se.capture_event_id = v_capture.id
      and se.action = 'release'
      and se.ueos_journal_entry_id is not null
  ) then
    return null;
  end if;

  v_payout_state := public.store_payout_state_for_capture(v_capture.id);

  select e.action, e.created_at
  into v_last_action, v_last_at
  from public.store_payout_events e
  where e.capture_event_id = v_capture.id
    and e.store_id = p_store_id
  order by e.created_at desc, e.id desc
  limit 1;

  select count(*)::int into v_fail_count
  from public.store_payout_events e
  where e.capture_event_id = v_capture.id
    and e.store_id = p_store_id
    and e.action = 'fail';

  if v_payout_state = 'NONE' then
    v_status := 'available';
  elsif v_payout_state = 'IN_TRANSIT' then
    v_status := 'in_transit';
  elsif v_payout_state = 'COMPLETED' then
    v_status := 'completed';
  else
    raise exception 'unknown payout state %', v_payout_state;
  end if;

  return jsonb_build_object(
    'order_id', v_order.id,
    'payment_attempt_id', v_attempt.id,
    'capture_event_id', v_capture.id,
    'amount_minor', v_capture.amount_minor,
    'currency', upper(v_capture.currency),
    'settlement_state', v_settlement_state,
    'payout_state', v_payout_state,
    'payout_status', v_status,
    'last_payout_action', v_last_action,
    'last_payout_at', v_last_at,
    'fail_count', coalesce(v_fail_count, 0),
    'capture_created_at', v_capture.created_at
  );
end;
$$;

revoke all on function public.store_payout_read_project_capture(uuid, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) get_my_seller_payout_eligibility
-- ---------------------------------------------------------------------------

create or replace function public.get_my_seller_payout_eligibility(
  p_store_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available_count int := 0;
  v_in_transit_count int := 0;
  v_currency_count int := 0;
  v_reasons text[] := array[]::text[];
  v_eligible boolean := false;
  v_rec record;
  v_proj jsonb;
begin
  perform public.store_payout_read_assert_store_access(p_store_id);

  for v_rec in
    select distinct se.capture_event_id
    from public.store_settlement_events se
    where se.store_id = p_store_id
      and se.action = 'release'
      and se.ueos_journal_entry_id is not null
  loop
    v_proj := public.store_payout_read_project_capture(
      p_store_id,
      v_rec.capture_event_id
    );
    if v_proj is null then
      continue;
    end if;
    if (v_proj ->> 'payout_status') = 'available' then
      v_available_count := v_available_count + 1;
    elsif (v_proj ->> 'payout_status') = 'in_transit' then
      v_in_transit_count := v_in_transit_count + 1;
    end if;
  end loop;

  select count(distinct upper(se.currency))::int into v_currency_count
  from public.store_settlement_events se
  where se.store_id = p_store_id
    and se.action = 'release'
    and se.ueos_journal_entry_id is not null;

  -- Read-model eligibility: seller may view settled payable balances.
  -- Bank/rail payouts remain disabled (foundation boundary).
  if v_available_count > 0 then
    v_eligible := true;
  else
    v_reasons := array_append(v_reasons, 'no_available_settled_balance');
  end if;

  if v_in_transit_count > 0 then
    v_reasons := array_append(v_reasons, 'has_in_transit_payouts');
  end if;

  return jsonb_build_object(
    'store_id', p_store_id,
    'eligible_for_balance_read', true,
    'has_available_for_payout', v_eligible,
    'available_capture_count', v_available_count,
    'in_transit_capture_count', v_in_transit_count,
    'release_currency_count', coalesce(v_currency_count, 0),
    'bank_payouts_enabled', false,
    'reasons', to_jsonb(v_reasons),
    'capability', 'commerce.settlement.seller_payout_read_model_v1'
  );
end;
$$;

comment on function public.get_my_seller_payout_eligibility(uuid) is
  'Seller Payout Read Model V1 — eligibility / honest flags. Owner/manager. No bank rail.';

revoke all on function public.get_my_seller_payout_eligibility(uuid)
  from public, anon;
grant execute on function public.get_my_seller_payout_eligibility(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) get_my_seller_payout_summary
-- ---------------------------------------------------------------------------

create or replace function public.get_my_seller_payout_summary(
  p_store_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buckets jsonb := '{}'::jsonb;
  v_currency text;
  v_bucket jsonb;
  v_rec record;
  v_proj jsonb;
  v_status text;
  v_amount bigint;
  v_fail_events int;
  v_by_currency jsonb := '[]'::jsonb;
begin
  perform public.store_payout_read_assert_store_access(p_store_id);

  for v_rec in
    select distinct se.capture_event_id
    from public.store_settlement_events se
    where se.store_id = p_store_id
      and se.action = 'release'
      and se.ueos_journal_entry_id is not null
  loop
    v_proj := public.store_payout_read_project_capture(
      p_store_id,
      v_rec.capture_event_id
    );
    if v_proj is null then
      continue;
    end if;

    v_currency := v_proj ->> 'currency';
    v_status := v_proj ->> 'payout_status';
    v_amount := (v_proj ->> 'amount_minor')::bigint;

    v_bucket := coalesce(
      v_buckets -> v_currency,
      jsonb_build_object(
        'currency', v_currency,
        'available_minor', 0,
        'in_transit_minor', 0,
        'completed_minor', 0,
        'available_count', 0,
        'in_transit_count', 0,
        'completed_count', 0
      )
    );

    if v_status = 'available' then
      v_bucket := jsonb_set(
        v_bucket,
        '{available_minor}',
        to_jsonb(((v_bucket ->> 'available_minor')::bigint + v_amount))
      );
      v_bucket := jsonb_set(
        v_bucket,
        '{available_count}',
        to_jsonb(((v_bucket ->> 'available_count')::int + 1))
      );
    elsif v_status = 'in_transit' then
      v_bucket := jsonb_set(
        v_bucket,
        '{in_transit_minor}',
        to_jsonb(((v_bucket ->> 'in_transit_minor')::bigint + v_amount))
      );
      v_bucket := jsonb_set(
        v_bucket,
        '{in_transit_count}',
        to_jsonb(((v_bucket ->> 'in_transit_count')::int + 1))
      );
    elsif v_status = 'completed' then
      v_bucket := jsonb_set(
        v_bucket,
        '{completed_minor}',
        to_jsonb(((v_bucket ->> 'completed_minor')::bigint + v_amount))
      );
      v_bucket := jsonb_set(
        v_bucket,
        '{completed_count}',
        to_jsonb(((v_bucket ->> 'completed_count')::int + 1))
      );
    end if;

    v_buckets := jsonb_set(v_buckets, array[v_currency], v_bucket);
  end loop;

  select coalesce(count(*)::int, 0) into v_fail_events
  from public.store_payout_events e
  where e.store_id = p_store_id
    and e.action = 'fail';

  select coalesce(jsonb_agg(value order by key), '[]'::jsonb)
  into v_by_currency
  from jsonb_each(v_buckets);

  return jsonb_build_object(
    'store_id', p_store_id,
    'by_currency', coalesce(v_by_currency, '[]'::jsonb),
    'failed_event_count', v_fail_events,
    'bank_payouts_enabled', false,
    'capability', 'commerce.settlement.seller_payout_read_model_v1'
  );
end;
$$;

comment on function public.get_my_seller_payout_summary(uuid) is
  'Seller Payout Read Model V1 — per-currency available / in_transit / completed minors. Owner/manager.';

revoke all on function public.get_my_seller_payout_summary(uuid)
  from public, anon;
grant execute on function public.get_my_seller_payout_summary(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) get_my_seller_payouts — newest-first, bounded
-- ---------------------------------------------------------------------------

create or replace function public.get_my_seller_payouts(
  p_store_id uuid,
  p_limit integer default 50,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
  v_items jsonb := '[]'::jsonb;
  v_proj jsonb;
  v_count int := 0;
  v_rec record;
  v_next_created_at timestamptz := null;
  v_next_id uuid := null;
  v_has_more boolean := false;
begin
  perform public.store_payout_read_assert_store_access(p_store_id);
  v_limit := public.store_payout_read_clamp_limit(p_limit);

  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'pagination cursor requires both before_created_at and before_id';
  end if;

  for v_rec in
    select c.id as capture_event_id, c.created_at
    from public.store_payment_outcome_events c
    join public.orders o on o.id = c.order_id
    where o.store_id = p_store_id
      and c.outcome = 'captured'
      and exists (
        select 1
        from public.store_settlement_events se
        where se.capture_event_id = c.id
          and se.store_id = p_store_id
          and se.action = 'release'
          and se.ueos_journal_entry_id is not null
      )
      and (
        p_before_created_at is null
        or (c.created_at, c.id) < (p_before_created_at, p_before_id)
      )
    order by c.created_at desc, c.id desc
  loop
    v_proj := public.store_payout_read_project_capture(
      p_store_id,
      v_rec.capture_event_id
    );
    if v_proj is null then
      continue;
    end if;

    -- Page already full: this projected row proves has_more; do not append.
    if v_count >= v_limit then
      v_has_more := true;
      v_next_created_at := (v_items -> (v_count - 1) ->> 'capture_created_at')::timestamptz;
      v_next_id := (v_items -> (v_count - 1) ->> 'capture_event_id')::uuid;
      exit;
    end if;

    v_items := v_items || jsonb_build_array(v_proj);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'store_id', p_store_id,
    'items', v_items,
    'limit', v_limit,
    'has_more', v_has_more,
    'next_cursor', case
      when v_has_more then jsonb_build_object(
        'before_created_at', v_next_created_at,
        'before_id', v_next_id
      )
      else null
    end,
    'capability', 'commerce.settlement.seller_payout_read_model_v1'
  );
end;
$$;

comment on function public.get_my_seller_payouts(uuid, integer, timestamptz, uuid) is
  'Seller Payout Read Model V1 — newest-first capture projections, limit<=50. Owner/manager. No sensitive fields.';

revoke all on function public.get_my_seller_payouts(uuid, integer, timestamptz, uuid)
  from public, anon;
grant execute on function public.get_my_seller_payouts(uuid, integer, timestamptz, uuid)
  to authenticated, service_role;
