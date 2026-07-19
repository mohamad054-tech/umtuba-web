# Marketplace Foundation V1 (Phase 3D)

Status: implemented in `umtuba-web`
Migration: `supabase/migrations/20260802_store_marketplace_foundation_v1.sql`

## Scope

Additive layer on top of Product Foundation, Cart Foundation, and Video
Commerce Shelf V1:

- Seller applications (operator-reviewed onboarding — no self-serve store creation)
- Store public profile fields (city, public contact email/phone/link)
- Category manual sort order
- Product logistics fields (weight, dimensions, origin) + `booking` product type
- Product status expansion (`pending_review`, `paused`, `rejected`) with a
  sync trigger that normalizes `item_type`/`product_type` and legacy
  `pending_review` writes
- Verified-store gate on product creation (enforced in DB + app)
- Wishlist (save/unsave products)
- Id-based redirect routes for products/stores (durable deep links)

**Out of scope:** checkout, orders, payments, shipping, payouts, live
shopping, ratings/reviews.

## Database objects

### New tables

| Table | Purpose |
| --- | --- |
| `seller_applications` | Operator-reviewed seller onboarding queue |
| `store_wishlist_items` | Per-user saved products |

### Altered tables

| Table | Change |
| --- | --- |
| `stores` | `city`, `public_contact_email`, `public_contact_phone`, `public_contact_url` |
| `product_categories` | `sort_order` (manual display ordering) |
| `store_products` | `item_type`, `weight_grams`, `length_mm`, `width_mm`, `height_mm`, `origin_country_code`; `product_type` gains `booking`; `status` gains `pending_review`, `rejected`, `paused` |

### Functions / triggers

- `approve_seller_application(uuid)` / `reject_seller_application(uuid, text)` /
  `suspend_seller_application(uuid)` — **service_role only**. Approval creates
  the store (`status='active'`, `verification_status='verified'`) and the
  owner membership row in one transaction — the app never inserts into
  `stores` directly anymore.
- `sync_store_product_item_type()` — keeps `item_type`/`product_type` in sync
  and normalizes legacy `pending_review` writes to `in_review`.
- `enforce_verified_store_for_products()` — `before insert` trigger on
  `store_products`; raises unless the owning store's
  `verification_status = 'verified'`. Sellers cannot create products by
  racing the app-level check.

### RLS (fail-closed)

| Table | Actor | Access |
| --- | --- | --- |
| `seller_applications` | Owner (`user_id = auth.uid()`) | Read own; insert/update own **pending** rows only |
| `seller_applications` | Anyone else | None |
| `store_wishlist_items` | Owner | Full read/write on own rows |
| `store_wishlist_items` | Anyone else | None |

`DELETE` is revoked on `seller_applications` for `authenticated`/`anon`
(status transitions happen only through the service-role RPCs above).

## Domain modules (`lib/store/`)

| Module | Role |
| --- | --- |
| `sellerApplications.ts` | `applyToBecomeSeller`, `getLatestSellerApplication`, `canManageSellerCatalog`, types |
| `wishlist.ts` | `listWishlist`, `addToWishlist`, `removeFromWishlist`, `isProductWishlisted` |
| `types.ts` | Extended enums (`booking`, `pending_review`/`paused`/`rejected`) + optional logistics/profile fields |
| `sellerStore.ts` | `createStoreForUser` is now a fail-closed stub; `createDraftProduct` gates on `canManageSellerCatalog`; `updateStoreBasics` accepts city/contacts; product insert writes `item_type` |
| `catalogQueries.ts` | `listActiveCategories` orders by `sort_order`; adds `getPublicProductById` / `getPublicStoreById` for id-based redirects; extracts `enrichPublicCatalogRow` (shared by catalog + wishlist) |
| `videoCommerceQueries.ts` | Adds `listPublicVideosForProduct` (product → shoppable videos) |

Server actions: `app/actions/storeSeller.ts` (`applySellerAction`),
`app/actions/storeWishlist.ts` (`toggleWishlistAction`), and
`app/actions/storeCatalog.ts` (`createStoreAction` now redirects to
`/seller/apply`; `updateStoreAction` passes city/contacts).

