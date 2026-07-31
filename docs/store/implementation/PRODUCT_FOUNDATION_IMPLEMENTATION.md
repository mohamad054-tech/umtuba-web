# Product Foundation Implementation (Phase 3A)

Status: implemented in `umtuba-web`  
Migration: `supabase/migrations/20260728_store_product_foundation_v1.sql`

## Scope

First production-ready **Product Foundation** inside the existing Next.js App Router app:

- Stores + memberships
- Products, variants, prices, inventory, media metadata
- Categories / brands / category links
- Public catalog routes
- Seller draft → review workflow
- Fail-closed RLS

**Out of scope:** checkout, orders, payments, shipping, payouts, affiliates, Live Shopping, UM Points, cart.

## Database objects

### Tables

| Table | Purpose |
| --- | --- |
| `stores` | Seller store identity, status, verification, currency/country |
| `store_members` | Membership + roles (`owner`, `manager`, `catalog_editor`, `viewer`) |
| `store_products` | Product catalog rows + moderation/status lifecycle |
| `product_variants` | SKU / option_values variants |
| `product_prices` | Minor-unit prices |
| `product_inventory` | Warehouse stock |
| `product_media` | Media metadata + storage paths |
| `product_categories` | Category tree |
| `product_brands` | Brand registry + verification |
| `product_category_links` | Product↔category links with primary flag |

### Helpers / RPC

- `is_store_member`, `is_store_member_with_role`, `can_manage_store_catalog`, `is_store_owner`
- `is_public_store_product`
- `approve_store_product(product_id)` — **service_role only**

### Triggers / constraints

- `updated_at` triggers
- Auto owner membership on store insert
- Soft-status model (DELETE revoked for catalog tables)
- Active products require exactly one primary category
- Sellers cannot self-verify stores/brands or self-activate/approve products

## RLS (fail-closed)

| Actor | Read | Write |
| --- | --- | --- |
| Public | Active stores; active+approved products; active variants/prices/media; active categories/brands | None |
| Viewer | Own store + catalog | None |
| Catalog editor / manager | Own store + catalog | Catalog mutations |
| Owner | Own store + members | Store basics + members + catalog |

Public visibility requires **all** of: store `active`, product `active`, moderation `approved`.

## Domain modules (`lib/store/`)

| Module | Role |
| --- | --- |
| `types.ts` | Domain types / enums |
| `permissions.ts` | Role capability matrix |
| `money.ts` | Minor-unit validation + formatting |
| `inventory.ts` | Availability calculation |
| `validators.ts` | Input validation (hand-rolled, project style) |
| `catalogQueries.ts` | Public list/detail queries |
| `sellerStore.ts` | Authenticated seller mutations + seller reads |

Server actions: `app/actions/storeCatalog.ts`

## Routes

### Buyer

- `/store` — public catalog
- `/store/[storeSlug]` — store profile
- `/store/[storeSlug]/product/[productSlug]` — product detail

### Seller (auth-gated via `/seller` in `PROTECTED_PREFIXES`)

- `/seller/store`
- `/seller/store/products`
- `/seller/store/products/new`
- `/seller/store/products/[productId]/edit`

Cart CTA disabled: **Cart coming next**. Follow CTA is a disabled placeholder.

## Seller lifecycle

1. Create store → `status=active`, `verification_status=unverified`
2. Create draft product (+ default variant/price/inventory)
3. Edit draft / in_review
4. Submit for review → `in_review` + `moderation_status=pending`
5. Operator approval via `approve_store_product` (service_role)

## Media

Metadata + `storage_path` only. Binary upload deferred until a store-scoped Storage policy matching owned-folder conventions exists.

## Auth / navigation

- `/seller` added to `PROTECTED_PREFIXES`
- `APP_ROUTES.store`, `APP_ROUTES.sellerStore`

## Tests

`lib/store/storeFoundation.test.ts` covers role matrix, public visibility, money, inventory, validation, fail-closed corrupted inputs.

Auth gate coverage extended for `/seller` and public `/store`.

## Limitations / safe TODOs

1. ~~Categories empty until operators insert `product_categories`~~ — launch taxonomy seeded by `commerce.catalog.category_taxonomy_seed_v1` (`CATEGORY_TAXONOMY_SEED_V1.md`, migration `20260885`)
2. ~~Trusted availability modes (unlimited / finite / unavailable)~~ — `commerce.inventory.seller_inventory_availability_foundation_v1` (`SELLER_INVENTORY_AVAILABILITY_FOUNDATION_V1.md`); reuses `product_inventory`
3. Binary media upload deferred
4. Cart / checkout intentionally disabled
5. Follow store placeholder only
6. `database.types.ts` not regenerated; domain uses `lib/store/types.ts`
7. Catalog query N+1 acceptable for foundation
8. Full DB RLS e2e depends on local/remote Supabase apply

## Next phase

Cart + checkout + orders, payments, shipping, Storage upload, admin moderation UI, search ranking. Category Admin editor remains out of scope until Product GO.
