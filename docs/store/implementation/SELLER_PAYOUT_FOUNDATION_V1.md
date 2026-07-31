# Seller Payout Foundation V1

Capability: `commerce.settlement.seller_payout_foundation_v1`
Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260881_store_seller_payout_foundation_v1.sql`

Depends on: Settlement Foundation (`20260824`), Payment Outcome Sync (`20260823`), UEOS Foundation (`20260822`)

## Purpose

Trusted path to move **store payable** into **store in_transit** after settlement `RELEASED`, then either confirm (funds leave platform custody via clearing) or fail (return to payable):

`payout action â†’ claim event_key â†’ UEOS journal â†’ store_payout_events`

Full amount only (matches capture / settlement). No bank rails, payout UI, profiles/batches, maker-checker, commissions, or partial amounts in V1.

## Actions

| Action | Ledger | UEOS `event_type` |
| --- | --- | --- |
| `submit` | Debit store **payable**, credit store **in_transit** | `transfer` |
| `confirm` | Debit store **in_transit**, credit platform **clearing** | `transfer` |
| `fail` | Debit store **in_transit**, credit store **payable** | `release` |

**Platform revenue is never touched.** Confirm does not call a bank/PSP adapter â€” it only posts the custody exit journal.

## State machine (per capture)

Event-sourced over `store_payout_events` for a `capture_event_id`, ordered by **`created_at asc, id asc`**:

```
NONE --submit--> IN_TRANSIT
IN_TRANSIT --confirm--> COMPLETED  (TERMINAL)
IN_TRANSIT --fail--> NONE
```

- `submit` requires settlement state **`RELEASED`** and a completed settlement `release` journal.
- **`COMPLETED` is terminal in V1.** Re-submit after confirm is **FORBIDDEN**.
- `fail` returns to `NONE` so a new submit may retry.
- `store_payout_active_in_transit` is deleted on confirm/fail; absence of the active row does **not** allow re-submit after `COMPLETED` â€” historical confirm permanently blocks new `submit`.
- Root `submit` rows have `submit_event_id = null`; children reference the active submit id (resolved internally â€” never from caller).

## Prerequisites

- Trusted capture outcome with UEOS journal
- Order `payment_status=paid`, attempt `status=captured`
- No trusted `refunded` outcome
- Settlement state `RELEASED` with non-null release `ueos_journal_entry_id`

## Settlement interaction

`apply_store_settlement_event` (replaced in `20260881`) calls:

`store_payout_assert_settlement_action_allowed(capture_event_id, action)`

after idempotent replay returns, for new events only:

| Payout state | Settlement mutation |
| --- | --- |
| `NONE` | Allowed (subject to settlement state machine) |
| `IN_TRANSIT` | Blocked |
| `COMPLETED` | Blocked |

## UEOS extension

Account kind **`in_transit`** is added to `ueos_accounts` / `ueos_ensure_account` for store payout custody.

## product_scope

- Seller store payable / in_transit accounts use **`product_scope='store'`**
- Platform clearing on confirm remains **`product_scope='ueos'`**

## Fingerprint

Canonical request object includes **`policy_id`** and **`settlement_release_event_id`**. Policy is resolved and the posting template asserted **before** fingerprint computation.

## EXECUTE privileges

| Function | PUBLIC / anon / authenticated | service_role |
| --- | --- | --- |
| `apply_store_payout_event` | revoked | **GRANT EXECUTE** |
| All payout helpers | revoked | **no grant** (internal only) |
| `apply_store_settlement_event` (replaced) | revoked | **GRANT EXECUTE** (re-granted after replace) |

## Security

- FORCE RLS on `store_payout_events` and `store_payout_active_in_transit`; no authenticated policies
- Caller metadata allow-list only; no `account_id` / `owner_id` / `lines` / submit ids / rail / bank fields
- Posting templates: exact match; `ueos_ensure_account` resolves store vs platform accounts
- Advisory locks: `store_payo_event:` â†’ `store_payo_order:` â†’ `store_payo_capture:`
- Idempotent `event_key` + fingerprint (includes `policy_id`)

## Known V1 Boundaries

Seller Payout Foundation V1 intentionally does **not** include:

- bank / connected-account / wallet rail adapters
- payout profiles, batches, maker-checker approval
- seller payout UI dashboards (see Seller Payout Read Model V1 for trusted balance/history reads)
- commission / fee split
- partial payouts
- post-payout clawback / refunds from COMPLETED
- chargebacks
- UM Points / UMT changes
- country capability matrix / KYC gates (fail-closed absence: no rail)

Settlement release remains the eligibility gate; this foundation only books payable â†’ in_transit â†’ clearing (or fail back to payable). Seller-facing read projection is `commerce.settlement.seller_payout_read_model_v1`.