## Seller lifecycle (revised)

1. Apply at `/seller/apply` → `seller_applications` row, `status='pending'`
2. Operator approves via `approve_seller_application` (service_role) → store
   created `verified` + owner membership
3. Seller manages catalog at `/seller/store` once verified
4. Draft → in_review → operator `approve_store_product` (unchanged from
   Product Foundation)

Rejected applicants can re-apply from `/seller/apply`. There is no path for
the app to create a store directly — `createStoreForUser` always returns
`ok: false` pointing at `/seller/apply`, and the DB trigger
`enforce_verified_store_for_products` blocks product creation even if a
client tried to bypass the app-level check.

## Routes

### Buyer

- `/store/wishlist` — Favorites (auth required)
- `/store/products/[productId]` — id → canonical slug PDP redirect
- `/store/shops/[shopId]` — id → canonical slug store redirect
- `/store` — Favorites + Sell on UMTUBA links added to the footer row
- `/store/[storeSlug]` — About tab now shows city + public contact

### Seller (auth-gated via `/seller` in `PROTECTED_PREFIXES`)

- `/seller` — hub (routes to apply, store dashboard, or application status)
- `/seller/apply` — application form
- `/seller/products`, `/seller/products/new`, `/seller/products/[productId]` —
  friendly aliases that redirect to the canonical `/seller/store/products/*`
  screens
- `/seller/store` — rewritten: no create-store form; redirects to
  `/seller/apply` when the user has no store; settings form now includes
  city/contacts

New `APP_ROUTES` keys: `storeWishlist`, `seller`, `sellerApply`,
`sellerProducts`. New helpers: `buildStoreProductIdHref`,
`buildStoreShopIdHref`, `buildSellerProductHref`.

`/store/wishlist` added to `PROTECTED_PREFIXES` (alongside existing
`/seller` and `/store/cart`).

## Product detail page

- Wishlist toggle button next to Add to Cart (`WishlistButton`, shared with
  the Favorites list)
- "Videos featuring this product" now lists real shoppable Watch videos via
  `listPublicVideosForProduct`, falling back to the existing placeholder
  panel when none are attached
- Specifications panel shows weight/dimensions/origin country when the
  seller has set them

## Video Commerce Shelf badge

`ShopBadge` now shows the Arabic CTA **"تسوّق المنتجات"** with the live
product count, in addition to the existing 🛍 icon, `aria-expanded`, and
`aria-haspopup` contract from Video Commerce Shelf V1. Hidden entirely when
`count <= 0` (unchanged).

## Tests

`lib/store/marketplaceFoundation.test.ts` covers:

- Migration contracts (tables, RLS, triggers, service-role-only RPCs)
- Domain type expansions (`booking`, `pending_review`/`paused`/`rejected`)
- `canManageSellerCatalog` role + verification gate
- New routes/helpers and id sanitization
- Auth gate coverage for `/seller` and `/store/wishlist`
- `createStoreForUser` / `createStoreAction` fail-closed redirect to
  `/seller/apply`
- Arabic Shop CTA presence
- Wishlist/seller-application module exports

## Limitations / safe TODOs

1. Operator UI for reviewing `seller_applications` is DB-RPC only (no admin
   screen yet) — approve/reject/suspend via SQL Editor or a future admin tool
2. Logistics fields are metadata only — no shipping rate calculation
3. `listPublicVideosForProduct` does not resolve signed thumbnail URLs (text
   metadata only, consistent with the rest of this phase's media handling)
4. Wishlist has no notion of "back in stock" alerts
5. `database.types.ts` not regenerated; domain uses `lib/store/types.ts`
6. Full DB RLS e2e depends on local/remote Supabase apply

## Next phase

Seller Self-Service Store Setup Wizard: see `SELLER_SELF_SERVICE_V1.md`.

Checkout + orders, Storage upload, ratings/reviews, search ranking.

Operator admin UI for seller/product moderation: see
`STORE_ADMIN_MODERATION_V1.md`.
