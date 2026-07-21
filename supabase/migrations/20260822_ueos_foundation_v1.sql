-- UMTUBA UEOS Foundation V1 (security + integrity hardened)
-- Additive shared financial core (ledger-first). Does NOT modify Store or UM Points.
--
-- Single write gate for money movement:
--   public.ueos_ensure_account(...)  — accounts + zero balance only
--   public.ueos_post_journal(...)    — journal + lines + balance updates only
--
-- Authenticated V1 visibility: own user accounts + balances only.
-- No authenticated SELECT on journals or ledger lines (no statement projection yet).
--
-- Out of scope: live PSPs, settlement, payouts, commissions, FX, blockchain,
-- token issuance, Store wiring / triggers, UM Points migration.

-- ---------------------------------------------------------------------------
-- 1) Product registry
-- ---------------------------------------------------------------------------

create table if not exists public.ueos_products (
  code text primary key
    constraint ueos_products_code_len check (
      char_length(btrim(code)) between 1 and 64
      and code = lower(btrim(code))
      and code ~ '^[a-z][a-z0-9_]*$'
    ),
  display_name text not null
    constraint ueos_products_display_name_len check (
      char_length(btrim(display_name)) between 1 and 120
    ),
  status text not null
    constraint ueos_products_status_check check (
      status in ('active', 'planned', 'disabled')
    ),
  created_at timestamptz not null default now()
);

comment on table public.ueos_products is
  'UEOS product registry. Journals and accounts reference product codes; add products without schema redesign.';

alter table public.ueos_products enable row level security;
alter table public.ueos_products force row level security;
revoke all on public.ueos_products from public, anon, authenticated;
grant select on public.ueos_products to authenticated;
revoke insert, update, delete on public.ueos_products from authenticated;

drop policy if exists "Authenticated read ueos products" on public.ueos_products;
create policy "Authenticated read ueos products"
  on public.ueos_products for select to authenticated
  using (true);

insert into public.ueos_products (code, display_name, status) values
  ('system', 'System', 'active'),
  ('ueos', 'UEOS', 'active'),
  ('store', 'Store', 'active'),
  ('ads', 'Ads', 'active'),
  ('rewards', 'Rewards', 'active'),
  ('learning', 'UM Learning', 'planned'),
  ('challenges', 'Challenges', 'planned'),
  ('creator', 'Creator Economy', 'planned'),
  ('subscriptions', 'Subscriptions', 'planned')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Asset registry (lifecycle — UMT is future_reserved only)
-- ---------------------------------------------------------------------------

create table if not exists public.ueos_assets (
  code text primary key
    constraint ueos_assets_code_len check (
      char_length(btrim(code)) between 2 and 32
      and code = upper(btrim(code))
      and code ~ '^[A-Z][A-Z0-9_]*$'
    ),
  kind text not null
    constraint ueos_assets_kind_check check (
      kind in ('fiat_minor', 'points', 'token')
    ),
  display_name text not null
    constraint ueos_assets_display_name_len check (
      char_length(btrim(display_name)) between 1 and 120
    ),
  scale smallint not null
    constraint ueos_assets_scale_check check (scale >= 0 and scale <= 18),
  lifecycle_status text not null
    constraint ueos_assets_lifecycle_status_check check (
      lifecycle_status in ('active', 'planned', 'future_reserved', 'disabled')
    ),
  created_at timestamptz not null default now()
);

comment on table public.ueos_assets is
  'UEOS asset registry. Only lifecycle_status=active may be posted. UMT=future_reserved is a placeholder — not an issued token.';

comment on column public.ueos_assets.lifecycle_status is
  'active=postable; planned=placeholder; future_reserved=future slot (e.g. UMT) — presence does not mean the asset exists; disabled=blocked.';

alter table public.ueos_assets enable row level security;
alter table public.ueos_assets force row level security;
revoke all on public.ueos_assets from public, anon, authenticated;
grant select on public.ueos_assets to authenticated;
revoke insert, update, delete on public.ueos_assets from authenticated;

drop policy if exists "Authenticated read ueos assets" on public.ueos_assets;
create policy "Authenticated read ueos assets"
  on public.ueos_assets for select to authenticated
  using (true);

