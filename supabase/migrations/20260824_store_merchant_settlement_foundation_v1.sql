-- UMTUBA Store — Merchant Settlement & Seller Balances Foundation V1
-- Additive after Payment Outcome Sync V1 (20260823) and UEOS Foundation (20260822).
-- Moves captured platform liability into store escrow / payable via event-sourced
-- settlement actions. Does NOT: payouts, commissions, UI, partial amounts, UM Points.
--
-- Refund ordering: Sync refunds are blocked while settlement is ALLOCATED/HELD/RELEASED.
-- Guard is injected into apply_store_payment_outcome via CREATE OR REPLACE (do not
-- edit 20260823 migration file).
--
-- reverse_allocation transitions to REVERSED (terminal in V1).
-- Re-allocation after reverse is FORBIDDEN.
-- active_allocations is deleted on reverse, but historical reverse permanently
-- blocks new allocate (state=REVERSED). Future admin reopen is out of scope.
--
-- State derivation order: created_at asc, id asc
--   (store_settlement_state_for_capture / store_settlement_active_state).
--
-- Seller store accounts use product_scope='store' (escrow/payable) so merchant
-- balances are isolated from the platform UEOS chart. Platform liability lines
-- remain product_scope='ueos'.
--
-- Fingerprint includes policy_id (resolved before canonical/fingerprint).
-- Settlement is blocked when a trusted refunded outcome already exists.

-- ---------------------------------------------------------------------------
-- 1) Settlement event ledger
-- ---------------------------------------------------------------------------

create table if not exists public.store_settlement_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null
    constraint store_settlement_events_event_key_len check (
      char_length(btrim(event_key)) between 8 and 128
    ),
  correlation_id text not null
    constraint store_settlement_events_correlation_len check (
      char_length(btrim(correlation_id)) between 8 and 128
    ),
  request_fingerprint text not null
    constraint store_settlement_events_fingerprint_len check (
      char_length(btrim(request_fingerprint)) between 16 and 128
    ),
  fingerprint_alg text not null
    constraint store_settlement_events_fingerprint_alg_check check (
      fingerprint_alg in ('md5')
    ),
  action text not null
    constraint store_settlement_events_action_check check (
      action in ('allocate', 'release', 'hold', 'reverse_allocation')
    ),
  store_id uuid not null
    references public.stores (id) on delete restrict,
  order_id uuid not null
    references public.orders (id) on delete restrict,
  payment_attempt_id uuid not null
    references public.payment_attempts (id) on delete restrict,
  capture_event_id uuid not null
    references public.store_payment_outcome_events (id) on delete restrict,
  allocation_event_id uuid
    references public.store_settlement_events (id) on delete restrict,
  amount_minor bigint not null
    constraint store_settlement_events_amount_positive check (
      amount_minor > 0
    ),
  currency text not null
    constraint store_settlement_events_currency_check check (
      currency ~ '^[A-Z]{3}$'
    ),
  ueos_journal_entry_id uuid
    references public.ueos_journal_entries (id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb
    constraint store_settlement_events_metadata_object check (
      jsonb_typeof(metadata) = 'object'
    ),
  created_at timestamptz not null default now(),
  constraint store_settlement_events_event_key_uidx unique (event_key),
  constraint store_settlement_events_allocation_parent_check check (
    (action = 'allocate' and allocation_event_id is null)
    or (action <> 'allocate' and allocation_event_id is not null)
  )
);

comment on table public.store_settlement_events is
  'Trusted merchant settlement events. Full-amount allocate/release/hold/reverse against a capture. Root allocate has null allocation_event_id; children reference that allocate.';

comment on column public.store_settlement_events.correlation_id is
  'Must match the trusted capture outcome correlation_id for this payment attempt.';

comment on column public.store_settlement_events.allocation_event_id is
  'Null for root allocate. For release/hold/reverse_allocation, references the originating allocate event.';

create index if not exists store_settlement_events_correlation_idx
  on public.store_settlement_events (correlation_id, created_at desc);

create index if not exists store_settlement_events_store_idx
  on public.store_settlement_events (store_id, created_at desc);

create index if not exists store_settlement_events_order_idx
  on public.store_settlement_events (order_id, created_at desc);

create index if not exists store_settlement_events_payment_attempt_idx
  on public.store_settlement_events (payment_attempt_id, created_at desc);

create index if not exists store_settlement_events_capture_event_idx
  on public.store_settlement_events (capture_event_id, created_at asc);

create index if not exists store_settlement_events_allocation_event_idx
  on public.store_settlement_events (allocation_event_id, created_at desc);

alter table public.store_settlement_events enable row level security;
alter table public.store_settlement_events force row level security;
revoke all on public.store_settlement_events from public, anon, authenticated;
-- No authenticated policies in V1 (money events; service_role / DEFINER only).

-- ---------------------------------------------------------------------------
-- 1b) Active allocation uniqueness (DB-authoritative)
-- ---------------------------------------------------------------------------
-- Primary key on capture_event_id enforces at most one active non-reversed
-- allocation per capture. reverse_allocation deletes the row; absence of the
-- active row does NOT allow re-allocate — historical reverse (state=REVERSED)
-- permanently blocks new allocate in V1.

create table if not exists public.store_settlement_active_allocations (
  capture_event_id uuid primary key
    references public.store_payment_outcome_events (id) on delete restrict,
  allocation_event_id uuid not null
    references public.store_settlement_events (id) on delete restrict,
  store_id uuid not null
    references public.stores (id) on delete restrict,
  order_id uuid not null
    references public.orders (id) on delete restrict,
  payment_attempt_id uuid not null
    references public.payment_attempts (id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);

comment on table public.store_settlement_active_allocations is
  'DB-authoritative uniqueness: PK capture_event_id enforces at most one active non-reversed allocation per capture. reverse_allocation deletes the row; absence does not allow re-allocate — REVERSED (historical reverse) permanently blocks allocate in V1.';

alter table public.store_settlement_active_allocations enable row level security;
alter table public.store_settlement_active_allocations force row level security;
revoke all on public.store_settlement_active_allocations from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Settlement UEOS policies (strict posting templates)
-- ---------------------------------------------------------------------------

insert into public.ueos_policies (
  policy_code, version, status, effective_from, effective_to, description, metadata
)
select
  v.policy_code,
  v.version,
  v.status,
  v.effective_from,
  v.effective_to,
  v.description,
  v.metadata
from (
  values
    (
      'store.settlement.allocate',
      1,
      'active',
      timestamptz '2026-01-01 00:00:00+00',
      null::timestamptz,
      'Settlement allocate — platform liability debit / store escrow credit.',
      jsonb_build_object(
        'posting', jsonb_build_object(
          'mode', 'double_entry',
          'asset_source', 'order_currency',
          'lines', jsonb_build_array(
            jsonb_build_object(
              'role', 'debit',
              'owner_type', 'platform',
              'account_kind', 'liability',
              'product_scope', 'ueos'
            ),
            jsonb_build_object(
              'role', 'credit',
              'owner_type', 'store',
              'account_kind', 'escrow',
              'product_scope', 'store'
            )
          )
        )
      )
    ),
    (
      'store.settlement.release',
      1,
      'active',
      timestamptz '2026-01-01 00:00:00+00',
      null::timestamptz,
      'Settlement release — store escrow debit / store payable credit.',
      jsonb_build_object(
        'posting', jsonb_build_object(
          'mode', 'double_entry',
          'asset_source', 'order_currency',
          'lines', jsonb_build_array(
            jsonb_build_object(
              'role', 'debit',
              'owner_type', 'store',
              'account_kind', 'escrow',
              'product_scope', 'store'
            ),
            jsonb_build_object(
              'role', 'credit',
              'owner_type', 'store',
              'account_kind', 'payable',
              'product_scope', 'store'
            )
          )
        )
      )
    ),
    (
      'store.settlement.hold',
      1,
      'active',
      timestamptz '2026-01-01 00:00:00+00',
      null::timestamptz,
      'Settlement hold — store payable debit / store escrow credit.',
      jsonb_build_object(
        'posting', jsonb_build_object(
          'mode', 'double_entry',
          'asset_source', 'order_currency',
          'lines', jsonb_build_array(
            jsonb_build_object(
              'role', 'debit',
              'owner_type', 'store',
              'account_kind', 'payable',
              'product_scope', 'store'
            ),
            jsonb_build_object(
              'role', 'credit',
              'owner_type', 'store',
              'account_kind', 'escrow',
              'product_scope', 'store'
            )
          )
        )
      )
    ),
    (
      'store.settlement.reverse_allocation',
      1,
      'active',
      timestamptz '2026-01-01 00:00:00+00',
      null::timestamptz,
      'Settlement reverse_allocation — store escrow debit / platform liability credit.',
      jsonb_build_object(
        'posting', jsonb_build_object(
          'mode', 'double_entry',
          'asset_source', 'order_currency',
          'lines', jsonb_build_array(
            jsonb_build_object(
              'role', 'debit',
              'owner_type', 'store',
              'account_kind', 'escrow',
              'product_scope', 'store'
            ),
            jsonb_build_object(
              'role', 'credit',
              'owner_type', 'platform',
              'account_kind', 'liability',
              'product_scope', 'ueos'
            )
          )
        )
      )
    )
) as v(policy_code, version, status, effective_from, effective_to, description, metadata)
where not exists (
  select 1
  from public.ueos_policies p
  where p.policy_code = v.policy_code
    and p.version = v.version
);

-- ---------------------------------------------------------------------------
-- 3) Helpers
-- ---------------------------------------------------------------------------

