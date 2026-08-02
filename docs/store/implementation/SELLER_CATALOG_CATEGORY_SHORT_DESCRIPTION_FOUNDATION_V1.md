# Seller Catalog Category & Short Description Foundation V1

Capability: `commerce.seller.catalog_category_short_description_v1`
Branch: `office/seller-catalog-category-short-description-v1`
Base: `cd946a33d38c6cfca788b8aa5ef47615c4ed7da4` (`origin/office/seller-catalog-bulk-field-editing-v1`)

## Repository audit

| Concern | Finding |
| --- | --- |
| Category storage | Existing `store_products.primary_category_id` → `product_categories` |
| Taxonomy | Existing seed + `listActiveCategories` — no parallel taxonomy |
| Short description | Existing `store_products.short_description` (nullable text) |
| Create/edit writes | Already via `createDraftProduct` / `updateDraftProduct` |
| Bulk field editing | Already supports category + short_description replace/clear |
| List display | Was the main gap (name + preview not shown) |
| Migration | **Not required** — columns and taxonomy already exist |

## Data model (reused)

- **Category:** `primary_category_id` (UUID FK) + active rows from `product_categories` / taxonomy seed
- **Short description:** `short_description` nullable text, app max **280** chars
- Empty/whitespace short description normalizes to `null` (legacy products remain valid)

## This foundation adds

1. Shared helpers in `lib/store/sellerCatalogCategoryShortDescription.ts`
2. Fail-closed short-description validation (no silent truncate) wired into `validateProductDraftInput` and bulk normalize
3. Seller catalog list display: category chip + short-description preview
4. Edit form `maxLength` parity with create
5. Focused tests for normalize/resolve/display/draft validation

## Bulk field editing

Left intact and reused. No scope expansion beyond shared validation helper.

## Out of scope

Inventory availability, pricing, stock, checkout, orders, shipping, Home/Learning/AI/Navigation, remote migrations, new taxonomy tables.