insert into public.ueos_assets (code, kind, display_name, scale, lifecycle_status) values
  ('USD', 'fiat_minor', 'US Dollar', 2, 'active'),
  ('EUR', 'fiat_minor', 'Euro', 2, 'active'),
  ('ILS', 'fiat_minor', 'Israeli New Shekel', 2, 'active'),
  ('JOD', 'fiat_minor', 'Jordanian Dinar', 2, 'active'),
  ('SAR', 'fiat_minor', 'Saudi Riyal', 2, 'active'),
  ('AED', 'fiat_minor', 'UAE Dirham', 2, 'active'),
  ('EGP', 'fiat_minor', 'Egyptian Pound', 2, 'active'),
  ('UM_POINTS', 'points', 'UM Points', 0, 'active'),
  ('UMT', 'token', 'UMTUBA Token (future placeholder)', 0, 'future_reserved')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- 3) Policy registry (no commission/rewards engine)
-- ---------------------------------------------------------------------------

create table if not exists public.ueos_policies (
  id uuid primary key default gen_random_uuid(),
  policy_code text not null
    constraint ueos_policies_code_len check (
      char_length(btrim(policy_code)) between 1 and 120
      and policy_code = lower(btrim(policy_code))
    ),
  version integer not null
    constraint ueos_policies_version_positive check (version >= 1),
  status text not null
    constraint ueos_policies_status_check check (
      status in ('draft', 'active', 'superseded', 'disabled')
    ),
  effective_from timestamptz not null,
  effective_to timestamptz
    constraint ueos_policies_effective_window check (
      effective_to is null or effective_to > effective_from
    ),
  description text not null default ''
    constraint ueos_policies_description_len check (
      char_length(description) <= 500
    ),
  metadata jsonb not null default '{}'::jsonb
    constraint ueos_policies_metadata_object check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint ueos_policies_code_version_uidx unique (policy_code, version)
);

comment on table public.ueos_policies is
  'Minimal UEOS policy registry. Journals may reference a policy version. No commission/rewards/campaign execution in V1.';

create index if not exists ueos_policies_code_status_idx
  on public.ueos_policies (policy_code, status);

alter table public.ueos_policies enable row level security;
alter table public.ueos_policies force row level security;
revoke all on public.ueos_policies from public, anon, authenticated;
grant select on public.ueos_policies to authenticated;
revoke insert, update, delete on public.ueos_policies from authenticated;

drop policy if exists "Authenticated read ueos policies" on public.ueos_policies;
create policy "Authenticated read ueos policies"
  on public.ueos_policies for select to authenticated
  using (true);

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
      'ueos.foundation',
      1,
      'active',
      timestamptz '2026-01-01 00:00:00+00',
      null::timestamptz,
      'UEOS Foundation V1 baseline policy marker.',
      '{}'::jsonb
    ),
    (
      'ueos.manual_adjustment',
      1,
      'active',
      timestamptz '2026-01-01 00:00:00+00',
      null::timestamptz,
      'Marker for controlled system adjustments (no fee engine).',
      '{}'::jsonb
    )
) as v(policy_code, version, status, effective_from, effective_to, description, metadata)
where not exists (
  select 1
  from public.ueos_policies p
  where p.policy_code = v.policy_code
    and p.version = v.version
);

-- ---------------------------------------------------------------------------
-- 4) Accounts
-- ---------------------------------------------------------------------------

create table if not exists public.ueos_accounts (
  id uuid primary key default gen_random_uuid(),
  asset_code text not null references public.ueos_assets (code) on delete restrict,
  owner_type text not null
    constraint ueos_accounts_owner_type_check check (
      owner_type in ('user', 'store', 'platform', 'system')
    ),
  owner_id uuid,
  account_kind text not null
    constraint ueos_accounts_account_kind_check check (
      account_kind in (
        'wallet',
        'clearing',
        'receivable',
        'payable',
        'escrow',
        'revenue',
        'liability'
      )
    ),
  product_scope text not null references public.ueos_products (code) on delete restrict,
  status text not null default 'active'
    constraint ueos_accounts_status_check check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ueos_accounts_owner_id_required check (
    (owner_type in ('platform', 'system') and owner_id is null)
    or (owner_type in ('user', 'store') and owner_id is not null)
  )
);

