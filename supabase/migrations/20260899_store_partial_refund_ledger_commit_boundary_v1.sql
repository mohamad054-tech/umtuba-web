-- =============================================================================
-- Commerce Partial Refund Durable Ledger & Commit Boundary V1
-- LOCAL DRAFT ONLY — do not remote-apply in this GO.
--
-- Durable reservation of partial-refund amounts/quantities per capture.
-- States: planned | committing | committed | failed
-- Does NOT: Stripe/Sync refund execution, restock, entitlement, settlement,
--           commission unwind, payout, Manual Ops, commerce_confirm.
-- =============================================================================

-- Version selection proof (read-only at authoring time):
--   Local max store migration present: 20260898
--   Documented remote tip (PROJECT_STATE): 20260898
--   Learning occupied 20260896–97; no local 20260899 file existed
--   => 20260899 treated as free for local draft only

-- ---------------------------------------------------------------------------
-- 1) Capture accounting lock / ceilings
-- ---------------------------------------------------------------------------

create table if not exists public.store_partial_refund_capture_accounting (
  capture_event_id uuid primary key
    references public.store_payment_outcome_events (id) on delete restrict,
  store_id uuid not null references public.stores (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  payment_attempt_id uuid not null
    references public.payment_attempts (id) on delete restrict,
  currency text not null check (char_length(currency) = 3),
  capture_amount_minor bigint not null check (capture_amount_minor > 0),
  committed_refund_amount_minor bigint not null default 0
    check (committed_refund_amount_minor >= 0),
  accounting_version bigint not null default 0
    check (accounting_version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_partial_refund_capture_accounting_ceil_check
    check (committed_refund_amount_minor <= capture_amount_minor)
);

create index if not exists store_partial_refund_capture_accounting_order_idx
  on public.store_partial_refund_capture_accounting (store_id, order_id);

-- ---------------------------------------------------------------------------
-- 2) Ledger commit headers
-- ---------------------------------------------------------------------------

create table if not exists public.store_partial_refund_ledger_commits (
  id uuid primary key,
  store_id uuid not null references public.stores (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  payment_attempt_id uuid not null
    references public.payment_attempts (id) on delete restrict,
  capture_event_id uuid not null
    references public.store_partial_refund_capture_accounting (capture_event_id)
      on delete restrict,
  status text not null default 'planned'
    constraint store_partial_refund_ledger_commits_status_check check (
      status in ('planned', 'committing', 'committed', 'failed')
    ),
  currency text not null check (char_length(currency) = 3),
  capture_amount_minor bigint not null check (capture_amount_minor > 0),
  refund_amount_minor bigint not null check (refund_amount_minor > 0),
  calculation_fingerprint text not null
    check (char_length(btrim(calculation_fingerprint)) between 8 and 256),
  idempotency_key text not null
    check (char_length(idempotency_key) between 8 and 128),
  planned_accounting_version bigint not null check (planned_accounting_version >= 0),
  committed_accounting_version bigint
    check (
      committed_accounting_version is null
      or committed_accounting_version >= 0
    ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  failure_code text
    check (failure_code is null or char_length(failure_code) between 1 and 80),
  failure_message_safe text
    check (
      failure_message_safe is null
      or char_length(failure_message_safe) between 1 and 500
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_partial_refund_ledger_commits_amount_ceil_check
    check (refund_amount_minor <= capture_amount_minor),
  unique (store_id, idempotency_key)
);

create unique index if not exists store_partial_refund_ledger_one_committing_per_capture_uq
  on public.store_partial_refund_ledger_commits (capture_event_id)
  where status = 'committing';

create index if not exists store_partial_refund_ledger_commits_capture_status_idx
  on public.store_partial_refund_ledger_commits (capture_event_id, status);

-- ---------------------------------------------------------------------------
-- 3) Ledger lines
-- ---------------------------------------------------------------------------

create table if not exists public.store_partial_refund_ledger_lines (
  id uuid primary key default gen_random_uuid(),
  ledger_commit_id uuid not null
    references public.store_partial_refund_ledger_commits (id) on delete cascade,
  order_item_id uuid not null
    references public.order_items (id) on delete restrict,
  requested_quantity integer not null
    check (requested_quantity > 0 and requested_quantity <= 9999),
  refund_amount_minor bigint not null check (refund_amount_minor > 0),
  unique (ledger_commit_id, order_item_id)
);

create index if not exists store_partial_refund_ledger_lines_item_idx
  on public.store_partial_refund_ledger_lines (order_item_id);

-- ---------------------------------------------------------------------------
-- 4) Committed quantity aggregate (fast over-quantity checks)
-- ---------------------------------------------------------------------------

create table if not exists public.store_partial_refund_line_committed_qty (
  capture_event_id uuid not null
    references public.store_partial_refund_capture_accounting (capture_event_id)
      on delete restrict,
  order_item_id uuid not null
    references public.order_items (id) on delete restrict,
  committed_quantity integer not null default 0
    check (committed_quantity >= 0),
  primary key (capture_event_id, order_item_id)
);

-- ---------------------------------------------------------------------------
-- 5) RLS: deny client direct access (service/RPC only)
-- ---------------------------------------------------------------------------

alter table public.store_partial_refund_capture_accounting enable row level security;
alter table public.store_partial_refund_ledger_commits enable row level security;
alter table public.store_partial_refund_ledger_lines enable row level security;
alter table public.store_partial_refund_line_committed_qty enable row level security;

revoke all on public.store_partial_refund_capture_accounting from public, anon, authenticated;
revoke all on public.store_partial_refund_ledger_commits from public, anon, authenticated;
revoke all on public.store_partial_refund_ledger_lines from public, anon, authenticated;
revoke all on public.store_partial_refund_line_committed_qty from public, anon, authenticated;

-- Note: apply RPCs (plan/begin/complete/fail) are intentionally deferred to a
-- follow-on GO that wires privileged SECURITY DEFINER functions. This draft
-- establishes durable schema + constraints only. TypeScript commit boundary +
-- memory repository define runtime contracts for local tests.
