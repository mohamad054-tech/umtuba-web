# Partial Refund Provider Money — Operator Observability Readiness V1

## Purpose

Raise **operational observability** readiness for the refund / provider-execution path **without** activating Stripe, flipping gates, or moving money.

## Surface

- Pure derivation: `buildProviderMoneyOperatorObservability` / `buildProviderMoneyOperatorObservabilityAbsent`
- Module: `lib/store/partialRefundProviderMoneyExecution/operatorObservability.ts`
- Admin presentation: recovery panel diagnostic block `data-testid="pr-prov-operator-observability"`

## Ten operator questions (answered from durable fields only)

| # | Question | Derivation source |
|---|----------|-------------------|
| 1 | Which refund is executing? | `ledgerId` / order / payment / amount / currency (+ optional ledger status) |
| 2 | Which provider execution belongs to it? | `executionId`, `providerKind`, `idempotencyKey` |
| 3 | Was provider submission attempted? | `startedAtIso` / status path evidence |
| 4 | Current execution state? | `status` + `latestOperation` |
| 5 | Has money execution already occurred? | terminal success / failed-without-refund-id / unknown |
| 6 | Is retry safe? | V1 `no_retry` + in-flight/succeeded rules |
| 7 | Is reconciliation required? | uncertain / stale executing / recovery eligible |
| 8 | Is execution stuck? | stale executing threshold (60s) |
| 9 | Recovery evidence? | refund id, lookup timestamps, failure codes, last op |
| 10 | Can duplicate execution be ruled out? | `prf-prov:{ledgerId}` binding + status |

## Non-goals

- No new telemetry sinks or persistent state
- No Stripe calls / provider activation / money semantics change
- No `providerKind` changes
- Reservation-layer stuck-committing remains a separate panel

## Default posture

Provider gates / execution mode remain OFF. This pack is read-only derivation + admin visibility.