comment on table public.ueos_accounts is
  'UEOS product-independent accounts. Created only via ueos_ensure_account. No UMT accounts (asset not postable).';

create unique index if not exists ueos_accounts_identity_uidx
  on public.ueos_accounts (
    owner_type,
    coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid),
    account_kind,
    asset_code,
    product_scope
  );

create index if not exists ueos_accounts_owner_idx
  on public.ueos_accounts (owner_type, owner_id)
  where owner_id is not null;

create index if not exists ueos_accounts_asset_idx
  on public.ueos_accounts (asset_code, status);

drop trigger if exists ueos_accounts_set_updated_at on public.ueos_accounts;
create trigger ueos_accounts_set_updated_at
  before update on public.ueos_accounts
  for each row execute function public.set_row_updated_at();

alter table public.ueos_accounts enable row level security;
alter table public.ueos_accounts force row level security;
revoke all on public.ueos_accounts from public, anon, authenticated;
grant select on public.ueos_accounts to authenticated;
revoke insert, update, delete on public.ueos_accounts from authenticated;

drop policy if exists "Users read own ueos accounts" on public.ueos_accounts;
create policy "Users read own ueos accounts"
  on public.ueos_accounts for select to authenticated
  using (
    owner_type = 'user'
    and owner_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 5) Journal entries
-- ---------------------------------------------------------------------------

create table if not exists public.ueos_journal_entries (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null
    constraint ueos_journal_idempotency_len check (
      char_length(btrim(idempotency_key)) between 8 and 128
    ),
  request_fingerprint text not null
    constraint ueos_journal_request_fingerprint_len check (
      char_length(request_fingerprint) = 32
    ),
  event_type text not null
    constraint ueos_journal_event_type_check check (
      event_type in (
        'transfer',
        'payment_authorized',
        'payment_captured',
        'payment_failed',
        'refund_recorded',
        'adjustment',
        'hold',
        'release'
      )
    ),
  product_code text not null references public.ueos_products (code) on delete restrict,
  policy_id uuid references public.ueos_policies (id) on delete restrict,
  reference_type text
    constraint ueos_journal_reference_type_len check (
      reference_type is null
      or char_length(btrim(reference_type)) between 1 and 64
    ),
  reference_id text
    constraint ueos_journal_reference_id_len check (
      reference_id is null
      or char_length(btrim(reference_id)) between 1 and 128
    ),
  description text not null default ''
    constraint ueos_journal_description_len check (char_length(description) <= 500),
  metadata jsonb not null default '{}'::jsonb
    constraint ueos_journal_metadata_object check (jsonb_typeof(metadata) = 'object'),
  created_by text not null default 'system'
    constraint ueos_journal_created_by_check check (
      created_by in ('system', 'service', 'admin')
    ),
  actor_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ueos_journal_entries_idempotency_key_uidx unique (idempotency_key)
);

comment on table public.ueos_journal_entries is
  'Immutable UEOS journal headers. Insert only via ueos_post_journal. Soft product refs only — no FK to Store/Ads. request_fingerprint enforces semantic idempotency.';

comment on column public.ueos_journal_entries.actor_user_id is
  'Audit-only actor. Never used for authorization inside UEOS write-gate RPCs.';

create index if not exists ueos_journal_product_created_idx
  on public.ueos_journal_entries (product_code, created_at desc);

create index if not exists ueos_journal_reference_idx
  on public.ueos_journal_entries (reference_type, reference_id)
  where reference_type is not null and reference_id is not null;

alter table public.ueos_journal_entries enable row level security;
alter table public.ueos_journal_entries force row level security;
drop policy if exists "Users read related ueos journals" on public.ueos_journal_entries;
-- V1: no authenticated journal SELECT (avoids leaking counterparty/system accounts).
revoke all on public.ueos_journal_entries from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Ledger lines
-- ---------------------------------------------------------------------------

create table if not exists public.ueos_ledger_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null
    references public.ueos_journal_entries (id) on delete restrict,
  account_id uuid not null
    references public.ueos_accounts (id) on delete restrict,
  asset_code text not null references public.ueos_assets (code) on delete restrict,
  direction text not null
    constraint ueos_ledger_lines_direction_check check (
      direction in ('debit', 'credit')
    ),
  amount_minor bigint not null
    constraint ueos_ledger_lines_amount_positive check (amount_minor > 0),
  line_ordinal smallint not null
    constraint ueos_ledger_lines_ordinal_positive check (line_ordinal >= 1),
  created_at timestamptz not null default now(),
  constraint ueos_ledger_lines_journal_ordinal_uidx unique (journal_entry_id, line_ordinal)
);

