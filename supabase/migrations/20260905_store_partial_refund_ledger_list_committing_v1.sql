-- =============================================================================
-- Commerce Partial Refund In-Flight Committing Visibility RPC Foundation V1
-- Corrective renumber: was wrongly drafted as 20260901 (Learning-owned).
-- LOCAL ONLY until a separate remote-apply GO for 20260905.
--
-- Read-only privileged list of ledger commits with status = 'committing'.
-- Does NOT: mutate rows, fail/complete/plan/begin, release locks, money,
--           provider refunds, compensation, payout, commerce_confirm.
--
-- Version selection proof (2026-08-07 resume):
--   Remote tip: 20260900
--   Claimed in git: 20260901 Learning (+ Commerce collision), 20260902–04 Translation,
--                   20260910 Translation studio reallocation
--   => 20260905 first collision-free Commerce draft
-- Depends on: 20260899 tables + 20260900 helper/RPC grants pattern
-- Note: live orphan RPC may already exist from interrupted 20260901 SQL apply;
--       CREATE OR REPLACE rebinds safely under this version on apply GO.
-- =============================================================================

create or replace function public.list_store_partial_refund_ledger_committing(
  p_store_id uuid default null,
  p_capture_event_id uuid default null,
  p_limit integer default 50
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
  lim integer;
begin
  -- Bound limit: default 50, hard max 100, min 1 when provided as non-null.
  if p_limit is null then
    lim := 50;
  elsif p_limit < 1 or p_limit > 100 then
    raise exception 'malformed_id';
  else
    lim := p_limit;
  end if;

  for r in
    select
      c.id,
      c.store_id,
      c.order_id,
      c.capture_event_id,
      c.status,
      c.planned_accounting_version,
      c.created_at,
      c.updated_at
    from public.store_partial_refund_ledger_commits c
    where c.status = 'committing'
      and (p_store_id is null or c.store_id = p_store_id)
      and (p_capture_event_id is null or c.capture_event_id = p_capture_event_id)
    order by c.created_at asc, c.id asc
    limit lim
  loop
    -- Minimum operator-safe fields only (no lines, amounts, provider payloads).
    arr := arr || jsonb_build_array(
      jsonb_build_object(
        'ledger_id', r.id,
        'store_id', r.store_id,
        'order_id', r.order_id,
        'capture_event_id', r.capture_event_id,
        'status', r.status,
        'accounting_version', r.planned_accounting_version,
        'created_at', r.created_at,
        'updated_at', r.updated_at
      )
    );
  end loop;

  return jsonb_build_object('ok', true, 'commits', arr);
end;
$$;

revoke all on function public.list_store_partial_refund_ledger_committing(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.list_store_partial_refund_ledger_committing(uuid, uuid, integer)
  to service_role;

comment on function public.list_store_partial_refund_ledger_committing(uuid, uuid, integer) is
  'service_role only. Read-only admin ops list of in-flight committing partial-refund ledger rows. Does not mutate state or release locks.';
