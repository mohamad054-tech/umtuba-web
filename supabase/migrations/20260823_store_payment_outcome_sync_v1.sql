-- UMTUBA Store — Trusted Payment Outcome Sync V1
-- Additive after UEOS Foundation (20260822) and Store payments (20260814+).
-- Connects payment_attempts outcomes → UEOS journals → orders.payment_status
-- → order_status_history atomically via one SECURITY DEFINER RPC.
--
-- Marketplace accounting (V1):
--   capture: debit platform clearing, credit platform liability
--   refund:  debit platform liability, credit platform clearing
-- Platform revenue is NOT touched. No commissions/settlement/payouts.
--
-- Does NOT: live PSPs, webhooks, UI, new payment enums, UM Points, UMT.

-- ---------------------------------------------------------------------------
-- 1) Outcome event ledger (idempotency + correlation)
-- ---------------------------------------------------------------------------

create table if not exists public.store_payment_outcome_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null
    constraint store_payment_outcome_events_event_key_len check (
      char_length(btrim(event_key)) between 8 and 128
    ),
  correlation_id text not null
    constraint store_payment_outcome_events_correlation_len check (
      char_length(btrim(correlation_id)) between 8 and 128
    ),
  request_fingerprint text not null
    constraint store_payment_outcome_events_fingerprint_len check (
      char_length(btrim(request_fingerprint)) between 16 and 128
    ),
  fingerprint_alg text not null
    constraint store_payment_outcome_events_fingerprint_alg_check check (
      fingerprint_alg in ('md5')
    ),
  payment_attempt_id uuid not null
    references public.payment_attempts (id) on delete restrict,
  order_id uuid not null
    references public.orders (id) on delete restrict,
  outcome text not null
    constraint store_payment_outcome_events_outcome_check check (
      outcome in (
        'authorized',
        'captured',
        'failed',
        'cancelled',
        'refunded'
      )
    ),
  amount_minor bigint
    constraint store_payment_outcome_events_amount_nonneg check (
      amount_minor is null or amount_minor >= 0
    ),
  currency text
    constraint store_payment_outcome_events_currency_check check (
      currency is null or currency ~ '^[A-Z]{3}$'
    ),
  ueos_journal_entry_id uuid
    references public.ueos_journal_entries (id) on delete restrict,
  order_history_id uuid
    references public.order_status_history (id) on delete restrict,
  provider_reference text
    constraint store_payment_outcome_events_provider_ref_len check (
      provider_reference is null
      or char_length(btrim(provider_reference)) between 1 and 200
    ),
  metadata jsonb not null default '{}'::jsonb
    constraint store_payment_outcome_events_metadata_object check (
      jsonb_typeof(metadata) = 'object'
    ),
  created_at timestamptz not null default now(),
  constraint store_payment_outcome_events_event_key_uidx unique (event_key)
);

comment on table public.store_payment_outcome_events is
  'Trusted payment outcome sync events. Canonical request_fingerprint is algorithm-tagged via fingerprint_alg (md5 today; replaceable later).';

comment on column public.store_payment_outcome_events.correlation_id is
  'Business-flow join key linking capture, refund, and future settlement/chargeback events.';

comment on column public.store_payment_outcome_events.request_fingerprint is
  'Opaque canonical request fingerprint. Public behavior is semantic equality; hashing algorithm is versioned in fingerprint_alg.';

create index if not exists store_payment_outcome_events_correlation_idx
  on public.store_payment_outcome_events (correlation_id, created_at desc);

create index if not exists store_payment_outcome_events_attempt_idx
  on public.store_payment_outcome_events (payment_attempt_id, created_at desc);

create index if not exists store_payment_outcome_events_order_idx
  on public.store_payment_outcome_events (order_id, created_at desc);

alter table public.store_payment_outcome_events enable row level security;
alter table public.store_payment_outcome_events force row level security;
revoke all on public.store_payment_outcome_events from public, anon, authenticated;
-- No authenticated SELECT in V1 (mirrors UEOS journal posture for money events).

