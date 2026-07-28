# Session Handoff — UMTUBA

**Updated:** 2026-07-28

## Commerce program status

Consolidation complete. Implementation track active.

### Completed implementation

1. Storefront foundation
2. Cart & Checkout
3. Buyer Orders
4. Seller Orders Operations
5. Seller Catalog & Product Management
6. Seller Inventory & Reservation Visibility
7. Seller Dashboard & Operational Insights
8. Trading Domain Alignment & Integrity V1
9. Revenue Ledger Bridge Foundation V1
10. Marketplace Supplier→Seller Foundation V1
11. Marketplace Eligibility & Listing Storefront Resolution V1 (current) — `office/commerce-marketplace-eligibility-listing-storefront-v1`

## Marketplace relationship

Supplier-owned `store_products` ← `store_seller_listings` → seller storefront.
Eligibility: store `marketplace_supplier_enabled` ≠ product `marketplace_eligible` ≠ listing status.
PDP rule: owned product first, then active supplier listing (`LISTING_PDP_RESOLUTION_RULE`).
Price: canonical `product_prices` only (Outcome B). Inventory stays on supplier variants.
Cart stamps seller `store_id` + `seller_listing_id` for listing-backed lines.

## Frozen architecture

Do not modify `docs/commerce/**` frozen foundations / Physical SAs / Manifesto.

## Next

Remote-apply `20260869`/`20260870` when authorized; commission only when trusted policy exists.
