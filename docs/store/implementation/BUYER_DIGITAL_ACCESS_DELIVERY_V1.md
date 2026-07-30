# Commerce Buyer Digital Access Delivery V1

Capability: `commerce.digital.buyer_access_delivery_v1`  
Branch: `office/commerce-buyer-digital-access-delivery-v1`  
Migration (local only): `20260878_store_digital_access_delivery_v1.sql`

## Lifecycle

1. Buyer order detail lists active entitlements with delivery availability.
2. Buyer requests access with entitlement id only.
3. Server reloads entitlement under the authenticated buyer session (RLS).
4. Service-role verifies digital product + owned digital asset path.
5. Service-role mints a short-lived signed URL (15 minutes) from `store-product-media`.
6. Client receives signed URL only — never storage path, bucket internals, or secrets.

## Security

- Entitlement ownership + `active` required on every mint
- Physical products rejected
- Path must match `stores/{storeId}/products/{productId}/digital/{uuid}.{ext}`
- No permanent/public URL
- Delivery does not mutate entitlement, payment, or settlement

## Out of scope

CDN/library product, seller upload studio redesign, payouts, refunds,
physical shipping/warehouse/carriers/returns, Learning/AI/Home/Creator/Navigation.
