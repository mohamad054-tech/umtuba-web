# Current Task

## Task title

Commerce Seller Digital Product Asset Upload V1

## Status

`implementation-complete-local` — awaiting commit / push / apply GO

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-commerce-seller-digital-product-asset-upload-v1`

## Branch

`office/commerce-seller-digital-product-asset-upload-v1`

## Base

`1a2ede70c17455937fdd1a068ac5c87c9aeafe2e`
(`office/commerce-buyer-digital-access-delivery-v1`)

## Milestone

`commerce.digital.seller_product_asset_upload_v1`

## Delivered

- Migration (local): `20260879_store_seller_digital_product_asset_upload_v1.sql`
- Server prepare → client upload → service-role finalize attach
- Seller product editor “Digital deliverable” section
- One active digital asset per product; replacement preserves previous on failure

## Machine policy

Commerce laptop only. Digital-first. Physical dormant. Do not touch Learning / AI Tutor / Home / Creator / Navigation.

## Allowed scope

- `lib/store/digitalAssetUpload.ts` (+ tests)
- `lib/store/uploadDigitalProductAsset.ts`
- `lib/store/mediaConstants.ts`
- `lib/store/mediaValidation.ts`
- `app/actions/storeDigitalAssets.ts`
- `app/components/store/SellerDigitalAssetPanel.tsx`
- `app/seller/store/products/[productId]/edit/page.tsx`
- `supabase/migrations/20260879_store_seller_digital_product_asset_upload_v1.sql`
- `docs/store/implementation/SELLER_DIGITAL_PRODUCT_ASSET_UPLOAD_V1.md`
- `docs/ai/CURRENT_TASK.md`, `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / AI Tutor / Home / Creator / Navigation
- Physical commerce / shipping / warehouse / carriers / returns
- Payouts / refunds / capture-allocate-entitlement-release redesign
- Buyer delivery rewrite / CDN studio
- Commit / push / remote migration apply without GO

## Next

Verification report, then separate commit/push GO, then separate apply GO for `20260879`.
