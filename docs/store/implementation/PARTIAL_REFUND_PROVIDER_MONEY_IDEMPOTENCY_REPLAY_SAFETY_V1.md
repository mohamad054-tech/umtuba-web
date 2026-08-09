# Partial Refund Provider Money — Idempotency / Replay Safety V1

**Task:** `COMMERCE_REFUND_PROVIDER_IDEMPOTENCY_REPLAY_SAFETY_V1`  
**Module:** `lib/store/partialRefundProviderMoneyExecution/refundProviderIdempotencyReplaySafety.ts`  
**Constraints:** `STRIPE_CALLS=0` · `MONEY_MOVEMENT=0` · `DB_WRITES=0` · `PROVIDER_GATES=OFF`

## Purpose

Pure, fail-closed decision boundary that classifies durable local facts **before** any provider money submit into:

| Field | Meaning |
|------|---------|
| `EXECUTION_ALLOWED` | First-time provider submit may proceed (gates/ACK still required at runtime) |
| `EXECUTION_BLOCKED` | Provider submit must not run |
| `RECONCILIATION_REQUIRED` | Local/provider state needs reconciliation / recovery lookup |
| `OPERATOR_REVIEW_REQUIRED` | Human review required; never auto second money |

## Critical invariant

Previously executed **or** UNKNOWN provider outcome must **never** yield uncontrolled second money execution (`EXECUTION_ALLOWED` / `providerSubmitAllowed` for submit).

## Runtime alignment

Orchestrator already fail-closes:

- succeeded → `replayed_succeeded` (no submit)
- uncertain / executing → `recovery_required` (no submit)
- failed → V1 `no_retry`
- gates default OFF

This module makes the four-field contract explicit for admin/ops classification and regression coverage of replay surfaces (server action, browser reload, network-like retry) without real network.

## Out of scope

- Stripe API calls / invented provider truth
- Migrations / DB writes / gate activation
- Porting unmerged recovery-decision / reconciliation branches onto SoT tip
