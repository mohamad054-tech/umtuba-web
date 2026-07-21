# Trusted Payment Outcome Sync V1

Status: implemented locally (not applied remotely in this phase)

Migration: `supabase/migrations/20260823_store_payment_outcome_sync_v1.sql`

## Purpose

Atomic trusted path:

`payment outcome → claim event_key → (optional) UEOS journal → payment_attempts → orders.payment_status → order_status_history`

## EXECUTE privileges

| Function | PUBLIC / anon / authenticated | service_role |
| --- | --- | --- |
| `apply_store_payment_outcome` | revoked | **GRANT EXECUTE** |
| `ueos_ensure_account` / `ueos_post_journal` | revoked | **GRANT EXECUTE** (support path; Sync is DEFINER) |
| All Sync helpers | revoked | **no grant** (internal only) |

## Marketplace accounting (V1)

| Outcome | UEOS |
| --- | --- |
| captured (amount > 0) | Debit **clearing**, credit **liability** |
| refunded (amount > 0) | Debit **liability**, credit **clearing** |
| authorized / failed / cancelled | Status only |
| amount = 0 capture/refund | Outcome recorded; **no** journal |

**Platform revenue is never touched.**

## Same-status / new event_key

If the same outcome was already finalized for the attempt, a **different** `event_key` **fails closed**:

`outcome % already finalized ... replay original event_key %`

Only the original `event_key` may replay (same fingerprint). No second journal, history row, or balance change.

## Multi-attempt / order capture

Capture is blocked when:

- order `payment_status ∈ {paid, refunded, failed}`, or
- any trusted `captured` outcome event already exists for the order

Order is locked (row + advisory) before attempt mutations.

## Refund provenance

Refund requires:

- order `paid`
- attempt `captured`
- prior trusted **capture** outcome event on **this** attempt
- matching `correlation_id`
- matching amount/currency
- capture journal present when amount > 0
- no prior refund event on the attempt

## Policies

`store.payment.authorized` (mode=none), `store.payment.captured`, `store.payment.refunded` — exact template match; unknown metadata keys rejected; exactly one effective policy version.

## Fingerprint

Canonical request object → opaque `request_fingerprint` + `fingerprint_alg` (`md5` today). PostgreSQL `jsonb` text form is key-order deterministic. Algorithm is replaceable without changing replay/conflict behavior.

## Known V1 Boundaries

Sync V1 intentionally does **not** include:

- settlement engine
- seller balances
- commission allocation
- payout engine
- chargeback workflow
- partial refunds
- live PSP / webhook integrations
- multi-attempt payment routing
- accounting recognition of platform revenue

Captured buyer funds are recorded as **platform liability** (via clearing → liability) until future settlement/accounting phases allocate seller payables, UMTUBA commission, fees, taxes, and reserves.
