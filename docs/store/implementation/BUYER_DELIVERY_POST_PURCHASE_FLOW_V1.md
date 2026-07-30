# Commerce Buyer Delivery & Post-Purchase Flow V1

Capability: `commerce.digital.buyer_delivery_post_purchase_flow_v1`  
Branch: `office/commerce-buyer-delivery-post-purchase-flow-v1`  
Migration: none

## Scope

UX/orchestration only — reuses existing entitlement list, availability probe,
and mint action. Does not rebuild Delivery / Entitlement / Upload.

## Surfaces

1. Orders list shows fail-closed digital access cue when an active entitlement exists
2. `/store/orders/digital-access` library across all purchases
3. Checkout success CTA when entitlements exist for recorded orders
4. Digital-aware buyer status chips (Access vs shipping metaphors)
5. Updated buyer copy (no deferred-payment-only framing on orders)

## Out of scope

New mint paths, tables, RPCs, CDN, payouts, refunds, physical redesign,
Learning/AI/Home/Creator/Navigation.
