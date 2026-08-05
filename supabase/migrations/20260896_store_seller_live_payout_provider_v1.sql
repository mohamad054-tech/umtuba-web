-- =============================================================================
-- Commerce Seller Live Payout Provider V1 — Slice S2 (schema + RPCs)
-- Durable destinations + executions for gated live payouts.
-- Does NOT: UEOS postings, apply_store_payout_event, Manual Ops adapter,
-- orchestrator, Stripe Connect, bank PANs, client-trusted money fields.
-- Local migration only — do not remote-apply in this slice.
-- Depends on: stores, auth.users; payout foundation 20260881 recommended for
-- orchestrator (S4+) but not required for these tables/RPCs to exist.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Destinations (masked labels only — never full bank account numbers)
-- ---------------------------------------------------------------------------

create table if not exists public.store_payout_destinations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  created_by_user_id uuid not null references auth.users (id) on delete restrict,
  provider_id text not null
    constraint store_payout_destinations_provider_id_check check (
      provider_id in ('manual_ops_live', 'stripe_connect')
    ),
  currency text not null
    constraint store_payout_destinations_currency_check check (
      char_length(currency) = 3 and currency = upper(currency)
    ),
  -- Masked descriptor only (e.g. "Bank ****1234"). Forbid long digit runs.
  display_label text not null
    constraint store_payout_destinations_display_label_len_check check (
      char_length(btrim(display_label)) between 3 and 80
    )
    constraint store_payout_destinations_display_label_mask_check check (
      btrim(display_label) !~ '[0-9]{8,}'
    ),
  verification_state text not null default 'unverified'
    constraint store_payout_destinations_verification_state_check check (
      verification_state in (
        'unverified',
        'pending_review',
        'verified',
        'rejected',
        'suspended'
      )
    ),
  verified_at timestamptz,
  verified_by_user_id uuid references auth.users (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_payout_destinations_verified_consistency_check check (
    (
      verification_state = 'verified'
      and verified_at is not null
      and verified_by_user_id is not null
    )
    or (
      verification_state is distinct from 'verified'
      and verified_at is null
      and verified_by_user_id is null
    )
  )
);

comment on table public.store_payout_destinations is
  'Seller Live Payout V1 destinations. Masked labels only; no full account numbers.';

create unique index if not exists store_payout_destinations_store_provider_currency_uidx
  on public.store_payout_destinations (store_id, provider_id, currency)
  where is_active = true;

create index if not exists store_payout_destinations_store_idx
  on public.store_payout_destinations (store_id, created_at desc);

alter table public.store_payout_destinations enable row level security;
alter table public.store_payout_destinations force row level security;
revoke all on public.store_payout_destinations from public, anon, authenticated;
grant all on public.store_payout_destinations to service_role;

-- ---------------------------------------------------------------------------
-- 2) Executions (durable provider/ops lifecycle — no UEOS here)
-- ---------------------------------------------------------------------------

create table if not exists public.store_payout_executions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  capture_event_id uuid not null,
  destination_id uuid not null references public.store_payout_destinations (id)
    on delete restrict,
  provider_id text not null
    constraint store_payout_executions_provider_id_check check (
      provider_id in ('manual_ops_live', 'stripe_connect')
    ),
  status text not null default 'planned'
    constraint store_payout_executions_status_check check (
      status in (
        'planned',
        'awaiting_attestation',
        'provider_submitted',
        'succeeded',
        'failed',
        'uncertain',
        'suppressed'
      )
    ),
  -- Server-trusted amount/currency only (inserted by service_role).
  trusted_amount_minor bigint not null
    constraint store_payout_executions_amount_check check (trusted_amount_minor > 0),
  currency text not null
    constraint store_payout_executions_currency_check check (
      char_length(currency) = 3 and currency = upper(currency)
    ),
  idempotency_key text not null
    constraint store_payout_executions_idempotency_len_check check (
      char_length(idempotency_key) between 8 and 128
    ),
  provider_ref text
    constraint store_payout_executions_provider_ref_len_check check (
      provider_ref is null or char_length(provider_ref) between 1 and 128
    )
    constraint store_payout_executions_provider_ref_mask_check check (
      provider_ref is null or provider_ref !~ '[0-9]{12,}'
    ),
  failure_code text
    constraint store_payout_executions_failure_code_check check (
      failure_code is null or char_length(failure_code) between 1 and 80
    ),
  failure_message_safe text
    constraint store_payout_executions_failure_message_check check (
      failure_message_safe is null
      or char_length(failure_message_safe) between 1 and 500
    ),
  attestation_decision text
    constraint store_payout_executions_attestation_decision_check check (
      attestation_decision is null
      or attestation_decision in ('succeeded', 'failed')
    ),
  attestation_ref text
    constraint store_payout_executions_attestation_ref_check check (
      attestation_ref is null or char_length(btrim(attestation_ref)) between 3 and 128
    )
    constraint store_payout_executions_attestation_ref_mask_check check (
      attestation_ref is null or attestation_ref !~ '[0-9]{12,}'
    ),
  attested_by_user_id uuid references auth.users (id) on delete set null,
  attested_at timestamptz,
  payout_submit_event_id uuid,
  note text
    constraint store_payout_executions_note_check check (
      note is null or char_length(note) between 1 and 500
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_payout_executions_attestation_consistency_check check (
    (
      attestation_decision is null
      and attested_by_user_id is null
      and attested_at is null
    )
    or (
      attestation_decision is not null
      and attested_by_user_id is not null
      and attested_at is not null
    )
  )
);

