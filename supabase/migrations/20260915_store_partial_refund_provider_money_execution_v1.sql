-- =============================================================================
-- Commerce Partial Refund Provider Money Execution V1
-- LOCAL ONLY — do NOT remote-apply without an explicit apply GO.
--
-- Durable provider-execution attempts against an already-committed ledger
-- reservation. Does NOT: redefine ledger committed, Sync partial refund,
-- restock, entitlement, settlement, commission, payout, commerce_confirm,
-- or auto-compensate.
--
-- Version history:
--   P1 candidate was 20260908 (appeared free then).
--   P4 collision: remote 20260908 = learning_personal_notes_hub_v1 (Learning).
--   P5A (2026-08-07): renumbered local draft to 20260909 after verified free then.
--   P5B collision: remote 20260909 = learning_assessment_due_ux_followthrough_v1.
--   P5C (2026-08-07): renumbered local draft to 20260914 (later SUPERSEDED).
--   P5C2 (2026-08-07): renumbered local draft to 20260915 after cross-workstream
--     allocation audit. Rejected: 20260908 (Learning notes hub),
--     20260909 (Learning assessment UX), 20260914 (Translation reserved —
--     origin/office/platform-translation-trunk-port-v1 holds
--     20260914_translation_studio_memory_identity_contract_align_v1.sql;
--     not yet in remote schema_migrations). Translation owns 20260910–13.
--     Active Commerce draft version: 20260915.
-- P2 additions (same draft): get-by-id + list RPCs; terminal-success immutability.
-- Depends on: 20260899 ledger schema (+ 20260900/07 status/compensated).
-- =============================================================================
create table if not exists public.store_partial_refund_provider_executions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  ledger_id uuid not null
    references public.store_partial_refund_ledger_commits (id) on delete restrict,
  order_id uuid not null,
  payment_attempt_id uuid not null,
  capture_event_id uuid not null,
  provider_kind text not null default 'stripe'
    constraint store_pr_prov_exec_provider_kind_check check (
      provider_kind in ('stripe')
    ),
  provider_payment_ref text
    constraint store_pr_prov_exec_payment_ref_len_check check (
      provider_payment_ref is null
      or char_length(provider_payment_ref) between 1 and 128
    )
    constraint store_pr_prov_exec_payment_ref_mask_check check (
      provider_payment_ref is null
      or provider_payment_ref !~ '[0-9]{12,}'
    ),
  trusted_amount_minor bigint not null
    constraint store_pr_prov_exec_amount_check check (trusted_amount_minor > 0),
  currency text not null
    constraint store_pr_prov_exec_currency_check check (
      char_length(currency) = 3 and currency = upper(currency)
    ),
  idempotency_key text not null
    constraint store_pr_prov_exec_idempotency_len_check check (
      char_length(idempotency_key) between 8 and 128
    ),
  status text not null default 'planned'
    constraint store_pr_prov_exec_status_check check (
      status in (
        'planned',
        'executing',
        'succeeded',
        'failed',
        'uncertain'
      )
    ),
  provider_refund_id text
    constraint store_pr_prov_exec_refund_id_len_check check (
      provider_refund_id is null
      or char_length(provider_refund_id) between 1 and 128
    )
    constraint store_pr_prov_exec_refund_id_mask_check check (
      provider_refund_id is null
      or provider_refund_id !~ '[0-9]{12,}'
    ),
  provider_status_safe text
    constraint store_pr_prov_exec_provider_status_len_check check (
      provider_status_safe is null
      or char_length(provider_status_safe) between 1 and 80
    ),
  failure_code text
    constraint store_pr_prov_exec_failure_code_check check (
      failure_code is null or char_length(failure_code) between 1 and 80
    ),
  failure_message_safe text
    constraint store_pr_prov_exec_failure_message_check check (
      failure_message_safe is null
      or char_length(failure_message_safe) between 1 and 500
    ),
  operator_user_id uuid references auth.users (id) on delete set null,
  operator_reason_safe text
    constraint store_pr_prov_exec_reason_check check (
      operator_reason_safe is null
      or char_length(operator_reason_safe) between 3 and 500
    ),
  started_at timestamptz,
  completed_at timestamptz,
  last_lookup_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.store_partial_refund_provider_executions is
  'Partial refund provider money execution attempts. Local draft only; not Sync/restock/settlement.';

create unique index if not exists store_pr_prov_exec_store_idempotency_uidx
  on public.store_partial_refund_provider_executions (store_id, idempotency_key);

-- At most one non-failed execution row per ledger (failed may allow controlled re-plan later).
create unique index if not exists store_pr_prov_exec_open_or_succeeded_ledger_uidx
  on public.store_partial_refund_provider_executions (ledger_id)
  where status in ('planned', 'executing', 'uncertain', 'succeeded');

