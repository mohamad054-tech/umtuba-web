# Session Handoff — UMTUBA

**Updated:** 2026-07-28

## Commerce program status

Consolidation complete. Implementation track active. **Commerce End-to-End Beta Readiness V1 complete — Ready for Beta (90% implemented scope).**

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
11. Marketplace Eligibility & Listing Storefront Resolution V1 — `office/commerce-marketplace-eligibility-listing-storefront-v1`
12. End-to-End Beta Readiness V1 — `office/commerce-end-to-end-beta-readiness-v1` (stabilization; no new domains)

## Marketplace relationship

Supplier-owned `store_products` ← `store_seller_listings` → seller storefront.
Eligibility: store `marketplace_supplier_enabled` ≠ product `marketplace_eligible` ≠ listing status.
PDP rule: owned product first, then active supplier listing (`LISTING_PDP_RESOLUTION_RULE`).
Price: canonical `product_prices` only (Outcome B). Inventory stays on supplier variants.
Cart stamps seller `store_id` + `seller_listing_id` for listing-backed lines.

## Beta residual

- Wishlist / id-PDP may lose listing provenance
- Payment provider / shipping method coverage / warehouse / payouts deferred by design

## Frozen architecture

Do not modify `docs/commerce/**` frozen foundations / Physical SAs / Manifesto.

## Next

Stop major Commerce features. Optional follow-up: wishlist listing provenance only if required before public beta traffic. Do not start Shipping Network / Payment Provider / Warehouse Runtime without an explicit new task.
