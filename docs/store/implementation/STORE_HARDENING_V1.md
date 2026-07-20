# UMTUBA Store — Hardening V1

**Status:** Implemented in repo (migration apply is ops-owned; not applied by this change)  
**Branch base:** `origin/alpha-0.2`  
**Migration:** `supabase/migrations/20260818_store_hardening_v1.sql`

## Why `20260818` not `20260811`

On `alpha-0.2`, `20260811_store_orders_foundation_v1.sql` already exists. Hardening uses the next free Store date: **20260818**.

## Scope

1. Close residual authenticated `stores` INSERT RLS + revoke INSERT  
2. Dedicated **private** Storage bucket `store-product-media` with store-tenant path policies  
3. Seller image upload + **server-authorized signed URL** display (catalog/PDP/seller/admin)  
4. Product Reject + Return-for-revision admin RPCs/UI (`review_note`, `reviewed_at`)  
5. Gate unfinished storefront placeholders/tabs (off by default)  
6. Contract tests + this doc  

**Out of scope:** Orders, Checkout, Payments, Shipping engine changes, Ads.

## Storage security model

| Rule | Detail |
|------|--------|
| Bucket | `store-product-media`, **`public = false`** |
| Writes | Catalog editors only; path `stores/{storeId}/products/{productId}/{uuid}.{ext}` |
| Reads (Storage SELECT) | (1) published products via `is_public_store_product`, (2) catalog editors via `can_manage_store_catalog`, (3) platform admins via `is_platform_admin` |
| App signing | `createAuthorizedProductMediaSignedUrl` — never `getPublicUrl` |
| TTL | `STORE_PRODUCT_MEDIA_SIGNED_URL_TTL_SECONDS` = 15 minutes |
| Public access | Only active store + active product + approved moderation + active media row + owned path |
| Private preview | Owning catalog editor or platform admin may sign draft/rejected/needs_changes media |
| Arbitrary paths | Rejected (owned-path check before any sign) |

Draft, rejected, needs_changes, hidden, and inactive products are **not** publicly signable.

## Apply checklist (ops)

Apply only after review. Do not auto-apply from the app.

1. Confirm prior Store foundations applied (product, cart, marketplace, admin moderation, seller self-service, video commerce shelf as required by environment).  
2. Apply `20260818_store_hardening_v1.sql`.  
3. Verify: no policy `"Authenticated users can create stores"`; `INSERT` revoked on `stores` for `anon`/`authenticated`.  
4. Verify RPCs: `admin_reject_store_product`, `admin_return_store_product_for_revision` execute granted only to `authenticated`/`service_role`.  
5. Verify bucket `store-product-media` exists with **`public = false`** and expected MIME/size limits.

## Migration consistency (repo presence)

| Migration | Role |
|-----------|------|
| `20260728_store_product_foundation_v1.sql` | Catalog / residual INSERT policy origin |
| `20260729_store_cart_foundation_v1.sql` | Cart |
| `20260801_video_commerce_shelf_v1.sql` | Watch shelf |
| `20260802_store_marketplace_foundation_v1.sql` | Marketplace |
| `20260809_store_admin_moderation_foundation_v1.sql` | Admin approve baseline |
| `20260810_store_seller_self_service_v1.sql` | Seller setup |
| `20260818_store_hardening_v1.sql` | This hardening slice |

Later alpha Store migrations (orders/checkout/payments/etc.) are intentionally untouched by Hardening V1.

## Security notes

- Store creation remains RPC-only after INSERT policy drop + revoke.  
- Admin product reject/return require `require_platform_admin()` and fixed `search_path = public`.  
- Media paths must be `stores/{storeId}/products/{productId}/{uuid}.{ext}`; Storage write gated by `can_manage_store_catalog(store_id)`.  
- No service-role key in Next app Store admin paths.  
- Clients never mint signed URLs for arbitrary user-supplied paths.

## Feature flags

Unfinished merchandising defaults **off**. Opt-in with `NEXT_PUBLIC_STORE_SHOW_*=1` (see `lib/store/storefrontFlags.ts`).