create or replace function public.store_settlement_expected_posting_template(
  p_action text
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case p_action
    when 'allocate' then
      jsonb_build_object(
        'mode', 'double_entry',
        'asset_source', 'order_currency',
        'lines', jsonb_build_array(
          jsonb_build_object(
            'role', 'debit',
            'owner_type', 'platform',
            'account_kind', 'liability',
            'product_scope', 'ueos'
          ),
          jsonb_build_object(
            'role', 'credit',
            'owner_type', 'store',
            'account_kind', 'escrow',
            'product_scope', 'store'
          )
        )
      )
    when 'release' then
      jsonb_build_object(
        'mode', 'double_entry',
        'asset_source', 'order_currency',
        'lines', jsonb_build_array(
          jsonb_build_object(
            'role', 'debit',
            'owner_type', 'store',
            'account_kind', 'escrow',
            'product_scope', 'store'
          ),
          jsonb_build_object(
            'role', 'credit',
            'owner_type', 'store',
            'account_kind', 'payable',
            'product_scope', 'store'
          )
        )
      )
    when 'hold' then
      jsonb_build_object(
        'mode', 'double_entry',
        'asset_source', 'order_currency',
        'lines', jsonb_build_array(
          jsonb_build_object(
            'role', 'debit',
            'owner_type', 'store',
            'account_kind', 'payable',
            'product_scope', 'store'
          ),
          jsonb_build_object(
            'role', 'credit',
            'owner_type', 'store',
            'account_kind', 'escrow',
            'product_scope', 'store'
          )
        )
      )
    when 'reverse_allocation' then
      jsonb_build_object(
        'mode', 'double_entry',
        'asset_source', 'order_currency',
        'lines', jsonb_build_array(
          jsonb_build_object(
            'role', 'debit',
            'owner_type', 'store',
            'account_kind', 'escrow',
            'product_scope', 'store'
          ),
          jsonb_build_object(
            'role', 'credit',
            'owner_type', 'platform',
            'account_kind', 'liability',
            'product_scope', 'ueos'
          )
        )
      )
    else
      null
  end;
$$;

revoke all on function public.store_settlement_expected_posting_template(text)
  from public, anon, authenticated;

create or replace function public.store_settlement_assert_posting_template(
  p_action text,
  p_policy_metadata jsonb
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_posting jsonb;
  v_expected jsonb;
  v_keys text[];
  v_line jsonb;
  v_line_keys text[];
  v_allowed_top text[] := array['posting'];
  v_allowed_posting text[] := array['mode', 'asset_source', 'lines'];
  v_allowed_line text[] := array['role', 'owner_type', 'account_kind', 'product_scope'];
  i int;
begin
  v_expected := public.store_settlement_expected_posting_template(p_action);
  if v_expected is null then
    raise exception 'action % does not use a posting template', p_action;
  end if;

  if p_policy_metadata is null or jsonb_typeof(p_policy_metadata) is distinct from 'object' then
    raise exception 'policy metadata must be a JSON object';
  end if;

  select array_agg(k order by k) into v_keys
  from jsonb_object_keys(p_policy_metadata) k;
  if v_keys is null then
    raise exception 'policy metadata is empty';
  end if;
  if exists (select 1 from unnest(v_keys) k where k <> all (v_allowed_top)) then
    raise exception 'policy metadata contains unknown keys';
  end if;

  v_posting := p_policy_metadata -> 'posting';
  if v_posting is null or jsonb_typeof(v_posting) is distinct from 'object' then
    raise exception 'policy metadata.posting is required';
  end if;

  select array_agg(k order by k) into v_keys
  from jsonb_object_keys(v_posting) k;
  if exists (select 1 from unnest(coalesce(v_keys, array[]::text[])) k where k <> all (v_allowed_posting)) then
    raise exception 'policy posting contains unknown keys';
  end if;

  -- Exact template match (fail closed on any drift).
  if v_posting is distinct from v_expected then
    raise exception 'policy posting template does not match approved Settlement V1 template for %', p_action;
  end if;

  if jsonb_typeof(v_posting -> 'lines') is distinct from 'array'
     or jsonb_array_length(v_posting -> 'lines') is distinct from 2 then
    raise exception 'policy posting must contain exactly 2 lines';
  end if;

  for i in 0 .. 1 loop
    v_line := v_posting -> 'lines' -> i;
    if jsonb_typeof(v_line) is distinct from 'object' then
      raise exception 'policy posting line % must be an object', i + 1;
    end if;
    select array_agg(k order by k) into v_line_keys
    from jsonb_object_keys(v_line) k;
    if exists (
      select 1 from unnest(coalesce(v_line_keys, array[]::text[])) k
      where k <> all (v_allowed_line)
    ) then
      raise exception 'policy posting line % contains unknown keys', i + 1;
    end if;
    if v_line ? 'owner_id' or v_line ? 'account_id' then
      raise exception 'caller-controlled owner_id/account_id is not allowed in posting templates';
    end if;
    if (v_line ->> 'account_kind') = 'revenue' then
      raise exception 'revenue account_kind is forbidden in settlement posting templates';
    end if;
  end loop;

  return v_posting;
end;
$$;

revoke all on function public.store_settlement_assert_posting_template(text, jsonb)
  from public, anon, authenticated;

create or replace function public.store_settlement_assert_caller_metadata(
  p_metadata jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_keys text[];
  v_allowed text[] := array[
    'note',
    'provider_event_type',
    'provider_payload_id'
  ];
begin
  if p_metadata is null or jsonb_typeof(p_metadata) is distinct from 'object' then
    raise exception 'metadata must be a JSON object';
  end if;

  select array_agg(k order by k) into v_keys
  from jsonb_object_keys(p_metadata) k;

  if exists (
    select 1
    from unnest(coalesce(v_keys, array[]::text[])) k
    where k <> all (v_allowed)
  ) then
    raise exception 'metadata contains unknown or forbidden keys';
  end if;

  if p_metadata ? 'account_id'
     or p_metadata ? 'owner_id'
     or p_metadata ? 'policy_id'
     or p_metadata ? 'journal_entry_id'
     or p_metadata ? 'lines'
     or p_metadata ? 'allocation_event_id'
     or p_metadata ? 'capture_event_id' then
    raise exception 'metadata must not contain account or posting controls';
  end if;

  return p_metadata;
end;
$$;

revoke all on function public.store_settlement_assert_caller_metadata(jsonb)
  from public, anon, authenticated;

create or replace function public.store_settlement_canonical_request_object(
  p_action text,
  p_payment_attempt_id uuid,
  p_order_id uuid,
  p_store_id uuid,
  p_correlation_id text,
  p_amount_minor bigint,
  p_currency text,
  p_capture_event_id uuid,
  p_allocation_event_id uuid,
  p_policy_id uuid,
  p_metadata jsonb
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'action', p_action,
    'payment_attempt_id', p_payment_attempt_id,
    'order_id', p_order_id,
    'store_id', p_store_id,
    'correlation_id', p_correlation_id,
    'amount_minor', p_amount_minor,
    'currency', p_currency,
    'capture_event_id', p_capture_event_id,
    'allocation_event_id', p_allocation_event_id,
    'policy_id', p_policy_id,
    'metadata', coalesce(p_metadata, '{}'::jsonb)
  );
$$;

revoke all on function public.store_settlement_canonical_request_object(
  text, uuid, uuid, uuid, text, bigint, text, uuid, uuid, uuid, jsonb
) from public, anon, authenticated;

create or replace function public.store_settlement_compute_request_fingerprint(
  p_canonical jsonb,
  p_alg text default 'md5'
)
returns text
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_alg is distinct from 'md5' then
    raise exception 'unsupported fingerprint_alg: %', p_alg;
  end if;
  return md5(p_canonical::text);
end;
$$;

revoke all on function public.store_settlement_compute_request_fingerprint(jsonb, text)
  from public, anon, authenticated;

create or replace function public.store_settlement_policy_code_for_action(
  p_action text
)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_action
    when 'allocate' then 'store.settlement.allocate'
    when 'release' then 'store.settlement.release'
    when 'hold' then 'store.settlement.hold'
    when 'reverse_allocation' then 'store.settlement.reverse_allocation'
    else null
  end;
$$;

revoke all on function public.store_settlement_policy_code_for_action(text)
  from public, anon, authenticated;

create or replace function public.store_settlement_resolve_policy(
  p_policy_code text
)
returns public.ueos_policies
language plpgsql
stable
set search_path = public
as $$
declare
  v_count int;
  v_policy public.ueos_policies%rowtype;
begin
  select count(*) into v_count
  from public.ueos_policies p
  where p.policy_code = p_policy_code
    and public.ueos_policy_is_effective(p, now());

  if v_count = 0 then
    raise exception 'no effective policy for %', p_policy_code;
  end if;
  if v_count > 1 then
    raise exception 'multiple effective policies for %', p_policy_code;
  end if;

  select * into v_policy
  from public.ueos_policies p
  where p.policy_code = p_policy_code
    and public.ueos_policy_is_effective(p, now())
  for share;

  return v_policy;
end;
$$;

revoke all on function public.store_settlement_resolve_policy(text)
  from public, anon, authenticated;

create or replace function public.store_settlement_resolve_ueos_lines(
  p_posting jsonb,
  p_asset_code text,
  p_amount_minor bigint,
  p_store_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line jsonb;
  v_role text;
  v_owner_type text;
  v_account_kind text;
  v_product_scope text;
  v_account jsonb;
  v_out jsonb := '[]'::jsonb;
  i int;
begin
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'journal amount_minor must be > 0';
  end if;
  if p_asset_code is null or p_asset_code !~ '^[A-Z]{3}$' then
    raise exception 'invalid asset_code for posting';
  end if;
  if p_store_id is null then
    raise exception 'store_id is required for settlement posting';
  end if;
  if p_posting is null or jsonb_typeof(p_posting -> 'lines') is distinct from 'array' then
    raise exception 'posting lines are required';
  end if;

  for i in 0 .. jsonb_array_length(p_posting -> 'lines') - 1 loop
    v_line := p_posting -> 'lines' -> i;
    if v_line ? 'account_id' or v_line ? 'owner_id' then
      raise exception 'caller-controlled account_id/owner_id is not allowed';
    end if;

    v_role := v_line ->> 'role';
    v_owner_type := v_line ->> 'owner_type';
    v_account_kind := v_line ->> 'account_kind';
    v_product_scope := v_line ->> 'product_scope';

    if v_role not in ('debit', 'credit') then
      raise exception 'malformed posting role';
    end if;
    if v_account_kind = 'revenue' then
      raise exception 'revenue account_kind is forbidden in settlement posting';
    end if;
    if v_account_kind not in ('liability', 'escrow', 'payable') then
      raise exception 'unsupported account_kind in settlement posting template';
    end if;

    if v_owner_type = 'platform' then
      if v_account_kind is distinct from 'liability' then
        raise exception 'platform settlement lines must use liability';
      end if;
      if v_product_scope is distinct from 'ueos' then
        raise exception 'platform settlement lines must use product_scope ueos';
      end if;
      v_account := public.ueos_ensure_account(
        'platform',
        null,
        v_account_kind,
        p_asset_code,
        'ueos'
      );
    elsif v_owner_type = 'store' then
      if v_account_kind not in ('escrow', 'payable') then
        raise exception 'store settlement lines must use escrow or payable';
      end if;
      if v_product_scope is distinct from 'store' then
        raise exception 'store settlement lines must use product_scope store';
      end if;
      v_account := public.ueos_ensure_account(
        'store',
        p_store_id,
        v_account_kind,
        p_asset_code,
        'store'
      );
    else
      raise exception 'unsupported owner_type in settlement posting template';
    end if;

    v_out := v_out || jsonb_build_array(
      jsonb_build_object(
        'account_id', v_account ->> 'account_id',
        'direction', v_role,
        'amount_minor', p_amount_minor
      )
    );
  end loop;

  return v_out;
end;
$$;

revoke all on function public.store_settlement_resolve_ueos_lines(jsonb, text, bigint, uuid)
  from public, anon, authenticated;

create or replace function public.store_settlement_ueos_event_type(
  p_action text
)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_action
    when 'allocate' then 'hold'
    when 'hold' then 'hold'
    when 'release' then 'release'
    when 'reverse_allocation' then 'release'
    else null
  end;
$$;

revoke all on function public.store_settlement_ueos_event_type(text)
  from public, anon, authenticated;

-- Event-sourced settlement state for a capture.
-- Transitions:
--   UNALLOCATED --allocate--> ALLOCATED
--   ALLOCATED|HELD --release--> RELEASED
--   RELEASED --hold--> HELD
--   ALLOCATED|HELD --reverse_allocation--> REVERSED  (TERMINAL in V1)
-- reverse_allocation is forbidden from RELEASED (enforced here as corrupt/invalid).
-- allocate / reverse_allocation into or from REVERSED is corrupt history.
create or replace function public.store_settlement_state_for_capture(
  p_capture_event_id uuid
)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_state text := 'UNALLOCATED';
  v_rec public.store_settlement_events%rowtype;
begin
  if p_capture_event_id is null then
    raise exception 'capture_event_id is required';
  end if;

  for v_rec in
    select *
    from public.store_settlement_events e
    where e.capture_event_id = p_capture_event_id
    order by e.created_at asc, e.id asc
  loop
    if v_rec.action = 'allocate' then
      if v_state is distinct from 'UNALLOCATED' then
        raise exception
          'corrupt settlement history: allocate not allowed in state % for capture %',
          v_state,
          p_capture_event_id;
      end if;
      v_state := 'ALLOCATED';
    elsif v_rec.action = 'release' then
      if v_state not in ('ALLOCATED', 'HELD') then
        raise exception
          'corrupt settlement history: release not allowed in state % for capture %',
          v_state,
          p_capture_event_id;
      end if;
      v_state := 'RELEASED';
    elsif v_rec.action = 'hold' then
      if v_state is distinct from 'RELEASED' then
        raise exception
          'corrupt settlement history: hold not allowed in state % for capture %',
          v_state,
          p_capture_event_id;
      end if;
      v_state := 'HELD';
    elsif v_rec.action = 'reverse_allocation' then
      if v_state not in ('ALLOCATED', 'HELD') then
        raise exception
          'corrupt settlement history: reverse_allocation not allowed in state % for capture %',
          v_state,
          p_capture_event_id;
      end if;
      v_state := 'REVERSED';
    else
      raise exception 'unknown settlement action % in history', v_rec.action;
    end if;
  end loop;

  return v_state;
end;
$$;

revoke all on function public.store_settlement_state_for_capture(uuid)
  from public, anon, authenticated;

-- Alias name used in design notes.
create or replace function public.store_settlement_active_state(
  p_capture_event_id uuid
)
returns text
language sql
stable
set search_path = public
as $$
  select public.store_settlement_state_for_capture(p_capture_event_id);
$$;

revoke all on function public.store_settlement_active_state(uuid)
  from public, anon, authenticated;

create or replace function public.store_settlement_assert_refund_allowed(
  p_payment_attempt_id uuid,
  p_correlation_id text
)
returns void
language plpgsql
stable
set search_path = public
as $$
declare
  v_capture public.store_payment_outcome_events%rowtype;
  v_state text;
  v_correlation text := nullif(btrim(coalesce(p_correlation_id, '')), '');
  v_latest_allocate public.store_settlement_events%rowtype;
  v_reverse public.store_settlement_events%rowtype;
begin
  if p_payment_attempt_id is null then
    raise exception 'payment_attempt_id is required for settlement refund guard';
  end if;
  if v_correlation is null then
    raise exception 'correlation_id is required for settlement refund guard';
  end if;

  -- Trusted tables only — never caller metadata.
  select * into v_capture
  from public.store_payment_outcome_events e
  where e.payment_attempt_id = p_payment_attempt_id
    and e.outcome = 'captured'
  order by e.created_at asc
  limit 1;

  if not found then
    raise exception 'settlement refund guard requires a trusted capture outcome for this attempt';
  end if;
  if v_capture.correlation_id is distinct from v_correlation then
    raise exception 'settlement refund guard correlation_id must match capture correlation_id';
  end if;

  v_state := public.store_settlement_state_for_capture(v_capture.id);

  if v_state in ('ALLOCATED', 'HELD') then
    raise exception
      'refund blocked: settlement allocation active; reverse_allocation required first';
  end if;
  if v_state = 'RELEASED' then
    raise exception
      'refund blocked: settlement funds released to seller payable (V1)';
  end if;
  -- UNALLOCATED (never allocated or legacy) and REVERSED (terminal reverse) allow refund.
  if v_state not in ('UNALLOCATED', 'REVERSED') then
    raise exception 'refund blocked: unknown settlement state %', v_state;
  end if;

  -- When REVERSED (or UNALLOCATED with allocate history): require completed reverse
  -- proofs — no active_allocations row, and a reverse_allocation for the latest
  -- allocate with a non-null UEOS journal. Never-allocated UNALLOCATED skips this.
  select * into v_latest_allocate
  from public.store_settlement_events e
  where e.capture_event_id = v_capture.id
    and e.action = 'allocate'
  order by e.created_at desc, e.id desc
  limit 1;

  if found then
    if exists (
      select 1
      from public.store_settlement_active_allocations a
      where a.capture_event_id = v_capture.id
    ) then
      raise exception
        'refund blocked: active settlement allocation row still present for capture %',
        v_capture.id;
    end if;

    select * into v_reverse
    from public.store_settlement_events r
    where r.capture_event_id = v_capture.id
      and r.action = 'reverse_allocation'
      and r.allocation_event_id = v_latest_allocate.id
    order by r.created_at desc, r.id desc
    limit 1;

    if not found then
      raise exception
        'refund blocked: reverse_allocation event missing for latest allocate % on capture %',
        v_latest_allocate.id,
        v_capture.id;
    end if;
    if v_reverse.ueos_journal_entry_id is null then
      raise exception
        'refund blocked: reverse_allocation % has null ueos_journal_entry_id for capture %',
        v_reverse.id,
        v_capture.id;
    end if;
  end if;
end;
$$;

revoke all on function public.store_settlement_assert_refund_allowed(uuid, text)
  from public, anon, authenticated;

create or replace function public.store_settlement_replay_payload(
  p_event public.store_settlement_events
)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'replayed', true,
    'event_id', p_event.id,
    'event_key', p_event.event_key,
    'correlation_id', p_event.correlation_id,
    'action', p_event.action,
    'store_id', p_event.store_id,
    'order_id', p_event.order_id,
    'payment_attempt_id', p_event.payment_attempt_id,
    'capture_event_id', p_event.capture_event_id,
    'allocation_event_id', p_event.allocation_event_id,
    'amount_minor', p_event.amount_minor,
    'currency', p_event.currency,
    'ueos_journal_entry_id', p_event.ueos_journal_entry_id,
    'request_fingerprint', p_event.request_fingerprint,
    'fingerprint_alg', p_event.fingerprint_alg,
    'settlement_state', public.store_settlement_state_for_capture(p_event.capture_event_id)
  );
$$;

revoke all on function public.store_settlement_replay_payload(
  public.store_settlement_events
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) apply_store_settlement_event — single write gate
-- ---------------------------------------------------------------------------

create or replace function public.apply_store_settlement_event(
  p_action text,
  p_event_key text,
  p_correlation_id text,
  p_payment_attempt_id uuid,
  p_amount_minor bigint,
  p_currency text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_event_key text := nullif(btrim(coalesce(p_event_key, '')), '');
  v_correlation_id text := nullif(btrim(coalesce(p_correlation_id, '')), '');
  v_metadata jsonb;
  v_order_id uuid;
  v_store_id uuid;
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_store public.stores%rowtype;
  v_capture public.store_payment_outcome_events%rowtype;
  v_existing public.store_settlement_events%rowtype;
  v_active_alloc public.store_settlement_events%rowtype;
  v_amount bigint;
  v_currency text;
  v_state text;
  v_parent_allocation_id uuid;
  v_canonical jsonb;
  v_fingerprint text;
  v_fingerprint_alg constant text := 'md5';
  v_policy public.ueos_policies%rowtype;
  v_policy_code text;
  v_posting jsonb;
  v_lines jsonb;
  v_journal jsonb;
  v_journal_id uuid;
  v_event_id uuid;
  v_ueos_idem text;
  v_ueos_event text;
  v_deleted int;
  v_is_replay boolean := false;
begin
  if p_payment_attempt_id is null then
    raise exception 'payment_attempt_id is required';
  end if;
  if v_action not in ('allocate', 'release', 'hold', 'reverse_allocation') then
    raise exception 'invalid settlement action: %', v_action;
  end if;
  if v_event_key is null
     or char_length(v_event_key) < 8
     or char_length(v_event_key) > 128 then
    raise exception 'event_key must be 8..128 characters';
  end if;
  if v_correlation_id is null
     or char_length(v_correlation_id) < 8
     or char_length(v_correlation_id) > 128 then
    raise exception 'correlation_id must be 8..128 characters';
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'amount_minor must be > 0 for settlement V1';
  end if;
  if p_currency is null or btrim(p_currency) = '' then
    raise exception 'currency is required';
  end if;

  v_metadata := public.store_settlement_assert_caller_metadata(
    coalesce(p_metadata, '{}'::jsonb)
  );

  -- 1) Event identity lock
  perform pg_advisory_xact_lock(
    ('x' || substr(md5('store_set_event:' || v_event_key), 1, 16))::bit(64)::bigint
  );

  select order_id into v_order_id
  from public.payment_attempts
  where id = p_payment_attempt_id;
  if v_order_id is null then
    raise exception 'payment attempt not found';
  end if;

  -- 2) Order settlement lock
  perform pg_advisory_xact_lock(
    ('x' || substr(md5('store_set_order:' || v_order_id::text), 1, 16))::bit(64)::bigint
  );

  select * into v_order
  from public.orders
  where id = v_order_id
  for update;
  if not found then
    raise exception 'order not found';
  end if;

  select * into v_attempt
  from public.payment_attempts
  where id = p_payment_attempt_id
  for update;
  if not found then
    raise exception 'payment attempt not found';
  end if;
  if v_attempt.order_id is distinct from v_order.id then
    raise exception 'payment attempt does not belong to locked order';
  end if;

  v_store_id := v_order.store_id;
  select * into v_store
  from public.stores
  where id = v_store_id
  for share;
  if not found then
    raise exception 'store not found';
  end if;

  -- Trusted capture for this attempt
  select * into v_capture
  from public.store_payment_outcome_events e
  where e.payment_attempt_id = v_attempt.id
    and e.outcome = 'captured'
  order by e.created_at asc
  limit 1
  for share;

  if not found then
    raise exception 'settlement requires a trusted capture outcome event for this attempt';
  end if;

  -- 3) Capture settlement lock (serializes all actions on this capture)
  perform pg_advisory_xact_lock(
    ('x' || substr(md5('store_set_capture:' || v_capture.id::text), 1, 16))::bit(64)::bigint
  );

  if v_capture.correlation_id is distinct from v_correlation_id then
    raise exception 'settlement correlation_id must match the capture correlation_id';
  end if;
  if v_capture.order_id is distinct from v_order.id then
    raise exception 'capture order diverges from locked order';
  end if;

  v_amount := p_amount_minor;
  v_currency := upper(btrim(p_currency));

  if v_attempt.amount_minor is distinct from v_order.grand_total_minor then
    raise exception 'payment attempt amount diverges from order grand_total_minor';
  end if;
  if upper(v_attempt.currency) is distinct from upper(v_order.currency) then
    raise exception 'payment attempt currency diverges from order currency';
  end if;
  if v_amount is distinct from v_attempt.amount_minor then
    raise exception 'amount_minor must equal payment attempt amount (full amount only)';
  end if;
  if v_currency is distinct from upper(v_attempt.currency) then
    raise exception 'currency must equal payment attempt currency';
  end if;
  if v_capture.amount_minor is distinct from v_amount
     or upper(coalesce(v_capture.currency, '')) is distinct from v_currency then
    raise exception 'settlement amount/currency must match trusted capture event';
  end if;
  if v_order.payment_status is distinct from 'paid' then
    raise exception 'settlement requires order payment_status=paid';
  end if;
  if v_attempt.status is distinct from 'captured' then
    raise exception 'settlement requires payment_attempt.status=captured';
  end if;
  if exists (
    select 1 from store_payment_outcome_events e
    where e.payment_attempt_id = v_attempt.id and e.outcome = 'refunded'
  ) then
    raise exception 'settlement blocked: trusted refund outcome already exists for payment attempt %', v_attempt.id;
  end if;
  if v_capture.ueos_journal_entry_id is null then
    raise exception 'settlement requires capture UEOS journal for positive amount';
  end if;

  -- Resolve active (non-reversed) allocation from trusted events — never from caller.
  select * into v_active_alloc
  from public.store_settlement_events e
  where e.capture_event_id = v_capture.id
    and e.action = 'allocate'
    and not exists (
      select 1
      from public.store_settlement_events r
      where r.capture_event_id = v_capture.id
        and r.action = 'reverse_allocation'
        and r.allocation_event_id = e.id
    )
  order by e.created_at desc, e.id desc
  limit 1;

  if found then
    v_parent_allocation_id := v_active_alloc.id;
  else
    v_parent_allocation_id := null;
  end if;

  v_state := public.store_settlement_state_for_capture(v_capture.id);

  -- Resolve policy + assert template BEFORE fingerprint (fingerprint includes policy_id).
  v_policy_code := public.store_settlement_policy_code_for_action(v_action);
  if v_policy_code is null then
    raise exception 'no policy mapped for settlement action %', v_action;
  end if;
  v_policy := public.store_settlement_resolve_policy(v_policy_code);
  v_posting := public.store_settlement_assert_posting_template(
    v_action,
    v_policy.metadata
  );

  -- Event_key lookup BEFORE state transition guards so exact reverse replay
  -- still works after REVERSED (active parent is gone; use stored parent).
  select * into v_existing
  from public.store_settlement_events
  where event_key = v_event_key
  for share;
  v_is_replay := found;

  if v_action = 'allocate' then
    v_parent_allocation_id := null;
  elsif v_is_replay then
    -- Replay: fingerprint against the original stored parent allocation.
    v_parent_allocation_id := v_existing.allocation_event_id;
  end if;
  -- else: keep derived active parent for new release/hold/reverse

  -- Canonical fingerprint uses resolved parent (null for allocate) + policy_id.
  v_canonical := public.store_settlement_canonical_request_object(
    v_action,
    v_attempt.id,
    v_order.id,
    v_store_id,
    v_correlation_id,
    v_amount,
    v_currency,
    v_capture.id,
    case when v_action = 'allocate' then null else v_parent_allocation_id end,
    v_policy.id,
    v_metadata
  );
  -- jsonb::text is key-order deterministic in PostgreSQL (keys stored sorted).
  v_fingerprint := public.store_settlement_compute_request_fingerprint(
    v_canonical,
    v_fingerprint_alg
  );

  if v_is_replay then
    if v_existing.request_fingerprint is distinct from v_fingerprint
       or v_existing.fingerprint_alg is distinct from v_fingerprint_alg then
      raise exception
        'idempotency conflict: event_key % already used with a different request fingerprint',
        v_event_key
        using errcode = '23505';
    end if;
    return public.store_settlement_replay_payload(v_existing);
  end if;

  -- State machine guards (new events only — replay returned above).
  if v_action = 'allocate' then
    if v_state = 'REVERSED' then
      raise exception
        'settlement allocate rejected: capture % is REVERSED (terminal in V1); re-allocation is not allowed',
        v_capture.id;
    end if;
    -- Defense in depth: any historical reverse permanently blocks allocate.
    if exists (
      select 1
      from public.store_settlement_events e
      where e.capture_event_id = v_capture.id
        and e.action = 'reverse_allocation'
    ) then
      raise exception
        'settlement allocate rejected: capture % has prior reverse_allocation; REVERSED / prior reverse_allocation permanently blocks allocate in V1',
        v_capture.id;
    end if;
    if v_state is distinct from 'UNALLOCATED' then
      raise exception
        'action allocate already finalized for capture %; replay original event_key % (state %)',
        v_capture.id,
        coalesce(v_active_alloc.event_key, '<unknown>'),
        v_state;
    end if;
    v_parent_allocation_id := null;
  elsif v_action = 'release' then
    if v_state = 'REVERSED' then
      raise exception
        'settlement action release not allowed: capture % is REVERSED (terminal in V1)',
        v_capture.id;
    end if;
    if v_state not in ('ALLOCATED', 'HELD') then
      raise exception
        'settlement action release not allowed in state % for capture %',
        v_state,
        v_capture.id;
    end if;
    if v_parent_allocation_id is null then
      raise exception 'release requires an active allocation for capture %', v_capture.id;
    end if;
  elsif v_action = 'hold' then
    if v_state = 'REVERSED' then
      raise exception
        'settlement action hold not allowed: capture % is REVERSED (terminal in V1)',
        v_capture.id;
    end if;
    if v_state is distinct from 'RELEASED' then
      raise exception
        'settlement action hold not allowed in state % for capture %',
        v_state,
        v_capture.id;
    end if;
    if v_parent_allocation_id is null then
      raise exception 'hold requires an active allocation for capture %', v_capture.id;
    end if;
  elsif v_action = 'reverse_allocation' then
    if v_state = 'REVERSED' then
      raise exception
        'settlement action reverse_allocation not allowed: capture % is REVERSED (terminal in V1); replay original event_key',
        v_capture.id;
    end if;
    if v_state = 'RELEASED' then
      raise exception
        'reverse_allocation forbidden while settlement funds are RELEASED for capture %',
        v_capture.id;
    end if;
    if v_state not in ('ALLOCATED', 'HELD') then
      raise exception
        'settlement action reverse_allocation not allowed in state % for capture %',
        v_state,
        v_capture.id;
    end if;
    if v_parent_allocation_id is null then
      raise exception
        'reverse_allocation requires an active allocation for capture %',
        v_capture.id;
    end if;
  end if;

  -- Claim event_key BEFORE UEOS post.
  insert into public.store_settlement_events (
    event_key,
    correlation_id,
    request_fingerprint,
    fingerprint_alg,
    action,
    store_id,
    order_id,
    payment_attempt_id,
    capture_event_id,
    allocation_event_id,
    amount_minor,
    currency,
    ueos_journal_entry_id,
    metadata
  ) values (
    v_event_key,
    v_correlation_id,
    v_fingerprint,
    v_fingerprint_alg,
    v_action,
    v_store_id,
    v_order.id,
    v_attempt.id,
    v_capture.id,
    case when v_action = 'allocate' then null else v_parent_allocation_id end,
    v_amount,
    v_currency,
    null,
    v_metadata
  )
  returning id into v_event_id;

  -- DB-authoritative active allocation uniqueness.
  if v_action = 'allocate' then
    begin
      insert into public.store_settlement_active_allocations (
        capture_event_id,
        allocation_event_id,
        store_id,
        order_id,
        payment_attempt_id,
        amount_minor,
        currency
      ) values (
        v_capture.id,
        v_event_id,
        v_store_id,
        v_order.id,
        v_attempt.id,
        v_amount,
        v_currency
      );
    exception
      when unique_violation then
        raise exception
          'concurrent or double allocate for capture %: active allocation already exists',
          v_capture.id;
    end;
  elsif v_action = 'reverse_allocation' then
    delete from public.store_settlement_active_allocations
    where capture_event_id = v_capture.id;
    get diagnostics v_deleted = row_count;
    if v_deleted = 0 then
      raise exception
        'reverse_allocation expected active allocation row missing for capture %',
        v_capture.id;
    end if;
  end if;

  if not exists (
    select 1
    from public.ueos_assets a
    where a.code = v_currency
      and a.lifecycle_status = 'active'
  ) then
    raise exception 'currency % is not an active UEOS asset', v_currency;
  end if;

  v_lines := public.store_settlement_resolve_ueos_lines(
    v_posting,
    v_currency,
    v_amount,
    v_store_id
  );

  v_ueos_event := public.store_settlement_ueos_event_type(v_action);
  if v_ueos_event is null then
    raise exception 'no UEOS event_type for settlement action %', v_action;
  end if;

  v_ueos_idem := 'sset-' || md5(v_event_key);
  v_journal := public.ueos_post_journal(
    v_ueos_idem,
    v_ueos_event,
    'store',
    v_lines,
    v_policy.id,
    'store_settlement_event',
    v_event_id::text,
    format('store settlement %s', v_action),
    jsonb_build_object(
      'event_key', v_event_key,
      'correlation_id', v_correlation_id,
      'action', v_action,
      'capture_event_id', v_capture.id
    ),
    'service',
    null
  );
  v_journal_id := (v_journal ->> 'journal_entry_id')::uuid;

  update public.store_settlement_events e
  set ueos_journal_entry_id = v_journal_id
  where e.id = v_event_id;

  return jsonb_build_object(
    'replayed', false,
    'event_id', v_event_id,
    'event_key', v_event_key,
    'correlation_id', v_correlation_id,
    'action', v_action,
    'store_id', v_store_id,
    'order_id', v_order.id,
    'payment_attempt_id', v_attempt.id,
    'capture_event_id', v_capture.id,
    'allocation_event_id', case
      when v_action = 'allocate' then null
      else v_parent_allocation_id
    end,
    'amount_minor', v_amount,
    'currency', v_currency,
    'ueos_journal_entry_id', v_journal_id,
    'request_fingerprint', v_fingerprint,
    'fingerprint_alg', v_fingerprint_alg,
    'settlement_state', public.store_settlement_state_for_capture(v_capture.id)
  );
end;
$$;

comment on function public.apply_store_settlement_event(
  text, text, text, uuid, bigint, text, jsonb
) is
  'Trusted Store merchant settlement. Claim-first event_key, capture-locked state machine, liability↔escrow↔payable UEOS posts. GRANT EXECUTE to service_role only.';

revoke all on function public.apply_store_settlement_event(
  text, text, text, uuid, bigint, text, jsonb
) from public, anon, authenticated;

grant execute on function public.apply_store_settlement_event(
  text, text, text, uuid, bigint, text, jsonb
) to service_role;

-- ---------------------------------------------------------------------------
-- 5) CREATE OR REPLACE apply_store_payment_outcome — add settlement refund guard
-- Full body copied from 20260823 HEAD; refund block gains settlement assert.
-- ---------------------------------------------------------------------------

