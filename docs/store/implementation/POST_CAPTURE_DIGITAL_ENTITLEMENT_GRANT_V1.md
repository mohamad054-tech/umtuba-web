# Commerce Post-Capture Digital Entitlement Grant V1

Capability: `commerce.digital.post_capture_entitlement_grant_v1`
Branch: `office/commerce-post-capture-digital-entitlement-grant-v1`
Migration (local only): `20260877_store_digital_entitlement_grant_v1.sql`

## Lifecycle

1. Trusted Stripe return/webhook verifies session + PaymentIntent.
2. Sync applies `captured` via `apply_store_payment_outcome`.
3. Settlement allocate runs (existing Post-Capture Allocate V1).
4. `grant_store_digital_entitlements_after_capture` grants one entitlement per digital order line, consumes active/pending_capture reservations, and marks `fulfillment_status=fulfilled` when allowed.
5. Buyer order detail lists active entitlements via `list_my_store_digital_entitlements`.

## Idempotency

- Grant `event_key` = `${captureEventKey}:entitlement`
- Grant-events table replays identical keys
- Unique entitlement per `order_item_id`
- Non-captured outcomes never grant

## Out of scope

release, payouts, refunds, download CDN, physical shipping/warehouse/carriers/returns,
Learning/AI/Home/Creator/Navigation.