create unique index if not exists store_pr_prov_exec_succeeded_ledger_uidx
  on public.store_partial_refund_provider_executions (ledger_id)
  where status = 'succeeded';

create index if not exists store_pr_prov_exec_store_created_idx
  on public.store_partial_refund_provider_executions (store_id, created_at desc);

create index if not exists store_pr_prov_exec_status_idx
  on public.store_partial_refund_provider_executions (status, created_at desc);

create index if not exists store_pr_prov_exec_ledger_idx
  on public.store_partial_refund_provider_executions (ledger_id);

alter table public.store_partial_refund_provider_executions enable row level security;
alter table public.store_partial_refund_provider_executions force row level security;
revoke all on public.store_partial_refund_provider_executions from public, anon, authenticated;
grant all on public.store_partial_refund_provider_executions to service_role;

-- ---------------------------------------------------------------------------
-- Transition helper
-- ---------------------------------------------------------------------------

create or replace function public.store_partial_refund_provider_exec_transition_allowed(
  p_from text,
  p_to text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = 'planned' and p_to in ('executing', 'failed') then true
    when p_from = 'executing' and p_to in ('succeeded', 'failed', 'uncertain') then true
    when p_from = 'uncertain' and p_to in ('succeeded', 'failed', 'uncertain') then true
    when p_from = p_to then true
    else false
  end;
$$;

revoke all on function public.store_partial_refund_provider_exec_transition_allowed(text, text)
  from public, anon, authenticated;
grant execute on function public.store_partial_refund_provider_exec_transition_allowed(text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- JSON serializer
-- ---------------------------------------------------------------------------

create or replace function public.store_partial_refund_provider_execution_json(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  e public.store_partial_refund_provider_executions%rowtype;
begin
  select * into e
  from public.store_partial_refund_provider_executions
  where id = p_id;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'execution_id', e.id,
    'store_id', e.store_id,
    'ledger_id', e.ledger_id,
    'order_id', e.order_id,
    'payment_attempt_id', e.payment_attempt_id,
    'capture_event_id', e.capture_event_id,
    'provider_kind', e.provider_kind,
    'provider_payment_ref', e.provider_payment_ref,
    'trusted_amount_minor', e.trusted_amount_minor,
    'currency', e.currency,
    'idempotency_key', e.idempotency_key,
    'status', e.status,
    'provider_refund_id', e.provider_refund_id,
    'provider_status_safe', e.provider_status_safe,
    'failure_code', e.failure_code,
    'failure_message_safe', e.failure_message_safe,
    'operator_user_id', e.operator_user_id,
    'operator_reason_safe', e.operator_reason_safe,
    'started_at', e.started_at,
    'completed_at', e.completed_at,
    'last_lookup_at', e.last_lookup_at,
    'created_at', e.created_at,
    'updated_at', e.updated_at
  );
end;
$$;

revoke all on function public.store_partial_refund_provider_execution_json(uuid)
  from public, anon, authenticated;
grant execute on function public.store_partial_refund_provider_execution_json(uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- Claim / insert (idempotent by store + idempotency_key)
-- ---------------------------------------------------------------------------

create or replace function public.service_claim_store_partial_refund_provider_execution(
  p_store_id uuid,
  p_ledger_id uuid,
  p_order_id uuid,
  p_payment_attempt_id uuid,
  p_capture_event_id uuid,
  p_provider_kind text,
  p_provider_payment_ref text,
  p_trusted_amount_minor bigint,
  p_currency text,
  p_idempotency_key text,
  p_operator_user_id uuid default null,
  p_operator_reason_safe text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.store_partial_refund_provider_executions%rowtype;
  v_ledger public.store_partial_refund_ledger_commits%rowtype;
  v_currency text;
  v_key text;
  v_id uuid;
begin
  if p_store_id is null
    or p_ledger_id is null
    or p_order_id is null
    or p_payment_attempt_id is null
    or p_capture_event_id is null then
    raise exception 'malformed_id';
  end if;

  v_key := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  if v_key is null
    or char_length(v_key) < 8
    or char_length(v_key) > 128 then
    raise exception 'malformed_idempotency_key';
  end if;

  if p_trusted_amount_minor is null or p_trusted_amount_minor <= 0 then
    raise exception 'zero_amount';
  end if;

  v_currency := upper(btrim(coalesce(p_currency, '')));
  if char_length(v_currency) <> 3 then
    raise exception 'currency_mismatch';
  end if;

  if coalesce(p_provider_kind, '') <> 'stripe' then
    raise exception 'provider_not_allowed';
  end if;

  select * into v_ledger
  from public.store_partial_refund_ledger_commits
  where id = p_ledger_id
  for update;
  if not found then
    raise exception 'unknown_refund';
  end if;
  if v_ledger.store_id is distinct from p_store_id
    or v_ledger.order_id is distinct from p_order_id
    or v_ledger.payment_attempt_id is distinct from p_payment_attempt_id
    or v_ledger.capture_event_id is distinct from p_capture_event_id then
    raise exception 'missing_ownership';
  end if;
  if v_ledger.status <> 'committed' then
    raise exception 'invalid_state';
  end if;
  if v_ledger.refund_amount_minor is distinct from p_trusted_amount_minor then
    raise exception 'amount_mismatch';
  end if;
  if upper(v_ledger.currency) is distinct from v_currency then
    raise exception 'currency_mismatch';
  end if;

  select * into v_existing
  from public.store_partial_refund_provider_executions
  where store_id = p_store_id
    and idempotency_key = v_key;
  if found then
    if v_existing.ledger_id is distinct from p_ledger_id
      or v_existing.trusted_amount_minor is distinct from p_trusted_amount_minor
      or upper(v_existing.currency) is distinct from v_currency then
      raise exception 'duplicate_idempotency_key';
    end if;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'execution', public.store_partial_refund_provider_execution_json(v_existing.id)
    );
  end if;

  -- Block second open/succeeded execution for same ledger.
  if exists (
    select 1
    from public.store_partial_refund_provider_executions e
    where e.ledger_id = p_ledger_id
      and e.status in ('planned', 'executing', 'uncertain', 'succeeded')
  ) then
    select * into v_existing
    from public.store_partial_refund_provider_executions e
    where e.ledger_id = p_ledger_id
      and e.status in ('planned', 'executing', 'uncertain', 'succeeded')
    order by e.created_at asc
    limit 1;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'execution', public.store_partial_refund_provider_execution_json(v_existing.id)
    );
  end if;

  insert into public.store_partial_refund_provider_executions (
    store_id,
    ledger_id,
    order_id,
    payment_attempt_id,
    capture_event_id,
    provider_kind,
    provider_payment_ref,
    trusted_amount_minor,
    currency,
    idempotency_key,
    status,
    operator_user_id,
    operator_reason_safe
  ) values (
    p_store_id,
    p_ledger_id,
    p_order_id,
    p_payment_attempt_id,
    p_capture_event_id,
    'stripe',
    nullif(btrim(coalesce(p_provider_payment_ref, '')), ''),
    p_trusted_amount_minor,
    v_currency,
    v_key,
    'planned',
    p_operator_user_id,
    nullif(btrim(coalesce(p_operator_reason_safe, '')), '')
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'execution', public.store_partial_refund_provider_execution_json(v_id)
  );
end;
$$;

revoke all on function public.service_claim_store_partial_refund_provider_execution(
  uuid, uuid, uuid, uuid, uuid, text, text, bigint, text, text, uuid, text
) from public, anon, authenticated;
grant execute on function public.service_claim_store_partial_refund_provider_execution(
  uuid, uuid, uuid, uuid, uuid, text, text, bigint, text, text, uuid, text
) to service_role;

-- ---------------------------------------------------------------------------
-- Update status (service_role)
-- ---------------------------------------------------------------------------

create or replace function public.service_update_store_partial_refund_provider_execution(
  p_execution_id uuid,
  p_to_status text,
  p_provider_refund_id text default null,
  p_provider_status_safe text default null,
  p_failure_code text default null,
  p_failure_message_safe text default null,
  p_provider_payment_ref text default null,
  p_touch_lookup boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.store_partial_refund_provider_executions%rowtype;
  v_now timestamptz := now();
begin
  if p_execution_id is null then
    raise exception 'malformed_id';
  end if;

  select * into e
  from public.store_partial_refund_provider_executions
  where id = p_execution_id
  for update;
  if not found then
    raise exception 'unknown_execution';
  end if;

  -- Terminal success is immutable (no downgrade).
  if e.status = 'succeeded' and p_to_status is distinct from 'succeeded' then
    raise exception 'unsupported_transition';
  end if;

  if not public.store_partial_refund_provider_exec_transition_allowed(e.status, p_to_status) then
    raise exception 'unsupported_transition';
  end if;

  update public.store_partial_refund_provider_executions
  set
    status = p_to_status,
    provider_refund_id = coalesce(
      nullif(btrim(coalesce(p_provider_refund_id, '')), ''),
      provider_refund_id
    ),
    provider_status_safe = coalesce(
      nullif(btrim(coalesce(p_provider_status_safe, '')), ''),
      provider_status_safe
    ),
    failure_code = case
      when p_to_status in ('failed', 'uncertain') then
        coalesce(nullif(btrim(coalesce(p_failure_code, '')), ''), failure_code)
      when p_to_status = 'succeeded' then null
      else failure_code
    end,
    failure_message_safe = case
      when p_to_status in ('failed', 'uncertain') then
        coalesce(
          nullif(btrim(coalesce(p_failure_message_safe, '')), ''),
          failure_message_safe
        )
      when p_to_status = 'succeeded' then null
      else failure_message_safe
    end,
    provider_payment_ref = coalesce(
      nullif(btrim(coalesce(p_provider_payment_ref, '')), ''),
      provider_payment_ref
    ),
    started_at = case
      when p_to_status = 'executing' and started_at is null then v_now
      else started_at
    end,
    completed_at = case
      when p_to_status in ('succeeded', 'failed') then coalesce(completed_at, v_now)
      else completed_at
    end,
    last_lookup_at = case
      when p_touch_lookup then v_now
      else last_lookup_at
    end,
    updated_at = v_now
  where id = p_execution_id;

  return jsonb_build_object(
    'ok', true,
    'execution', public.store_partial_refund_provider_execution_json(p_execution_id)
  );
end;
$$;

revoke all on function public.service_update_store_partial_refund_provider_execution(
  uuid, text, text, text, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.service_update_store_partial_refund_provider_execution(
  uuid, text, text, text, text, text, text, boolean
) to service_role;

-- ---------------------------------------------------------------------------
-- Gets
-- ---------------------------------------------------------------------------

create or replace function public.service_get_store_partial_refund_provider_execution_by_ledger(
  p_ledger_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  e_id uuid;
begin
  if p_ledger_id is null then
    raise exception 'malformed_id';
  end if;

  select id into e_id
  from public.store_partial_refund_provider_executions
  where ledger_id = p_ledger_id
  order by
    case status
      when 'succeeded' then 0
      when 'executing' then 1
      when 'uncertain' then 2
      when 'planned' then 3
      else 4
    end,
    created_at desc
  limit 1;

  if e_id is null then
    return jsonb_build_object('ok', true, 'execution', null);
  end if;

  return jsonb_build_object(
    'ok', true,
    'execution', public.store_partial_refund_provider_execution_json(e_id)
  );
end;
$$;

revoke all on function public.service_get_store_partial_refund_provider_execution_by_ledger(uuid)
  from public, anon, authenticated;
grant execute on function public.service_get_store_partial_refund_provider_execution_by_ledger(uuid)
  to service_role;

create or replace function public.service_get_store_partial_refund_provider_execution_by_idempotency(
  p_store_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  e_id uuid;
  v_key text;
begin
  if p_store_id is null then
    raise exception 'malformed_id';
  end if;
  v_key := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  if v_key is null then
    raise exception 'malformed_idempotency_key';
  end if;

  select id into e_id
  from public.store_partial_refund_provider_executions
  where store_id = p_store_id
    and idempotency_key = v_key
  limit 1;

  if e_id is null then
    return jsonb_build_object('ok', true, 'execution', null);
  end if;

  return jsonb_build_object(
    'ok', true,
    'execution', public.store_partial_refund_provider_execution_json(e_id)
  );
end;
$$;

revoke all on function public.service_get_store_partial_refund_provider_execution_by_idempotency(uuid, text)
  from public, anon, authenticated;
grant execute on function public.service_get_store_partial_refund_provider_execution_by_idempotency(uuid, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Get by id + list (admin recovery review; service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.service_get_store_partial_refund_provider_execution(
  p_execution_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_execution_id is null then
    raise exception 'malformed_id';
  end if;
  return jsonb_build_object(
    'ok', true,
    'execution', public.store_partial_refund_provider_execution_json(p_execution_id)
  );
end;
$$;

revoke all on function public.service_get_store_partial_refund_provider_execution(uuid)
  from public, anon, authenticated;
grant execute on function public.service_get_store_partial_refund_provider_execution(uuid)
  to service_role;

create or replace function public.service_list_store_partial_refund_provider_executions(
  p_store_id uuid default null,
  p_status text default null,
  p_limit int default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
  v_rows jsonb;
begin
  if p_status is not null
    and p_status not in ('planned', 'executing', 'succeeded', 'failed', 'uncertain') then
    raise exception 'invalid_state';
  end if;

  select coalesce(jsonb_agg(public.store_partial_refund_provider_execution_json(e.id)
    order by e.created_at desc, e.id desc), '[]'::jsonb)
  into v_rows
  from (
    select id, created_at
    from public.store_partial_refund_provider_executions
    where (p_store_id is null or store_id = p_store_id)
      and (p_status is null or status = p_status)
    order by created_at desc, id desc
    limit v_limit
  ) e;

  return jsonb_build_object('ok', true, 'executions', v_rows);
end;
$$;

revoke all on function public.service_list_store_partial_refund_provider_executions(uuid, text, int)
  from public, anon, authenticated;
grant execute on function public.service_list_store_partial_refund_provider_executions(uuid, text, int)
  to service_role;
