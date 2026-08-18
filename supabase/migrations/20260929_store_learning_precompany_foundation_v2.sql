-- UMTUBA Store + Learning Pre-Company Foundation V2
-- Local schema only. Do NOT apply remotely in this handoff.
-- MOCK providers/products/courses only. No plaintext partner secrets.
-- Unknown rights default DENY. REAL_PARTNER_DATA cannot be ACTIVE.

-- ---------------------------------------------------------------------------
-- 0) Additive provenance on existing catalogs (no second catalog stack)
-- ---------------------------------------------------------------------------

alter table public.store_products
  add column if not exists provider_id uuid,
  add column if not exists external_id text,
  add column if not exists source_type text,
  add column if not exists rights_record_id uuid,
  add column if not exists data_class text,
  add column if not exists sync_version integer;

alter table public.learning_courses
  add column if not exists provider_id uuid,
  add column if not exists external_id text,
  add column if not exists source_type text,
  add column if not exists rights_record_id uuid,
  add column if not exists data_class text,
  add column if not exists sync_version integer;

-- ---------------------------------------------------------------------------
-- 1) Commerce providers + rights + import staging
-- ---------------------------------------------------------------------------

create table if not exists public.commerce_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  mode text not null
    check (mode in ('AFFILIATE', 'CATALOG_API', 'DROPSHIP', 'WHOLESALE', 'RESELLER', 'MARKETPLACE')),
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ENABLED', 'DISABLED', 'REMOVED')),
  data_class text not null
    check (data_class in ('MOCK_DATA', 'REAL_PARTNER_DATA')),
  source_type text not null
    check (source_type in ('UMTUBA_ORIGINAL', 'PARTNER', 'EXTERNAL', 'MOCK_PROVIDER')),
  payment_owner text not null default 'UNKNOWN'
    check (payment_owner in ('UMTUBA', 'PROVIDER', 'SELLER', 'UNKNOWN')),
  fulfillment_owner text not null default 'UNKNOWN'
    check (fulfillment_owner in ('UMTUBA', 'PROVIDER', 'SELLER', 'UNKNOWN')),
  returns_owner text not null default 'UNKNOWN'
    check (returns_owner in ('UMTUBA', 'PROVIDER', 'SELLER', 'UNKNOWN')),
  customer_support_owner text not null default 'UNKNOWN'
    check (customer_support_owner in ('UMTUBA', 'PROVIDER', 'SELLER', 'UNKNOWN')),
  max_stale_ms integer not null default 86400000
    check (max_stale_ms >= 60000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz,
  removed_at timestamptz
);

comment on table public.commerce_providers is
  'Provider-neutral Store commerce registry. MOCK_DATA only until real partnerships are approved.';

create table if not exists public.commerce_provider_rights (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.commerce_providers (id) on delete restrict,
  catalog_display_allowed boolean not null default false,
  image_usage_allowed boolean not null default false,
  price_sync_allowed boolean not null default false,
  inventory_sync_allowed boolean not null default false,
  checkout_allowed boolean not null default false,
  resell_allowed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint commerce_provider_rights_one_per_provider unique (provider_id)
);

comment on table public.commerce_provider_rights is
  'Store rights matrix. Unknown/absent rights default DENY (false). Canonical keys: CATALOG_DISPLAY_ALLOWED, IMAGE_USAGE_ALLOWED, PRICE_SYNC_ALLOWED, INVENTORY_SYNC_ALLOWED, CHECKOUT_ALLOWED, RESELL_ALLOWED.';

create table if not exists public.commerce_provider_credential_status (
  provider_id uuid primary key references public.commerce_providers (id) on delete restrict,
  status text not null default 'ABSENT'
    check (status in ('ABSENT', 'PRESENT', 'ROTATION_DUE', 'REVOKED')),
  vault_ref text,
  rotated_at timestamptz,
  revoked_at timestamptz,
  last_presence_check_at timestamptz,
  constraint commerce_provider_credential_vault_ref_len
    check (vault_ref is null or char_length(vault_ref) between 1 and 128),
  constraint commerce_provider_credential_no_secret_shape
    check (
      vault_ref is null
      or (
        vault_ref not ilike 'sk-%'
        and vault_ref not ilike 'pk\_%'
        and vault_ref not ilike 'bearer %'
      )
    )
);

comment on table public.commerce_provider_credential_status is
  'Presence/rotation/revocation flags only. Never store plaintext partner secrets.';

