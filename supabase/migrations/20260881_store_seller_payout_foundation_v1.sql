-- UMTUBA Store — Seller Payout Foundation V1
-- Additive after Merchant Settlement Foundation V1 (20260824) and UEOS (20260822).
-- Moves store payable into store in_transit (and out) after settlement RELEASED.
-- Does NOT: bank rails, payout profiles/batches UI, maker-checker, commissions,
-- partial amounts, UM Points, live PSP transfer adapters.
--
-- State derivation order: created_at asc, id asc
--   NONE --submit--> IN_TRANSIT
--   IN_TRANSIT --confirm--> COMPLETED  (TERMINAL)
--   IN_TRANSIT --fail--> NONE          (re-submit allowed after fail)
-- COMPLETED permanently blocks new submit (historical confirm).
--
-- Seller store in_transit/payable use product_scope='store'.
-- Confirm credits platform clearing (product_scope='ueos') — funds leave custody.
-- Fingerprint includes policy_id (resolved before canonical/fingerprint).
-- Settlement mutations blocked while payout IN_TRANSIT or COMPLETED.

-- ---------------------------------------------------------------------------
-- 1) Extend UEOS account_kind with in_transit
-- ---------------------------------------------------------------------------

alter table public.ueos_accounts
  drop constraint if exists ueos_accounts_account_kind_check;

alter table public.ueos_accounts
  add constraint ueos_accounts_account_kind_check check (
    account_kind in (
      'wallet',
      'clearing',
      'receivable',
      'payable',
      'escrow',
      'revenue',
      'liability',
      'in_transit'
    )
  );

