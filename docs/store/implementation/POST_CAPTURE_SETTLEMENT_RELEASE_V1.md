# Commerce Post-Capture Settlement Release V1

Capability: `commerce.settlement.post_capture_release_v1`  
Branch: `office/commerce-post-capture-settlement-release-v1`  
Migration: none (reuses Settlement Foundation `apply_store_settlement_event`)

## Lifecycle

1. Trusted Stripe return/webhook verifies session + PaymentIntent.
2. Sync applies `captured` via `apply_store_payment_outcome`.
3. Settlement allocate runs (Post-Capture Allocate V1).
4. Digital entitlement grant / fulfillment runs (Entitlement Grant V1).
5. `apply_store_settlement_event(release)` moves store escrow → store payable when allocate and entitlement both succeeded.

## Idempotency

- Release `event_key` = `${captureEventKey}:release`
- Settlement Foundation replays identical keys
- Non-captured outcomes never release
- Allocate failure or entitlement failure skips release
- Release failure returns `release.status=failed` (never falsely `released`)

## Out of scope

bank payouts, payout UI, commissions redesign, refunds/chargebacks,
`reverse_allocation`, download CDN, physical shipping/warehouse/carriers/returns,
Learning/AI/Home/Creator/Navigation.
