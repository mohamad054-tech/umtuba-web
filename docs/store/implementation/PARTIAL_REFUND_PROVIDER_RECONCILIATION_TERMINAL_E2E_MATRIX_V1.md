# Partial Refund Provider — Reconciliation → Terminal E2E Matrix V1

**Task:** `COMMERCE_REFUND_PROVIDER_RECONCILIATION_TERMINAL_E2E_MATRIX_V1`  
**Module:** `lib/store/partialRefundProviderMoneyExecution/refundProviderReconciliationTerminalE2eMatrix.ts`  
**Constraints:** `STRIPE_CALLS=0` · `MONEY_MOVEMENT=0` · `DB_WRITES=0` · `MIGRATIONS=0` · `PROVIDER_GATES=OFF`

## Purpose

TEST-ONLY consolidated deterministic **in-process** E2E-style matrix that proves the full refund/provider safety chain using actual SoT tip contracts (especially terminal-state + replay invariants):

`REQUEST → RESERVATION → COMMITTING → PROVIDER_OUTCOME → RECONCILIATION → RECOVERY → TERMINAL_STATE`

## Minimum scenarios

| Scenario | Actual SoT mapping |
|----------|-------------------|
| `SUCCESS` | provider `succeeded` |
| `FAILED` | provider `failed` |
| `UNCERTAIN` | provider `uncertain` (task UNKNOWN) |
| `COMPENSATED` | ledger `compensated` |
| `COMMITTING` | ledger/reservation `committing` |
| `STUCK_RECOVERY` | stuck-committing class + stale `executing` recovery path |
| `DUPLICATE_REPLAY` | duplicate command / stale UI after terminal `succeeded` |

## Per-phase decision fields

| Field | Meaning |
|------|---------|
| `EXECUTION_ALLOWED` | First-time provider submit may proceed (runtime gates/ACK still required) |
| `EXECUTION_BLOCKED` | Provider submit must not run |
| `RECONCILIATION_REQUIRED` | Local/provider state needs reconciliation |
| `RECOVERY_REQUIRED` | Explicit recovery path required |
| `OPERATOR_REVIEW_REQUIRED` | Human review required |
| `TERMINAL` | Provider terminal (`succeeded`/`failed`) or ledger `compensated` / reconciled-terminal class |
| `REPLAY_ALLOWED` | Must be **NO** at `TERMINAL_STATE` (and late phases of money-closed scenarios) |

## Actual state names (do not invent)

| Domain | Actual names |
|--------|----------------|
| Provider execution | `planned`, `executing`, `succeeded`, `failed`, `uncertain` |
| Provider terminal | `succeeded`, `failed` |
| Provider unknown | `uncertain` |
| Ledger | `planned`, `committing`, `committed`, `failed`, `compensated` |
| Reconciled | **not** a durable status |

## Safety

- Pure / in-memory fixtures — no Stripe, no money movement, no DB writes, no migrations
- Consumes `buildRefundProviderTerminalStateReplayInvariants` + `classifyRepeatedRecoveryAction`
- Does **not** rewrite completed Central-submitted branches (`987a9d7`, `df10121`, `7681a01`, …)
- Does **not** touch A2 `stripeTestActivation*` / dry-run orchestration surfaces
- Provider gates remain OFF globally; matrix evaluates decision boundary only

## Out of scope

- Production semantic changes (unless proven P0/P1 — stop and report)
- Provider activation / Stripe TEST dry-run orchestration (A2)
- Canonical / alpha merge / `_port_extract`
- Wholesale port of non-integrated recovery/idempotency branches onto SoT
