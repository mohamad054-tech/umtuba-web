# Commerce Digital Product Versioning & Update Delivery V1

Capability: `commerce.digital.product_versioning_update_delivery_v1`  
Branch: `office/commerce-digital-product-versioning-update-delivery-v1`  
Migration (local only): `20260880_store_digital_product_versioning_update_delivery_v1.sql`

## Policy

- **Delivery:** always-latest. Entitled buyers mint the product’s current **active** version.
- **No entitlement pin** in V1 (`asset_version_id` is not added to entitlements).
- **Upload:** creates a **draft** version; does not change the active pointer.
- **Activate:** explicit, atomic, fail-closed; at most one active version per product.

## Schema

- `store_digital_product_asset_versions` — version history (`draft` | `active` | `inactive`)
- `store_digital_product_assets.active_version_id` — pointer to the active version
- Partial unique index: one `status = 'active'` row per `product_id`
- Backfill: existing asset rows become version `1` without losing storage paths

## Seller lifecycle

1. Prepare owned path (unchanged).
2. Client uploads to private `store-product-media`.
3. Finalize inserts a **draft** version (active preserved).
4. Seller activates a owned version via `activate_store_digital_product_asset_version`.
5. Publish readiness and buyer mint resolve only the active owned version.

## Out of scope

CDN, multi-file bundles, entitlement pinning, payment/settlement/refunds/payouts,
physical fulfillment, Learning/AI/Home/Creator/Navigation.
