# Stripe TEST Activation State Machine — Regression & Invariants V1

## Purpose

Independent, TEST-ONLY regression pack proving activation state-machine safety
invariants **before any real Stripe TEST activation**.

## Scope

- Branch: `office/desktop-a2-stripe-test-activation-state-machine-regression-invariants-v1`
- Base: SM implementation tip `03b45a19a311ac9e148d1d029d39d50da6e86b03`
  (`office/desktop-a2-stripe-test-activation-state-machine-safety-v1` — not modified)
- Test file:
  `lib/store/partialRefundProviderMoneyExecution/stripeTestActivationStateMachine.regression.invariants.test.ts`

## Hard counters

| Counter | Value |
|--------|-------|
| STRIPE_CALLS | 0 |
| MONEY_MOVEMENT | 0 |
| DB_WRITES | 0 |
| STRIPE_ACTIVATED | NO |
| PROVIDER_GATES | OFF |

## Invariants covered

1. DISABLED cannot silently become ACTIVE
2. Failed precheck cannot activate
3. Missing TEST credentials cannot activate
4. Invalid fixture / mixed LIVE·TEST shape cannot activate
5. LIVE configuration cannot enter TEST_ACTIVE
6. Repeated activation is deterministic
7. Failed activation remains fail-closed
8. Deactivation is deterministic
9. Validation cannot call Stripe
10. State inspection cannot move money
11. Secrets never appear in results/errors
12. Provider gates remain OFF unless separately authorized

## Integration note

State-machine implementation was **not** integrated into Commerce SoT tip at
pack authoring time. Central owns SM integration. This pack must not be used as
a substitute for SoT merge.