create or replace function public.ueos_ensure_account(
  p_owner_type text,
  p_owner_id uuid,
  p_account_kind text,
  p_asset_code text,
  p_product_scope text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.ueos_assets%rowtype;
  v_product public.ueos_products%rowtype;
  v_account public.ueos_accounts%rowtype;
  v_owner_type text := lower(btrim(coalesce(p_owner_type, '')));
  v_account_kind text := lower(btrim(coalesce(p_account_kind, '')));
  v_asset_code text := upper(btrim(coalesce(p_asset_code, '')));
  v_product_scope text := lower(btrim(coalesce(p_product_scope, '')));
  v_created boolean := false;
begin
  if v_owner_type not in ('user', 'store', 'platform', 'system') then
    raise exception 'invalid owner_type';
  end if;
  if v_account_kind not in (
    'wallet', 'clearing', 'receivable', 'payable', 'escrow', 'revenue',
    'liability', 'in_transit'
  ) then
    raise exception 'invalid account_kind';
  end if;
  if v_owner_type in ('user', 'store') and p_owner_id is null then
    raise exception 'owner_id is required for owner_type %', v_owner_type;
  end if;
  if v_owner_type in ('platform', 'system') and p_owner_id is not null then
    raise exception 'owner_id must be null for owner_type %', v_owner_type;
  end if;

  select * into v_asset
  from public.ueos_assets
  where code = v_asset_code
  for share;

  if not found then
    raise exception 'unknown asset_code: %', v_asset_code;
  end if;

  if v_asset.lifecycle_status is distinct from 'active' then
    raise exception
      'asset % is not postable (lifecycle_status=%)',
      v_asset_code,
      v_asset.lifecycle_status;
  end if;
  if v_asset_code = 'UMT' then
    raise exception 'UMT is future_reserved and cannot have accounts';
  end if;

  select * into v_product
  from public.ueos_products
  where code = v_product_scope
  for share;

  if not found then
    raise exception 'unknown product_scope: %', v_product_scope;
  end if;
  if v_product.status is distinct from 'active' then
    raise exception
      'product % is not active (status=%)',
      v_product_scope,
      v_product.status;
  end if;

  select * into v_account
  from public.ueos_accounts
  where owner_type = v_owner_type
    and coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(p_owner_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and account_kind = v_account_kind
    and asset_code = v_asset_code
    and product_scope = v_product_scope
  for update;

  if not found then
    insert into public.ueos_accounts (
      asset_code,
      owner_type,
      owner_id,
      account_kind,
      product_scope,
      status
    ) values (
      v_asset_code,
      v_owner_type,
      case when v_owner_type in ('platform', 'system') then null else p_owner_id end,
      v_account_kind,
      v_product_scope,
      'active'
    )
    returning * into v_account;

    insert into public.ueos_account_balances (account_id, balance_minor)
    values (v_account.id, 0);

    v_created := true;
  else
    if v_account.status is distinct from 'active' then
      raise exception 'account % is closed', v_account.id;
    end if;

    insert into public.ueos_account_balances (account_id, balance_minor)
    values (v_account.id, 0)
    on conflict (account_id) do nothing;
  end if;

  return jsonb_build_object(
    'account_id', v_account.id,
    'asset_code', v_account.asset_code,
    'owner_type', v_account.owner_type,
    'owner_id', v_account.owner_id,
    'account_kind', v_account.account_kind,
    'product_scope', v_account.product_scope,
    'status', v_account.status,
    'created', v_created,
    'balance_minor', (
      select b.balance_minor
      from public.ueos_account_balances b
      where b.account_id = v_account.id
    )
  );
end;
$$;

comment on function public.ueos_ensure_account(text, uuid, text, text, text) is
  'UEOS write gate (accounts). Creates account + zero balance. Includes in_transit (Seller Payout Foundation V1). Rejects non-active assets including UMT. EXECUTE revoked from PUBLIC/anon/authenticated.';

revoke all on function public.ueos_ensure_account(text, uuid, text, text, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Payout event ledger
-- ---------------------------------------------------------------------------

create table if not exists public.store_payout_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null
    constraint store_payout_events_event_key_len check (
      char_length(btrim(event_key)) between 8 and 128
    ),
  correlation_id text not null
    constraint store_payout_events_correlation_len check (
      char_length(btrim(correlation_id)) between 8 and 128
    ),
  request_fingerprint text not null
    constraint store_payout_events_fingerprint_len check (
      char_length(btrim(request_fingerprint)) between 16 and 128
    ),
  fingerprint_alg text not null
    constraint store_payout_events_fingerprint_alg_check check (
      fingerprint_alg in ('md5')
    ),
  action text not null
    constraint store_payout_events_action_check check (
      action in ('submit', 'confirm', 'fail')
    ),
  store_id uuid not null
    references public.stores (id) on delete restrict,
  order_id uuid not null
    references public.orders (id) on delete restrict,
  payment_attempt_id uuid not null
    references public.payment_attempts (id) on delete restrict,
  capture_event_id uuid not null
    references public.store_payment_outcome_events (id) on delete restrict,
  settlement_release_event_id uuid not null
    references public.store_settlement_events (id) on delete restrict,
  submit_event_id uuid
    references public.store_payout_events (id) on delete restrict,
  amount_minor bigint not null
    constraint store_payout_events_amount_positive check (
      amount_minor > 0
    ),
  currency text not null
    constraint store_payout_events_currency_check check (
      currency ~ '^[A-Z]{3}$'
    ),
  ueos_journal_entry_id uuid
    references public.ueos_journal_entries (id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb
    constraint store_payout_events_metadata_object check (
      jsonb_typeof(metadata) = 'object'
    ),
  created_at timestamptz not null default now(),
  constraint store_payout_events_event_key_uidx unique (event_key),
  constraint store_payout_events_submit_parent_check check (
    (action = 'submit' and submit_event_id is null)
    or (action <> 'submit' and submit_event_id is not null)
  )
);

comment on table public.store_payout_events is
  'Trusted seller payout events. Full-amount submit/confirm/fail against a RELEASED settlement capture. Root submit has null submit_event_id; children reference that submit. No bank rail execution in V1.';

comment on column public.store_payout_events.correlation_id is
  'Must match the trusted capture outcome correlation_id for this payment attempt.';

comment on column public.store_payout_events.submit_event_id is
  'Null for root submit. For confirm/fail, references the originating submit event.';

comment on column public.store_payout_events.settlement_release_event_id is
  'Trusted settlement release event that placed funds in store payable for this capture.';

create index if not exists store_payout_events_correlation_idx
  on public.store_payout_events (correlation_id, created_at desc);

create index if not exists store_payout_events_store_idx
  on public.store_payout_events (store_id, created_at desc);

create index if not exists store_payout_events_order_idx
  on public.store_payout_events (order_id, created_at desc);

create index if not exists store_payout_events_payment_attempt_idx
  on public.store_payout_events (payment_attempt_id, created_at desc);

create index if not exists store_payout_events_capture_event_idx
  on public.store_payout_events (capture_event_id, created_at asc);

create index if not exists store_payout_events_submit_event_idx
  on public.store_payout_events (submit_event_id, created_at desc);

alter table public.store_payout_events enable row level security;
alter table public.store_payout_events force row level security;
revoke all on public.store_payout_events from public, anon, authenticated;
-- No authenticated policies in V1 (money events; service_role / DEFINER only).

-- ---------------------------------------------------------------------------
-- 2b) Active in-transit payout uniqueness (DB-authoritative)
-- ---------------------------------------------------------------------------

create table if not exists public.store_payout_active_in_transit (
  capture_event_id uuid primary key
    references public.store_payment_outcome_events (id) on delete restrict,
  submit_event_id uuid not null
    references public.store_payout_events (id) on delete restrict,
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

comment on table public.store_payout_active_in_transit is
  'DB-authoritative uniqueness: PK capture_event_id enforces at most one active in-transit payout per capture. confirm/fail deletes the row; COMPLETED (historical confirm) permanently blocks new submit in V1.';

alter table public.store_payout_active_in_transit enable row level security;
alter table public.store_payout_active_in_transit force row level security;
revoke all on public.store_payout_active_in_transit from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Payout UEOS policies (strict posting templates)
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
      'store.payout.submit',
      1,
      'active',
      timestamptz '2026-01-01 00:00:00+00',
      null::timestamptz,
      'Seller payout submit — store payable debit / store in_transit credit.',
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
              'account_kind', 'in_transit',
              'product_scope', 'store'
            )
          )
        )
      )
    ),
    (
      'store.payout.confirm',
      1,
      'active',
      timestamptz '2026-01-01 00:00:00+00',
      null::timestamptz,
      'Seller payout confirm — store in_transit debit / platform clearing credit.',
      jsonb_build_object(
        'posting', jsonb_build_object(
          'mode', 'double_entry',
          'asset_source', 'order_currency',
          'lines', jsonb_build_array(
            jsonb_build_object(
              'role', 'debit',
              'owner_type', 'store',
              'account_kind', 'in_transit',
              'product_scope', 'store'
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
    ),
    (
      'store.payout.fail',
      1,
      'active',
      timestamptz '2026-01-01 00:00:00+00',
      null::timestamptz,
      'Seller payout fail — store in_transit debit / store payable credit.',
      jsonb_build_object(
        'posting', jsonb_build_object(
          'mode', 'double_entry',
          'asset_source', 'order_currency',
          'lines', jsonb_build_array(
            jsonb_build_object(
              'role', 'debit',
              'owner_type', 'store',
              'account_kind', 'in_transit',
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
    )
) as v(policy_code, version, status, effective_from, effective_to, description, metadata)
where not exists (
  select 1
  from public.ueos_policies p
  where p.policy_code = v.policy_code
    and p.version = v.version
);

-- ---------------------------------------------------------------------------
-- 4) Helpers
-- ---------------------------------------------------------------------------

create or replace function public.store_payout_expected_posting_template(
  p_action text
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case p_action
    when 'submit' then
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
            'account_kind', 'in_transit',
            'product_scope', 'store'
          )
        )
      )
    when 'confirm' then
      jsonb_build_object(
        'mode', 'double_entry',
        'asset_source', 'order_currency',
        'lines', jsonb_build_array(
          jsonb_build_object(
            'role', 'debit',
            'owner_type', 'store',
            'account_kind', 'in_transit',
            'product_scope', 'store'
          ),
          jsonb_build_object(
            'role', 'credit',
            'owner_type', 'platform',
            'account_kind', 'clearing',
            'product_scope', 'ueos'
          )
        )
      )
    when 'fail' then
      jsonb_build_object(
        'mode', 'double_entry',
        'asset_source', 'order_currency',
        'lines', jsonb_build_array(
          jsonb_build_object(
            'role', 'debit',
            'owner_type', 'store',
            'account_kind', 'in_transit',
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
    else
      null
  end;
$$;

revoke all on function public.store_payout_expected_posting_template(text)
  from public, anon, authenticated;

create or replace function public.store_payout_assert_posting_template(
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
  v_expected := public.store_payout_expected_posting_template(p_action);
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

  if v_posting is distinct from v_expected then
    raise exception 'policy posting template does not match approved Seller Payout V1 template for %', p_action;
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
      raise exception 'revenue account_kind is forbidden in payout posting templates';
    end if;
  end loop;

  return v_posting;
end;
$$;

revoke all on function public.store_payout_assert_posting_template(text, jsonb)
  from public, anon, authenticated;

create or replace function public.store_payout_assert_caller_metadata(
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
     or p_metadata ? 'submit_event_id'
     or p_metadata ? 'capture_event_id'
     or p_metadata ? 'settlement_release_event_id'
     or p_metadata ? 'rail'
     or p_metadata ? 'bank_account'
     or p_metadata ? 'beneficiary' then
    raise exception 'metadata must not contain account, rail, or posting controls';
  end if;

  return p_metadata;
end;
$$;

revoke all on function public.store_payout_assert_caller_metadata(jsonb)
  from public, anon, authenticated;

create or replace function public.store_payout_canonical_request_object(
  p_action text,
  p_payment_attempt_id uuid,
  p_order_id uuid,
  p_store_id uuid,
  p_correlation_id text,
  p_amount_minor bigint,
  p_currency text,
  p_capture_event_id uuid,
  p_settlement_release_event_id uuid,
  p_submit_event_id uuid,
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
    'settlement_release_event_id', p_settlement_release_event_id,
    'submit_event_id', p_submit_event_id,
    'policy_id', p_policy_id,
    'metadata', coalesce(p_metadata, '{}'::jsonb)
  );
$$;

revoke all on function public.store_payout_canonical_request_object(
  text, uuid, uuid, uuid, text, bigint, text, uuid, uuid, uuid, uuid, jsonb
) from public, anon, authenticated;

create or replace function public.store_payout_compute_request_fingerprint(
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

revoke all on function public.store_payout_compute_request_fingerprint(jsonb, text)
  from public, anon, authenticated;

create or replace function public.store_payout_policy_code_for_action(
  p_action text
)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_action
    when 'submit' then 'store.payout.submit'
    when 'confirm' then 'store.payout.confirm'
    when 'fail' then 'store.payout.fail'
    else null
  end;
$$;

revoke all on function public.store_payout_policy_code_for_action(text)
  from public, anon, authenticated;

create or replace function public.store_payout_resolve_policy(
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

revoke all on function public.store_payout_resolve_policy(text)
  from public, anon, authenticated;

create or replace function public.store_payout_resolve_ueos_lines(
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
    raise exception 'store_id is required for payout posting';
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
      raise exception 'revenue account_kind is forbidden in payout posting';
    end if;
    if v_account_kind not in ('payable', 'in_transit', 'clearing') then
      raise exception 'unsupported account_kind in payout posting template';
    end if;

    if v_owner_type = 'platform' then
      if v_account_kind is distinct from 'clearing' then
        raise exception 'platform payout lines must use clearing';
      end if;
      if v_product_scope is distinct from 'ueos' then
        raise exception 'platform payout lines must use product_scope ueos';
      end if;
      v_account := public.ueos_ensure_account(
        'platform',
        null,
        v_account_kind,
        p_asset_code,
        'ueos'
      );
    elsif v_owner_type = 'store' then
      if v_account_kind not in ('payable', 'in_transit') then
        raise exception 'store payout lines must use payable or in_transit';
      end if;
      if v_product_scope is distinct from 'store' then
        raise exception 'store payout lines must use product_scope store';
      end if;
      v_account := public.ueos_ensure_account(
        'store',
        p_store_id,
        v_account_kind,
        p_asset_code,
        'store'
      );
    else
      raise exception 'unsupported owner_type in payout posting template';
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

revoke all on function public.store_payout_resolve_ueos_lines(jsonb, text, bigint, uuid)
  from public, anon, authenticated;

create or replace function public.store_payout_ueos_event_type(
  p_action text
)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_action
    when 'submit' then 'transfer'
    when 'confirm' then 'transfer'
    when 'fail' then 'release'
    else null
  end;
$$;

revoke all on function public.store_payout_ueos_event_type(text)
  from public, anon, authenticated;

-- Event-sourced payout state for a capture.
-- Transitions:
--   NONE --submit--> IN_TRANSIT
--   IN_TRANSIT --confirm--> COMPLETED  (TERMINAL in V1)
--   IN_TRANSIT --fail--> NONE
-- submit into COMPLETED is corrupt; confirm/fail outside IN_TRANSIT is corrupt.
create or replace function public.store_payout_state_for_capture(
  p_capture_event_id uuid
)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_state text := 'NONE';
  v_rec public.store_payout_events%rowtype;
begin
  if p_capture_event_id is null then
    raise exception 'capture_event_id is required';
  end if;

  for v_rec in
    select *
    from public.store_payout_events e
    where e.capture_event_id = p_capture_event_id
    order by e.created_at asc, e.id asc
  loop
    if v_rec.action = 'submit' then
      if v_state is distinct from 'NONE' then
        raise exception
          'corrupt payout history: submit not allowed in state % for capture %',
          v_state,
          p_capture_event_id;
      end if;
      v_state := 'IN_TRANSIT';
    elsif v_rec.action = 'confirm' then
      if v_state is distinct from 'IN_TRANSIT' then
        raise exception
          'corrupt payout history: confirm not allowed in state % for capture %',
          v_state,
          p_capture_event_id;
      end if;
      v_state := 'COMPLETED';
    elsif v_rec.action = 'fail' then
      if v_state is distinct from 'IN_TRANSIT' then
        raise exception
          'corrupt payout history: fail not allowed in state % for capture %',
          v_state,
          p_capture_event_id;
      end if;
      v_state := 'NONE';
    else
      raise exception 'unknown payout action % in history', v_rec.action;
    end if;
  end loop;

  return v_state;
end;
$$;

revoke all on function public.store_payout_state_for_capture(uuid)
  from public, anon, authenticated;

create or replace function public.store_payout_active_state(
  p_capture_event_id uuid
)
returns text
language sql
stable
set search_path = public
as $$
  select public.store_payout_state_for_capture(p_capture_event_id);
$$;

revoke all on function public.store_payout_active_state(uuid)
  from public, anon, authenticated;

create or replace function public.store_payout_assert_settlement_action_allowed(
  p_capture_event_id uuid,
  p_settlement_action text
)
returns void
language plpgsql
stable
set search_path = public
as $$
declare
  v_state text;
  v_action text := lower(btrim(coalesce(p_settlement_action, '')));
begin
  if p_capture_event_id is null then
    raise exception 'capture_event_id is required for payout settlement guard';
  end if;

  v_state := public.store_payout_state_for_capture(p_capture_event_id);

  if v_state = 'IN_TRANSIT' then
    raise exception
      'settlement action % blocked: seller payout IN_TRANSIT for capture %',
      v_action,
      p_capture_event_id;
  end if;
  if v_state = 'COMPLETED' then
    raise exception
      'settlement action % blocked: seller payout COMPLETED for capture % (terminal in V1)',
      v_action,
      p_capture_event_id;
  end if;
end;
$$;

revoke all on function public.store_payout_assert_settlement_action_allowed(uuid, text)
  from public, anon, authenticated;

create or replace function public.store_payout_replay_payload(
  p_event public.store_payout_events
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
    'settlement_release_event_id', p_event.settlement_release_event_id,
    'submit_event_id', p_event.submit_event_id,
    'amount_minor', p_event.amount_minor,
    'currency', p_event.currency,
    'ueos_journal_entry_id', p_event.ueos_journal_entry_id,
    'request_fingerprint', p_event.request_fingerprint,
    'fingerprint_alg', p_event.fingerprint_alg,
    'payout_state', public.store_payout_state_for_capture(p_event.capture_event_id)
  );
$$;

revoke all on function public.store_payout_replay_payload(
  public.store_payout_events
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) apply_store_payout_event — single write gate
-- ---------------------------------------------------------------------------

create or replace function public.apply_store_payout_event(
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
  v_existing public.store_payout_events%rowtype;
  v_active_submit public.store_payout_events%rowtype;
  v_release public.store_settlement_events%rowtype;
  v_amount bigint;
  v_currency text;
  v_settlement_state text;
  v_payout_state text;
  v_parent_submit_id uuid;
  v_release_event_id uuid;
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
  if v_action not in ('submit', 'confirm', 'fail') then
    raise exception 'invalid payout action: %', v_action;
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
    raise exception 'amount_minor must be > 0 for payout V1';
  end if;
  if p_currency is null or btrim(p_currency) = '' then
    raise exception 'currency is required';
  end if;

  v_metadata := public.store_payout_assert_caller_metadata(
    coalesce(p_metadata, '{}'::jsonb)
  );

  -- 1) Event identity lock
  perform pg_advisory_xact_lock(
    ('x' || substr(md5('store_payo_event:' || v_event_key), 1, 16))::bit(64)::bigint
  );

  select order_id into v_order_id
  from public.payment_attempts
  where id = p_payment_attempt_id;
  if v_order_id is null then
    raise exception 'payment attempt not found';
  end if;

  -- 2) Order payout lock
  perform pg_advisory_xact_lock(
    ('x' || substr(md5('store_payo_order:' || v_order_id::text), 1, 16))::bit(64)::bigint
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

  select * into v_capture
  from public.store_payment_outcome_events e
  where e.payment_attempt_id = v_attempt.id
    and e.outcome = 'captured'
  order by e.created_at asc
  limit 1
  for share;

  if not found then
    raise exception 'payout requires a trusted capture outcome event for this attempt';
  end if;

  -- 3) Capture payout lock (serializes all payout actions on this capture)
  perform pg_advisory_xact_lock(
    ('x' || substr(md5('store_payo_capture:' || v_capture.id::text), 1, 16))::bit(64)::bigint
  );

  if v_capture.correlation_id is distinct from v_correlation_id then
    raise exception 'payout correlation_id must match the capture correlation_id';
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
    raise exception 'payout amount/currency must match trusted capture event';
  end if;
  if v_order.payment_status is distinct from 'paid' then
    raise exception 'payout requires order payment_status=paid';
  end if;
  if v_attempt.status is distinct from 'captured' then
    raise exception 'payout requires payment_attempt.status=captured';
  end if;
  if exists (
    select 1 from store_payment_outcome_events e
    where e.payment_attempt_id = v_attempt.id and e.outcome = 'refunded'
  ) then
    raise exception 'payout blocked: trusted refund outcome already exists for payment attempt %', v_attempt.id;
  end if;
  if v_capture.ueos_journal_entry_id is null then
    raise exception 'payout requires capture UEOS journal for positive amount';
  end if;

  v_settlement_state := public.store_settlement_state_for_capture(v_capture.id);
  if v_settlement_state is distinct from 'RELEASED' then
    raise exception
      'payout requires settlement state RELEASED for capture % (state %)',
      v_capture.id,
      v_settlement_state;
  end if;

  -- Latest completed release for this capture (trusted; never from caller).
  select * into v_release
  from public.store_settlement_events e
  where e.capture_event_id = v_capture.id
    and e.action = 'release'
    and e.ueos_journal_entry_id is not null
  order by e.created_at desc, e.id desc
  limit 1;

  if not found then
    raise exception
      'payout requires a completed settlement release journal for capture %',
      v_capture.id;
  end if;
  v_release_event_id := v_release.id;

  -- Active (non-failed/non-confirmed) submit from trusted events — never from caller.
  select * into v_active_submit
  from public.store_payout_events e
  where e.capture_event_id = v_capture.id
    and e.action = 'submit'
    and not exists (
      select 1
      from public.store_payout_events c
      where c.capture_event_id = v_capture.id
        and c.action in ('confirm', 'fail')
        and c.submit_event_id = e.id
    )
  order by e.created_at desc, e.id desc
  limit 1;

  if found then
    v_parent_submit_id := v_active_submit.id;
  else
    v_parent_submit_id := null;
  end if;

  v_payout_state := public.store_payout_state_for_capture(v_capture.id);

  v_policy_code := public.store_payout_policy_code_for_action(v_action);
  if v_policy_code is null then
    raise exception 'no policy mapped for payout action %', v_action;
  end if;
  v_policy := public.store_payout_resolve_policy(v_policy_code);
  v_posting := public.store_payout_assert_posting_template(
    v_action,
    v_policy.metadata
  );

  select * into v_existing
  from public.store_payout_events
  where event_key = v_event_key
  for share;
  v_is_replay := found;

  if v_action = 'submit' then
    v_parent_submit_id := null;
  elsif v_is_replay then
    v_parent_submit_id := v_existing.submit_event_id;
    v_release_event_id := v_existing.settlement_release_event_id;
  end if;

  v_canonical := public.store_payout_canonical_request_object(
    v_action,
    v_attempt.id,
    v_order.id,
    v_store_id,
    v_correlation_id,
    v_amount,
    v_currency,
    v_capture.id,
    v_release_event_id,
    case when v_action = 'submit' then null else v_parent_submit_id end,
    v_policy.id,
    v_metadata
  );
  v_fingerprint := public.store_payout_compute_request_fingerprint(
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
    return public.store_payout_replay_payload(v_existing);
  end if;

  -- State machine guards (new events only — replay returned above).
  if v_action = 'submit' then
    if v_payout_state = 'COMPLETED' then
      raise exception
        'payout submit rejected: capture % is COMPLETED (terminal in V1); re-payout is not allowed',
        v_capture.id;
    end if;
    if exists (
      select 1
      from public.store_payout_events e
      where e.capture_event_id = v_capture.id
        and e.action = 'confirm'
    ) then
      raise exception
        'payout submit rejected: capture % has prior confirm; COMPLETED permanently blocks submit in V1',
        v_capture.id;
    end if;
    if v_payout_state is distinct from 'NONE' then
      raise exception
        'action submit already finalized for capture %; replay original event_key % (state %)',
        v_capture.id,
        coalesce(v_active_submit.event_key, '<unknown>'),
        v_payout_state;
    end if;
    v_parent_submit_id := null;
  elsif v_action = 'confirm' then
    if v_payout_state = 'COMPLETED' then
      raise exception
        'payout action confirm not allowed: capture % is COMPLETED (terminal in V1); replay original event_key',
        v_capture.id;
    end if;
    if v_payout_state is distinct from 'IN_TRANSIT' then
      raise exception
        'payout action confirm not allowed in state % for capture %',
        v_payout_state,
        v_capture.id;
    end if;
    if v_parent_submit_id is null then
      raise exception 'confirm requires an active in-transit submit for capture %', v_capture.id;
    end if;
  elsif v_action = 'fail' then
    if v_payout_state = 'COMPLETED' then
      raise exception
        'payout action fail not allowed: capture % is COMPLETED (terminal in V1)',
        v_capture.id;
    end if;
    if v_payout_state is distinct from 'IN_TRANSIT' then
      raise exception
        'payout action fail not allowed in state % for capture %',
        v_payout_state,
        v_capture.id;
    end if;
    if v_parent_submit_id is null then
      raise exception 'fail requires an active in-transit submit for capture %', v_capture.id;
    end if;
  end if;

  -- Claim event_key BEFORE UEOS post.
  insert into public.store_payout_events (
    event_key,
    correlation_id,
    request_fingerprint,
    fingerprint_alg,
    action,
    store_id,
    order_id,
    payment_attempt_id,
    capture_event_id,
    settlement_release_event_id,
    submit_event_id,
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
    v_release_event_id,
    case when v_action = 'submit' then null else v_parent_submit_id end,
    v_amount,
    v_currency,
    null,
    v_metadata
  )
  returning id into v_event_id;

  if v_action = 'submit' then
    begin
      insert into public.store_payout_active_in_transit (
        capture_event_id,
        submit_event_id,
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
          'concurrent or double submit for capture %: active in-transit payout already exists',
          v_capture.id;
    end;
  elsif v_action in ('confirm', 'fail') then
    delete from public.store_payout_active_in_transit
    where capture_event_id = v_capture.id;
    get diagnostics v_deleted = row_count;
    if v_deleted = 0 then
      raise exception
        '% expected active in-transit row missing for capture %',
        v_action,
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

  v_lines := public.store_payout_resolve_ueos_lines(
    v_posting,
    v_currency,
    v_amount,
    v_store_id
  );

  v_ueos_event := public.store_payout_ueos_event_type(v_action);
  if v_ueos_event is null then
    raise exception 'no UEOS event_type for payout action %', v_action;
  end if;

  v_ueos_idem := 'spayo-' || md5(v_event_key);
  v_journal := public.ueos_post_journal(
    v_ueos_idem,
    v_ueos_event,
    'store',
    v_lines,
    v_policy.id,
    'store_payout_event',
    v_event_id::text,
    format('store payout %s', v_action),
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

  update public.store_payout_events e
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
    'settlement_release_event_id', v_release_event_id,
    'submit_event_id', case
      when v_action = 'submit' then null
      else v_parent_submit_id
    end,
    'amount_minor', v_amount,
    'currency', v_currency,
    'ueos_journal_entry_id', v_journal_id,
    'request_fingerprint', v_fingerprint,
    'fingerprint_alg', v_fingerprint_alg,
    'payout_state', public.store_payout_state_for_capture(v_capture.id)
  );
end;
$$;

comment on function public.apply_store_payout_event(
  text, text, text, uuid, bigint, text, jsonb
) is
  'Trusted Store seller payout foundation. Claim-first event_key, capture-locked state machine, payable↔in_transit↔clearing UEOS posts. No bank rail. GRANT EXECUTE to service_role only.';

revoke all on function public.apply_store_payout_event(
  text, text, text, uuid, bigint, text, jsonb
) from public, anon, authenticated;

grant execute on function public.apply_store_payout_event(
  text, text, text, uuid, bigint, text, jsonb
) to service_role;

-- ---------------------------------------------------------------------------
-- 6) CREATE OR REPLACE apply_store_settlement_event — payout settlement guard
-- Full body from 20260824 HEAD + store_payout_assert_settlement_action_allowed.
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

  -- Seller Payout Foundation V1: block settlement mutations while payout is
  -- IN_TRANSIT or COMPLETED (payable already committed to payout path).
  perform public.store_payout_assert_settlement_action_allowed(
    v_capture.id,
    v_action
  );

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
  'Trusted Store merchant settlement. Claim-first event_key, capture-locked state machine, liability↔escrow↔payable UEOS posts. Blocks mutations when seller payout is IN_TRANSIT/COMPLETED (20260881). GRANT EXECUTE to service_role only.';

revoke all on function public.apply_store_settlement_event(
  text, text, text, uuid, bigint, text, jsonb
) from public, anon, authenticated;

grant execute on function public.apply_store_settlement_event(
  text, text, text, uuid, bigint, text, jsonb
) to service_role;
