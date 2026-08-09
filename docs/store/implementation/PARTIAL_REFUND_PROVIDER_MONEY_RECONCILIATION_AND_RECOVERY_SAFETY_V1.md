# Partial Refund Provider Money — Reconciliation & Recovery Safety V1

## Purpose

Deterministic boundary after observability + reconciliation:

**OBSERVABILITY → RECONCILIATION → RECOVERY DECISION** (no provider execution).

Exposes eight recovery-decision fields from durable local facts only.

## Hard constraints

- `STRIPE_CALLS = 0`
- `DB_WRITES = 0`
- `MIGRATIONS = 0`
- `PROVIDER_GATES = OFF`
- Does **not** invent external provider truth
- **CRITICAL:** `PROVIDER_OUTCOME_CONFIDENCE=unknown` never silently becomes `RETRY_SAFE=true`

## Recovery decision fields

| Field | Meaning |
|-------|---------|
| `LOCAL_LEDGER_STATE` | Durable ledger outcome (`planned` / `committed` / `failed` / `compensated` / `absent` / `unknown`) |
| `RESERVATION_STATE` | Reservation lifecycle (`reserved` / `committing` / `committed` / `failed` / `cancelled` / `absent` / `unknown`) |
| `PROVIDER_EXECUTION_STATE` | Durable execution row (`none` / `planned` / `executing` / `succeeded` / `failed` / `uncertain`) |
| `PROVIDER_OUTCOME_CONFIDENCE` | `none` / `confirmed_local` / `in_flight` / `unknown` / `insufficient` |
| `RECONCILIATION_REQUIRED` | From reconciliation classifier |
| `RETRY_SAFE` | Fail-closed; V1 `no_retry`; unknown/in-flight/attempted always false |
| `RECOVERY_REQUIRED` | LOOKUP / stuck-committing / unknown outcome |
| `OPERATOR_ESCALATION_REQUIRED` | Critical mismatch / unknown requiring human review |

## Module

- `lib/store/partialRefundProviderMoneyExecution/refundProviderRecoveryDecision.ts`
- Tests: `refundProviderRecoveryDecision.test.ts`
- Builds on: `refundProviderReconciliation.ts` (prior hardening)
- Admin diagnostic: `data-testid="pr-prov-recovery-decision"`

## Duplicate-money prevention

- Idempotency key binding (`duplicateReplayBound`)
- Submission-attempted ⇒ `RETRY_SAFE=false`
- Succeeded / uncertain / in-flight ⇒ `RETRY_SAFE=false`
- Safety assertions: `assertRefundProviderRecoveryDecisionSafety`

## Out of scope

- Stripe API / money movement
- Gate enablement
- Migrations / production DB writes
- Invented live provider outcomes
