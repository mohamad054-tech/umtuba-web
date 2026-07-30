# Commerce Seller Digital Product Asset Upload V1

Capability: `commerce.digital.seller_product_asset_upload_v1`  
Branch: `office/commerce-seller-digital-product-asset-upload-v1`  
Migration (local only): `20260879_store_seller_digital_product_asset_upload_v1.sql`

## Lifecycle

1. Seller opens product editor for an eligible **digital** product.
2. Client requests prepare with `productId` + file metadata only.
3. Server re-checks catalog editor membership and `product_type=digital`.
4. Server generates owned path:
   `stores/{storeId}/products/{productId}/digital/{uuid}.{ext}`
5. Client uploads into private `store-product-media` at that path (`upsert: false`).
6. Client requests finalize with `productId` + server-issued path.
7. Service-role verifies the object exists, then upserts the single
   `store_digital_product_assets` row to `active`.
8. Buyer delivery continues to resolve only the currently active attached asset.

## UI states

- no asset attached
- upload in progress (prepare / upload / attach)
- asset ready
- replace asset
- upload failed / retry (previous active asset preserved)
- unavailable for non-digital products

## Security

- Never trust client store/seller/bucket/path ownership claims
- Path generated server-side; finalize re-validates owned digital path
- Extension authoritative; MIME must match allow-list when present
- Max size 10 MB (matches bucket / catalog media convention)
- No permanent/public URLs; no service-role secrets to the browser
- Failed upload or failed attach never activates a new DB pointer
- Does not mutate payment, settlement, entitlement, or delivery state

## Out of scope

CDN/library product, bulk uploads, multi-file bundles, payouts, refunds,
physical shipping/warehouse/carriers/returns, Learning/AI/Home/Creator/Navigation.
