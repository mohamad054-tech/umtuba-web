# Promotions & Fulfillment Foundation V1

Status: implemented in `umtuba-web` (local; migration not applied remotely)  
Migration: `20260815_store_promotions_fulfillment_foundation_v1.sql`

## Scope

Production-ready promotions and fulfillment foundation for UMTUBA Store:

- **Promotions**: extended coupons (fixed, percent, free shipping), targeting, limits, campaigns metadata
- **Fulfillment**: detailed lifecycle stages + timeline events
- **Shipping providers**: abstraction for DHL, Aramex, FedEx, UPS, local, pickup (no APIs)
- **Tracking**: tracking number, provider, status, ETA, delivery confirmation
- **Admin foundation**: RPCs + server actions for coupon/shipping/fulfillment management

No payment gateway integration. Existing checkout/order flows remain compatible.

## Promotions

Extended `store_coupons` with:

- `free_shipping` discount type (affects shipping fee only; merchandise discount remains 0)
- `promotion_name` / `promotion_description`
- Product/category/region targeting via junction tables
- Extended `checkout_validate_coupon` (targeting + free shipping snapshot)

**Targeting semantics:** empty product/category/region lists mean no restriction on that
dimension. When multiple dimensions are configured, all configured dimensions must pass
(AND). Cart product/category IDs and address region are derived server-side in quote/confirm
RPCs — never client-authoritative.

Domain rules: `lib/store/promotionRules.ts`  
Wrappers: `lib/store/promotionsFulfillment.ts`

## Fulfillment

`order_fulfillments` lifecycle:

`pending → confirmed → preparing → packed → shipped → out_for_delivery → delivered`

Terminal/alternate: `cancelled`, `returned`, `refunded`

- Auto-init on order insert (trigger; idempotent via `ON CONFLICT DO NOTHING`)
- Append-only `order_fulfillment_events` timeline
- `update_order_fulfillment_lifecycle` syncs mapped `orders.status` when allowed (seller/admin only)
- `confirm_order_delivery` syncs fulfillment + order status transactionally (buyer/seller/admin)

Domain rules: `lib/store/fulfillmentRules.ts`

## Shipping providers

Tables:

- `store_shipping_providers`
- `store_shipping_zones`
- `store_shipping_rates`

Abstraction: `lib/store/shippingProviders.ts` (extends checkout shipping models)

## Tracking

`order_shipments` with:

- tracking number (normalized uppercase)
- provider key
- tracking status
- estimated delivery / last update
- delivery confirmation via `confirm_order_delivery`

Domain rules: `lib/store/tracking.ts`

## Security

- Coupon rows remain RPC-only for validation/redemption; legacy 5-arg overload dropped
- Targeting tables revoked from authenticated clients
- Quote/confirm pass server-derived product/category/region arrays into coupon validation
- Free-shipping coupons zero shipping via `disc_snap` in `checkout_compute_shipping_fee`
- Fulfillment/tracking mutations via SECURITY DEFINER RPCs only
- Buyers may confirm delivery only for own orders and eligible shipment states
- `delivery_confirmed_by` derived server-side (client value ignored)
- Store authority derived from order/store membership (never client store_id alone)
- `FORCE RLS` on all new tables; EXECUTE revoked from PUBLIC/anon where required
- Trigger function `init_order_fulfillment_on_order_insert` not callable by clients
- Integer minor units only; no client-authoritative money in promotion paths
- Tracking URLs restricted to http/https; unsafe schemes rejected in app validation

## Admin actions

`app/actions/storePromotionsAdmin.ts` — store owner/manager or platform admin:

- coupon list/upsert
- shipping provider/zone/rate upsert
- fulfillment lifecycle update
- shipment tracking upsert + delivery confirmation

## Still deferred

- Live carrier APIs (DHL/FedEx/UPS/Aramex)
- Promotion UI dashboards
- Automated carrier webhooks
