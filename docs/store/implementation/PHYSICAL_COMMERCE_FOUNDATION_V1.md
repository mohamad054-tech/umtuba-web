# Physical Commerce Foundation V1

Capability: `commerce.physical.foundation_v1`
Branch: `office/commerce-physical-foundation-v1`
Base: `6875847eddc1e832b542135babce50eb036bd4ca` (`origin/office/commerce-chain-migration-apply-readiness-v1`)

## Scope

Internal foundation for **physical** catalog, inventory semantics, variants, shipping **metadata**, and mixed-order **classification**.

Does **not** open physical launch, carriers, rate shopping, labels, tracking, warehouses, physical refunds, taxes, or settlement/Stripe changes.

## Domain model

Extends existing tables (no parallel product system):

| Area | Source of truth |
| --- | --- |
| Product type | `store_products.product_type = physical` |
| Logistics dims | Existing `weight_grams`, `length_mm`, `width_mm`, `height_mm`, `origin_country_code` |
| Physical flags | `shipping_required`, `inventory_tracked`, `fulfillment_required`, `shippable` |
| Units / class | `weight_unit`, `dimension_unit`, `shipping_class`, `fragile`, `special_handling` |
| Package meta | `package_weight_grams`, `package_*_mm` |
| Variants | `product_variants` + `option_values` (`color`/`size`/`material`) + optional `barcode` / dim overrides |
| Inventory | `product_inventory.on_hand` / `reserved` / `safety_stock` / `allow_backorder` + `low_stock_threshold` |

TS module: `lib/store/physicalCommerceFoundation.ts`

## Inventory semantics

- `available = max(0, stock - reserved)` — **derived**, not stored (avoids drift).
- Sellable units reuse existing `availableUnits(onHand, reserved, safetyStock)`.
- Status: `in_stock` | `low_stock` | `out_of_stock` | `backorder` | `not_tracked`.
- Pure `planInventoryReserve` / `planInventoryRelease` are idempotent by reservation key; persistence remains existing reservation RPCs (`20260819`).
- Available never goes negative when backorder is disallowed; over-reservation fail-closed.

## Variant semantics

- Options via `option_values` JSON (color/size/material helpers).
- SKU uniqueness: per-product (existing DB index) + TS uniqueness check.
- Barcode uniqueness: when present, unique case-insensitive index (`product_variants_barcode_uidx`).
- Archived variants blocked from sale (`assertVariantActiveForSale`).
- Wrong-store ownership rejected (`assertVariantStoreOwnership`).

## Shipping metadata

Package weight/dims, shipping class, fragile/special handling, shippable / fulfillment_required flags only.

**Deferred:** carriers, rates, labels, tracking, customs calculation, HS code (origin country already exists; HS deferred).

## Mixed-order boundary

`classifyOrderFulfillment`:

- `digital_only` / `physical_only` / `mixed`
- `shippingRequired` derivation
- Digital entitlement and physical fulfillment are **separate tracks**
- Mixed order is **not** fully fulfilled after digital entitlement alone
- `physicalLaunchBlocked` remains true whenever physical lines exist

Does **not** change Stripe capture, entitlement grant, settlement, refund, or commission modules.

## Launch gate behavior

- `physicalLaunchGated: true` on physical product model and availability bridge
- `assertPhysicalCheckoutLaunchGate` fail-closed for physical lines
- `checkoutAllowed: false` on physical availability helper
- Existing Live Stripe digital-only RPC (`20260876`) left untouched
- Existing `commerce_confirm` gate left untouched

## Security / authorization

- Buyers must not supply stock / gate fields (`rejectClientPhysicalPrivilegeFields`)
- Variant mutations validate store ownership when expected store provided
- Inventory reserve/release are service-layer plans; privileged DB reservation RPCs remain service/DEFINER paths from prior safety migrations
- Catalog inventory RLS unchanged (catalog editors manage owned store inventory)

## Migration

- File: `supabase/migrations/20260892_store_physical_commerce_foundation_v1.sql`
- Number audit: latest prior tip migration `20260891`; `20260892` unused; **does not** reuse `20260889–91`
- Dependencies: `20260728` product foundation, `20260802` logistics columns, reservation foundation
- Local only — Desktop applies under separate GO
- Idempotent `ADD COLUMN IF NOT EXISTS` / unique indexes

## Test evidence

Focused suite: `lib/store/physicalCommerceFoundation.test.ts` (see Final Verification Report for counts).

## Deferred phases

Carriers, rate shopping, tracking, labels, multi-warehouse, PO/replenishment, returns/exchanges, physical refunds, taxes/VAT/invoices, customs/duties, shipment notifications, carrier webhooks, delivery confirmation, COD, physical settlement changes, production enablement.
