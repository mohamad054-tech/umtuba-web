# Partial Refund Provider — RELEASE-CANDIDATE Safety Matrix V1

**Task:** `COMMERCE_REFUND_PROVIDER_RELEASE_CANDIDATE_SAFETY_MATRIX_V1`
**Agent:** DESKTOP-A3
**Mode:** TEST-ONLY consolidation (no new provider architecture)

## Purpose

Consolidate completed Commerce refund/provider safety work into one deterministic
**release-candidate** safety matrix against actual SoT tip contracts:

- Terminal-state + replay invariants (`refundProviderTerminalStateReplayInvariants*`)
- Reconciliation → terminal E2E matrix (`refundProviderReconciliationTerminalE2eMatrix*`)

Does **not** invent status name replacements or a new provider stack.

## Hard safety counters

| Counter | Value |
|---------|-------|
| STRIPE_CALLS | 0 |
| MONEY_MOVEMENT | 0 |
| DB_WRITES | 0 |
| MIGRATIONS | 0 |
| PROVIDER_GATES | OFF |

## Covered domains

`REQUEST` → `RESERVATION` → `COMMITTING` → `PROVIDER_EXECUTION` →
`UNCERTAIN_OUTCOME` → `RECONCILIATION` → `RECOVERY` → `COMPENSATION` →
`TERMINAL_STATE` → `DUPLICATE_REPLAY`

## Per-row decision fields

| Field | Meaning |
|-------|---------|
| INPUT_STATE | Durable ledger + reservation normalized facts |
| PROVIDER_STATE | Actual provider execution status (`planned`…`uncertain` or `none`) |
| EXECUTION_ALLOWED | Provider money submit allowed |
| EXECUTION_BLOCKED | Provider money submit blocked |
| RETRY_SAFE | Automatic retry considered safe (must stay false for uncertain) |
| RECONCILIATION_REQUIRED | Must reconcile before further money action |
| RECOVERY_REQUIRED | Explicit recovery path required |
| OPERATOR_REVIEW_REQUIRED | Operator review required |
| TERMINAL | Terminal class (provider terminal / compensated / reconciled claim) |
| REPLAY_ALLOWED | Submit or retrySafe (must be false at protected terminals) |
| EXPECTED_EVIDENCE | Deterministic evidence tokens for the row |

## Critical invariants proven

1. `succeeded` cannot execute twice
2. Uncertain outcome is NOT automatically retry-safe
3. `compensated` cannot silently replay
4. Terminal reconciled cannot silently replay
5. Stuck / committing requires explicit recovery
6. Stale UI/action cannot bypass safety
7. Duplicate command cannot cause a second provider money execution

## Actual SoT names (no invented replacements)

| Domain | Actual names |
|--------|----------------|
| Provider execution | `planned`, `executing`, `succeeded`, `failed`, `uncertain` |
| Provider terminal | `succeeded`, `failed` |
| Provider unknown | `uncertain` (alias UNKNOWN → uncertain) |
| Ledger | `planned`, `committing`, `committed`, `failed`, `compensated` |

## Implementation

- `lib/store/partialRefundProviderMoneyExecution/refundProviderReleaseCandidateSafetyMatrix.ts`
- `lib/store/partialRefundProviderMoneyExecution/refundProviderReleaseCandidateSafetyMatrix.test.ts`
- Additive re-exports in `index.ts` only

## Out of scope

- Stripe / provider activation / money movement
- Production DB writes / migrations / gate enable
- A2 Stripe TEST activation / dry-run orchestration surfaces
- Rewriting completed Central-submitted A3 branches
