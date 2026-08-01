# Seller Catalog Search & Filtering Foundation V1

Capability: `commerce.seller.catalog_search_filtering_v1`
Branch: `office/seller-catalog-search-filtering-v1`
Base: `2463192fa891253ad13b8dc67b7b5ddc7674c4f2` (`origin/office/seller-catalog-performance-batching-v1`)

## Goal

Make the seller products workspace operable at hundreds/thousands of SKUs via search, status/health/type filters, and honest sorting — without new full-text search, migrations, or invented analytics.

## Search

In-memory, case-insensitive, partial match against:

- title
- product id
- slug / short description (existing convenience fields)
- variant SKU (when present)
- variant barcode (when present)

No new Postgres FTS / RPC.

## Filters

**Status:** All · Draft · Published · Pending Review · Rejected · Ready · Needs Attention

- Ready / Needs Attention reuse existing health codes (`ready_to_publish` / `complete` vs gap + `rejected` codes).
- Does not invent a new health engine.

**Health:** Missing Images / Description / Price / Inventory / Digital Asset / Physical Metadata

**Type:** Digital · Physical · Other (future-compatible catch-all)

## Sorting

Newest · Oldest · Last Updated · Name A–Z · Name Z–A

Most Viewed / Best Selling are **not** offered — no trusted view/sales fields on this surface.

## Query behavior

1. Server loads store-scoped products (`listSellerProducts` + `store_id`).
2. Parallel: inventory rows (for health inventory presence) + then batched health facts + batched variant SKU/barcode tokens.
3. Client filters/sorts in memory — **no per-filter DB round-trip**, **no N+1**.
4. Health batching from Performance Batching V1 remains O(1) vs product count (chunked).

## Security

- Products queried with store membership auth + `store_id`.
- Filter layer drops any item whose `storeId !==` active store.
- Variant token index ignores product IDs outside the owned catalog set.
- Client filters cannot expand the server-scoped product set.

## UI

`/seller/store/products` — search bar, status/health/type chips, sort select. No full page redesign.

## Deferred

Server-side pagination redesign, FTS, persistent cache, Most Viewed/Best Selling, UI redesign, shipping/payment changes.
