# Seller Catalog Data Access Foundation V1

Capability: `commerce.seller.catalog_data_access_v1`
Branch: `office/seller-catalog-data-access-v1`
Base: `58f3d1d9fc5a4fe9de23a3e105c7edcb471ee218` (`origin/office/seller-catalog-search-filtering-v1`)

## Baseline problem

`/seller/store/products` loaded the **full** store catalog via `listSellerProducts` (no limit), then batched health + SKU tokens for **all** products, then filtered/sorted **in the browser**. That does not scale to thousands of SKUs and couples enrichment cost to catalog size.

## Request / result contracts

- `SellerCatalogPageRequest` — `storeId`, `limit`, `cursor`, `search`, `status`, `productType`, `sort`, optional `health`
- `SellerCatalogPageResult` — `items`, `nextCursor`, `hasMore`, `pageSize`, `applied`, query stats; **no invented `totalCount`**

Page size: default **25**, min **1**, max **100**.

## Cursor design

Opaque base64url JSON `{ v:1, s:<sort>, k:<key>, i:<productId> }`.

- Tie-breaker always includes product `id`
- Cursor sort must match request sort (mismatch → fail-closed)
- Invalid/malformed cursor → fail-closed
- Keyset pagination (`pageSize + 1`) for `hasMore`

## Supported server-side search

- title / slug (`ilike`, escaped)
- product id (exact UUID or partial id string via `ilike` on id cast when safe)
- SKU / barcode via **one** batched `product_variants` query → intersect with store-owned product IDs
- Empty search = no search filter
- Max search length enforced

## Supported filters

| Filter | Server page query | Notes |
| --- | --- | --- |
| store ownership | always `store_id` | from membership, never URL |
| status draft/published/pending_review/rejected | yes | column filters |
| product type | yes | digital/physical/other |
| ready / needs_attention / health gaps | **page-local only** | after page facts; not catalog-wide |

## Supported sorting

Newest · Oldest · Last Updated · Name A–Z · Name Z–A — each with `(sortKey, id)` tie-breaker.
No Most Viewed / Best Selling.

## Page-only facts flow

1. Fetch one catalog page (store-scoped).
2. Batch health facts + variant tokens for **page product IDs only**.
3. Build search items; optionally apply health filter on this page with `healthFilterScope: "page_only"`.

## Security boundary

Auth → owned/member store → `storeId` from membership. Cursor cannot change store. Variant matches intersect owned IDs. Invalid inputs fail-closed.

## Query-count expectations

Per page (typical): 1 products keyset (+ optional 1 variants search) + health batch wave (media/variants/prices/assets as needed) scoped to page IDs. Does **not** grow with total catalog size.

## Limitations / Deferred Phase 2

- Global health / ready / needs-attention pagination across full catalog (needs indexed readiness facts or RPC/view)
- FTS / trigram indexes
- Exact total counts
- Previous-page cursor stack UI
- Advanced pagination chrome
- Migrations / new RPCs
