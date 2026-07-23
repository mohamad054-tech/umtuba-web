# Ads Production Serving Foundation V1

## Purpose

Define fail-closed **production-serving readiness contracts** after canonical
production-authority hardening:

- authoritative serving lifecycle stages
- ordered state transitions
- correlation / provenance continuity
- idempotency for delivery, measurement, and billing handoffs
- deterministic rejection reasons and structured diagnostics
- environment / kill-switch gates

This is **not** live serving. Production delivery and production billing remain
disabled.

## Authority

Sole authoritative public decision entrypoint:

`runAdsCanonicalStackV1`

Serving foundation helpers are contracts and validators only. They must not
create a second pipeline or alternate authoritative decision path.

Deep imports of `lib/ads/platform/servingFoundation` cannot manufacture
`productionAccepted: true` or `authoritativeProductionServing: true`.

## Lifecycle order

1. `request_intake`
2. `eligibility`
3. `candidate_selection`
4. `ranking`
5. `auction`
6. `fraud_ivt_decision`
7. `render_eligibility`
8. `delivery_attempt`
9. `measurement_handoff`
10. `billing_handoff`

Invalid stage ordering / skipping is rejected (`invalid_stage_order`).

## Kill switches (always closed in V1)

- `productionDeliveryEnabled: false`
- `productionBillingEnabled: false`
- `productionAccepted: false`
- diagnostics may run (`diagnosticsEnabled: true`)

## Idempotency

Fail-closed claim contracts:

- `delivery_attempt`
- `measurement_event`
- `billing_handoff`

Duplicates never become authoritative or billable. Billing handoff requires
accepted delivery **and** accepted measurement.

## Implementation

- Contracts: `lib/ads/platform/servingFoundation.ts`
- Wired into: `lib/ads/platform/canonicalStack.ts` (`servingLifecycle` on result)
- Public export: platform barrel (contracts only; no alternate `run*` authority)
