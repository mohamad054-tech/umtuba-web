-- UMTUBA Store — Settlement ↔ Payout Reconciliation Read V1
-- Additive after Seller Payout Read Model V1 (20260882).
-- Owner/manager read-only reconciliation of settlement vs payout states.
-- Does NOT: bank rails, payout booking writes, Dashboard/Admin UI, client money.

-- ---------------------------------------------------------------------------
-- 1) Access (reuse payout read access) + pure issue builder
-- ---------------------------------------------------------------------------

create or replace function public.store_settlement_payout_recon_build_issues(
  p_settlement_state text,
  p_payout_state text,
  p_submit_count integer,
  p_fail_count integer,
  p_confirm_count integer,
  p_has_refund boolean
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_issues jsonb := '[]'::jsonb;
  v_released boolean := (p_settlement_state = 'RELEASED');
  v_unsettled boolean := p_settlement_state in (
    'UNALLOCATED', 'ALLOCATED', 'HELD', 'REVERSED'
  );
  v_expected_open int := case
    when p_payout_state in ('IN_TRANSIT', 'COMPLETED') then 1
    else 0
  end;
begin
  if coalesce(p_has_refund, false)
     and p_payout_state in ('IN_TRANSIT', 'COMPLETED') then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'refunded_with_active_payout',
      'severity', 'error',
      'message', 'Trusted refund exists while payout is in_transit or completed.'
    ));
  end if;

  if not v_released
     and (coalesce(p_submit_count, 0) > 0 or p_payout_state is distinct from 'NONE') then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'payout_without_released_settlement',
      'severity', 'error',
      'message', 'Payout booking or non-NONE payout state without settlement RELEASED.'
    ));
  end if;

  if v_unsettled
     and (coalesce(p_submit_count, 0) > 0 or p_payout_state is distinct from 'NONE') then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'unsettled_with_payout',
      'severity', 'error',
      'message', format(
        'Settlement state %s is unsettled but payout activity exists.',
        p_settlement_state
      )
    ));
  end if;

  if coalesce(p_submit_count, 0) > coalesce(p_fail_count, 0) + v_expected_open then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'duplicate_payout_booking',
      'severity', 'error',
      'message', 'More submit events than explained by fail/confirm lifecycle (duplicate booking).'
    ));
  end if;

  if coalesce(p_confirm_count, 0) > 1 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'duplicate_payout_booking',
      'severity', 'error',
      'message', 'More than one confirm event for the same capture.'
    ));
  end if;

  if p_payout_state = 'COMPLETED' and not v_released then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'completed_without_release',
      'severity', 'error',
      'message', 'Payout COMPLETED but settlement is not RELEASED.'
    ));
  end if;

  if p_payout_state = 'COMPLETED' and coalesce(p_confirm_count, 0) < 1 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'completed_missing_confirm',
      'severity', 'error',
      'message', 'Payout state COMPLETED without a confirm event.'
    ));
  end if;

  if p_payout_state = 'IN_TRANSIT'
     and coalesce(p_submit_count, 0) < coalesce(p_fail_count, 0) + 1 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'in_transit_missing_submit',
      'severity', 'error',
      'message', 'Payout IN_TRANSIT without a matching open submit.'
    ));
  end if;

  if v_released
     and p_payout_state = 'NONE'
     and coalesce(p_submit_count, 0) = 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'released_without_payout_booking',
      'severity', 'info',
      'message', 'Settlement RELEASED with no payout booking yet (available for payout).'
    ));
  end if;

  if jsonb_array_length(v_issues) = 0 then
    v_issues := jsonb_build_array(jsonb_build_object(
      'code', 'aligned',
      'severity', 'ok',
      'message', 'Settlement and payout states are consistent.'
    ));
  end if;

  return v_issues;
end;
$$;

revoke all on function public.store_settlement_payout_recon_build_issues(
  text, text, integer, integer, integer, boolean
) from public, anon, authenticated;

