# Current Task

## Task title

Commerce Digital Product Publish Readiness V1

## Status

`implementation-complete-local` — awaiting commit / push GO

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-commerce-digital-product-publish-readiness-v1`

## Branch

`office/commerce-digital-product-publish-readiness-v1`

## Base

`55fb87ded4b257ad56d504ae97797b9c7319b57d`
(`office/commerce-seller-digital-product-asset-upload-v1`)

## Milestone

`commerce.digital.product_publish_readiness_v1`

## Delivered

- Digital publish readiness evaluator (no migration)
- Server gates on submit-for-review and marketplace eligibility enable
- Marketplace discovery / listing / cart fail-closed for unready digital products
- Product editor readiness status + blocked submit messaging

## Machine policy

Commerce laptop only. Digital-first. Physical dormant. Do not touch Learning / AI Tutor / Home / Creator / Navigation.

## Allowed scope

- `lib/store/digitalProductPublishReadiness.ts` (+ tests)
- `lib/store/sellerStore.ts`
- `lib/store/marketplaceEligibility.ts`
- `lib/store/marketplaceSupplierSeller.ts`
- `lib/store/marketplaceSupplierSellerQueries.ts`
- `lib/store/cart.ts`
- `app/seller/store/products/[productId]/edit/page.tsx`
- `docs/store/implementation/DIGITAL_PRODUCT_PUBLISH_READINESS_V1.md`
- `docs/ai/CURRENT_TASK.md`, `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / AI Tutor / Home / Creator / Navigation
- Physical commerce redesign / shipping / warehouse
- Payouts / refunds / CDN / multi-file bundles
- Capture/allocate/entitlement/release redesign
- Buyer delivery rewrite
- Commit / push / remote migration apply without GO

## Next

Verification report, then separate commit/push GO.