create table if not exists public.commerce_catalog_import_runs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.commerce_providers (id) on delete restrict,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  accepted_count integer not null default 0,
  rejected_count integer not null default 0,
  actor text
);

create table if not exists public.commerce_catalog_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.commerce_providers (id) on delete restrict,
  external_id text not null,
  source_type text not null,
  rights_record_id uuid not null references public.commerce_provider_rights (id) on delete restrict,
  data_class text not null
    check (data_class in ('MOCK_DATA', 'REAL_PARTNER_DATA')),
  sync_version integer not null default 1 check (sync_version >= 1),
  title text not null,
  description text,
  sku text not null,
  product_type text,
  category text,
  language text not null default 'en',
  price_minor integer not null default 0,
  currency text not null default 'USD',
  on_hand integer not null default 0,
  stale boolean not null default false,
  last_synced_at timestamptz not null default now(),
  bound_store_product_id uuid references public.store_products (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint commerce_catalog_items_provider_external unique (provider_id, external_id)
);

create table if not exists public.commerce_sku_mappings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.commerce_providers (id) on delete restrict,
  external_sku text not null,
  internal_sku text not null,
  external_variant_id text not null,
  bound_variant_id uuid,
  constraint commerce_sku_mappings_unique unique (provider_id, external_variant_id)
);

create table if not exists public.commerce_provider_audit (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.commerce_providers (id) on delete restrict,
  action text not null,
  actor text not null,
  at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- 2) Learning providers + course import staging
-- ---------------------------------------------------------------------------

create table if not exists public.learning_content_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  provider_type text not null
    check (provider_type in ('UMTUBA_ORIGINAL', 'PARTNER', 'EXTERNAL')),
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ENABLED', 'DISABLED', 'REMOVED')),
  data_class text not null
    check (data_class in ('MOCK_DATA', 'REAL_PARTNER_DATA')),
  source_type text not null
    check (source_type in ('UMTUBA_ORIGINAL', 'PARTNER', 'EXTERNAL', 'MOCK_PROVIDER')),
  progress_ownership text not null default 'UNKNOWN'
    check (progress_ownership in ('UMTUBA', 'PROVIDER', 'SPLIT', 'UNKNOWN')),
  certificate_ownership text not null default 'UNKNOWN'
    check (certificate_ownership in ('UMTUBA', 'PROVIDER', 'NONE', 'UNKNOWN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz,
  removed_at timestamptz
);

create table if not exists public.learning_provider_rights (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.learning_content_providers (id) on delete restrict,
  metadata_display_allowed boolean not null default false,
  content_hosting_allowed boolean not null default false,
  video_hosting_allowed boolean not null default false,
  enrollment_allowed boolean not null default false,
  payment_allowed boolean not null default false,
  ai_usage_allowed boolean not null default false,
  certificate_integration_allowed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint learning_provider_rights_one_per_provider unique (provider_id)
);

comment on table public.learning_provider_rights is
  'Learning rights matrix. ALL unknown rights DENY. AI_USAGE_ALLOWED defaults FALSE. Canonical keys: METADATA_DISPLAY_ALLOWED, CONTENT_HOSTING_ALLOWED, VIDEO_HOSTING_ALLOWED, ENROLLMENT_ALLOWED, PAYMENT_ALLOWED, AI_USAGE_ALLOWED, CERTIFICATE_INTEGRATION_ALLOWED.';

create table if not exists public.learning_course_import_runs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.learning_content_providers (id) on delete restrict,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  accepted_count integer not null default 0,
  rejected_count integer not null default 0,
  actor text
);

create table if not exists public.learning_course_external_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.learning_content_providers (id) on delete restrict,
  external_id text not null,
  source_type text not null,
  rights_record_id uuid not null references public.learning_provider_rights (id) on delete restrict,
  data_class text not null
    check (data_class in ('MOCK_DATA', 'REAL_PARTNER_DATA')),
  sync_version integer not null default 1 check (sync_version >= 1),
  title text not null,
  description text,
  language text not null default 'en',
  category text,
  difficulty text,
  price_minor integer not null default 0,
  currency text not null default 'USD',
  enrollment_model text not null default 'free'
    check (enrollment_model in ('free', 'paid', 'external')),
  external_enrollment_url text,
  progress_ownership text not null,
  certificate_ownership text not null,
  hosted_on_umtuba boolean not null default false,
  last_synced_at timestamptz not null default now(),
  bound_course_id uuid references public.learning_courses (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint learning_course_external_items_provider_external unique (provider_id, external_id)
);

