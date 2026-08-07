-- =============================================================================
-- Commerce Partial Refund Committed Reservation Compensation V1
-- LOCAL ONLY -- do not remote-apply in this GO.
--
-- Admin/service_role accounting-only unwind: committed -> compensated.
-- Restores capture amount + per-line quantity ceilings consumed at complete.
-- Does NOT: provider refunds, money, restock, entitlement, settlement,
--           commission, payout, commerce_confirm, auto-recovery.
--
-- Representation: terminal status `compensated` on the same ledger row
-- (not a parallel compensating event). Compatible with:
--   - unique committing index (status = 'committing' only)
--   - list_committed (status = 'committed' only) -- compensated drops out
--   - stuck recovery (committing -> failed only; never touches committed)
--
-- Version selection proof (2026-08-07 reallocation):
--   Rejected 20260906: Learning owns learning_assessment_due_dates_calendar_v1
--     (present in remote schema_migrations)
--   Git claims: 20260901 Learning; 20260902-04 + 20260910-11 Translation;
--               20260905 Commerce list-committing
--   Checked free: 20260907/08/09/12 -- absent git log, worktrees, remote (c07=0)
--   => 20260907 lowest safe Commerce compensation draft
-- Depends on: 20260899 schema + 20260900 RPCs (+ optional 20260905 list)
-- =============================================================================

-- Allow terminal compensated status on existing commit rows.
alter table public.store_partial_refund_ledger_commits
  drop constraint if exists store_partial_refund_ledger_commits_status_check;

alter table public.store_partial_refund_ledger_commits
  add constraint store_partial_refund_ledger_commits_status_check
  check (
    status in ('planned', 'committing', 'committed', 'failed', 'compensated')
  );

alter table public.store_partial_refund_ledger_commits
  add column if not exists compensation_reason_safe text
    check (
      compensation_reason_safe is null
      or char_length(compensation_reason_safe) between 3 and 500
    );

alter table public.store_partial_refund_ledger_commits
  add column if not exists compensated_at timestamptz;

-- Refresh serializer for new columns / status.
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
    'compensation_reason_safe', c.compensation_reason_safe,
    'compensated_at', c.compensated_at,
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
-- compensate: committed -> compensated (accounting ceilings restored once)
-- ---------------------------------------------------------------------------

create or replace function public.compensate_store_partial_refund_ledger_commit(
  p_ledger_id uuid,
  p_operator_reason text,
  p_expected_store_id uuid default null
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
  reason text := btrim(coalesce(p_operator_reason, ''));
  qty_row public.store_partial_refund_line_committed_qty%rowtype;
  restored_amount bigint;
begin
  if p_ledger_id is null then
    raise exception 'malformed_id';
  end if;
  if char_length(reason) < 3 or char_length(reason) > 500 then
    raise exception 'malformed_idempotency_key';
  end if;

  select * into c
  from public.store_partial_refund_ledger_commits
  where id = p_ledger_id
  for update;
  if not found then
    raise exception 'unknown_refund';
  end if;

  if p_expected_store_id is not null and c.store_id is distinct from p_expected_store_id then
    raise exception 'missing_ownership';
  end if;

  -- Idempotent replay: already compensated -- do not restore twice.
  if c.status = 'compensated' then
    return jsonb_build_object(
      'ok', true,
      'already_compensated', true,
      'commit', public.store_partial_refund_ledger_commit_json(p_ledger_id)
    );
  end if;

  if c.status is distinct from 'committed' then
    raise exception 'invalid_state';
  end if;

  select * into capture
  from public.store_partial_refund_capture_accounting
  where capture_event_id = c.capture_event_id
  for update;
  if not found then
    raise exception 'missing_capture';
  end if;

  if capture.committed_refund_amount_minor < c.refund_amount_minor then
    raise exception 'over_refund';
  end if;

  for line in
    select * from public.store_partial_refund_ledger_lines
    where ledger_commit_id = p_ledger_id
  loop
    select * into qty_row
    from public.store_partial_refund_line_committed_qty
    where capture_event_id = c.capture_event_id
      and order_item_id = line.order_item_id
    for update;
    if not found then
      raise exception 'over_quantity';
    end if;
    if qty_row.committed_quantity < line.requested_quantity then
      raise exception 'over_quantity';
    end if;

    update public.store_partial_refund_line_committed_qty
    set committed_quantity = committed_quantity - line.requested_quantity
    where capture_event_id = c.capture_event_id
      and order_item_id = line.order_item_id;
  end loop;

  restored_amount := c.refund_amount_minor;

  update public.store_partial_refund_capture_accounting
  set committed_refund_amount_minor = committed_refund_amount_minor - restored_amount,
      accounting_version = accounting_version + 1,
      updated_at = now()
  where capture_event_id = c.capture_event_id
  returning * into capture;

  update public.store_partial_refund_ledger_commits
  set status = 'compensated',
      compensation_reason_safe = reason,
      compensated_at = now(),
      updated_at = now()
  where id = p_ledger_id;

  return jsonb_build_object(
    'ok', true,
    'already_compensated', false,
    'commit', public.store_partial_refund_ledger_commit_json(p_ledger_id),
    'accounting_version', capture.accounting_version,
    'committed_refund_amount_minor', capture.committed_refund_amount_minor,
    'restored_refund_amount_minor', restored_amount
  );
end;
$$;

revoke all on function public.compensate_store_partial_refund_ledger_commit(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.compensate_store_partial_refund_ledger_commit(uuid, text, uuid)
  to service_role;

comment on function public.compensate_store_partial_refund_ledger_commit(uuid, text, uuid) is
  'service_role only. Accounting-only committed->compensated. Restores ceilings once. Not a provider refund or money movement.';
