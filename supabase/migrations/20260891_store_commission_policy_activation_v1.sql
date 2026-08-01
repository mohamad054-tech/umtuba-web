-- =============================================================================
-- UMTUBA Commerce — Commission Policy Activation V1
-- Migration: 20260891_store_commission_policy_activation_v1.sql
-- Local file only — do NOT remote-apply without explicit approval.
--
-- Adds safe activate/deactivate lifecycle for currency-scoped commission
-- policies. Exactly one active policy per currency. Historical versions
-- preserved. Does NOT invent rates, alter settlement/payout amounts, or seed
-- an active commercial policy.
-- =============================================================================

-- Exactly one authoritative active policy per currency scope.
create unique index if not exists store_commission_policies_one_active_per_currency_uidx
  on public.store_commission_policies (currency)
  where status = 'active';

comment on index public.store_commission_policies_one_active_per_currency_uidx is
  'Commission Policy Activation V1 — at most one active commission policy per currency.';

-- ---------------------------------------------------------------------------
-- Activation / deactivation audit + idempotency ledger
-- ---------------------------------------------------------------------------

create table if not exists public.store_commission_policy_activation_events (
  event_key text primary key,
  action text not null
    check (action in ('activate', 'deactivate')),
  policy_code text not null,
  policy_version integer not null check (policy_version >= 1),
  currency text not null
    check (currency = upper(currency) and char_length(currency) = 3),
  correlation_id text not null,
  from_status text not null
    check (from_status in ('draft', 'active', 'superseded', 'disabled')),
  to_status text not null
    check (to_status in ('draft', 'active', 'superseded', 'disabled')),
  superseded_policy_code text,
  superseded_policy_version integer,
  replayed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists store_commission_policy_activation_events_policy_idx
  on public.store_commission_policy_activation_events (
    policy_code, policy_version, created_at desc
  );

comment on table public.store_commission_policy_activation_events is
  'Commission Policy Activation V1 — idempotent activate/deactivate audit ledger.';

alter table public.store_commission_policy_activation_events enable row level security;
alter table public.store_commission_policy_activation_events force row level security;

revoke all on public.store_commission_policy_activation_events
  from public, anon, authenticated;
grant select on public.store_commission_policy_activation_events to service_role;

-- ---------------------------------------------------------------------------
-- Harden resolve: fail closed on ambiguous overlapping actives
-- (unique index makes this a defense-in-depth check)
-- ---------------------------------------------------------------------------

create or replace function public.resolve_store_commission_policy(
  p_currency text,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_currency text;
  v_row public.store_commission_policies%rowtype;
  v_active_count integer;
begin
  if p_currency is null or btrim(p_currency) = '' then
    raise exception 'currency is required';
  end if;
  v_currency := upper(btrim(p_currency));
  if char_length(v_currency) <> 3 then
    raise exception 'currency is invalid';
  end if;
  if p_at is null then
    raise exception 'effective-at is required';
  end if;

  -- Fail closed: at most one status=active row per currency (current authority).
  select count(*)::integer into v_active_count
  from public.store_commission_policies p
  where p.status = 'active'
    and p.currency = v_currency;
  if v_active_count > 1 then
    raise exception
      'ambiguous active commission policies for currency %',
      v_currency;
  end if;

  -- Resolve at transaction time: current active OR historically superseded
  -- versions whose effective window covers p_at (no silent fallback).
  select count(*)::integer into v_active_count
  from public.store_commission_policies p
  where p.status in ('active', 'superseded')
    and p.currency = v_currency
    and p.effective_from <= p_at
    and (p.effective_to is null or p.effective_to > p_at);
  if v_active_count > 1 then
    raise exception
      'ambiguous commission policy window for currency % at %',
      v_currency, p_at;
  end if;

  select * into v_row
  from public.store_commission_policies p
  where p.status in ('active', 'superseded')
    and p.currency = v_currency
    and p.effective_from <= p_at
    and (p.effective_to is null or p.effective_to > p_at)
  order by p.version desc, p.policy_code asc
  limit 1;

  if not found then
    return jsonb_build_object(
      'found', false,
      'capability', 'commerce.revenue.commission_policy_foundation_v1'
    );
  end if;

  return jsonb_build_object(
    'found', true,
    'policy_code', v_row.policy_code,
    'version', v_row.version,
    'status', v_row.status,
    'currency', v_row.currency,
    'effective_from', v_row.effective_from,
    'effective_to', v_row.effective_to,
    'basis_kind', v_row.basis_kind,
    'platform_bps', v_row.platform_bps,
    'seller_bps', v_row.seller_bps,
    'supplier_bps', v_row.supplier_bps,
    'affiliate_bps', v_row.affiliate_bps,
    'partner_bps', v_row.partner_bps,
    'description', v_row.description,
    'capability', 'commerce.revenue.commission_policy_foundation_v1'
  );
end;
$$;

comment on function public.resolve_store_commission_policy(text, timestamptz) is
  'Commission Policy Foundation + Activation V1 — resolve the single active currency policy at instant. Fail closed on ambiguity. Service-role only.';

revoke all on function public.resolve_store_commission_policy(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.resolve_store_commission_policy(text, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Activate: draft → active; supersede prior active for same currency
-- ---------------------------------------------------------------------------

create or replace function public.activate_store_commission_policy(
  p_policy_code text,
  p_version integer,
  p_event_key text,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy_code text := lower(btrim(coalesce(p_policy_code, '')));
  v_event_key text := nullif(btrim(coalesce(p_event_key, '')), '');
  v_correlation_id text := nullif(btrim(coalesce(p_correlation_id, '')), '');
  v_target public.store_commission_policies%rowtype;
  v_prior public.store_commission_policies%rowtype;
  v_existing public.store_commission_policy_activation_events%rowtype;
  v_from_status text;
  v_superseded_code text := null;
  v_superseded_version integer := null;
  v_now timestamptz := timezone('utc', now());
begin
  if v_policy_code is null or v_policy_code = ''
     or char_length(v_policy_code) > 120 then
    raise exception 'policy_code is invalid';
  end if;
  if p_version is null or p_version < 1 then
    raise exception 'policy version must be an integer >= 1';
  end if;
  if v_event_key is null
     or char_length(v_event_key) < 8
     or char_length(v_event_key) > 160 then
    raise exception 'event_key must be 8..160 characters';
  end if;
  if v_correlation_id is null
     or char_length(v_correlation_id) < 8
     or char_length(v_correlation_id) > 128 then
    raise exception 'correlation_id must be 8..128 characters';
  end if;

  perform pg_advisory_xact_lock(
    ('x' || substr(md5('store_commission_activate:' || v_event_key), 1, 16))::bit(64)::bigint
  );

  select * into v_existing
  from public.store_commission_policy_activation_events
  where event_key = v_event_key
  for share;
  if found then
    if v_existing.action is distinct from 'activate'
       or v_existing.policy_code is distinct from v_policy_code
       or v_existing.policy_version is distinct from p_version
       or v_existing.correlation_id is distinct from v_correlation_id then
      raise exception
        'idempotency conflict for commission policy activation event_key %',
        v_event_key;
    end if;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'action', 'activate',
      'policy_code', v_existing.policy_code,
      'policy_version', v_existing.policy_version,
      'currency', v_existing.currency,
      'from_status', v_existing.from_status,
      'to_status', v_existing.to_status,
      'superseded_policy_code', v_existing.superseded_policy_code,
      'superseded_policy_version', v_existing.superseded_policy_version
    );
  end if;

  select * into v_target
  from public.store_commission_policies
  where policy_code = v_policy_code
    and version = p_version
  for update;
  if not found then
    raise exception 'commission policy % @ v% not found', v_policy_code, p_version;
  end if;

  v_from_status := v_target.status;

  -- Idempotent: already the sole active policy for this currency.
  if v_target.status = 'active' then
    insert into public.store_commission_policy_activation_events (
      event_key, action, policy_code, policy_version, currency, correlation_id,
      from_status, to_status, replayed, metadata
    ) values (
      v_event_key, 'activate', v_target.policy_code, v_target.version,
      v_target.currency, v_correlation_id, 'active', 'active', true,
      jsonb_build_object(
        'note', 'commerce.revenue.commission_policy_activation_v1',
        'reason', 'already_active'
      )
    );
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'action', 'activate',
      'policy_code', v_target.policy_code,
      'policy_version', v_target.version,
      'currency', v_target.currency,
      'from_status', 'active',
      'to_status', 'active',
      'superseded_policy_code', null,
      'superseded_policy_version', null
    );
  end if;

  if v_target.status is distinct from 'draft' then
    raise exception
      'commission policy activation requires status=draft (found %)',
      v_target.status;
  end if;

  -- Lock and supersede any prior active policy for this currency.
  select * into v_prior
  from public.store_commission_policies
  where currency = v_target.currency
    and status = 'active'
    and (policy_code, version) is distinct from (v_target.policy_code, v_target.version)
  for update;

  if found then
    v_superseded_code := v_prior.policy_code;
    v_superseded_version := v_prior.version;
    update public.store_commission_policies
    set
      status = 'superseded',
      effective_to = case
        when effective_to is null or effective_to > v_now then v_now
        else effective_to
      end,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'superseded_by_policy_code', v_target.policy_code,
        'superseded_by_policy_version', v_target.version,
        'superseded_at', v_now,
        'superseded_capability', 'commerce.revenue.commission_policy_activation_v1'
      )
    where policy_code = v_prior.policy_code
      and version = v_prior.version
      and status = 'active';
  end if;

  update public.store_commission_policies
  set
    status = 'active',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'activated_at', v_now,
      'activated_capability', 'commerce.revenue.commission_policy_activation_v1',
      'activation_event_key', v_event_key
    )
  where policy_code = v_target.policy_code
    and version = v_target.version
    and status = 'draft';

  if not found then
    raise exception 'commission policy activation failed for % @ v%',
      v_policy_code, p_version;
  end if;

  insert into public.store_commission_policy_activation_events (
    event_key, action, policy_code, policy_version, currency, correlation_id,
    from_status, to_status, superseded_policy_code, superseded_policy_version,
    replayed, metadata
  ) values (
    v_event_key, 'activate', v_target.policy_code, v_target.version,
    v_target.currency, v_correlation_id, v_from_status, 'active',
    v_superseded_code, v_superseded_version, false,
    jsonb_build_object('note', 'commerce.revenue.commission_policy_activation_v1')
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'action', 'activate',
    'policy_code', v_target.policy_code,
    'policy_version', v_target.version,
    'currency', v_target.currency,
    'from_status', v_from_status,
    'to_status', 'active',
    'superseded_policy_code', v_superseded_code,
    'superseded_policy_version', v_superseded_version
  );
end;
$$;

comment on function public.activate_store_commission_policy(text, integer, text, text) is
  'Service-role only. Activate a draft commission policy for its currency; supersede prior active. Idempotent.';

revoke all on function public.activate_store_commission_policy(text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.activate_store_commission_policy(text, integer, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Deactivate: active → disabled (no silent replacement)
-- ---------------------------------------------------------------------------

create or replace function public.deactivate_store_commission_policy(
  p_policy_code text,
  p_version integer,
  p_event_key text,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy_code text := lower(btrim(coalesce(p_policy_code, '')));
  v_event_key text := nullif(btrim(coalesce(p_event_key, '')), '');
  v_correlation_id text := nullif(btrim(coalesce(p_correlation_id, '')), '');
  v_target public.store_commission_policies%rowtype;
  v_existing public.store_commission_policy_activation_events%rowtype;
  v_from_status text;
  v_now timestamptz := timezone('utc', now());
begin
  if v_policy_code is null or v_policy_code = ''
     or char_length(v_policy_code) > 120 then
    raise exception 'policy_code is invalid';
  end if;
  if p_version is null or p_version < 1 then
    raise exception 'policy version must be an integer >= 1';
  end if;
  if v_event_key is null
     or char_length(v_event_key) < 8
     or char_length(v_event_key) > 160 then
    raise exception 'event_key must be 8..160 characters';
  end if;
  if v_correlation_id is null
     or char_length(v_correlation_id) < 8
     or char_length(v_correlation_id) > 128 then
    raise exception 'correlation_id must be 8..128 characters';
  end if;

  perform pg_advisory_xact_lock(
    ('x' || substr(md5('store_commission_deactivate:' || v_event_key), 1, 16))::bit(64)::bigint
  );

  select * into v_existing
  from public.store_commission_policy_activation_events
  where event_key = v_event_key
  for share;
  if found then
    if v_existing.action is distinct from 'deactivate'
       or v_existing.policy_code is distinct from v_policy_code
       or v_existing.policy_version is distinct from p_version
       or v_existing.correlation_id is distinct from v_correlation_id then
      raise exception
        'idempotency conflict for commission policy deactivation event_key %',
        v_event_key;
    end if;
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'action', 'deactivate',
      'policy_code', v_existing.policy_code,
      'policy_version', v_existing.policy_version,
      'currency', v_existing.currency,
      'from_status', v_existing.from_status,
      'to_status', v_existing.to_status
    );
  end if;

  select * into v_target
  from public.store_commission_policies
  where policy_code = v_policy_code
    and version = p_version
  for update;
  if not found then
    raise exception 'commission policy % @ v% not found', v_policy_code, p_version;
  end if;

  v_from_status := v_target.status;

  if v_target.status = 'disabled' then
    insert into public.store_commission_policy_activation_events (
      event_key, action, policy_code, policy_version, currency, correlation_id,
      from_status, to_status, replayed, metadata
    ) values (
      v_event_key, 'deactivate', v_target.policy_code, v_target.version,
      v_target.currency, v_correlation_id, 'disabled', 'disabled', true,
      jsonb_build_object(
        'note', 'commerce.revenue.commission_policy_activation_v1',
        'reason', 'already_disabled'
      )
    );
    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'action', 'deactivate',
      'policy_code', v_target.policy_code,
      'policy_version', v_target.version,
      'currency', v_target.currency,
      'from_status', 'disabled',
      'to_status', 'disabled'
    );
  end if;

  if v_target.status is distinct from 'active' then
    raise exception
      'commission policy deactivation requires status=active (found %)',
      v_target.status;
  end if;

  update public.store_commission_policies
  set
    status = 'disabled',
    effective_to = case
      when effective_to is null or effective_to > v_now then v_now
      else effective_to
    end,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'deactivated_at', v_now,
      'deactivated_capability', 'commerce.revenue.commission_policy_activation_v1',
      'deactivation_event_key', v_event_key
    )
  where policy_code = v_target.policy_code
    and version = v_target.version
    and status = 'active';

  if not found then
    raise exception 'commission policy deactivation failed for % @ v%',
      v_policy_code, p_version;
  end if;

  insert into public.store_commission_policy_activation_events (
    event_key, action, policy_code, policy_version, currency, correlation_id,
    from_status, to_status, replayed, metadata
  ) values (
    v_event_key, 'deactivate', v_target.policy_code, v_target.version,
    v_target.currency, v_correlation_id, v_from_status, 'disabled', false,
    jsonb_build_object('note', 'commerce.revenue.commission_policy_activation_v1')
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'action', 'deactivate',
    'policy_code', v_target.policy_code,
    'policy_version', v_target.version,
    'currency', v_target.currency,
    'from_status', v_from_status,
    'to_status', 'disabled'
  );
end;
$$;

comment on function public.deactivate_store_commission_policy(text, integer, text, text) is
  'Service-role only. Deactivate an active commission policy (active→disabled). Idempotent. No silent replacement.';

revoke all on function public.deactivate_store_commission_policy(text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.deactivate_store_commission_policy(text, integer, text, text)
  to service_role;
