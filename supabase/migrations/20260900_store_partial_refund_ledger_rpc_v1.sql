-- =============================================================================
-- Commerce Partial Refund Ledger Privileged RPC V1
-- LOCAL DRAFT ONLY — do not remote-apply in this GO.
--
-- Requires prior local draft 20260899 (schema). Remote apply order (future GO):
--   20260899 → 20260900
--
-- SECURITY DEFINER RPCs for durable reservation accounting only.
-- Does NOT: payment-provider/Sync refund execution, restock, entitlement, settlement,
--           commission unwind, payout, Manual Ops, commerce_confirm.
-- Grants: service_role ONLY (never anon/authenticated/public).
-- =============================================================================

-- Version proof (read-only at authoring):
--   Remote tip: 20260898
--   20260899 / 20260900 absent remotely
--   => 20260900 free for local draft

-- ---------------------------------------------------------------------------
-- Helpers: serialize commit + lines as jsonb
-- ---------------------------------------------------------------------------

create or replace function public.store_partial_refund_ledger_commit_json(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.store_partial_refund_ledger_commits%rowtype;
  lines jsonb;
begin
  select * into c
  from public.store_partial_refund_ledger_commits
  where id = p_id;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'order_item_id', l.order_item_id,
      'requested_quantity', l.requested_quantity,
      'refund_amount_minor', l.refund_amount_minor
    )
    order by l.order_item_id
  ), '[]'::jsonb)
  into lines
  from public.store_partial_refund_ledger_lines l
  where l.ledger_commit_id = p_id;

  return jsonb_build_object(
    'ledger_id', c.id,
    'store_id', c.store_id,
    'order_id', c.order_id,
    'payment_attempt_id', c.payment_attempt_id,
    'capture_event_id', c.capture_event_id,
    'status', c.status,
    'currency', c.currency,
    'capture_amount_minor', c.capture_amount_minor,
    'refund_amount_minor', c.refund_amount_minor,
    'calculation_fingerprint', c.calculation_fingerprint,
    'idempotency_key', c.idempotency_key,
    'planned_accounting_version', c.planned_accounting_version,
    'committed_accounting_version', c.committed_accounting_version,
    'attempt_count', c.attempt_count,
    'failure_code', c.failure_code,
    'failure_message_safe', c.failure_message_safe,
    'created_at', c.created_at,
    'updated_at', c.updated_at,
    'lines', lines
  );
end;
$$;

revoke all on function public.store_partial_refund_ledger_commit_json(uuid)
  from public, anon, authenticated;
