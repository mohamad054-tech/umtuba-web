# Commerce Transactional Notifications V1

Capability: `commerce.notifications.transactional_v1`  
Module: `lib/store/commerceNotifications/`  
Migration (local only): `20260887_store_commerce_transactional_notifications_v1.sql`  
Admin: `/admin/store/notifications`

## Audit summary

- Reuses platform `notifications` + `create_notification` foundation.
- Commerce previously had zero notification wiring.
- V1 emits intents after trusted commerce successes; external channels disabled.

## Guarantees

- In-app only (optional durable insert via `create_store_commerce_notification`, service_role).
- Event + intent idempotency / dedupe.
- Safe metadata redaction; allow-listed deep links.
- No email/SMS/push/network providers, no Stripe/commission/payout changes.

## Wired hooks

- Checkout confirm → `order_created`
- Payment outcome apply → `payment_captured` / `payment_failed` (+ `digital_access_granted`)
- Seller order status → shipped/delivered/cancelled/confirmed
- Admin product/seller moderation
- Full-order refund completion
- Inventory signals via explicit helper (presentation signals exist; no auto cron)
