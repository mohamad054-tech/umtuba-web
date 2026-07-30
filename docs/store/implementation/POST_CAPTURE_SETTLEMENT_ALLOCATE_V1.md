# Commerce Post-Capture Settlement Allocate V1

Capability: `commerce.settlement.post_capture_allocate_v1`
Branch: `office/commerce-post-capture-settlement-allocate-v1`
Migration: **none** (reuses Settlement Foundation `20260824`)

## Lifecycle

1. Trusted Stripe return/webhook verifies session + PaymentIntent.
2. `applyVerifiedStorePaymentOutcome` calls `apply_store_payment_outcome` (Sync).
3. When outcome is **`captured`**, the same service-role path calls
   `apply_store_settlement_event` with action **`allocate`**.
4. Amount/currency/correlation come from the trusted capture inputs
   (attempt/order-derived; correlation must match capture event).
5. Allocate `event_key` = `${captureEventKey}:allocate` (Revenue Bridge pattern).

## Idempotency

- Sync replay: DB event_key replay.
- Allocate replay: same allocate event_key â†’ Settlement Foundation replay payload.
- Failed/cancelled Sync outcomes never allocate.
- Allocate failure is reported as `settlement.status = "failed"` (never `"allocated"`).

## Out of scope

release, bank payouts, payout UI, commissions, refunds, chargebacks,
entitlement/download library, physical fulfillment/shipping/warehouse/carriers/returns,
settlement admin dashboard, Learning/AI/Home/Creator/Navigation.