create or replace function public.apply_store_payment_outcome(
  p_payment_attempt_id uuid,
  p_outcome text,
  p_event_key text,
  p_correlation_id text,
  p_provider_reference text default null,
  p_amount_minor bigint default null,
  p_currency text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outcome text := lower(btrim(coalesce(p_outcome, '')));
  v_event_key text := nullif(btrim(coalesce(p_event_key, '')), '');
  v_correlation_id text := nullif(btrim(coalesce(p_correlation_id, '')), '');
  v_provider_ref text := nullif(btrim(coalesce(p_provider_reference, '')), '');
  v_metadata jsonb;
  v_order_id uuid;
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_existing public.store_payment_outcome_events%rowtype;
  v_capture public.store_payment_outcome_events%rowtype;
  v_prior public.store_payment_outcome_events%rowtype;
  v_amount bigint;
  v_currency text;
  v_canonical jsonb;
  v_fingerprint text;
  v_fingerprint_alg constant text := 'md5';
  v_policy public.ueos_policies%rowtype;
  v_policy_code text;
  v_posting jsonb;
  v_needs_journal boolean;
  v_lines jsonb;
  v_journal jsonb;
  v_journal_id uuid;
  v_history_id uuid;
  v_from_attempt_status text;
  v_to_attempt_status text;
  v_from_order_payment text;
  v_to_order_payment text;
  v_event_id uuid;
  v_ueos_idem text;
begin
  if p_payment_attempt_id is null then
    raise exception 'payment_attempt_id is required';
  end if;
  if v_outcome not in ('authorized', 'captured', 'failed', 'cancelled', 'refunded') then
    raise exception 'invalid outcome: %', v_outcome;
  end if;
  if v_event_key is null
     or char_length(v_event_key) < 8
     or char_length(v_event_key) > 128 then
    raise exception 'event_key must be 8..128 characters';
  end if;
  if v_correlation_id is null
     or char_length(v_correlation_id) < 8
     or char_length(v_correlation_id) > 128 then
    raise exception 'correlation_id must be 8..128 characters';
  end if;

  v_metadata := public.store_payment_assert_caller_metadata(
    coalesce(p_metadata, '{}'::jsonb)
  );

  -- 1) Event identity lock
  perform pg_advisory_xact_lock(
    ('x' || substr(md5('store_pay_event:' || v_event_key), 1, 16))::bit(64)::bigint
  );

  -- Resolve order id, then lock order before attempt (deterministic order).
  select order_id into v_order_id
  from public.payment_attempts
  where id = p_payment_attempt_id;
  if v_order_id is null then
    raise exception 'payment attempt not found';
  end if;

  -- 2) Order payment lock (also serializes multi-attempt captures)
  perform pg_advisory_xact_lock(
    ('x' || substr(md5('store_pay_order:' || v_order_id::text), 1, 16))::bit(64)::bigint
  );

  select * into v_order
  from public.orders
  where id = v_order_id
  for update;
  if not found then
    raise exception 'order not found';
  end if;

  -- 3) Attempt lock
  select * into v_attempt
  from public.payment_attempts
  where id = p_payment_attempt_id
  for update;
  if not found then
    raise exception 'payment attempt not found';
  end if;
  if v_attempt.order_id is distinct from v_order.id then
    raise exception 'payment attempt does not belong to locked order';
  end if;

  if p_amount_minor is not null and p_amount_minor < 0 then
    raise exception 'amount_minor must be >= 0';
  end if;

  v_amount := coalesce(p_amount_minor, v_attempt.amount_minor);
  v_currency := upper(btrim(coalesce(nullif(p_currency, ''), v_attempt.currency)));

  if v_attempt.amount_minor is distinct from v_order.grand_total_minor then
    raise exception 'payment attempt amount diverges from order grand_total_minor';
  end if;
  if upper(v_attempt.currency) is distinct from upper(v_order.currency) then
    raise exception 'payment attempt currency diverges from order currency';
  end if;
  if v_amount is distinct from v_attempt.amount_minor then
    raise exception 'amount_minor must equal payment attempt amount (full capture/refund only)';
  end if;
  if v_currency is distinct from upper(v_attempt.currency) then
    raise exception 'currency must equal payment attempt currency';
  end if;

  -- Provider reference consistency: non-null changes to an existing value are rejected.
  if v_provider_ref is not null
     and v_attempt.provider_reference is not null
     and v_provider_ref is distinct from v_attempt.provider_reference then
    raise exception 'provider_reference does not match existing attempt provider_reference';
  end if;

  v_canonical := public.store_payment_canonical_request_object(
    v_outcome,
    v_attempt.id,
    v_order.id,
    v_correlation_id,
    v_amount,
    v_currency,
    coalesce(v_provider_ref, v_attempt.provider_reference),
    v_metadata
  );
  -- jsonb::text is key-order deterministic in PostgreSQL (keys stored sorted).
  v_fingerprint := public.store_payment_compute_request_fingerprint(
    v_canonical,
    v_fingerprint_alg
  );

  select * into v_existing
  from public.store_payment_outcome_events
  where event_key = v_event_key
  for share;

  if found then
    if v_existing.request_fingerprint is distinct from v_fingerprint
       or v_existing.fingerprint_alg is distinct from v_fingerprint_alg then
      raise exception
        'idempotency conflict: event_key % already used with a different request fingerprint',
        v_event_key
        using errcode = '23505';
    end if;
    return public.store_payment_outcome_replay_payload(v_existing);
  end if;

  -- Same semantic final state with a *different* event_key must fail closed
  -- (providers may emit multiple event ids; only original event_key may replay).
  select * into v_prior
  from public.store_payment_outcome_events e
  where e.payment_attempt_id = v_attempt.id
    and e.outcome = v_outcome
  order by e.created_at asc
  limit 1;

  if found then
    raise exception
      'outcome % already finalized for payment attempt %; replay original event_key %',
      v_outcome,
      v_attempt.id,
      v_prior.event_key;
  end if;

  v_from_attempt_status := v_attempt.status;
  if v_outcome = 'authorized' then
    v_to_attempt_status := 'authorized';
  elsif v_outcome = 'captured' then
    v_to_attempt_status := 'captured';
  elsif v_outcome = 'failed' then
    v_to_attempt_status := 'failed';
  elsif v_outcome = 'cancelled' then
    v_to_attempt_status := 'cancelled';
  elsif v_outcome = 'refunded' then
    v_to_attempt_status := 'refunded';
  end if;

  if not public.store_payment_attempt_transition_allowed(
    v_from_attempt_status,
    v_to_attempt_status
  ) then
    raise exception
      'invalid payment_attempt transition % → %',
      v_from_attempt_status,
      v_to_attempt_status;
  end if;

  -- Order-level guards (not only selected attempt).
  if v_outcome = 'captured' then
    if v_order.payment_status in ('paid', 'refunded', 'failed') then
      raise exception
        'order payment_status % blocks capture (no silent revive / double capture)',
        v_order.payment_status;
    end if;
    if exists (
      select 1
      from public.store_payment_outcome_events e
      where e.order_id = v_order.id
        and e.outcome = 'captured'
    ) then
      raise exception 'order % already has a trusted capture outcome', v_order.id;
    end if;
  end if;

  if v_outcome = 'failed' and v_order.payment_status = 'paid' then
    raise exception 'failed outcome cannot overwrite paid order';
  end if;

  if v_outcome = 'authorized' and v_order.payment_status in ('paid', 'refunded', 'failed') then
    raise exception 'authorized cannot apply to order payment_status %', v_order.payment_status;
  end if;

  if v_outcome = 'cancelled' and v_order.payment_status is distinct from 'pending' then
    raise exception 'cancelled requires order payment_status=pending';
  end if;

  -- Refund provenance: trusted capture event on *this* attempt + matching correlation.
  if v_outcome = 'refunded' then
    if v_order.payment_status is distinct from 'paid' then
      raise exception 'refund requires order payment_status=paid';
    end if;
    if v_attempt.status is distinct from 'captured' then
      raise exception 'refund requires payment_attempt.status=captured';
    end if;

    select * into v_capture
    from public.store_payment_outcome_events e
    where e.payment_attempt_id = v_attempt.id
      and e.outcome = 'captured'
    order by e.created_at asc
    limit 1
    for share;

    if not found then
      raise exception 'refund requires a prior trusted capture outcome event for this attempt';
    end if;
    if v_capture.correlation_id is distinct from v_correlation_id then
      raise exception 'refund correlation_id must match the capture correlation_id';
    end if;
    if v_capture.amount_minor is distinct from v_amount
       or upper(coalesce(v_capture.currency, '')) is distinct from v_currency then
      raise exception 'refund amount/currency must match trusted capture event';
    end if;
    if v_amount > 0 and v_capture.ueos_journal_entry_id is null then
      raise exception 'refund requires capture UEOS journal for non-zero amount';
    end if;
    if exists (
      select 1
      from public.store_payment_outcome_events e
      where e.payment_attempt_id = v_attempt.id
        and e.outcome = 'refunded'
    ) then
      raise exception 'refund already finalized for payment attempt %', v_attempt.id;
    end if;

    -- Settlement allocation guard (V1): refund when UNALLOCATED or REVERSED.
    perform public.store_settlement_assert_refund_allowed(
      v_attempt.id,
      v_correlation_id
    );
  end if;

  v_from_order_payment := v_order.payment_status;
  v_to_order_payment := public.store_payment_order_status_for_outcome(
    v_outcome,
    v_from_order_payment
  );

  -- Cancelled: order stays pending (no payment_status mutation).
  if v_outcome = 'cancelled' then
    v_to_order_payment := 'pending';
  end if;

  v_needs_journal := (
    v_outcome in ('captured', 'refunded')
    and v_amount > 0
  );

  -- Zero-total refund: allowed only with capture provenance (above); no journal.
  if v_outcome = 'refunded' and v_amount = 0 and v_capture.amount_minor is distinct from 0 then
    raise exception 'zero refund amount does not match non-zero capture';
  end if;

  v_policy_code := public.store_payment_policy_code_for_outcome(v_outcome);

  if v_needs_journal or v_outcome = 'authorized' then
    if v_policy_code is null then
      raise exception 'no policy mapped for outcome %', v_outcome;
    end if;
    v_policy := public.store_payment_resolve_policy(v_policy_code);
    v_posting := public.store_payment_assert_posting_template(
      v_outcome,
      v_policy.metadata
    );
  end if;

  -- Claim event_key BEFORE mutations / UEOS post (prevents partial unique-race commits).
  insert into public.store_payment_outcome_events (
    event_key,
    correlation_id,
    request_fingerprint,
    fingerprint_alg,
    payment_attempt_id,
    order_id,
    outcome,
    amount_minor,
    currency,
    ueos_journal_entry_id,
    order_history_id,
    provider_reference,
    metadata
  ) values (
    v_event_key,
    v_correlation_id,
    v_fingerprint,
    v_fingerprint_alg,
    v_attempt.id,
    v_order.id,
    v_outcome,
    v_amount,
    v_currency,
    null,
    null,
    coalesce(v_provider_ref, v_attempt.provider_reference),
    v_metadata
  )
  returning id into v_event_id;

  if v_needs_journal then
    if not exists (
      select 1
      from public.ueos_assets a
      where a.code = v_currency
        and a.lifecycle_status = 'active'
    ) then
      raise exception 'currency % is not an active UEOS asset', v_currency;
    end if;

    -- 4) UEOS account locks happen inside ueos_post_journal (ordered by account id).
    v_lines := public.store_payment_resolve_ueos_lines(
      v_posting,
      v_currency,
      v_amount
    );

    v_ueos_idem := 'spay-' || md5(v_event_key);
    v_journal := public.ueos_post_journal(
      v_ueos_idem,
      case when v_outcome = 'captured' then 'payment_captured' else 'refund_recorded' end,
      'store',
      v_lines,
      v_policy.id,
      'store_payment_attempt',
      v_attempt.id::text,
      format('store payment %s', v_outcome),
      jsonb_build_object(
        'event_key', v_event_key,
        'correlation_id', v_correlation_id,
        'outcome', v_outcome
      ),
      'service',
      null
    );
    v_journal_id := (v_journal ->> 'journal_entry_id')::uuid;
  end if;

  update public.payment_attempts pa
  set
    status = v_to_attempt_status,
    provider_reference = coalesce(v_provider_ref, pa.provider_reference),
    metadata = coalesce(pa.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'last_outcome_event_key', v_event_key,
        'last_correlation_id', v_correlation_id
      )
  where pa.id = v_attempt.id;

  if v_outcome is distinct from 'cancelled'
     and v_to_order_payment is distinct from v_from_order_payment then
    update public.orders o
    set payment_status = v_to_order_payment
    where o.id = v_order.id;
  end if;

  insert into public.order_status_history (
    order_id,
    actor_user_id,
    from_status,
    to_status,
    from_fulfillment_status,
    to_fulfillment_status,
    from_payment_status,
    to_payment_status,
    note,
    source
  ) values (
    v_order.id,
    null,
    null,
    null,
    null,
    null,
    case
      when v_outcome = 'cancelled' then null
      when v_to_order_payment is distinct from v_from_order_payment
        then v_from_order_payment
      else null
    end,
    case
      when v_outcome = 'cancelled' then 'pending'
      else v_to_order_payment
    end,
    format('payment outcome %s (event %s)', v_outcome, v_event_key),
    'system'
  )
  returning id into v_history_id;

  if v_history_id is null then
    raise exception 'order_status_history insert failed';
  end if;

  update public.store_payment_outcome_events e
  set
    ueos_journal_entry_id = v_journal_id,
    order_history_id = v_history_id
  where e.id = v_event_id;

  return jsonb_build_object(
    'replayed', false,
    'event_id', v_event_id,
    'event_key', v_event_key,
    'correlation_id', v_correlation_id,
    'payment_attempt_id', v_attempt.id,
    'order_id', v_order.id,
    'outcome', v_outcome,
    'attempt_status', v_to_attempt_status,
    'order_payment_status', case
      when v_outcome = 'cancelled' then v_from_order_payment
      else v_to_order_payment
    end,
    'ueos_journal_entry_id', v_journal_id,
    'order_history_id', v_history_id,
    'request_fingerprint', v_fingerprint,
    'fingerprint_alg', v_fingerprint_alg,
    'amount_minor', v_amount,
    'currency', v_currency
  );
end;
$$;

comment on function public.apply_store_payment_outcome(
  uuid, text, text, text, text, bigint, text, jsonb
) is
  'Trusted Store payment outcome sync. Claim-first event_key, order-locked capture uniqueness, capture-proven refunds, clearing↔liability UEOS posts. Settlement refund guard via store_settlement_assert_refund_allowed (20260824). GRANT EXECUTE to service_role only.';

revoke all on function public.apply_store_payment_outcome(
  uuid, text, text, text, text, bigint, text, jsonb
) from public, anon, authenticated;

grant execute on function public.apply_store_payment_outcome(
  uuid, text, text, text, text, bigint, text, jsonb
) to service_role;
