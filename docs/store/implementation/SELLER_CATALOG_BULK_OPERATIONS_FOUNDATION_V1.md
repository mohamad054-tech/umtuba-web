# Seller Catalog Bulk Operations Foundation V1

Capability: `commerce.seller.catalog_bulk_operations_v1`
Branch: `office/seller-catalog-bulk-operations-v1`
Base: `f10cb08b6b9f413a5c16c87bb7493f33d9112e4e` (`origin/office/seller-catalog-pagination-experience-v1`)

## Bulk model

Multi-select over the seller products workspace with:

- Per-row checkbox
- Select all **current page only**
- Clear selection
- Selection map keyed by product id (survives search/filter/sort/pagination navigation)
- Store-scope gate on every toggle

Supported operations (existing services only):

| Operation | Status |
| --- | --- |
| Submit for review | Supported via `submitProductForReview` |
| Archive | Supported via `archiveProduct` |
| Publish | Disabled / deferred — sellers cannot self-publish |
| Unpublish | Disabled / deferred — no seller hide service |
| Restore | Disabled / deferred — no un-archive service |

## Validation

`planSellerCatalogBulkOperation`:

- Rejects cross-store rows
- Skips ineligible statuses with reasons
- Confirmation shows eligible count, skipped list, warnings
- Server still re-checks ownership/permissions per product

## Results

Partial success allowed. Summary reports:

- Success / Failed / Skipped counts
- Overall: `success` | `partial` | `failed` | `skipped_only` | `empty`
- Never claims full success when any item failed or was skipped after intent

## Security

- `storeId` from membership props, not URL
- Selection ignores foreign `storeId`
- Bulk actions use authenticated server actions + existing catalog managers checks
- Client cannot invent publish/restore paths

## UI

Toolbar + confirmation panel + result summary on `/seller/store/products`. No dashboard redesign.

## Deferred

Seller self-publish, unpublish/hide, restore-from-archive, true cross-page select-all-all-results.

Bulk field editing is covered by `SELLER_CATALOG_BULK_FIELD_EDITING_FOUNDATION_V1.md`.
