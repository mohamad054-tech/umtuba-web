# Commerce Partial Refund In-Flight Committing Visibility RPC Foundation V1

Capability: `commerce.payments.partial_refund_in_flight_committing_visibility_v1`  
Module: `lib/store/partialRefundInFlightCommittingVisibility/`  
Version: `commerce-partial-refund-in-flight-committing-visibility-v1`

## Status

**CLOSED** — `COMMERCE_PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_V1_CLOSED`.  
**Migration applied remotely: no.**

## Original blocker

Prior visibility audit stopped with `MIGRATION_OR_RPC_REQUIRED`:

- Service-role partial-refund repository is RPC-only (no direct `.from(...)` table reads).
- Existing list RPC `list_store_partial_refund_ledger_committed` returns only `status = 'committed'`.
- No privileged read RPC existed for exact `status = 'committing'`.

A privileged read-only RPC was required so platform admins can discover in-flight committing rows without weakening RLS or adding client table access.

## Why a privileged RPC was required

1. Ledger tables remain protected by RLS / service_role boundaries.
2. Repository contract forbids ad-hoc table queries from application code.
3. Visibility must hard-filter `committing` server-side (no client-supplied status).
4. SECURITY DEFINER + `service_role` execute matches the existing 20260900 ledger RPC contract.

## Chosen migration version and collision evidence

| Evidence | Value |
| --- | --- |
| Local max prior Store/partial-refund migration | `20260900_store_partial_refund_ledger_rpc_v1.sql` |
| Documented remote tip (`PROJECT_STATE` / partial-refund closeout) | **`20260900`** |
| Historical migrations left untouched | `20260898`, `20260899`, `20260900` |
| Cross-domain claims (do not use) | `20260901` Learning; `20260902–04` Translation; `20260910` Translation studio |
| Next free local draft (corrective) | **`20260905`** |

**Selected file:** `supabase/migrations/20260905_store_partial_refund_ledger_list_committing_v1.sql`
(Corrective renumber from invalid draft `20260901`.)

## RPC security model

```sql
public.list_store_partial_refund_ledger_committing(
  p_store_id uuid default null,
  p_capture_event_id uuid default null,
  p_limit integer default 50
) returns jsonb
```

- `STABLE` + **`SECURITY DEFINER`**
- `SET search_path = public`
- Hard-coded `where c.status = 'committing'` (no `p_status`)
- Bound limit: default 50, max 100, reject `<1` or `>100`
- Order: `created_at asc, id asc` (oldest in-flight first)
- Optional trusted store + capture scope
- `REVOKE ALL` from `public`, `anon`, `authenticated`
- `GRANT EXECUTE` to **`service_role` only**
- Comment documents read-only admin-ops purpose

## Read-only contract

The RPC and TypeScript path **never**:

- update / insert / delete ledger rows
- plan / begin / complete / fail
- release locks, compensate, cancel committed rows
- call providers, move money, restock, unwind settlement/commission, or touch payouts

## Repository wiring

- `PARTIAL_REFUND_LEDGER_RPCS.listCommitting`
- `PartialRefundLedgerRpcPort.listCommitting`
- `createPartialRefundLedgerRpcPort` → RPC invoke only
- `ServiceRolePartialRefundLedgerRepository.listCommitting` → `parseCommittingList` (fail closed)
- `MemoryPartialRefundLedgerRepository.listCommitting` for tests
- No direct `.from(...)` table query

## Authorization

- Admin server action: `assertPlatformAdminDb`
- No seller action; no buyer/public action
- Service-role boot for privileged RPC invoke

## Scope filters

- Optional `storeId` (UUID validated)
- Optional `captureEventId` (UUID validated; supported by ledger field)
- Cross-store / cross-capture leaks fail closed in the visibility service

## Safe fields returned

| Field | Notes |
| --- | --- |
| `ledger_id` | Commit id |
| `store_id` | Scope |
| `order_id` | Operator reference |
| `capture_event_id` | Capture scope |
| `status` | Always `committing` |
| `accounting_version` | Concurrency token |
| `created_at` / `updated_at` | Trusted timestamps |

Excluded: amounts, lines, provider payloads, credentials, payout destinations, buyer PII beyond existing operator ids.

## Ordering and limit

- Deterministic: oldest `created_at`, then `id`
- Default limit 50; hard max 100

## Stable results

`listed` | `empty` | `unauthorized` | `validation_failed` | `unsupported` | `repository_error`

Success always sets:

- `readOnly=true`
- `stateChanged=false`
- `committingLockReleased=false`
- `recoveryPerformed=false`
- all money / provider / payout / compensation / cancellation / restock / entitlement / settlement / commission flags = `false`

## UI separation from recovery

Admin refunds page section **“In-flight committing reservations”**:

- Manual refresh/list only
- Safe empty state
- Bounded rows; copy/select ledger id into recovery form via deliberate link (`prRecPrefill`)
- Recovery remains a **separate explicit** submit (`Release committing lock`)
- Listing does not change state or release locks
- No amount/currency/quantity/provider/payout/compensation controls
- No Refund Money / Cancel Refund / auto-recovery CTAs

## Local migration status

| Item | Value |
| --- | --- |
| Migration created | **yes** (`20260905`; was invalidly `20260901`) |
| Migration applied remotely | **no** (orphan RPC may exist from interrupted SQL; history absent) |
| `supabase db push` | **not run** |
| Remote history for this version | **not registered** |

## Test results (this GO)

- Visibility + SQL/UI/action audits: **14 passed**
- Combined focused + regressions: **11 files / 139 tests passed**
- `npx tsc --noEmit`: **PASS**
- `git diff --check`: **PASS**
- Secret / server-only / provider / money-input / ledger-mutation / auto-recovery / migration-collision / SQL-safety / forbidden-domain / no-`.from` audits: **PASS**

## Deferred capabilities

Provider refund execution · money movement · committed cancel/compensation · seller/buyer visibility · restock / entitlement / settlement / commission · payout · `commerce_confirm` · remote apply/register of `20260905` · automatic recovery

## Related closed milestones

- Stuck-committing recovery V1: **CLOSED** @ `8e16c8c` (`committing → failed` lock release only)
- Remote ledger tip remains **`20260900`** until a separate apply GO for `20260905`
