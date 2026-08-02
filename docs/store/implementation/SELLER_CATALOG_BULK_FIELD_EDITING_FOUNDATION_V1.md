# Seller Catalog Bulk Field Editing Foundation V1

Capability: `commerce.seller.catalog_bulk_field_editing_v1`
Branch: `office/seller-catalog-bulk-field-editing-v1`
Base: `64f2a004d27a37461aec67ecef8293419bfe3fd8` (`origin/office/seller-catalog-bulk-operations-v1`)

## Repository audit

| Area | Finding |
| --- | --- |
| Bulk operations | Submit/archive only; selection model reusable |
| Product field writes | `updateDraftProduct` for draft/in_review/rejected |
| Category | `primary_category_id` + `product_category_links`; eligibility via `assertPrimaryCategoryEligibleForReview` |
| Tags | **Not present** on `store_products` — deferred (no migration) |
| Visibility | Public discovery = `active` + approved moderation; no seller hide field — deferred |
| Price/stock | Variant inventory/price services exist but are sensitive — deferred / forbidden |
| Marketplace eligibility | Separate service; not storefront visibility — deferred this V1 |

## Supported fields

| Field | Operations | Service |
| --- | --- | --- |
| `category` | Replace, Clear | `updateDraftProduct` (`categoryId` / `clearPrimaryCategory`) |
| `short_description` | Replace, Clear | `updateDraftProduct` |

## Deferred fields

- Tags (no schema)
- Visibility / discoverability
- Price (no safe bulk currency/active-price path chosen)
- Status mass-assign (use submit/archive bulk ops)
- Stock / reserved quantity
- Marketplace eligibility toggle
- Shipping, commission, settlement, refund, entitlement

## Operation modes

- Category: Replace / Clear only (no Add/Remove)
- Short description: Replace / Clear only
- Unsupported field+operation combinations fail closed

## Preview contract

UI requires **Preview** before **Confirm**. Preview includes:

- Selected count
- Field + operation
- Value preview
- Eligible / skipped counts
- Warnings
- Expected impact sentence

## Validation

Server action (`bulkEditProductFieldsAction`):

- Auth + catalog membership (`getOwnedOrMemberStore` + `canManageCatalog`)
- Field allowlist fail-closed
- Operation allowlist fail-closed
- Batch size ≤ **100**
- Deduped product IDs
- Batch read scoped to membership `store_id`
- Stale/cross-store IDs skipped with reason
- Editable statuses only (`canSellerEditProductFields`)
- Category UUID + active existence check
- Short description non-empty (replace) and ≤ 280 chars

## Execution and partial success

- Per-product `updateDraftProduct` with concurrency cap **5**
- No new RPC / migration
- Summary: success / failed / skipped + overall `success` | `partial` | `failed` | `skipped_only` | `empty`
- Never presents full success when any item failed

## Idempotency

Same target value → skipped no-op (no unnecessary write). Clear on already-empty → no-op.

## Security

- Store id from membership only
- Product IDs revalidated server-side against store
- No client privileged writes
- No mass-assignment beyond allowlisted field payloads
- Invalid field/value fail-closed

## Performance / batch limit

- Default max **100** selected products (hard reject above)
- One batch product load (`in` + `eq store_id`)
- Writes capped at concurrency 5
- No full-catalog load

## UI behavior

On `/seller/store/products` toolbar:

- **Bulk Edit** → field / operation / value → Preview → Confirm
- Deferred fields appear disabled with reason
- Existing submit/archive bulk ops unchanged

## Test evidence

`lib/store/sellerCatalogBulkFieldEditing.test.ts` covers allowlist, unsupported rejection, category replace/clear, short description replace/clear, no-ops, duplicates, cross-store, max batch, preview/partial summary, selection regression helpers, invalid category.

Regressions: existing bulk operations + pagination/search/data-access/wiring/experience suites.

## Related

List display and shared short-description validation continue in
`SELLER_CATALOG_CATEGORY_SHORT_DESCRIPTION_FOUNDATION_V1.md`.

## Out of scope (deferred)

Bulk inventory/price/shipping/commission, publish/unpublish/restore, tags schema, migrations/RPCs, CSV, scheduled jobs, undo, media bulk upload.
