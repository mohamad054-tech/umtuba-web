# Partial Refund Provider Money — Reconciliation Runtime Hardening V1

## Purpose

Deterministic, migration-independent LOCAL ↔ PROVIDER reconciliation read-model for refund provider money execution. Answers operator fields from durable local facts only.

## Hard constraints

- `STRIPE_CALLS = 0`
- `DB_WRITES = 0`
- `MIGRATIONS = 0`
- `PROVIDER_GATES = OFF`
- Does **not** invent external provider truth (no live Stripe claims)

## Operator fields

| Field | Source |
|-------|--------|
| `LOCAL_STATE` | Ledger/reservation status (`planned` / `committing` / `committed` / `failed` / `compensated` / `absent` / `unknown`) |
| `PROVIDER_STATE` | Durable execution row status (`none` / `planned` / `executing` / `succeeded` / `failed` / `uncertain`) |
| `MATCH_STATUS` | Deterministic classification (aligned / in-flight / mismatch / unknown) |
| `RECONCILIATION_REQUIRED` | True for unknown/stale/critical mismatch / insufficient facts |
| `RETRY_SAFE` | Always `false` in V1 (`no_retry` policy) |
| `OPERATOR_ACTION_REQUIRED` | True when lookup, mismatch review, stuck-committing, or first-time submit candidate applies |

## Module

- `lib/store/partialRefundProviderMoneyExecution/refundProviderReconciliation.ts`
- Tests: `refundProviderReconciliation.test.ts`
- Admin diagnostic: recovery panel `data-testid="pr-prov-reconciliation"`

## Safe operator actions (when required)

1. `run_recovery_lookup` — LOOKUP only
2. `review_mismatch` — human review; no same-key retry
3. `use_stuck_committing_recovery` — reservation layer panel
4. `first_time_submit_candidate` — controlled first submit (gates remain OFF)

## Out of scope

- Stripe API / money movement
- Gate enablement
- Migrations / production DB writes
- Invented live provider outcomes
