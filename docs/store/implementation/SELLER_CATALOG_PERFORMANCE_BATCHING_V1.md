# Seller Catalog Performance & Query Batching V1

Capability: `commerce.seller.catalog_performance_batching_v1`
Branch: `office/seller-catalog-performance-batching-v1`
Base: `0f20502a8298d91e591c3e9bebeed515c3d137cf` (`origin/office/seller-catalog-wiring-v1`)

## Baseline (pre-change)

### Seller dashboard page (`app/seller/store/page.tsx`)

First wave `Promise.all` (store-scoped, not per-product):

1. `listSellerProducts`
2. `listSellerOrders`
3. `listSellerInventoryRows` (already product-batched internally)
4. `listSellerStoreReservations`
5. fulfillment counts
6. analytics bundle (optional)
7. listings + supplier refs

Later: revenue bridge, payout reads, then **`loadSellerCatalogHealthFacts`**.

### Catalog health loader (old pattern in wiring tip)

| Step | Table | Pattern | Count |
| --- | --- | --- | --- |
| 1a | `product_media` | `.in(product_id)` + active | 1 |
| 1b | `product_variants` | `.in(product_id)` | 1 (parallel with 1a) |
| 2 | `product_prices` | `.in(variant_id)` + active | 0–1 sequential |
| 3 | `store_digital_product_assets` | store_id + `.in(product_id)` | 0–1 sequential |
| Inventory | (reuse page rows) | in-memory map | 0 |

**Approximate health-loader queries:** 2–4, already **O(1) vs product count** (not classic N+1).

### Gaps found

1. **Silent success on query error** — destructures `{ data }` only; failed batches look like “no media/price” omit-or-empty and can under-flag gaps inconsistently; omit = fail-open in health derivation.
2. **Digital assets sequential after prices** — can run in wave 1 with media/variants.
3. **No product ID dedupe** — duplicate IDs inflate `.in()` lists.
4. **No empty-guard beyond digital/prices** — zero products early-returns (good).
5. **No chunking** — large catalogs may hit URL/gateway limits.
6. **Media / variants / prices not store-filtered** — relies on page product list; must reject products whose `store_id !== input.storeId`.
7. **No call-count evidence** in tests.

### Required tables (unchanged)

`product_media`, `product_variants`, `product_prices`, `store_digital_product_assets`; inventory facts from already-loaded seller inventory rows; physical metadata from product columns.

## New batch pattern

1. Dedupe product IDs; drop products not owned by `storeId` (fail-closed).
2. Chunk IDs (size 100) only when needed.
3. **Wave A (parallel):** media batches + variant batches + digital-asset batches (digital IDs only).
4. **Wave B (parallel):** price batches for collected variant IDs.
5. Map facts for **every input product** (missing relations → explicit `false` flags, not omitted).
6. On batch **error**: fail-closed — set affected presence flags to `false` (not ready); do not invent data; do not cross-store merge.

### Expected query count (health loader)

| Catalog size | Waves | Typical calls |
| --- | --- | --- |
| 0 products | — | **0** |
| 1–100 products | A+B | **3–4** (media, variants, digital if any, prices if any variants) |
| 101–200 products | A+B with chunks | **6–8** (2 chunks × media/variants + digital/prices as needed) |

1 product and 100 products use the **same** call count when no chunking is required.

## Error / fail-closed semantics

- Query error ⇒ presence flags for that concern = `false` (missing), so Product Health cannot mark complete/ready from unknown success.
- Empty related rows ⇒ `false` (same as wiring contract).
- Wrong-store product rows in input ⇒ excluded from ID queries; facts still returned with fail-closed flags for that product.
- No silent “ready” when required batch failed.

## Security boundary

- Input products filtered to `product.store_id === storeId`.
- Digital assets query always `.eq("store_id", storeId)`.
- No client-supplied stock/money; server page auth unchanged.
- No persistent cache; no cross-seller memoization.

## Performance evidence

Instrumented `loadSellerCatalogHealthFactsDetailed` exposes `queryCount`. Tests assert:

- 0 products → 0 queries
- 1 vs 100 products → same call count (4 with digital + prices, no chunking)
- 101 products @ chunk 100 → call count scales by chunks only (6 for physical-only)
- duplicate IDs deduped; wrong-store rows ignored for queries / fail-closed in facts
- batch failure → fail-closed presence flags (not Product Ready)
- mixed digital/physical health facts unchanged vs wiring contract

## Deferred

Persistent cache, Redis, materialized views, new RPCs/migrations, UI redesign, pagination overhaul, analytics telemetry, shipping/payment changes.