comment on table public.ueos_ledger_lines is
  'Immutable UEOS double-entry lines. Insert only via ueos_post_journal. Debit=+ / credit=- on account balances.';

create index if not exists ueos_ledger_lines_account_created_idx
  on public.ueos_ledger_lines (account_id, created_at desc);

create index if not exists ueos_ledger_lines_journal_idx
  on public.ueos_ledger_lines (journal_entry_id);

alter table public.ueos_ledger_lines enable row level security;
alter table public.ueos_ledger_lines force row level security;
drop policy if exists "Users read own ueos ledger lines" on public.ueos_ledger_lines;
-- V1: no authenticated ledger-line SELECT.
revoke all on public.ueos_ledger_lines from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7) Account balances (write gate only)
-- ---------------------------------------------------------------------------

create table if not exists public.ueos_account_balances (
  account_id uuid primary key
    references public.ueos_accounts (id) on delete restrict,
  balance_minor bigint not null default 0,
  updated_at timestamptz not null default now(),
  last_journal_entry_id uuid
    references public.ueos_journal_entries (id) on delete restrict
);

comment on table public.ueos_account_balances is
  'Materialized UEOS balances. Mutated only by ueos_ensure_account (zero) and ueos_post_journal.';

drop trigger if exists ueos_account_balances_set_updated_at on public.ueos_account_balances;
create trigger ueos_account_balances_set_updated_at
  before update on public.ueos_account_balances
  for each row execute function public.set_row_updated_at();

alter table public.ueos_account_balances enable row level security;
alter table public.ueos_account_balances force row level security;
revoke all on public.ueos_account_balances from public, anon, authenticated;
grant select on public.ueos_account_balances to authenticated;
revoke insert, update, delete on public.ueos_account_balances from authenticated;

drop policy if exists "Users read own ueos balances" on public.ueos_account_balances;
create policy "Users read own ueos balances"
  on public.ueos_account_balances for select to authenticated
  using (
    exists (
      select 1
      from public.ueos_accounts a
      where a.id = ueos_account_balances.account_id
        and a.owner_type = 'user'
        and a.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 8) Immutability protections (journal + lines)
-- ---------------------------------------------------------------------------

create or replace function public.ueos_forbid_ledger_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'UEOS ledger history is immutable'
    using errcode = '55000';
end;
$$;

drop trigger if exists ueos_journal_entries_immutable_upd on public.ueos_journal_entries;
create trigger ueos_journal_entries_immutable_upd
  before update on public.ueos_journal_entries
  for each row execute function public.ueos_forbid_ledger_mutation();

drop trigger if exists ueos_journal_entries_immutable_del on public.ueos_journal_entries;
create trigger ueos_journal_entries_immutable_del
  before delete on public.ueos_journal_entries
  for each row execute function public.ueos_forbid_ledger_mutation();

drop trigger if exists ueos_ledger_lines_immutable_upd on public.ueos_ledger_lines;
create trigger ueos_ledger_lines_immutable_upd
  before update on public.ueos_ledger_lines
  for each row execute function public.ueos_forbid_ledger_mutation();

drop trigger if exists ueos_ledger_lines_immutable_del on public.ueos_ledger_lines;
create trigger ueos_ledger_lines_immutable_del
  before delete on public.ueos_ledger_lines
  for each row execute function public.ueos_forbid_ledger_mutation();

revoke all on function public.ueos_forbid_ledger_mutation() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9) Helpers: policy window, fingerprint, journal payload
-- ---------------------------------------------------------------------------

create or replace function public.ueos_policy_is_effective(
  p_policy public.ueos_policies,
  p_at timestamptz
)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    p_policy.status = 'active'
    and p_policy.effective_from <= p_at
    and (p_policy.effective_to is null or p_policy.effective_to > p_at);
$$;

revoke all on function public.ueos_policy_is_effective(public.ueos_policies, timestamptz)
  from public, anon, authenticated;