grant execute on function public.store_partial_refund_ledger_commit_json(uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- ensure capture accounting
-- ---------------------------------------------------------------------------

create or replace function public.ensure_store_partial_refund_capture_accounting(
  p_store_id uuid,
  p_order_id uuid,
  p_payment_attempt_id uuid,
  p_capture_event_id uuid,
  p_currency text,
  p_capture_amount_minor bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cur text := upper(btrim(coalesce(p_currency, '')));
  row public.store_partial_refund_capture_accounting%rowtype;
begin
  if p_store_id is null or p_order_id is null
     or p_payment_attempt_id is null or p_capture_event_id is null then
    raise exception 'missing_capture';
  end if;
  if char_length(cur) <> 3 then
    raise exception 'currency_mismatch';
  end if;
  if p_capture_amount_minor is null or p_capture_amount_minor <= 0 then
    raise exception 'missing_capture';
  end if;

  insert into public.store_partial_refund_capture_accounting (
    capture_event_id, store_id, order_id, payment_attempt_id,
    currency, capture_amount_minor
  ) values (
    p_capture_event_id, p_store_id, p_order_id, p_payment_attempt_id,
    cur, p_capture_amount_minor
  )
  on conflict (capture_event_id) do nothing;

  select * into row
  from public.store_partial_refund_capture_accounting
  where capture_event_id = p_capture_event_id
  for update;

  if row.store_id is distinct from p_store_id
     or row.order_id is distinct from p_order_id
     or row.payment_attempt_id is distinct from p_payment_attempt_id
     or row.capture_amount_minor is distinct from p_capture_amount_minor
     or row.currency is distinct from cur then
    raise exception 'missing_capture';
  end if;

  return jsonb_build_object(
    'ok', true,
    'capture_event_id', row.capture_event_id,
    'store_id', row.store_id,
    'order_id', row.order_id,
    'payment_attempt_id', row.payment_attempt_id,
    'currency', row.currency,
    'capture_amount_minor', row.capture_amount_minor,
    'committed_refund_amount_minor', row.committed_refund_amount_minor,
    'accounting_version', row.accounting_version
  );
end;
$$;

revoke all on function public.ensure_store_partial_refund_capture_accounting(uuid, uuid, uuid, uuid, text, bigint)
  from public, anon, authenticated;
grant execute on function public.ensure_store_partial_refund_capture_accounting(uuid, uuid, uuid, uuid, text, bigint)
  to service_role;

-- ---------------------------------------------------------------------------
-- plan (insert planned + lines; idempotent)
-- ---------------------------------------------------------------------------

create or replace function public.plan_store_partial_refund_ledger(
  p_ledger_id uuid,
  p_store_id uuid,
  p_order_id uuid,
  p_payment_attempt_id uuid,
  p_capture_event_id uuid,
  p_currency text,
  p_capture_amount_minor bigint,
  p_refund_amount_minor bigint,
  p_calculation_fingerprint text,
  p_idempotency_key text,
  p_expected_accounting_version bigint,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cur text := upper(btrim(coalesce(p_currency, '')));
  idem text := btrim(coalesce(p_idempotency_key, ''));
  fp text := btrim(coalesce(p_calculation_fingerprint, ''));
  existing public.store_partial_refund_ledger_commits%rowtype;
  capture public.store_partial_refund_capture_accounting%rowtype;
  line jsonb;
  item_id uuid;
  qty integer;
  amt bigint;
  sum_amt bigint := 0;
begin
  if p_ledger_id is null or p_store_id is null or p_order_id is null
     or p_payment_attempt_id is null or p_capture_event_id is null then
    raise exception 'malformed_id';
  end if;
  if char_length(idem) < 8 or char_length(idem) > 128 then
    raise exception 'malformed_idempotency_key';
  end if;
  if char_length(fp) < 8 or char_length(fp) > 256 then
    raise exception 'missing_ownership';
  end if;
  if p_refund_amount_minor is null or p_refund_amount_minor <= 0 then
    raise exception 'zero_amount';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'empty_lines';
  end if;

  perform public.ensure_store_partial_refund_capture_accounting(
    p_store_id, p_order_id, p_payment_attempt_id, p_capture_event_id, cur, p_capture_amount_minor
  );

  select * into existing
  from public.store_partial_refund_ledger_commits
  where store_id = p_store_id and idempotency_key = idem;

  if found then
    if existing.calculation_fingerprint is distinct from fp
       or existing.refund_amount_minor is distinct from p_refund_amount_minor
       or existing.capture_event_id is distinct from p_capture_event_id then
      raise exception 'duplicate_idempotency_key';
    end if;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'commit', public.store_partial_refund_ledger_commit_json(existing.id)
    );
  end if;

  if exists (
    select 1 from public.store_partial_refund_ledger_commits where id = p_ledger_id
  ) then
    raise exception 'duplicate_ledger_id';
  end if;

  select * into capture
  from public.store_partial_refund_capture_accounting
  where capture_event_id = p_capture_event_id
  for update;

  if capture.accounting_version is distinct from p_expected_accounting_version then
    raise exception 'stale_version';
  end if;
  if p_refund_amount_minor > (capture.capture_amount_minor - capture.committed_refund_amount_minor) then
    raise exception 'over_refund';
  end if;

  for line in select * from jsonb_array_elements(p_lines)
  loop
    item_id := (line->>'order_item_id')::uuid;
    qty := (line->>'requested_quantity')::integer;
    amt := (line->>'refund_amount_minor')::bigint;
    if item_id is null or qty is null or qty <= 0 or amt is null or amt <= 0 then
      raise exception 'inconsistent_line_math';
    end if;
    sum_amt := sum_amt + amt;
  end loop;
  if sum_amt is distinct from p_refund_amount_minor then
    raise exception 'inconsistent_line_math';
  end if;

  insert into public.store_partial_refund_ledger_commits (
    id, store_id, order_id, payment_attempt_id, capture_event_id, status,
    currency, capture_amount_minor, refund_amount_minor,
    calculation_fingerprint, idempotency_key, planned_accounting_version
  ) values (
    p_ledger_id, p_store_id, p_order_id, p_payment_attempt_id, p_capture_event_id, 'planned',
    cur, p_capture_amount_minor, p_refund_amount_minor,
    fp, idem, capture.accounting_version
  );

  for line in select * from jsonb_array_elements(p_lines)
  loop
    insert into public.store_partial_refund_ledger_lines (
      ledger_commit_id, order_item_id, requested_quantity, refund_amount_minor
    ) values (
      p_ledger_id,
      (line->>'order_item_id')::uuid,
      (line->>'requested_quantity')::integer,
      (line->>'refund_amount_minor')::bigint
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'commit', public.store_partial_refund_ledger_commit_json(p_ledger_id)
  );
exception
  when unique_violation then
    raise exception 'duplicate_idempotency_key';
end;
$$;

revoke all on function public.plan_store_partial_refund_ledger(uuid, uuid, uuid, uuid, uuid, text, bigint, bigint, text, text, bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.plan_store_partial_refund_ledger(uuid, uuid, uuid, uuid, uuid, text, bigint, bigint, text, text, bigint, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- begin: planned|failed → committing
-- ---------------------------------------------------------------------------

create or replace function public.begin_store_partial_refund_ledger_commit(
  p_ledger_id uuid,
  p_purchased_quantity_by_line jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.store_partial_refund_ledger_commits%rowtype;
  capture public.store_partial_refund_capture_accounting%rowtype;
  line public.store_partial_refund_ledger_lines%rowtype;
  purchased integer;
  committed_qty integer;
begin
  if p_ledger_id is null then
    raise exception 'malformed_id';
  end if;
  if p_purchased_quantity_by_line is null
     or jsonb_typeof(p_purchased_quantity_by_line) <> 'object' then
    raise exception 'missing_order_item';
  end if;

  select * into c
  from public.store_partial_refund_ledger_commits
  where id = p_ledger_id
  for update;
  if not found then
    raise exception 'unknown_refund';
  end if;
  if c.status = 'committed' then
    raise exception 'duplicate_commit';
  end if;
  if c.status = 'committing' then
    raise exception 'concurrent_conflict';
  end if;
  if c.status not in ('planned', 'failed') then
    raise exception 'unsupported_transition';
  end if;

  select * into capture
  from public.store_partial_refund_capture_accounting
  where capture_event_id = c.capture_event_id
  for update;
  if not found then
    raise exception 'missing_capture';
  end if;

  if c.refund_amount_minor > (capture.capture_amount_minor - capture.committed_refund_amount_minor) then
    raise exception 'over_refund';
  end if;

  for line in
    select * from public.store_partial_refund_ledger_lines
    where ledger_commit_id = p_ledger_id
  loop
    purchased := (p_purchased_quantity_by_line->>line.order_item_id::text)::integer;
    if purchased is null or purchased <= 0 then
      raise exception 'missing_order_item';
    end if;
    select coalesce(
      (
        select q.committed_quantity
        from public.store_partial_refund_line_committed_qty q
        where q.capture_event_id = c.capture_event_id
          and q.order_item_id = line.order_item_id
      ),
      0
    ) into committed_qty;
    if committed_qty + line.requested_quantity > purchased then
      raise exception 'over_quantity';
    end if;
  end loop;

  if exists (
    select 1 from public.store_partial_refund_ledger_commits x
    where x.capture_event_id = c.capture_event_id
      and x.status = 'committing'
      and x.id is distinct from p_ledger_id
  ) then
    raise exception 'concurrent_conflict';
  end if;

  update public.store_partial_refund_ledger_commits
  set status = 'committing',
      attempt_count = attempt_count + 1,
      failure_code = null,
      failure_message_safe = null,
      planned_accounting_version = capture.accounting_version,
      updated_at = now()
  where id = p_ledger_id;

  return jsonb_build_object(
    'ok', true,
    'commit', public.store_partial_refund_ledger_commit_json(p_ledger_id)
  );
exception
  when unique_violation then
    raise exception 'concurrent_conflict';
end;
$$;

revoke all on function public.begin_store_partial_refund_ledger_commit(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.begin_store_partial_refund_ledger_commit(uuid, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- complete: committing → committed (reservation only)
-- ---------------------------------------------------------------------------

create or replace function public.complete_store_partial_refund_ledger_commit(
  p_ledger_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.store_partial_refund_ledger_commits%rowtype;
  capture public.store_partial_refund_capture_accounting%rowtype;
  line public.store_partial_refund_ledger_lines%rowtype;
begin
  if p_ledger_id is null then
    raise exception 'malformed_id';
  end if;

  select * into c
  from public.store_partial_refund_ledger_commits
  where id = p_ledger_id
  for update;
  if not found then
    raise exception 'unknown_refund';
  end if;
  if c.status = 'committed' then
    raise exception 'duplicate_commit';
  end if;
  if c.status is distinct from 'committing' then
    raise exception 'invalid_state';
  end if;

  select * into capture
  from public.store_partial_refund_capture_accounting
  where capture_event_id = c.capture_event_id
  for update;
  if not found then
    raise exception 'missing_capture';
  end if;
  if capture.accounting_version is distinct from c.planned_accounting_version then
    raise exception 'stale_version';
  end if;
  if c.refund_amount_minor > (capture.capture_amount_minor - capture.committed_refund_amount_minor) then
    raise exception 'over_refund';
  end if;

  for line in
    select * from public.store_partial_refund_ledger_lines
    where ledger_commit_id = p_ledger_id
  loop
    insert into public.store_partial_refund_line_committed_qty (
      capture_event_id, order_item_id, committed_quantity
    ) values (
      c.capture_event_id, line.order_item_id, line.requested_quantity
    )
    on conflict (capture_event_id, order_item_id) do update
      set committed_quantity =
        public.store_partial_refund_line_committed_qty.committed_quantity
        + excluded.committed_quantity;
  end loop;

  update public.store_partial_refund_capture_accounting
  set committed_refund_amount_minor = committed_refund_amount_minor + c.refund_amount_minor,
      accounting_version = accounting_version + 1,
      updated_at = now()
  where capture_event_id = c.capture_event_id
  returning * into capture;

  update public.store_partial_refund_ledger_commits
  set status = 'committed',
      committed_accounting_version = capture.accounting_version,
      updated_at = now()
  where id = p_ledger_id;

  return jsonb_build_object(
    'ok', true,
    'commit', public.store_partial_refund_ledger_commit_json(p_ledger_id),
    'accounting_version', capture.accounting_version,
    'committed_refund_amount_minor', capture.committed_refund_amount_minor
  );
end;
$$;

revoke all on function public.complete_store_partial_refund_ledger_commit(uuid)
  from public, anon, authenticated;
grant execute on function public.complete_store_partial_refund_ledger_commit(uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- fail: committing → failed
-- ---------------------------------------------------------------------------

create or replace function public.fail_store_partial_refund_ledger_commit(
  p_ledger_id uuid,
  p_failure_code text,
  p_failure_message_safe text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.store_partial_refund_ledger_commits%rowtype;
  code text := btrim(coalesce(p_failure_code, ''));
  msg text := btrim(coalesce(p_failure_message_safe, ''));
begin
  if p_ledger_id is null then
    raise exception 'malformed_id';
  end if;
  if char_length(code) < 1 or char_length(code) > 80 then
    raise exception 'malformed_idempotency_key';
  end if;
  if char_length(msg) < 1 or char_length(msg) > 500 then
    raise exception 'malformed_idempotency_key';
  end if;

  select * into c
  from public.store_partial_refund_ledger_commits
  where id = p_ledger_id
  for update;
  if not found then
    raise exception 'unknown_refund';
  end if;
  if c.status = 'committed' then
    raise exception 'invalid_state';
  end if;
  if c.status is distinct from 'committing' then
    raise exception 'unsupported_transition';
  end if;

  update public.store_partial_refund_ledger_commits
  set status = 'failed',
      failure_code = code,
      failure_message_safe = msg,
      updated_at = now()
  where id = p_ledger_id;

  return jsonb_build_object(
    'ok', true,
    'commit', public.store_partial_refund_ledger_commit_json(p_ledger_id)
  );
end;
$$;

revoke all on function public.fail_store_partial_refund_ledger_commit(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.fail_store_partial_refund_ledger_commit(uuid, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- reads
-- ---------------------------------------------------------------------------

create or replace function public.get_store_partial_refund_capture_accounting(
  p_capture_event_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.store_partial_refund_capture_accounting%rowtype;
  qty jsonb;
begin
  if p_capture_event_id is null then
    raise exception 'malformed_id';
  end if;
  select * into row
  from public.store_partial_refund_capture_accounting
  where capture_event_id = p_capture_event_id;
  if not found then
    return jsonb_build_object('ok', true, 'found', false);
  end if;

  select coalesce(jsonb_object_agg(order_item_id::text, committed_quantity), '{}'::jsonb)
  into qty
  from public.store_partial_refund_line_committed_qty
  where capture_event_id = p_capture_event_id;

  return jsonb_build_object(
    'ok', true,
    'found', true,
    'capture_event_id', row.capture_event_id,
    'store_id', row.store_id,
    'order_id', row.order_id,
    'payment_attempt_id', row.payment_attempt_id,
    'currency', row.currency,
    'capture_amount_minor', row.capture_amount_minor,
    'committed_refund_amount_minor', row.committed_refund_amount_minor,
    'accounting_version', row.accounting_version,
    'committed_quantity_by_line_id', qty
  );
end;
$$;

revoke all on function public.get_store_partial_refund_capture_accounting(uuid)
  from public, anon, authenticated;
grant execute on function public.get_store_partial_refund_capture_accounting(uuid)
  to service_role;

create or replace function public.get_store_partial_refund_ledger_commit(
  p_ledger_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  j jsonb;
begin
  if p_ledger_id is null then
    raise exception 'malformed_id';
  end if;
  j := public.store_partial_refund_ledger_commit_json(p_ledger_id);
  if j is null then
    return jsonb_build_object('ok', true, 'found', false);
  end if;
  return jsonb_build_object('ok', true, 'found', true, 'commit', j);
end;
$$;

revoke all on function public.get_store_partial_refund_ledger_commit(uuid)
  from public, anon, authenticated;
grant execute on function public.get_store_partial_refund_ledger_commit(uuid)
  to service_role;

create or replace function public.list_store_partial_refund_ledger_committed(
  p_capture_event_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  arr jsonb := '[]'::jsonb;
  r record;
begin
  if p_capture_event_id is null then
    raise exception 'malformed_id';
  end if;
  for r in
    select id
    from public.store_partial_refund_ledger_commits
    where capture_event_id = p_capture_event_id
      and status = 'committed'
    order by created_at, id
  loop
    arr := arr || jsonb_build_array(
      public.store_partial_refund_ledger_commit_json(r.id)
    );
  end loop;
  return jsonb_build_object('ok', true, 'commits', arr);
end;
$$;

revoke all on function public.list_store_partial_refund_ledger_committed(uuid)
  from public, anon, authenticated;
grant execute on function public.list_store_partial_refund_ledger_committed(uuid)
  to service_role;

comment on function public.plan_store_partial_refund_ledger(uuid, uuid, uuid, uuid, uuid, text, bigint, bigint, text, text, bigint, jsonb) is
  'service_role only. Plan durable partial-refund ledger reservation. Not a provider refund.';
comment on function public.complete_store_partial_refund_ledger_commit(uuid) is
  'service_role only. Commit ledger reservation only. Does not move money or call payment providers/Sync.';
