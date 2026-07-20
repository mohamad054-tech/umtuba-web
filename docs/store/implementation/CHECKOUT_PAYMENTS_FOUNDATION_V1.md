# Checkout & Payments Foundation V1

Status: implemented in `umtuba-web` (local; migration not applied remotely)  
Migrations:
- `20260812_store_checkout_foundation_v1.sql` (addresses, shipping, tax, coupons, quotes)
- `20260814_store_checkout_payments_foundation_v1.sql` (payment attempts + shipping classification)

## Scope

Extends the existing Checkout Foundation with:

- Canonical **pricing engine** (`lib/store/pricing.ts`) shared by cart/checkout/payments
- **Shipping architecture** types for local / international / pickup / future carriers
- **Payment abstraction** interfaces for Stripe, PayPal, Apple Pay, Google Pay,
  HyperPay, PayTabs, Tap, Paymob, COD, bank transfer
- `payment_attempts` table + deferred attempt RPC (no live charges)
- Checkout UI payment placeholder + richer order summary

**Still deferred:** live gateway SDKs, card capture, wallet sessions, carrier APIs.

## Pricing engine

`computeStorePricingBreakdown` is the single source of truth for:

- subtotal
- discount
- taxable base
- tax (inclusive / exclusive, integer bps)
- shipping (including free-above threshold)
- grand total

Checkout Rules re-export the same math so existing call sites stay stable.

## Shipping

`store_shipping_methods` gains `service_type` and `provider_key` (default
`standard` / `manual`). App models in `lib/store/shipping.ts` quote fees without
calling external APIs.

## Payments

| Piece | Role |
| --- | --- |
| `PaymentProviderAdapter` | Future gateway contract |
| `DeferredPaymentAdapter` | Local no-op until providers ship |
| `payment_attempts` | Append-only attempt ledger (buyer/seller readable via RLS) |
| `create_deferred_payment_attempt` | SECURITY DEFINER; amount from order row |

After quote confirm, the server action best-effort records one deferred attempt
per created order. Failures do not roll back the order; the response surfaces
`payment_recording_incomplete` + per-order failures. Buyers can retry via
`ensureDeferredPaymentAttemptAction` (amount still from the order row).

## Security

- No client money fields trusted for quote, confirm, or recovery paths
- Authenticated cannot INSERT/UPDATE/DELETE `payment_attempts`
- RPC requires `auth.uid()` = order buyer; `FOR UPDATE` on order
- Idempotency reuse requires matching `order_id` + `buyer_id`
- Unique deferred attempt per order (`payment_attempts_order_deferred_uidx`)
- Concurrent inserts handled via `unique_violation` recovery
- EXECUTE revoked from PUBLIC/anon on deferred payment RPC
- Shipping/payment adapters fail closed on invalid currency/provider
- Metadata must not store PANs/CVVs/secrets
- UI copy must not imply live charging

## UI

`/store/checkout` sections: cart/shipping methods, shipping address, deferred
payment placeholder (no live charge), coupon, sticky order summary, calculate
quote + place order. Double-submit guarded; loading/error/success use
`aria-live`. Success screen can retry missing deferred payment attempts.