-- Normalize + fingerprint semantic request body (excludes description/created_by/actor).
create or replace function public.ueos_normalize_post_lines(p_lines jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_elem jsonb;
  v_ordinal int := 0;
  v_out jsonb := '[]'::jsonb;
  v_keys text[];
  v_account_id uuid;
  v_direction text;
  v_amount bigint;
  v_allowed text[] := array['account_id', 'direction', 'amount_minor', 'asset_code'];
begin
  if p_lines is null or jsonb_typeof(p_lines) is distinct from 'array' then
    raise exception 'lines must be a JSON array';
  end if;
  if jsonb_array_length(p_lines) < 2 then
    raise exception 'journal requires at least 2 lines';
  end if;

  for v_elem in select value from jsonb_array_elements(p_lines)
  loop
    v_ordinal := v_ordinal + 1;
    if jsonb_typeof(v_elem) is distinct from 'object' then
      raise exception 'each line must be a JSON object';
    end if;

    select array_agg(k order by k)
    into v_keys
    from jsonb_object_keys(v_elem) as k;

    if exists (
      select 1 from unnest(v_keys) k where k <> all (v_allowed)
    ) then
      raise exception 'line %: unknown keys are not allowed', v_ordinal;
    end if;

    begin
      v_account_id := (v_elem ->> 'account_id')::uuid;
    exception when others then
      raise exception 'line %: invalid account_id', v_ordinal;
    end;
    if v_account_id is null then
      raise exception 'line %: account_id is required', v_ordinal;
    end if;

    v_direction := lower(btrim(coalesce(v_elem ->> 'direction', '')));
    if v_direction not in ('debit', 'credit') then
      raise exception 'line %: direction must be debit or credit', v_ordinal;
    end if;

    begin
      v_amount := (v_elem ->> 'amount_minor')::bigint;
    exception when others then
      raise exception 'line %: invalid amount_minor', v_ordinal;
    end;
    if v_amount is null or v_amount <= 0 then
      raise exception 'line %: amount_minor must be > 0', v_ordinal;
    end if;

    v_out := v_out || jsonb_build_array(
      jsonb_build_object(
        'account_id', v_account_id,
        'direction', v_direction,
        'amount_minor', v_amount
      )
    );
  end loop;

  return v_out;
end;
$$;

revoke all on function public.ueos_normalize_post_lines(jsonb)
  from public, anon, authenticated;

create or replace function public.ueos_compute_request_fingerprint(
  p_event_type text,
  p_product_code text,
  p_policy_id uuid,
  p_reference_type text,
  p_reference_id text,
  p_metadata jsonb,
  p_normalized_lines jsonb
)
returns text
language sql
immutable
set search_path = public
as $$
  select md5(
    jsonb_build_object(
      'event_type', p_event_type,
      'product_code', p_product_code,
      'policy_id', p_policy_id,
      'reference_type', p_reference_type,
      'reference_id', p_reference_id,
      'metadata', coalesce(p_metadata, '{}'::jsonb),
      'lines', p_normalized_lines
    )::text
  );
$$;

revoke all on function public.ueos_compute_request_fingerprint(
  text, text, uuid, text, text, jsonb, jsonb
) from public, anon, authenticated;

create or replace function public.ueos_journal_payload(p_journal_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  j public.ueos_journal_entries%rowtype;
  lines jsonb;
  bals jsonb;
begin
  select * into j
  from public.ueos_journal_entries
  where id = p_journal_id;

  if not found then
    raise exception 'journal not found';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'account_id', l.account_id,
        'asset_code', l.asset_code,
        'direction', l.direction,
        'amount_minor', l.amount_minor,
        'line_ordinal', l.line_ordinal
      )
      order by l.line_ordinal
    ),
    '[]'::jsonb
  )
  into lines
  from public.ueos_ledger_lines l
  where l.journal_entry_id = p_journal_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'account_id', b.account_id,
        'balance_minor', b.balance_minor,
        'updated_at', b.updated_at,
        'last_journal_entry_id', b.last_journal_entry_id
      )
      order by b.account_id
    ),
    '[]'::jsonb
  )
  into bals
  from public.ueos_account_balances b
  where b.account_id in (
    select distinct l.account_id
    from public.ueos_ledger_lines l
    where l.journal_entry_id = p_journal_id
  );

  return jsonb_build_object(
    'journal_entry_id', j.id,
    'idempotency_key', j.idempotency_key,
    'request_fingerprint', j.request_fingerprint,
    'event_type', j.event_type,
    'product_code', j.product_code,
    'policy_id', j.policy_id,
    'reference_type', j.reference_type,
    'reference_id', j.reference_id,
    'description', j.description,
    'metadata', j.metadata,
    'created_by', j.created_by,
    'actor_user_id', j.actor_user_id,
    'created_at', j.created_at,
    'replayed', false,
    'lines', lines,
    'balances', bals
  );
