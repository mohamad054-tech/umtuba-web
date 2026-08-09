# Stripe TEST Activation Dry-Run Orchestration V1

**TASK_ID:** `COMMERCE_STRIPE_TEST_ACTIVATION_DRY_RUN_ORCHESTRATION_V1`  
**Module:** `lib/store/partialRefundProviderMoneyExecution/stripeTestActivationDryRunOrchestration.ts`  
**Status:** Offline dry-run only — **NO REAL ACTIVATION**

## Purpose

Walk the future controlled Stripe TEST activation lifecycle against CURRENT
activation state-machine / control-plane contracts, recording per-phase evidence
without network, money movement, DB writes, or gate enablement.

## Phase walk

| Phase | SM event (simulated) | Expected state (READY CP) |
|-------|----------------------|---------------------------|
| PRECHECK | `EVALUATE_PRECHECK` from `DISABLED` | `READY_FOR_TEST` |
| READY_FOR_TEST | re-`EVALUATE_PRECHECK` | `READY_FOR_TEST` |
| ACTIVATION_REQUEST | `BEGIN_ACTIVATION` | `TEST_ACTIVATING` |
| ACTIVATION_VALIDATION | idempotent `BEGIN_ACTIVATION` | `TEST_ACTIVATING` |
| TEST_ACTIVE_EXPECTED | `MARK_ACTIVATION_SUCCEEDED` | `TEST_ACTIVE` |
| DEACTIVATION | `DEACTIVATE` | `TEST_DEACTIVATED` |
| CLEANUP | `RESET` | `DISABLED` |

Each phase record includes: `INPUTS`, `EXPECTED_STATE`, `BLOCKING_REASONS`,
`EVIDENCE`, `STOP_CONDITION`, `ROLLBACK_ACTION`.

## Hard invariants

- `STRIPE_CALLS = 0`
- `MONEY_MOVEMENT = 0`
- `DB_WRITES = 0`
- `STRIPE_ACTIVATED = NO`
- `PROVIDER_GATES = OFF`
- Structural `operatorActivationAuthorized` / activation-performed constants remain `false`
- Simulated auth override is test-graph only; never enables provider gates
- Secrets never appear in reports (names/booleans/reason codes only)

## SoT integration note

When SM tip is not yet an ancestor of Commerce SoT tip, set
`waitingForStateMachineIntegration: true` on the report. Dry-run still completes
against proven-safe SM contracts on the A2 branch.

## Forbidden

- Stripe API / provider activation
- Production DB write / migrations
- LIVE credential exposure
- Canonical / alpha merge / `_port_extract`