comment on table public.store_payout_executions is
  'Seller Live Payout V1 executions. Admin attestation does not post UEOS.';

create unique index if not exists store_payout_executions_store_idempotency_uidx
  on public.store_payout_executions (store_id, idempotency_key);

create unique index if not exists store_payout_executions_open_capture_uidx
  on public.store_payout_executions (store_id, capture_event_id)
  where status in (
    'planned',
    'awaiting_attestation',
    'provider_submitted',
    'uncertain'
  );

create index if not exists store_payout_executions_store_created_idx
  on public.store_payout_executions (store_id, created_at desc);

create index if not exists store_payout_executions_status_idx
  on public.store_payout_executions (status, created_at desc);

create index if not exists store_payout_executions_capture_idx
  on public.store_payout_executions (capture_event_id);

alter table public.store_payout_executions enable row level security;
alter table public.store_payout_executions force row level security;
revoke all on public.store_payout_executions from public, anon, authenticated;
grant all on public.store_payout_executions to service_role;

-- ---------------------------------------------------------------------------
-- 3) Pure helpers
-- ---------------------------------------------------------------------------

create or replace function public.store_live_payout_execution_transition_allowed(
  p_from text,
  p_to text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = 'planned' and p_to in (
      'awaiting_attestation', 'provider_submitted', 'suppressed', 'failed'
    ) then true
    when p_from = 'awaiting_attestation' and p_to in (
      'succeeded', 'failed', 'uncertain'
    ) then true
    when p_from = 'provider_submitted' and p_to in (
      'succeeded', 'failed', 'uncertain'
    ) then true
    when p_from = 'uncertain' and p_to in ('succeeded', 'failed') then true
    when p_from = p_to then true
    else false
  end;
$$;

comment on function public.store_live_payout_execution_transition_allowed(text, text) is
  'Seller Live Payout V1 — fail-closed execution status transitions.';

revoke all on function public.store_live_payout_execution_transition_allowed(text, text)
  from public, anon;
grant execute on function public.store_live_payout_execution_transition_allowed(text, text)
  to service_role;

create or replace function public.store_live_payout_project_destination(
  p_row public.store_payout_destinations
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p_row.id,
    'store_id', p_row.store_id,
    'provider_id', p_row.provider_id,
    'currency', p_row.currency,
    'display_label', p_row.display_label,
    'verification_state', p_row.verification_state,
    'is_active', p_row.is_active,
    'created_at', p_row.created_at,
    'updated_at', p_row.updated_at
  );
$$;

revoke all on function public.store_live_payout_project_destination(
  public.store_payout_destinations
) from public, anon, authenticated;

create or replace function public.store_live_payout_project_execution(
  p_row public.store_payout_executions
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p_row.id,
    'store_id', p_row.store_id,
    'capture_event_id', p_row.capture_event_id,
    'destination_id', p_row.destination_id,
    'provider_id', p_row.provider_id,
    'status', p_row.status,
    'trusted_amount_minor', p_row.trusted_amount_minor,
    'currency', p_row.currency,
    'provider_ref', p_row.provider_ref,
    'failure_code', p_row.failure_code,
    'failure_message_safe', p_row.failure_message_safe,
    'attestation_decision', p_row.attestation_decision,
    'attestation_ref', p_row.attestation_ref,
    'attested_at', p_row.attested_at,
    'note', p_row.note,
    'created_at', p_row.created_at,
    'updated_at', p_row.updated_at
  );
$$;

revoke all on function public.store_live_payout_project_execution(
  public.store_payout_executions
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Seller: upsert_my_store_payout_destination
--    Seller cannot set verification_state to verified/rejected/suspended.
-- ---------------------------------------------------------------------------

create or replace function public.upsert_my_store_payout_destination(
  p_store_id uuid,
  p_provider_id text,
  p_currency text,
  p_display_label text,
  p_request_review boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  provider text := lower(btrim(coalesce(p_provider_id, '')));
  currency text := upper(btrim(coalesce(p_currency, '')));
  label text := btrim(coalesce(p_display_label, ''));
  next_state text := case
    when coalesce(p_request_review, false) then 'pending_review'
    else 'unverified'
  end;
  existing public.store_payout_destinations%rowtype;
  saved public.store_payout_destinations%rowtype;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_store_id is null then
    raise exception 'store_id is required';
  end if;
  if not public.is_store_member_with_role(
    p_store_id,
    array['owner', 'manager']
  ) then
    raise exception 'Not authorized';
  end if;
  if provider is distinct from 'manual_ops_live'
     and provider is distinct from 'stripe_connect' then
    raise exception 'Invalid provider_id';
  end if;
  if char_length(currency) <> 3 then
    raise exception 'Invalid currency';
  end if;
  if char_length(label) < 3 or char_length(label) > 80 then
    raise exception 'display_label must be 3..80 characters';
  end if;
  if label ~ '[0-9]{8,}' then
    raise exception 'display_label must be masked (no long digit runs)';
  end if;

  select * into existing
  from public.store_payout_destinations d
  where d.store_id = p_store_id
    and d.provider_id = provider
    and d.currency = currency
    and d.is_active = true
  for update;

  if found then
    -- Seller may refresh label / request review, but never self-verify.
    if existing.verification_state in ('verified', 'suspended') then
      -- Keep trusted verification; allow label refresh only.
      update public.store_payout_destinations
      set
        display_label = label,
        updated_at = now()
      where id = existing.id
      returning * into saved;
    else
      update public.store_payout_destinations
      set
        display_label = label,
        verification_state = next_state,
        verified_at = null,
        verified_by_user_id = null,
        updated_at = now()
      where id = existing.id
      returning * into saved;
    end if;
  else
    insert into public.store_payout_destinations (
      store_id,
      created_by_user_id,
      provider_id,
      currency,
      display_label,
      verification_state
    ) values (
      p_store_id,
      uid,
      provider,
      currency,
      label,
      next_state
    )
    returning * into saved;
  end if;

  return jsonb_build_object(
    'ok', true,
    'destination', public.store_live_payout_project_destination(saved)
  );
end;
$$;

comment on function public.upsert_my_store_payout_destination(uuid, text, text, text, boolean) is
  'Seller Live Payout V1 — owner/manager upsert masked destination. Cannot self-verify.';

revoke all on function public.upsert_my_store_payout_destination(uuid, text, text, text, boolean)
  from public, anon;
grant execute on function public.upsert_my_store_payout_destination(uuid, text, text, text, boolean)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Seller: list_my_store_payout_destinations
-- ---------------------------------------------------------------------------

create or replace function public.list_my_store_payout_destinations(
  p_store_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  items jsonb := '[]'::jsonb;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_store_id is null then
    raise exception 'store_id is required';
  end if;
  if not public.is_store_member_with_role(
    p_store_id,
    array['owner', 'manager']
  ) then
    raise exception 'Not authorized';
  end if;

  select coalesce(
    jsonb_agg(
      public.store_live_payout_project_destination(d)
      order by d.created_at desc, d.id desc
    ),
    '[]'::jsonb
  )
  into items
  from public.store_payout_destinations d
  where d.store_id = p_store_id
    and d.is_active = true;

  return jsonb_build_object('ok', true, 'destinations', items);
end;
$$;

comment on function public.list_my_store_payout_destinations(uuid) is
  'Seller Live Payout V1 — owner/manager list masked destinations.';

revoke all on function public.list_my_store_payout_destinations(uuid)
  from public, anon;
grant execute on function public.list_my_store_payout_destinations(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Seller: get_my_store_payout_execution
-- ---------------------------------------------------------------------------

create or replace function public.get_my_store_payout_execution(
  p_store_id uuid,
  p_execution_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row_exec public.store_payout_executions%rowtype;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_store_id is null or p_execution_id is null then
    raise exception 'store_id and execution_id are required';
  end if;
  if not public.is_store_member_with_role(
    p_store_id,
    array['owner', 'manager']
  ) then
    raise exception 'Not authorized';
  end if;

  select * into row_exec
  from public.store_payout_executions e
  where e.id = p_execution_id
    and e.store_id = p_store_id;

  if not found then
    raise exception 'Execution not found';
  end if;

  return jsonb_build_object(
    'ok', true,
    'execution', public.store_live_payout_project_execution(row_exec)
  );
end;
$$;

comment on function public.get_my_store_payout_execution(uuid, uuid) is
  'Seller Live Payout V1 — owner/manager read one execution (safe projection).';

revoke all on function public.get_my_store_payout_execution(uuid, uuid)
  from public, anon;
grant execute on function public.get_my_store_payout_execution(uuid, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) Admin: admin_list_store_live_payout_executions
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_store_live_payout_executions(
  p_status text default null,
  p_store_id uuid default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  lim integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  status_filter text := nullif(btrim(coalesce(p_status, '')), '');
  items jsonb := '[]'::jsonb;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if status_filter is not null
     and status_filter not in (
       'planned',
       'awaiting_attestation',
       'provider_submitted',
       'succeeded',
       'failed',
       'uncertain',
       'suppressed'
     ) then
    raise exception 'Invalid status filter';
  end if;

  select coalesce(
    jsonb_agg(x.proj order by x.created_at desc, x.id desc),
    '[]'::jsonb
  )
  into items
  from (
    select
      e.id,
      e.created_at,
      public.store_live_payout_project_execution(e) as proj
    from public.store_payout_executions e
    where (p_store_id is null or e.store_id = p_store_id)
      and (status_filter is null or e.status = status_filter)
    order by e.created_at desc, e.id desc
    limit lim
  ) x;

  return jsonb_build_object('ok', true, 'executions', items, 'limit', lim);
end;
$$;

comment on function public.admin_list_store_live_payout_executions(text, uuid, integer) is
  'Seller Live Payout V1 — platform admin execution queue (safe projection).';

revoke all on function public.admin_list_store_live_payout_executions(text, uuid, integer)
  from public, anon;
grant execute on function public.admin_list_store_live_payout_executions(text, uuid, integer)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) Admin: admin_attest_store_live_payout_execution
--    Persists attestation only — does NOT post UEOS / apply_store_payout_event.
-- ---------------------------------------------------------------------------

create or replace function public.admin_attest_store_live_payout_execution(
  p_execution_id uuid,
  p_decision text,
  p_attestation_ref text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  decision text := lower(btrim(coalesce(p_decision, '')));
  aref text := btrim(coalesce(p_attestation_ref, ''));
  note_text text := nullif(btrim(coalesce(p_note, '')), '');
  row_exec public.store_payout_executions%rowtype;
  next_status text;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if p_execution_id is null then
    raise exception 'execution_id is required';
  end if;
  if decision not in ('succeeded', 'failed') then
    raise exception 'decision must be succeeded or failed';
  end if;
  if char_length(aref) < 3 or char_length(aref) > 128 then
    raise exception 'attestation_ref must be 3..128 characters';
  end if;
  if aref ~ '[0-9]{12,}' then
    raise exception 'attestation_ref must not contain long digit runs';
  end if;
  if note_text is not null and char_length(note_text) > 500 then
    raise exception 'note too long';
  end if;

  select * into row_exec
  from public.store_payout_executions e
  where e.id = p_execution_id
  for update;

  if not found then
    raise exception 'Execution not found';
  end if;

  -- Idempotent replay of identical attestation.
  if row_exec.attestation_decision is not null then
    if row_exec.attestation_decision = decision
       and row_exec.attestation_ref is not distinct from aref then
      return jsonb_build_object(
        'ok', true,
        'replayed', true,
        'execution', public.store_live_payout_project_execution(row_exec),
        'ueos_posted', false,
        'payout_booking_called', false
      );
    end if;
    raise exception 'Execution already attested with a different decision';
  end if;

  if row_exec.status not in ('awaiting_attestation', 'uncertain') then
    raise exception 'Execution status % does not accept attestation', row_exec.status;
  end if;

  next_status := decision; -- succeeded | failed

  if not public.store_live_payout_execution_transition_allowed(
    row_exec.status,
    next_status
  ) then
    raise exception 'Illegal execution transition % -> %', row_exec.status, next_status;
  end if;

  update public.store_payout_executions
  set
    status = next_status,
    attestation_decision = decision,
    attestation_ref = aref,
    attested_by_user_id = uid,
    attested_at = now(),
    failure_code = case
      when decision = 'failed' then coalesce(failure_code, 'provider_rejected')
      else failure_code
    end,
    failure_message_safe = case
      when decision = 'failed' then coalesce(
        failure_message_safe,
        'Manual ops attestation marked failed. No UEOS posting in this RPC.'
      )
      else failure_message_safe
    end,
    note = coalesce(note_text, note),
    updated_at = now()
  where id = row_exec.id
  returning * into row_exec;

  -- Explicit non-actions for auditors / contract tests:
  -- no payout booking RPC, no settlement RPC, no UEOS journals.

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'execution', public.store_live_payout_project_execution(row_exec),
    'ueos_posted', false,
    'payout_booking_called', false
  );
end;
$$;

comment on function public.admin_attest_store_live_payout_execution(uuid, text, text, text) is
  'Seller Live Payout V1 — admin attestation only. Does not post UEOS or call payout booking.';

revoke all on function public.admin_attest_store_live_payout_execution(uuid, text, text, text)
  from public, anon;
grant execute on function public.admin_attest_store_live_payout_execution(uuid, text, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9) Service: service_insert_store_payout_execution
-- ---------------------------------------------------------------------------

create or replace function public.service_insert_store_payout_execution(
  p_store_id uuid,
  p_capture_event_id uuid,
  p_destination_id uuid,
  p_provider_id text,
  p_trusted_amount_minor bigint,
  p_currency text,
  p_idempotency_key text,
  p_status text default 'planned',
  p_provider_ref text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  provider text := lower(btrim(coalesce(p_provider_id, '')));
  currency text := upper(btrim(coalesce(p_currency, '')));
  idem text := btrim(coalesce(p_idempotency_key, ''));
  status_text text := lower(btrim(coalesce(p_status, 'planned')));
  pref text := nullif(btrim(coalesce(p_provider_ref, '')), '');
  note_text text := nullif(btrim(coalesce(p_note, '')), '');
  dest public.store_payout_destinations%rowtype;
  existing public.store_payout_executions%rowtype;
  saved public.store_payout_executions%rowtype;
begin
  -- service_role only (no authenticated grant).
  if p_store_id is null or p_capture_event_id is null or p_destination_id is null then
    raise exception 'store_id, capture_event_id, and destination_id are required';
  end if;
  if provider not in ('manual_ops_live', 'stripe_connect') then
    raise exception 'Invalid provider_id';
  end if;
  if coalesce(p_trusted_amount_minor, 0) <= 0 then
    raise exception 'trusted_amount_minor must be > 0';
  end if;
  if char_length(currency) <> 3 then
    raise exception 'Invalid currency';
  end if;
  if char_length(idem) < 8 or char_length(idem) > 128 then
    raise exception 'idempotency_key must be 8..128 characters';
  end if;
  if status_text not in (
    'planned',
    'awaiting_attestation',
    'provider_submitted',
    'suppressed'
  ) then
    raise exception 'Initial status not allowed';
  end if;
  if pref is not null and pref ~ '[0-9]{12,}' then
    raise exception 'provider_ref must not contain long digit runs';
  end if;

  select * into dest
  from public.store_payout_destinations d
  where d.id = p_destination_id
    and d.store_id = p_store_id
    and d.is_active = true;

  if not found then
    raise exception 'Destination not found for store';
  end if;
  if dest.provider_id is distinct from provider then
    raise exception 'Destination provider_id mismatch';
  end if;
  if dest.currency is distinct from currency then
    raise exception 'Destination currency mismatch';
  end if;

  select * into existing
  from public.store_payout_executions e
  where e.store_id = p_store_id
    and e.idempotency_key = idem;

  if found then
    if existing.capture_event_id is distinct from p_capture_event_id
       or existing.destination_id is distinct from p_destination_id
       or existing.trusted_amount_minor is distinct from p_trusted_amount_minor
       or existing.currency is distinct from currency
       or existing.provider_id is distinct from provider then
      raise exception 'Idempotency conflict for payout execution';
    end if;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'execution', public.store_live_payout_project_execution(existing)
    );
  end if;

  insert into public.store_payout_executions (
    store_id,
    capture_event_id,
    destination_id,
    provider_id,
    status,
    trusted_amount_minor,
    currency,
    idempotency_key,
    provider_ref,
    note
  ) values (
    p_store_id,
    p_capture_event_id,
    p_destination_id,
    provider,
    status_text,
    p_trusted_amount_minor,
    currency,
    idem,
    pref,
    note_text
  )
  returning * into saved;

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'execution', public.store_live_payout_project_execution(saved)
  );
end;
$$;

comment on function public.service_insert_store_payout_execution(
  uuid, uuid, uuid, text, bigint, text, text, text, text, text
) is
  'Seller Live Payout V1 — service_role insert execution (trusted amount).';

revoke all on function public.service_insert_store_payout_execution(
  uuid, uuid, uuid, text, bigint, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.service_insert_store_payout_execution(
  uuid, uuid, uuid, text, bigint, text, text, text, text, text
) to service_role;

-- ---------------------------------------------------------------------------
-- 10) Service: service_update_store_payout_execution
-- ---------------------------------------------------------------------------

create or replace function public.service_update_store_payout_execution(
  p_execution_id uuid,
  p_status text,
  p_provider_ref text default null,
  p_failure_code text default null,
  p_failure_message_safe text default null,
  p_payout_submit_event_id uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  status_text text := lower(btrim(coalesce(p_status, '')));
  pref text := nullif(btrim(coalesce(p_provider_ref, '')), '');
  fcode text := nullif(btrim(coalesce(p_failure_code, '')), '');
  fmsg text := nullif(btrim(coalesce(p_failure_message_safe, '')), '');
  note_text text := nullif(btrim(coalesce(p_note, '')), '');
  row_exec public.store_payout_executions%rowtype;
begin
  if p_execution_id is null then
    raise exception 'execution_id is required';
  end if;
  if status_text not in (
    'planned',
    'awaiting_attestation',
    'provider_submitted',
    'succeeded',
    'failed',
    'uncertain',
    'suppressed'
  ) then
    raise exception 'Invalid status';
  end if;
  if pref is not null and pref ~ '[0-9]{12,}' then
    raise exception 'provider_ref must not contain long digit runs';
  end if;

  select * into row_exec
  from public.store_payout_executions e
  where e.id = p_execution_id
  for update;

  if not found then
    raise exception 'Execution not found';
  end if;

  if row_exec.status in ('succeeded', 'failed', 'suppressed')
     and status_text is distinct from row_exec.status then
    raise exception 'Terminal execution status cannot transition';
  end if;

  if not public.store_live_payout_execution_transition_allowed(
    row_exec.status,
    status_text
  ) then
    raise exception 'Illegal execution transition % -> %', row_exec.status, status_text;
  end if;

  update public.store_payout_executions
  set
    status = status_text,
    provider_ref = coalesce(pref, provider_ref),
    failure_code = coalesce(fcode, failure_code),
    failure_message_safe = coalesce(fmsg, failure_message_safe),
    payout_submit_event_id = coalesce(
      p_payout_submit_event_id,
      payout_submit_event_id
    ),
    note = coalesce(note_text, note),
    updated_at = now()
  where id = row_exec.id
  returning * into row_exec;

  return jsonb_build_object(
    'ok', true,
    'execution', public.store_live_payout_project_execution(row_exec)
  );
end;
$$;

comment on function public.service_update_store_payout_execution(
  uuid, text, text, text, text, uuid, text
) is
  'Seller Live Payout V1 — service_role fail-closed execution status updates.';

revoke all on function public.service_update_store_payout_execution(
  uuid, text, text, text, text, uuid, text
) from public, anon, authenticated;
grant execute on function public.service_update_store_payout_execution(
  uuid, text, text, text, text, uuid, text
) to service_role;
