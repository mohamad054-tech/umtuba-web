# Merchant Settlement & Seller Balances Foundation V1

Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260824_store_merchant_settlement_foundation_v1.sql`

Depends on: UEOS Foundation (`20260822`), Payment Outcome Sync (`20260823`)

## Purpose

Trusted path to move **captured platform liability** into **store escrow / payable** after a Sync capture:

`settlement action → claim event_key → UEOS journal → store_settlement_events`

Full amount only (matches capture). No commissions, payouts, UI, or partial amounts in V1.

## Actions

| Action | Ledger | UEOS `event_type` |
| --- | --- | --- |
| `allocate` | Debit platform **liability**, credit store **escrow** | `hold` |
| `release` | Debit store **escrow**, credit store **payable** | `release` |
| `hold` | Debit store **payable**, credit store **escrow** | `hold` |
| `reverse_allocation` | Debit store **escrow**, credit platform **liability** | `release` |

**Platform revenue is never touched.**

## State machine (per capture)

Event-sourced over `store_settlement_events` for a `capture_event_id`, ordered by **`created_at asc, id asc`**:

```
UNALLOCATED --allocate--> ALLOCATED
ALLOCATED|HELD --release--> RELEASED
RELEASED --hold--> HELD
ALLOCATED|HELD --reverse_allocation--> REVERSED  (TERMINAL)
```

- `reverse_allocation` is **forbidden** from `RELEASED` (V1: funds already in seller payable).
- **`REVERSED` is terminal in V1.** Re-allocation after reverse is **FORBIDDEN**.
- `store_settlement_active_allocations` is deleted on reverse, but absence of the active row does **not** allow re-allocate — historical reverse permanently blocks new `allocate`.
- Future admin reopen of `REVERSED` is out of scope for V1.
- Root `allocate` rows have `allocation_event_id = null`; children reference the active allocate id (resolved internally — never from caller).

## Active allocations (DB uniqueness)

Table `store_settlement_active_allocations` is the DB-authoritative uniqueness gate:

- Primary key = `capture_event_id` → at most one active non-reversed allocation per capture
- `allocate` inserts the row after claim; unique violation → concurrent/double allocate fails closed
- `reverse_allocation` deletes the row; missing row fails closed
- Deleting the active row does **not** imply re-allocate is allowed — `REVERSED` permanently blocks allocate

## Fingerprint

Canonical request object (and thus `request_fingerprint`) includes **`policy_id`**. Policy is resolved and the posting template asserted **before** fingerprint computation so the claim is bound to the effective policy.

## product_scope

- Seller store escrow/payable accounts use **`product_scope='store'`** to isolate merchant balances from the platform UEOS chart
- Platform liability lines remain **`product_scope='ueos'`**

## Refund ordering

Sync refunds (`apply_store_payment_outcome` outcome=`refunded`) call:

`store_settlement_assert_refund_allowed(attempt_id, correlation_id)`

after capture provenance checks. That guard reads only trusted capture + settlement tables:

| Settlement state | Refund |
| --- | --- |
| `UNALLOCATED` (never allocated) | Allowed |
| `REVERSED` (after reverse) | Allowed only if: no `active_allocations` row, and a `reverse_allocation` for the latest allocate has `ueos_journal_entry_id IS NOT NULL` |
| `ALLOCATED` / `HELD` | Blocked — reverse_allocation required first |
| `RELEASED` | Blocked **directly** — V1 Sync refund guard does not unwind payable. Use Full Order Refund Path V1 (`hold` → `reverse_allocation` → Sync `refunded`). |

Correlation must still match the trusted capture (mismatch fails closed).

## Settlement after refund

`apply_store_settlement_event` blocks any settlement action when a trusted `refunded` outcome already exists for the payment attempt.

The Sync migration file `20260823_...sql` is **not** edited (already applied remotely). The refund guard is injected via `CREATE OR REPLACE` in `20260824`.

## EXECUTE privileges

| Function | PUBLIC / anon / authenticated | service_role |
| --- | --- | --- |
| `apply_store_settlement_event` | revoked | **GRANT EXECUTE** |
| All settlement helpers | revoked | **no grant** (internal only) |
| `apply_store_payment_outcome` (replaced) | revoked | **GRANT EXECUTE** (re-granted after replace) |

## Security

- FORCE RLS on `store_settlement_events` and `store_settlement_active_allocations`; no authenticated policies
- Caller metadata allow-list only; no `account_id` / `owner_id` / `lines` / allocation ids
- Posting templates: exact match; `ueos_ensure_account` resolves platform vs store accounts
- Advisory locks: `store_set_event:` → `store_set_order:` → `store_set_capture:`
- Idempotent `event_key` + fingerprint (includes `policy_id`); money controls not taken from caller for allocation parent

## Known V1 Boundaries

Settlement Foundation V1 intentionally does **not** include:

- bank transfers / payout rail adapters (see Seller Payout Foundation V1 for payable → in_transit booking)
- commission / fee split
- partial allocate or partial refund unwind from RELEASED without the Full Order Refund Path V1 orchestration
- seller UI / balance dashboards
- chargebacks
- UM Points / UMT changes
- live PSP / webhook integrations

Captured funds remain platform liability until `allocate`; seller payable is the release target. Payout custody booking after `RELEASED` is `commerce.settlement.seller_payout_foundation_v1` (`SELLER_PAYOUT_FOUNDATION_V1.md`).
