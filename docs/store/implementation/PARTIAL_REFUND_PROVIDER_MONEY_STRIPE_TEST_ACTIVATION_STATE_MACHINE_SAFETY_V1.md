# Partial Refund Provider Money — Stripe TEST Activation State Machine Safety V1

## Purpose

Explicit deterministic **state machine** for future controlled Stripe TEST activation.

**This module does not activate Stripe.** It models fail-closed lifecycle transitions so a later coordinator GO cannot silently become active, enter LIVE, or skip precheck.

## Canonical states

| State | Meaning |
|-------|---------|
| `DISABLED` | Default / reset; no activation intent |
| `PRECHECK_BLOCKED` | Control-plane precheck failed (missing creds, LIVE, bad fixtures, unsafe gates) |
| `READY_FOR_TEST` | Control-plane `READY`; still not activating |
| `TEST_ACTIVATING` | Transitional; requires separate operator authorization |
| `TEST_ACTIVE` | Active TEST (unreachable without auth + precheck success) |
| `TEST_FAILED` | Activation attempt failed; cannot silently become active |
| `TEST_DEACTIVATED` | Deterministic deactivation terminal before reset |

## Events

`EVALUATE_PRECHECK` · `BEGIN_ACTIVATION` · `MARK_ACTIVATION_SUCCEEDED` · `MARK_ACTIVATION_FAILED` · `DEACTIVATE` · `RESET`

## Fail-closed invariants

- Cannot enter `TEST_ACTIVE` without precheck success (`control plane READY`)
- LIVE / TEST·LIVE mismatch cannot enter TEST activation (`PRECHECK_BLOCKED`)
- Missing credentials / invalid fixtures → `PRECHECK_BLOCKED`
- Repeated `BEGIN_ACTIVATION` / succeed / deactivate transitions are deterministic + idempotent
- `TEST_FAILED` cannot transition to `TEST_ACTIVE`
- Provider gates remain `OFF` unless a **separate** operator activation is authorized
- Structural constants: `STRIPE_TEST_ACTIVATION_OPERATOR_AUTHORIZED = false`, `STRIPE_TEST_ACTIVATION_PERFORMED = false`

## Hard invariants

- `STRIPE_CALLS = 0`
- `MONEY_MOVEMENT = 0`
- `PRODUCTION_DB_WRITES = 0`
- `PROVIDER_GATES = OFF`
- Secrets never printed or stored in report payloads

## API

```ts
import {
  buildStripeTestActivationStateMachineReport,
  applyStripeTestActivationTransition,
  resolveStripeTestActivationState,
  isStripeTestActivationReadyForTest,
} from "@/lib/store/partialRefundProviderMoneyExecution";

const report = buildStripeTestActivationStateMachineReport(process.env);
// report.state === "READY_FOR_TEST" | "PRECHECK_BLOCKED" | ...

const begin = applyStripeTestActivationTransition({
  from: "READY_FOR_TEST",
  event: "BEGIN_ACTIVATION",
  source: process.env,
});
// Without separate operator auth → rejected; stays READY_FOR_TEST
```

## Composition

Builds on:

- `stripeTestControlPlaneHardening` (`READY` | `NOT_READY`)
- `stripeTestControlledTestPreActivationSafety`
- `stripeTestOfflinePreflightValidator`
- `stripeTestFixturePack` (read-only consume)

## Forbidden

- Stripe API / network calls
- Provider activation / gate enablement
- Production DB writes / migrations
- Secret value echo
- Claiming this module authorizes activation
