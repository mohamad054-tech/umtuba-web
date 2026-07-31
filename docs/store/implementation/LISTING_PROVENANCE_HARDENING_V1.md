# Marketplace Listing Provenance Hardening V1

Branch: `office/commerce-marketplace-listing-provenance-hardening-v1`  
Base: `office/commerce-end-to-end-beta-readiness-v1` @ `6cbe0f6`  
Migration: `20260875_store_marketplace_listing_provenance_hardening_v1.sql` (local only)

## Provenance-loss path (before fix)

1. Buyer opens **seller storefront PDP** for a marketplace listing (`sellerListingId` present).
2. **WishlistButton** saves only `product_id` — listing id discarded.
3. **listWishlist** joins the product owner store and `enrichPublicCatalogRow` forces `sellerListingId: null`, `marketplaceSourceType: "owned"`.
4. **ProductCard** links to `/store/{ownerSlug}/product/{slug}` (supplier store).
5. PDP resolves the **owned** path → add-to-cart without listing → cart `store_id` = supplier, `seller_listing_id` = null.
6. Checkout never sees marketplace provenance (cross-store listing recovery never runs).

Parallel loss: **id-based PDP** (`/store/products/{uuid}` via `getPublicProductById`) always redirects to the **owner** store, ignoring any listing context.

## Healthy path (unchanged)

Seller storefront catalog/PDP already stamps `sellerListingId` → add-to-cart → cart reload → checkout quote/confirm.

## Fix (this milestone)

- Persist optional `store_wishlist_items.seller_listing_id`.
- Wishlist write/read stamps and re-enriches listing provenance fail-closed.
- Id-based PDP accepts `?listing=<uuid>` and resolves seller storefront via listing eligibility RPC; invalid/ambiguous listing fails closed (no silent owned fallback when listing was requested).
- UI passes `sellerListingId` from ProductCard / PDP wishlist and cart already carried listing id.

## Out of scope

Payment providers, shipping carriers, commission, affiliate, supplier portal, AI.

Listing **create** hardening (auth, category, inventory model, duplicate active) is documented in `SUPPLIER_LISTING_CREATE_HARDENING_V1.md` (`commerce.marketplace.supplier_listing_create_hardening_v1`).
