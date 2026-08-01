# Seller Experience Foundation V1

Capability: `commerce.seller.experience_foundation_v1`
Branch: `office/seller-experience-foundation-v1`
Base: `d2b961f63ffd201be62301cfd81ef6d3b342f836` (`origin/office/commerce-physical-foundation-v1`)

## Scope

Pure TypeScript seller experience layer over existing catalog / order / analytics reads:

1. Seller dashboard summary
2. Product health codes
3. Action center cards
4. Analytics foundation (lightweight)
5. Store readiness checklist + percent

No migrations. No Physical/Inventory/Variants/Shipping/Refund/Entitlement/Commission/Settlement/Stripe changes.

## Module

`lib/store/sellerExperienceFoundation.ts`

Wired lightly into:

- `app/seller/store/page.tsx`
- `app/components/store/SellerDashboardInsights.tsx`

## Product health codes

`complete | missing_images | missing_description | missing_pricing | missing_inventory | pending_review | rejected | published | draft`

Optional media/price/inventory facts are omitted when unknown (fail-open); explicit `false` flags the gap.

## Analytics foundation

Views may be null until telemetry exists. Conversion = orders / storeViews when both known. Top products reuse existing analytics rows.

## Store readiness

Weighted checklist (active, verified, published product, complete listing, no rejected). `readyToSell` requires catalog-ready base + ≥85% + no rejected products.

## Deferred

Traffic telemetry, deep analytics warehouse, inventory mutation UX, payout/settlement redesign, physical launch enablement.
