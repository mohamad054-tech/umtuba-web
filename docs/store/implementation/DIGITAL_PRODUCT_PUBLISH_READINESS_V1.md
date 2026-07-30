# Commerce Digital Product Publish Readiness V1

Capability: `commerce.digital.product_publish_readiness_v1`  
Branch: `office/commerce-digital-product-publish-readiness-v1`  
Migration: none (reuses `store_digital_product_assets` + owned path contract)

## Gate

A **digital** product is publish/marketplace-ready only when:

1. An active `store_digital_product_assets` row exists for the same store + product
2. `status = active`
3. `storage_path` matches
   `stores/{storeId}/products/{productId}/digital/{uuid}.{ext}`

Physical products are not gated by this slice.

## Enforced on

- Seller `submitProductForReview` (server-side; UI also hides submit when blocked)
- Enabling `marketplace_eligible` for digital products
- Marketplace discovery / listing eligibility / listing cart validation
  (fail-closed when digital deliverable is missing or invalid)

## Seller UI

Product editor shows publish readiness:

- asset missing
- asset invalid
- asset ready / ready for review

Blocked submit directs sellers to the existing Digital deliverable panel.

## Out of scope

CDN/library, multi-file bundles, payouts, refunds, physical redesign,
Learning/AI/Home/Creator/Navigation, capture/allocate/entitlement/release redesign.
