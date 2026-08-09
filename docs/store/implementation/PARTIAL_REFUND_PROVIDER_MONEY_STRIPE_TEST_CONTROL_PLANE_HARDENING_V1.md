# Partial Refund Provider Money — Stripe TEST Control Plane Hardening V1

## Purpose

Local/offline **control plane** that must pass before any controlled Stripe TEST activation GO.

Deterministic status: **`READY`** | **`NOT_READY`** with machine-readable reasons.

## Answers (always)

| Question | Field |
|----------|--------|
| required TEST configuration names present? | `answers.requiredTestConfigurationNamesPresent` |
| mode TEST? | `answers.modeTest` |
| LIVE disabled? | `answers.liveDisabled` |
| provider gates correct starting state? | `answers.providerGatesCorrectStartingState` |
| fixtures valid? | `answers.fixturesValid` |
| can activation proceed? | `answers.canActivationProceed` |
| why blocked / missing prerequisite? | `reasons[]` + `missingPrerequisites[]` |

## Hard invariants

- `NETWORK_STRIPE_CALLS = 0`
- `MONEY_MOVEMENT = 0`
- `PRODUCTION_DB_WRITES = 0`
- `PROVIDER_GATES = OFF` (never enabled here)
- Secrets never printed or stored in report payloads
- This module **never activates** the provider (`activationPerformed = false`, `activationAuthorizedByControlPlane = false`)

## READY criteria

All must hold:

1. Required TEST env **names** present (`STRIPE_MODE`, `STRIPE_SECRET_KEY`, publishable key, webhook secret, app origin)
2. `STRIPE_MODE=test` and LIVE disabled (no live prefixes / no TEST·LIVE mismatch)
3. Provider gates OFF / execution mode `off` / production exec ACK absent
4. Fixture pack schema-valid + deterministic
5. Offline preflight verdict = pass (safe to start controlled TEST prep)
6. Pre-activation structural verdict = zero-money safe / activation forbidden
7. Credential shape TEST-aligned

`READY` means prerequisites are satisfied for a **separate coordinator activation GO**. It is not activation.

## API

```ts
import {
  buildStripeTestControlPlaneReport,
  isStripeTestControlPlaneReady,
  getStripeTestControlPlaneBlockReasons,
} from "@/lib/store/partialRefundProviderMoneyExecution";

const report = buildStripeTestControlPlaneReport(process.env);
// report.status === "READY" | "NOT_READY"
```

## Composition

Builds on (ported when not yet on Commerce tip):

- `stripeTestOfflinePreflightValidator`
- `stripeTestControlledTestPreActivationSafety`
- `stripeTestFixturePack` (read-only consume)

## Forbidden

- Stripe API / network calls
- Provider activation / gate enablement
- Production DB writes / migrations
- Secret value echo