-- ---------------------------------------------------------------------------
-- 2) Event-specific UEOS policies (strict posting templates)
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
      'store.payment.authorized',
      1,
      'active',
      timestamptz '2026-01-01 00:00:00+00',
      null::timestamptz,
      'Store payment authorized — status-only in Sync V1 (no UEOS journal).',
      jsonb_build_object(
        'posting', jsonb_build_object('mode', 'none')
      )
    ),
    (
      'store.payment.captured',
      1,
      'active',
      timestamptz '2026-01-01 00:00:00+00',
      null::timestamptz,
      'Store capture — platform clearing debit / liability credit (marketplace gross hold).',
      jsonb_build_object(
        'posting', jsonb_build_object(
          'mode', 'double_entry',
          'asset_source', 'order_currency',
          'lines', jsonb_build_array(
            jsonb_build_object(
              'role', 'debit',
              'owner_type', 'platform',
              'account_kind', 'clearing',
              'product_scope', 'ueos'
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
    ),
    (
      'store.payment.refunded',
      1,
      'active',
      timestamptz '2026-01-01 00:00:00+00',
      null::timestamptz,
      'Store refund — reverse marketplace hold (liability debit / clearing credit).',
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
              'owner_type', 'platform',
              'account_kind', 'clearing',
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
-- 3) Helpers: expected posting template + strict validation + fingerprint
-- ---------------------------------------------------------------------------

create or replace function public.store_payment_expected_posting_template(
  p_outcome text
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case p_outcome
    when 'captured' then
      jsonb_build_object(
        'mode', 'double_entry',
        'asset_source', 'order_currency',
        'lines', jsonb_build_array(
          jsonb_build_object(
            'role', 'debit',
            'owner_type', 'platform',
            'account_kind', 'clearing',
            'product_scope', 'ueos'
          ),
          jsonb_build_object(
            'role', 'credit',
            'owner_type', 'platform',
            'account_kind', 'liability',
            'product_scope', 'ueos'
          )
        )
      )
    when 'refunded' then
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
            'owner_type', 'platform',
            'account_kind', 'clearing',
            'product_scope', 'ueos'
          )
        )
      )
    when 'authorized' then
      jsonb_build_object('mode', 'none')
    else
      null
  end;
$$;

revoke all on function public.store_payment_expected_posting_template(text)
  from public, anon, authenticated;

create or replace function public.store_payment_assert_posting_template(
  p_outcome text,
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
  v_expected := public.store_payment_expected_posting_template(p_outcome);
  if v_expected is null then
    raise exception 'outcome % does not use a posting template', p_outcome;
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
    raise exception 'policy posting template does not match approved Sync V1 template for %', p_outcome;
  end if;

  if (v_posting ->> 'mode') = 'none' then
    return v_posting;
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
    if v_line ? 'owner_id' then
      raise exception 'caller-controlled owner_id is not allowed in posting templates';
    end if;
  end loop;

  return v_posting;
end;
$$;

revoke all on function public.store_payment_assert_posting_template(text, jsonb)
  from public, anon, authenticated;

create or replace function public.store_payment_canonical_request_object(
  p_outcome text,
  p_payment_attempt_id uuid,
  p_order_id uuid,
  p_correlation_id text,
  p_amount_minor bigint,
  p_currency text,
  p_provider_reference text,
  p_metadata jsonb
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'outcome', p_outcome,
    'payment_attempt_id', p_payment_attempt_id,
    'order_id', p_order_id,
    'correlation_id', p_correlation_id,
    'amount_minor', p_amount_minor,
    'currency', p_currency,
    'provider_reference', p_provider_reference,
    'metadata', coalesce(p_metadata, '{}'::jsonb)
  );
$$;

revoke all on function public.store_payment_canonical_request_object(
  text, uuid, uuid, text, bigint, text, text, jsonb
) from public, anon, authenticated;

-- Opaque fingerprint. Algorithm is versioned; public behavior is semantic equality.
create or replace function public.store_payment_compute_request_fingerprint(
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

revoke all on function public.store_payment_compute_request_fingerprint(jsonb, text)
  from public, anon, authenticated;

create or replace function public.store_payment_resolve_ueos_lines(
  p_posting jsonb,
  p_asset_code text,
  p_amount_minor bigint
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

  for i in 0 .. jsonb_array_length(p_posting -> 'lines') - 1 loop
    v_line := p_posting -> 'lines' -> i;
    v_role := v_line ->> 'role';
    v_owner_type := v_line ->> 'owner_type';
    v_account_kind := v_line ->> 'account_kind';
    v_product_scope := v_line ->> 'product_scope';

    if v_owner_type is distinct from 'platform' then
      raise exception 'unsupported owner_type in posting template';
    end if;
    if v_product_scope is distinct from 'ueos' then
      raise exception 'unsupported product_scope in posting template';
    end if;
    if v_account_kind not in ('clearing', 'liability') then
      raise exception 'unsupported account_kind in posting template';
    end if;
    if v_role not in ('debit', 'credit') then
      raise exception 'malformed posting role';
    end if;

    -- Never accept caller-controlled owner ids; platform accounts use null owner_id.
    v_account := public.ueos_ensure_account(
      'platform',
      null,
      v_account_kind,
      p_asset_code,
      'ueos'
    );

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

revoke all on function public.store_payment_resolve_ueos_lines(jsonb, text, bigint)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Transition helpers
-- ---------------------------------------------------------------------------

create or replace function public.store_payment_attempt_transition_allowed(
  p_from text,
  p_to text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when p_to = 'authorized' and p_from in ('deferred', 'pending') then true
    when p_to = 'captured' and p_from in ('deferred', 'pending', 'authorized') then true
    when p_to = 'failed' and p_from in ('deferred', 'pending', 'authorized') then true
    when p_to = 'cancelled' and p_from in ('deferred', 'pending', 'authorized') then true
    when p_to = 'refunded' and p_from = 'captured' then true
    else false
  end;
$$;

revoke all on function public.store_payment_attempt_transition_allowed(text, text)
  from public, anon, authenticated;

create or replace function public.store_payment_order_status_for_outcome(
  p_outcome text,
  p_current text
)
returns text
language plpgsql
immutable
set search_path = public
as $$
begin
  elsif p_outcome = 'authorized' then
    if p_current = 'pending' then
      return 'authorized';
    end if;
    raise exception 'invalid order payment_status transition for authorized from %', p_current;
  elsif p_outcome = 'captured' then
    if p_current in ('pending', 'authorized') then
      return 'paid';
    end if;
    raise exception 'invalid order payment_status transition for captured from %', p_current;
  elsif p_outcome = 'failed' then
    if p_current in ('pending', 'authorized') then
      return 'failed';
    end if;
    raise exception 'invalid order payment_status transition for failed from %', p_current;
  elsif p_outcome = 'cancelled' then
    -- Attempt cancel only; order remains pending.
    if p_current = 'pending' then
      return 'pending';
    end if;
    raise exception 'cancelled outcome requires order payment_status=pending (got %)', p_current;
  elsif p_outcome = 'refunded' then
    if p_current = 'paid' then
      return 'refunded';
    end if;
    raise exception 'invalid order payment_status transition for refunded from %', p_current;
  end if;
  raise exception 'unknown outcome %', p_outcome;
end;
$$;

revoke all on function public.store_payment_order_status_for_outcome(text, text)
  from public, anon, authenticated;

create or replace function public.store_payment_policy_code_for_outcome(
  p_outcome text
)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_outcome
    when 'authorized' then 'store.payment.authorized'
    when 'captured' then 'store.payment.captured'
    when 'refunded' then 'store.payment.refunded'
    else null
  end;
$$;

revoke all on function public.store_payment_policy_code_for_outcome(text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Metadata allow-list + single effective policy resolution
-- ---------------------------------------------------------------------------

create or replace function public.store_payment_assert_caller_metadata(
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
     or p_metadata ? 'lines' then
    raise exception 'metadata must not contain account or posting controls';
  end if;

  return p_metadata;
end;
$$;

revoke all on function public.store_payment_assert_caller_metadata(jsonb)
  from public, anon, authenticated;

create or replace function public.store_payment_resolve_policy(
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

revoke all on function public.store_payment_resolve_policy(text)
  from public, anon, authenticated;

create or replace function public.store_payment_outcome_replay_payload(
  p_event public.store_payment_outcome_events
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
    'payment_attempt_id', p_event.payment_attempt_id,
    'order_id', p_event.order_id,
    'outcome', p_event.outcome,
    'attempt_status', (
      select status from public.payment_attempts where id = p_event.payment_attempt_id
    ),
    'order_payment_status', (
      select payment_status from public.orders where id = p_event.order_id
    ),
    'ueos_journal_entry_id', p_event.ueos_journal_entry_id,
    'order_history_id', p_event.order_history_id,
    'request_fingerprint', p_event.request_fingerprint,
    'fingerprint_alg', p_event.fingerprint_alg
  );
$$;

revoke all on function public.store_payment_outcome_replay_payload(
  public.store_payment_outcome_events
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) apply_store_payment_outcome — single write gate
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
  'Trusted Store payment outcome sync. Claim-first event_key, order-locked capture uniqueness, capture-proven refunds, clearing↔liability UEOS posts. GRANT EXECUTE to service_role only.';

revoke all on function public.apply_store_payment_outcome(
  uuid, text, text, text, text, bigint, text, jsonb
) from public, anon, authenticated;

grant execute on function public.apply_store_payment_outcome(
  uuid, text, text, text, text, bigint, text, jsonb
) to service_role;

-- Ensure service_role can invoke UEOS write gate when operating as Sync caller
-- (DEFINER Sync still runs as owner; explicit grants document the support path).
grant execute on function public.ueos_ensure_account(text, uuid, text, text, text)
  to service_role;
grant execute on function public.ueos_post_journal(
  text, text, text, jsonb, uuid, text, text, text, jsonb, text, uuid
) to service_role;