end;
$$;

revoke all on function public.ueos_journal_payload(uuid) from public, anon, authenticated;

create or replace function public.ueos_assert_bigint_add(p_balance bigint, p_delta bigint)
returns bigint
language plpgsql
immutable
set search_path = public
as $$
declare
  v_max constant bigint := 9223372036854775807;
  v_min constant bigint := -9223372036854775808;
begin
  if p_delta > 0 and p_balance > (v_max - p_delta) then
    raise exception 'balance overflow'
      using errcode = '22003';
  end if;
  if p_delta < 0 and p_balance < (v_min - p_delta) then
    raise exception 'balance overflow'
      using errcode = '22003';
  end if;
  return p_balance + p_delta;
end;
$$;

revoke all on function public.ueos_assert_bigint_add(bigint, bigint)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10) Write gate: ueos_ensure_account
-- ---------------------------------------------------------------------------

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
    'wallet', 'clearing', 'receivable', 'payable', 'escrow', 'revenue', 'liability'
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
  'UEOS write gate (accounts). Creates account + zero balance. Rejects non-active assets including UMT. EXECUTE revoked from PUBLIC/anon/authenticated.';

revoke all on function public.ueos_ensure_account(text, uuid, text, text, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 11) Write gate: ueos_post_journal
-- ---------------------------------------------------------------------------

