# Supplier Listing Create Hardening V1

Capability: `commerce.marketplace.supplier_listing_create_hardening_v1`  
Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260886_store_supplier_listing_create_hardening_v1.sql`

Depends on: Marketplace Supplier→Seller Foundation (`store_seller_listings`, `add_store_seller_listing`), Category Taxonomy Seed, Inventory Availability Foundation, Digital Publish Readiness, Commission Policy (orthogonal), Settlement (orthogonal)

## Purpose

Harden **supplier listing creation** so real suppliers/sellers can safely prepare products for marketplace publication — trusted ownership, readiness, category, inventory model, and deterministic listing state — without inventing a duplicate listing system.

## Behavior

| Gate | Rule |
| --- | --- |
| Authorization | **Owner/manager only** (catalog_editor denied) |
| Ownership | Product `store_id` must equal supplier; seller ≠ supplier |
| Category | Source `primary_category_id` required + active taxonomy row; stamped onto listing |
| Price | Trusted active `product_prices` required |
| Inventory | Finite types (`physical`/`booking`) require consistent `product_inventory`; unlimited types skip finite math; out-of-stock does **not** block create |
| Digital readiness | Digital products require active owned deliverable (path ownership checked) |
| Duplicate active | Reject — no silent idempotent reuse of an already-active listing |
| Reactivate | Non-active existing row may be reactivated after full validation |
| Insert path | **RPC-only** — authenticated direct INSERT revoked |

## TS SSOT

`lib/store/supplierListingCreateHardening.ts`

- `evaluateSupplierListingCreate`
- `canCreateSupplierListing`
- `rejectClientListingCreateFields`
- `supplierListingCreateCompatibility`

Wired through `addSupplierProductToMyStore` + `addToMyStoreAction` before `add_store_seller_listing`.

## Reuse (no duplication)

- Existing `store_seller_listings` + RPC
- `evaluateMarketplaceEligibility`
- `assertPrimaryCategoryEligibleForReview`
- `resolveTrustedInventoryAvailability`
- Digital publish readiness
- Commission / settlement remain **unavailable** at create (`settlementDecomposition: "unavailable"`)

## Out of scope

Dashboard, Admin UI, AI, redesign, shipping, inventing commission splits, remote migration apply.
