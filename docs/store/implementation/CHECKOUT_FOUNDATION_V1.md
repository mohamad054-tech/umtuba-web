# Checkout Foundation V1

Status: implemented in `umtuba-web` (local; not applied remotely by default)  
Migration: `supabase/migrations/20260812_store_checkout_foundation_v1.sql`

## Scope

Production-ready checkout foundation **without payment gateways**:

- Saved buyer addresses
- Authoritative cart validation → checkout quote → order confirm
- Provider-neutral shipping methods + tax configs + coupons
- Immutable order checkout snapshots
- Buyer UI at `/store/checkout`

**Deferred:** Stripe/PayPal/HyperPay/MyFatoorah/Tap, inventory reservation
lifecycle, carrier APIs, legal tax compliance engines, authenticated
order-status mutation RPCs.

## Trust boundaries

| Input | Trusted? |
| --- | --- |
| Buyer address / shipping method code / coupon code | Identity only — validated server-side |
| Prices, titles, SKUs, snapshots, totals | **Never** from client |
| Buyer id | `auth.uid()` inside SECURITY DEFINER RPCs |
| Order create | `confirm_store_checkout_quote` calls owner-only `create_store_order_foundation_core` directly (no GUC). Public `create_store_order_foundation` remains `service_role`-only. |

## Multi-store behavior

Cart items are **grouped by `store_id`**. Each store becomes one order
(Orders Foundation constraint).

`confirm_store_checkout_quote` is **atomic across all stores** in the quote:

- All store orders are created in one database transaction
- Live catalog/shipping/tax/coupon totals are recalculated and must match the quote
- Coupon redemptions + cart conversion happen in the same transaction
- On any failure, nothing is committed (no partial silent corruption)

## Architecture

1. `create_store_checkout_quote` — validates cart/catalog/inventory, computes
   shipping/tax/discount per store, stores quote (`expires_at` = now+15m)
2. `confirm_store_checkout_quote` — ownership + expiry checks, live recalculation,
   creates orders via core, attaches set-once snapshots, records discounts/redemptions,
   converts cart

Helpers (`checkout_normalize_address`, shipping/tax/coupon) are SECURITY DEFINER
with `EXECUTE` revoked from `PUBLIC`/`anon`/`authenticated` (service_role + owner
siblings only).

### Shipping

`store_shipping_methods` with fee, optional free-above threshold, estimate text.
If a store has no methods, default `standard` fee `0` is used. Invalid method
codes are rejected.

### Tax

`store_tax_configs` with `rate_bps` and `inclusive` flag. Integer minor-unit
math only. Snapshots include `not_legal_advice: true`.

### Coupons

`store_coupons` + `store_coupon_redemptions`. Validation locks coupon rows,
enforces date/usage/min-subtotal/currency caps. At most **one redemption per
checkout quote** (first eligible store). Table is not readable/writable by
authenticated clients (RPC only).

## Application

| Path | Role |
| --- | --- |
| `/store/checkout` | Buyer checkout UI (auth protected) |
| `lib/store/checkoutRules.ts` | Pure helpers |
| `lib/store/checkout.ts` | Supabase orchestration |
| `app/actions/storeCheckout.ts` | Server actions |

## Idempotency

Quotes require an idempotency key (unique). Only **open, non-expired** quotes
are reusable under the same key; expired/confirmed keys cannot mint a new open
quote. Confirm is idempotent for already `confirmed` quotes. Per-store order
keys derive from quote id + store id.