create or replace function public.store_settlement_payout_recon_highest_severity(
  p_issues jsonb
)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(
    (
      select i.severity
      from jsonb_array_elements(coalesce(p_issues, '[]'::jsonb)) e
      cross join lateral (
        select e.value ->> 'severity' as severity
      ) i
      order by case i.severity
        when 'error' then 3
        when 'warning' then 2
        when 'info' then 1
        else 0
      end desc
      limit 1
    ),
    'ok'
  );
$$;

revoke all on function public.store_settlement_payout_recon_highest_severity(jsonb)
  from public, anon, authenticated;

create or replace function public.store_settlement_payout_recon_project_capture(
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
  v_submit_count int;
  v_fail_count int;
  v_confirm_count int;
  v_has_refund boolean;
  v_issues jsonb;
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

  select * into v_order from public.orders o where o.id = v_capture.order_id;
  if not found or v_order.store_id is distinct from p_store_id then
    return null;
  end if;

  select * into v_attempt
  from public.payment_attempts pa
  where pa.id = v_capture.payment_attempt_id;
  if not found then
    return null;
  end if;

  v_has_refund := exists (
    select 1
    from public.store_payment_outcome_events r
    where r.payment_attempt_id = v_capture.payment_attempt_id
      and r.outcome = 'refunded'
  );

  v_settlement_state := public.store_settlement_state_for_capture(v_capture.id);
  v_payout_state := public.store_payout_state_for_capture(v_capture.id);

  select
    count(*) filter (where e.action = 'submit'),
    count(*) filter (where e.action = 'fail'),
    count(*) filter (where e.action = 'confirm')
  into v_submit_count, v_fail_count, v_confirm_count
  from public.store_payout_events e
  where e.capture_event_id = v_capture.id
    and e.store_id = p_store_id;

  v_issues := public.store_settlement_payout_recon_build_issues(
    v_settlement_state,
    v_payout_state,
    coalesce(v_submit_count, 0),
    coalesce(v_fail_count, 0),
    coalesce(v_confirm_count, 0),
    v_has_refund
  );

  return jsonb_build_object(
    'order_id', v_order.id,
    'payment_attempt_id', v_attempt.id,
    'capture_event_id', v_capture.id,
    'amount_minor', v_capture.amount_minor,
    'currency', upper(v_capture.currency),
    'settlement_state', v_settlement_state,
    'payout_state', v_payout_state,
    'issues', v_issues,
    'highest_severity', public.store_settlement_payout_recon_highest_severity(v_issues),
    'capture_created_at', v_capture.created_at
  );
end;
$$;

revoke all on function public.store_settlement_payout_recon_project_capture(uuid, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) List RPC — newest-first, bounded
-- ---------------------------------------------------------------------------

create or replace function public.get_my_seller_settlement_payout_reconciliation(
  p_store_id uuid,
  p_limit integer default 50,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_issues_only boolean default false
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
  v_has_more boolean := false;
  v_next_created_at timestamptz := null;
  v_next_id uuid := null;
  v_severity text;
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
      and (
        p_before_created_at is null
        or (c.created_at, c.id) < (p_before_created_at, p_before_id)
      )
      and (
        exists (
          select 1 from public.store_settlement_events se
          where se.capture_event_id = c.id and se.store_id = p_store_id
        )
        or exists (
          select 1 from public.store_payout_events pe
          where pe.capture_event_id = c.id and pe.store_id = p_store_id
        )
      )
    order by c.created_at desc, c.id desc
  loop
    v_proj := public.store_settlement_payout_recon_project_capture(
      p_store_id,
      v_rec.capture_event_id
    );
    if v_proj is null then
      continue;
    end if;

    if coalesce(p_issues_only, false) then
      v_severity := v_proj ->> 'highest_severity';
      if v_severity is null or v_severity = 'ok' then
        continue;
      end if;
    end if;

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
    'capability', 'commerce.settlement.payout_reconciliation_read_v1'
  );
end;
$$;

comment on function public.get_my_seller_settlement_payout_reconciliation(
  uuid, integer, timestamptz, uuid, boolean
) is
  'Settlement↔Payout Reconciliation Read V1 — newest-first capture issues. Owner/manager. Read-only.';

revoke all on function public.get_my_seller_settlement_payout_reconciliation(
  uuid, integer, timestamptz, uuid, boolean
) from public, anon;
grant execute on function public.get_my_seller_settlement_payout_reconciliation(
  uuid, integer, timestamptz, uuid, boolean
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Summary RPC — per-currency + issue counts
-- ---------------------------------------------------------------------------

create or replace function public.get_my_seller_settlement_payout_reconciliation_summary(
  p_store_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issue_counts jsonb := '{}'::jsonb;
  v_currency_buckets jsonb := '{}'::jsonb;
  v_rec record;
  v_proj jsonb;
  v_currency text;
  v_bucket jsonb;
  v_issue jsonb;
  v_code text;
  v_severity text;
  v_by_currency jsonb;
begin
  perform public.store_payout_read_assert_store_access(p_store_id);

  for v_rec in
    select distinct c.id as capture_event_id
    from public.store_payment_outcome_events c
    join public.orders o on o.id = c.order_id
    where o.store_id = p_store_id
      and c.outcome = 'captured'
      and (
        exists (
          select 1 from public.store_settlement_events se
          where se.capture_event_id = c.id and se.store_id = p_store_id
        )
        or exists (
          select 1 from public.store_payout_events pe
          where pe.capture_event_id = c.id and pe.store_id = p_store_id
        )
      )
  loop
    v_proj := public.store_settlement_payout_recon_project_capture(
      p_store_id,
      v_rec.capture_event_id
    );
    if v_proj is null then
      continue;
    end if;

    v_currency := v_proj ->> 'currency';
    v_severity := v_proj ->> 'highest_severity';
    v_bucket := coalesce(
      v_currency_buckets -> v_currency,
      jsonb_build_object(
        'currency', v_currency,
        'capture_count', 0,
        'issue_count', 0,
        'error_count', 0,
        'info_count', 0
      )
    );
    v_bucket := jsonb_set(
      v_bucket,
      '{capture_count}',
      to_jsonb(((v_bucket ->> 'capture_count')::int + 1))
    );
    if v_severity is distinct from 'ok' then
      v_bucket := jsonb_set(
        v_bucket,
        '{issue_count}',
        to_jsonb(((v_bucket ->> 'issue_count')::int + 1))
      );
    end if;
    if v_severity = 'error' then
      v_bucket := jsonb_set(
        v_bucket,
        '{error_count}',
        to_jsonb(((v_bucket ->> 'error_count')::int + 1))
      );
    end if;
    if v_severity = 'info' then
      v_bucket := jsonb_set(
        v_bucket,
        '{info_count}',
        to_jsonb(((v_bucket ->> 'info_count')::int + 1))
      );
    end if;
    v_currency_buckets := jsonb_set(v_currency_buckets, array[v_currency], v_bucket);

    for v_issue in
      select value from jsonb_array_elements(coalesce(v_proj -> 'issues', '[]'::jsonb))
    loop
      v_code := v_issue ->> 'code';
      if v_code is null then
        continue;
      end if;
      v_issue_counts := jsonb_set(
        v_issue_counts,
        array[v_code],
        to_jsonb(coalesce((v_issue_counts ->> v_code)::int, 0) + 1)
      );
    end loop;
  end loop;

  select coalesce(jsonb_agg(value order by key), '[]'::jsonb)
  into v_by_currency
  from jsonb_each(v_currency_buckets);

  return jsonb_build_object(
    'store_id', p_store_id,
    'by_currency', coalesce(v_by_currency, '[]'::jsonb),
    'issue_counts', v_issue_counts,
    'capability', 'commerce.settlement.payout_reconciliation_read_v1'
  );
end;
$$;

comment on function public.get_my_seller_settlement_payout_reconciliation_summary(uuid) is
  'Settlement↔Payout Reconciliation Read V1 — per-currency and issue counts. Owner/manager. Read-only.';

revoke all on function public.get_my_seller_settlement_payout_reconciliation_summary(uuid)
  from public, anon;
grant execute on function public.get_my_seller_settlement_payout_reconciliation_summary(uuid)
  to authenticated, service_role;