create or replace function public.ueos_post_journal(
  p_idempotency_key text,
  p_event_type text,
  p_product_code text,
  p_lines jsonb,
  p_policy_id uuid default null,
  p_reference_type text default null,
  p_reference_id text default null,
  p_description text default '',
  p_metadata jsonb default '{}'::jsonb,
  p_created_by text default 'system',
  p_actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_idem text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_event text := lower(btrim(coalesce(p_event_type, '')));
  v_product_code text := lower(btrim(coalesce(p_product_code, '')));
  v_created_by text := lower(btrim(coalesce(p_created_by, 'system')));
  v_ref_type text := nullif(btrim(coalesce(p_reference_type, '')), '');
  v_ref_id text := nullif(btrim(coalesce(p_reference_id, '')), '');
  v_description text := coalesce(p_description, '');
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_normalized_lines jsonb;
  v_fingerprint text;
  v_existing public.ueos_journal_entries%rowtype;
  v_product public.ueos_products%rowtype;
  v_policy public.ueos_policies%rowtype;
  v_journal_id uuid;
  v_elem jsonb;
  v_ordinal int := 0;
  v_account_id uuid;
  v_direction text;
  v_amount bigint;
  v_account public.ueos_accounts%rowtype;
  v_asset public.ueos_assets%rowtype;
  v_lock_id uuid;
  r record;
  v_payload jsonb;
  v_delta bigint;
  v_new_balance bigint;
begin
  if v_idem is null or char_length(v_idem) < 8 or char_length(v_idem) > 128 then
    raise exception 'idempotency_key must be 8..128 characters';
  end if;

  if v_event not in (
    'transfer',
    'payment_authorized',
    'payment_captured',
    'payment_failed',
    'refund_recorded',
    'adjustment',
    'hold',
    'release'
  ) then
    raise exception 'invalid event_type: %', v_event;
  end if;

  if v_created_by not in ('system', 'service', 'admin') then
    raise exception 'invalid created_by';
  end if;

  -- actor_user_id is audit-only; never used for authorization.
  if jsonb_typeof(v_metadata) is distinct from 'object' then
    raise exception 'metadata must be a JSON object';
  end if;

  v_normalized_lines := public.ueos_normalize_post_lines(p_lines);
  v_fingerprint := public.ueos_compute_request_fingerprint(
    v_event,
    v_product_code,
    p_policy_id,
    v_ref_type,
    v_ref_id,
    v_metadata,
    v_normalized_lines
  );

  -- Serialize concurrent first-writers for the same idempotency key.
  perform pg_advisory_xact_lock(
    ('x' || substr(md5('ueos:' || v_idem), 1, 16))::bit(64)::bigint
  );

  select * into v_existing
  from public.ueos_journal_entries
  where idempotency_key = v_idem
  for share;

  if found then
    if v_existing.request_fingerprint is distinct from v_fingerprint then
      raise exception
        'idempotency conflict: key % already used with a different request fingerprint',
        v_idem
        using errcode = '23505';
    end if;
    v_payload := public.ueos_journal_payload(v_existing.id);
    v_payload := v_payload || jsonb_build_object('replayed', true);
    return v_payload;
  end if;

  select * into v_product
  from public.ueos_products
  where code = v_product_code
  for share;

  if not found then
    raise exception 'unknown product_code: %', v_product_code;
  end if;
  if v_product.status is distinct from 'active' then
    raise exception
      'product % is not active (status=%)',
      v_product_code,
      v_product.status;
  end if;

  -- Product events require a policy; only ueos/system bootstrap may omit policy_id.
  if p_policy_id is null and v_product_code not in ('ueos', 'system') then
    raise exception 'policy_id is required for product %', v_product_code;
  end if;

  if p_policy_id is not null then
    select * into v_policy
    from public.ueos_policies
    where id = p_policy_id
    for share;

    if not found then
      raise exception 'unknown policy_id';
    end if;
    if not public.ueos_policy_is_effective(v_policy, now()) then
      raise exception
        'policy % v% is not effective (status=%)',
        v_policy.policy_code,
        v_policy.version,
        v_policy.status;
    end if;
  end if;

  begin
    execute $c$
      create temporary table ueos_post_lines (
        line_ordinal smallint primary key,
        account_id uuid not null,
        asset_code text not null,
        direction text not null,
        amount_minor bigint not null
      ) on commit drop
    $c$;
  exception
    when duplicate_table then
      delete from ueos_post_lines;
  end;

  -- Lock all involved accounts in deterministic UUID order (deadlock reduction).
  for v_lock_id in
    select distinct (value ->> 'account_id')::uuid as account_id
    from jsonb_array_elements(v_normalized_lines)
    order by 1
  loop
    perform 1
    from public.ueos_accounts a
    where a.id = v_lock_id
    for update;
  end loop;

  for v_elem in
    select value from jsonb_array_elements(v_normalized_lines)
  loop
    v_ordinal := v_ordinal + 1;
    v_account_id := (v_elem ->> 'account_id')::uuid;
    v_direction := v_elem ->> 'direction';
    v_amount := (v_elem ->> 'amount_minor')::bigint;

    select * into v_account
    from public.ueos_accounts
    where id = v_account_id;

    if not found then
      raise exception 'line %: account not found', v_ordinal;
    end if;
    if v_account.status is distinct from 'active' then
      raise exception 'line %: account is closed', v_ordinal;
    end if;

    if jsonb_typeof(p_lines -> (v_ordinal - 1)) = 'object'
       and (p_lines -> (v_ordinal - 1)) ? 'asset_code'
       and upper(btrim(coalesce(p_lines -> (v_ordinal - 1) ->> 'asset_code', '')))
           is distinct from v_account.asset_code
    then
      raise exception
        'line %: asset_code does not match account asset %',
        v_ordinal,
        v_account.asset_code;
    end if;

    select * into v_asset
    from public.ueos_assets
    where code = v_account.asset_code
    for share;

    if not found then
      raise exception 'line %: account asset missing', v_ordinal;
    end if;
    if v_asset.lifecycle_status is distinct from 'active' then
      raise exception
        'line %: asset % is not postable (lifecycle_status=%)',
        v_ordinal,
        v_asset.code,
        v_asset.lifecycle_status;
    end if;
    if v_asset.code = 'UMT' then
      raise exception 'UMT is future_reserved and cannot be posted';
    end if;

    insert into ueos_post_lines (
      line_ordinal, account_id, asset_code, direction, amount_minor
    ) values (
      v_ordinal, v_account.id, v_account.asset_code, v_direction, v_amount
    );
  end loop;

  for r in
    select
      asset_code,
      coalesce(sum(amount_minor) filter (where direction = 'debit'), 0) as debit_sum,
      coalesce(sum(amount_minor) filter (where direction = 'credit'), 0) as credit_sum
    from ueos_post_lines
    group by asset_code
  loop
    if r.debit_sum is distinct from r.credit_sum then
      raise exception
        'unbalanced journal for asset % (debit=% credit=%)',
        r.asset_code,
        r.debit_sum,
        r.credit_sum;
    end if;
  end loop;

  if exists (
    select 1
    from ueos_post_lines pl
    left join public.ueos_account_balances b on b.account_id = pl.account_id
    where b.account_id is null
  ) then
    raise exception 'missing balance row for one or more accounts';
  end if;

  begin
    insert into public.ueos_journal_entries (
      idempotency_key,
      request_fingerprint,
      event_type,
      product_code,
      policy_id,
      reference_type,
      reference_id,
      description,
      metadata,
      created_by,
      actor_user_id
    ) values (
      v_idem,
      v_fingerprint,
      v_event,
      v_product_code,
      p_policy_id,
      v_ref_type,
      v_ref_id,
      v_description,
      v_metadata,
      v_created_by,
      p_actor_user_id
    )
    returning id into v_journal_id;
  exception
    when unique_violation then
      select * into v_existing
      from public.ueos_journal_entries
      where idempotency_key = v_idem;

      if not found then
        raise;
      end if;
      if v_existing.request_fingerprint is distinct from v_fingerprint then
        raise exception
          'idempotency conflict: key % already used with a different request fingerprint',
          v_idem
          using errcode = '23505';
      end if;
      v_payload := public.ueos_journal_payload(v_existing.id);
      v_payload := v_payload || jsonb_build_object('replayed', true);
      return v_payload;
  end;

  insert into public.ueos_ledger_lines (
    journal_entry_id,
    account_id,
    asset_code,
    direction,
    amount_minor,
    line_ordinal
  )
  select
    v_journal_id,
    account_id,
    asset_code,
    direction,
    amount_minor,
    line_ordinal
  from ueos_post_lines
  order by line_ordinal;

  -- Aggregate duplicate account lines; debit=+ credit=- ; overflow-safe.
  for r in
    select
      account_id,
      sum(
        case
          when direction = 'debit' then amount_minor
          else -amount_minor
        end
      ) as delta
    from ueos_post_lines
    group by account_id
    order by account_id
  loop
    select b.balance_minor
    into v_delta
    from public.ueos_account_balances b
    where b.account_id = r.account_id
    for update;

    v_new_balance := public.ueos_assert_bigint_add(v_delta, r.delta);

    update public.ueos_account_balances b
    set
      balance_minor = v_new_balance,
      last_journal_entry_id = v_journal_id
    where b.account_id = r.account_id;
  end loop;

  v_payload := public.ueos_journal_payload(v_journal_id);
  return v_payload;
end;
$$;

comment on function public.ueos_post_journal(
  text, text, text, jsonb, uuid, text, text, text, jsonb, text, uuid
) is
  'UEOS write gate (money movement). Semantic idempotency via request_fingerprint; concurrent-safe via advisory lock + unique key. EXECUTE revoked from PUBLIC/anon/authenticated.';

revoke all on function public.ueos_post_journal(
  text, text, text, jsonb, uuid, text, text, text, jsonb, text, uuid
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 12) Seed platform clearing / revenue / liability for active fiat assets
-- ---------------------------------------------------------------------------

do $$
declare
  v_asset text;
begin
  for v_asset in
    select a.code
    from public.ueos_assets a
    where a.lifecycle_status = 'active'
      and a.kind = 'fiat_minor'
    order by a.code
  loop
    perform public.ueos_ensure_account('platform', null, 'clearing', v_asset, 'ueos');
    perform public.ueos_ensure_account('platform', null, 'revenue', v_asset, 'ueos');
    perform public.ueos_ensure_account('platform', null, 'liability', v_asset, 'ueos');
  end loop;

  if exists (
    select 1 from public.ueos_accounts where asset_code = 'UMT'
  ) then
    raise exception 'UMT accounts must not exist';
  end if;
end;
$$;
