# CURSOR_REPORT — Commerce Seller Digital Product Asset Upload V1

## Summary

Seller prepare → upload → finalize attach for one private digital deliverable per
digital product, reusing `store_digital_product_assets` and the owned
`.../digital/{uuid}.{ext}` path contract so buyer entitlement-gated delivery can
resolve a real file. Local migration `20260879` only — not applied. No
commit/push. Base `1a2ede7…` unchanged as branch tip parent.

## Exact files changed

- `supabase/migrations/20260879_store_seller_digital_product_asset_upload_v1.sql` (new)
- `lib/store/digitalAssetUpload.ts` (new)
- `lib/store/digitalAssetUpload.test.ts` (new)
- `lib/store/uploadDigitalProductAsset.ts` (new)
- `lib/store/mediaConstants.ts`
- `lib/store/mediaValidation.ts`
- `app/actions/storeDigitalAssets.ts` (new)
- `app/components/store/SellerDigitalAssetPanel.tsx` (new)
- `app/seller/store/products/[productId]/edit/page.tsx`
- `docs/store/implementation/SELLER_DIGITAL_PRODUCT_ASSET_UPLOAD_V1.md` (new)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

`supabase/migrations/20260879_store_seller_digital_product_asset_upload_v1.sql`
(local only; not applied) — expands private `store-product-media` MIME allow-list
for digital deliverables; bucket remains non-public; 10 MB limit unchanged.

## Security review

- Catalog editor / owner / manager membership re-checked server-side on prepare and finalize
- Product type re-fetched; physical products fail closed
- Storage path generated server-side; finalize rejects forged/cross-store/traversal paths
- Bucket fixed to private `store-product-media`; client cannot supply bucket/store/seller claims
- Extension authoritative; MIME must match allow-list when present; size capped at 10 MB
- Service-role used only server-side to verify object + upsert single active pointer
- Failed upload/object verify/DB attach never activates a new pointer; previous preserved
- No permanent/public URLs; no storage path or secrets in seller summary responses
- Does not mutate payment, settlement, entitlement, or buyer delivery state

## Tests

Focused Commerce suites: **138 passed** (11 files)

## TypeScript

`npx tsc --noEmit` — pass

## Build

`npm run build` — pass

## git diff --check

pass

## git status --short

Uncommitted local WIP on base tip (see Final Verification Report).

## Open issues

- Await commit / push / apply GO for `20260879`
- CDN/library product, multi-file bundles, payouts, refunds remain deferred