create table if not exists public.learning_provider_audit (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.learning_content_providers (id) on delete restrict,
  action text not null,
  actor text not null,
  at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- 3) Shared partner admin / commercial placeholders
-- ---------------------------------------------------------------------------

create table if not exists public.partner_onboarding (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  domain text not null check (domain in ('STORE', 'LEARNING', 'BOTH')),
  data_class text not null
    check (data_class in ('MOCK_DATA', 'REAL_PARTNER_DATA')),
  lifecycle text not null default 'DRAFT'
    check (lifecycle in (
      'DRAFT', 'LEGAL_REVIEW', 'APPROVED', 'INTEGRATION', 'QA',
      'ACTIVE', 'SUSPENDED', 'TERMINATED'
    )),
  legal_status text not null default 'NOT_STARTED'
    check (legal_status in ('NOT_STARTED', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
  contract_status text not null default 'UNSIGNED'
    check (contract_status in ('UNSIGNED', 'IN_NEGOTIATION', 'SIGNED', 'EXPIRED', 'TERMINATED')),
  store_provider_id uuid references public.commerce_providers (id) on delete set null,
  learning_provider_id uuid references public.learning_content_providers (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  suspended_at timestamptz,
  terminated_at timestamptz,
  constraint partner_onboarding_no_real_active_check
    check (not (data_class = 'REAL_PARTNER_DATA' and lifecycle = 'ACTIVE'))
);

create table if not exists public.partner_commercial_config (
  partner_id uuid primary key references public.partner_onboarding (id) on delete restrict,
  markets text[] not null default '{}',
  currencies text[] not null default array['USD']::text[],
  languages text[] not null default array['en']::text[],
  commission_bps integer not null default 0 check (commission_bps between 0 and 10000),
  revenue_share_bps integer not null default 0 check (revenue_share_bps between 0 and 10000),
  tax_classification text not null default 'UNCLASSIFIED'
    check (tax_classification in ('UNCLASSIFIED', 'VAT_PLACEHOLDER', 'SALES_TAX_PLACEHOLDER')),
  starts_at timestamptz,
  ends_at timestamptz
);

create table if not exists public.partner_payout_ledger_placeholders (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_onboarding (id) on delete restrict,
  order_or_enrollment_id text not null,
  attribution_kind text not null
    check (attribution_kind in ('ORDER', 'ENROLLMENT', 'REFUND')),
  currency text not null,
  amount_minor integer not null,
  status text not null default 'PLACEHOLDER'
    check (status in ('PLACEHOLDER', 'ACCRUED', 'VOID')),
  note text not null default 'Calculation-only ledger. Real payouts are not implemented.'
);

create table if not exists public.partner_audit_events (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_onboarding (id) on delete restrict,
  action text not null,
  actor text not null,
  at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- 4) RLS FORCE + grants — platform admin read; service_role write; audit append-only
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'commerce_providers',
    'commerce_provider_rights',
    'commerce_provider_credential_status',
    'commerce_catalog_import_runs',
    'commerce_catalog_items',
    'commerce_sku_mappings',
    'commerce_provider_audit',
    'learning_content_providers',
    'learning_provider_rights',
    'learning_course_import_runs',
    'learning_course_external_items',
    'learning_provider_audit',
    'partner_onboarding',
    'partner_commercial_config',
    'partner_payout_ledger_placeholders',
    'partner_audit_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update on table public.%I to service_role', t);
  end loop;
end
$$;

revoke update, delete on public.commerce_provider_audit from service_role;
revoke update, delete on public.learning_provider_audit from service_role;
revoke update, delete on public.partner_audit_events from service_role;
grant select, insert on public.commerce_provider_audit to service_role;
grant select, insert on public.learning_provider_audit to service_role;
grant select, insert on public.partner_audit_events to service_role;

drop policy if exists commerce_providers_admin_read on public.commerce_providers;
create policy commerce_providers_admin_read
  on public.commerce_providers
  for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists learning_content_providers_admin_read on public.learning_content_providers;
create policy learning_content_providers_admin_read
  on public.learning_content_providers
  for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists partner_onboarding_admin_read on public.partner_onboarding;
create policy partner_onboarding_admin_read
  on public.partner_onboarding
  for select
  to authenticated
  using (public.is_platform_admin());

grant select on public.commerce_providers to authenticated;
grant select on public.learning_content_providers to authenticated;
grant select on public.partner_onboarding to authenticated;
