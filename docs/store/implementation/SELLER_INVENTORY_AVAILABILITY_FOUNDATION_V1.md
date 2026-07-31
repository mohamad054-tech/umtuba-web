# Seller Inventory Availability Foundation V1

Capability: `commerce.inventory.seller_inventory_availability_foundation_v1`  
Status: implemented locally (no migration — reuses existing `product_inventory`)

Depends on: Product Foundation (`product_inventory`, `product_type`), Category Taxonomy Seed, Digital Publish Readiness (orthogonal)

## Purpose

Create the **trusted inventory & availability foundation** required before loading real products: unlimited / finite / unavailable resolution over the existing inventory model — no duplicate inventory system, no client-supplied stock, no shipping.

## Behavior

| Mode | Product types | Stock source | Sellable when |
| --- | --- | --- | --- |
| `unlimited` | digital, service, subscription, bundle | Finite warehouse math **not** applied | Product + variant active |
| `finite` | physical, booking | `product_inventory` via `availableUnits` | Available > 0, or backorder allowed |
| `unavailable` | any (fail closed) | Missing/inconsistent inventory, inactive statuses, unknown type, zero stock without backorder | Never |

Reserved quantity remains system-managed (checkout holds). Sellers cannot supply `on_hand` / `reserved` / `available` via client bags (`rejectClientInventoryStockFields`).

## Reuse (no duplicate system)

- `lib/store/inventory.ts` — `availableUnits` / `validateInventoryInput`
- `product_inventory` table — on_hand, reserved, safety_stock, allow_backorder
- Cart / catalog / seller inventory queries call `resolveTrustedInventoryAvailability`

## Orthogonality

- Does **not** replace digital publish-readiness (asset must still be present)
- Does **not** replace category taxonomy gate (`primary_category_id`)
- Physical checkout remains behind `commerce_confirm_enabled` (default OFF)

## TS SSOT

`lib/store/sellerInventoryAvailabilityFoundation.ts`

Helpers:

- `resolveTrustedInventoryAvailability`
- `assertQuantityAgainstAvailability`
- `rejectClientInventoryStockFields`
- `inventoryAvailabilityDoesNotReplacePublishReadiness`

## Wiring

- `lib/store/cart.ts` — offer load + live cart enrichment
- `lib/store/catalogQueries.ts` — catalog / PDP availability
- `lib/store/sellerInventoryQueries.ts` + presentation — seller visibility (`availabilityMode`, unlimited label)

## Migration

**None.** Schema already supports trusted stock; this milestone is the availability convention and server-side resolution.

## Out of scope

Shipping, Dashboard, Admin UI, AI, duplicate inventory ledger, remote migration apply, weakening publish/category/commerce-confirm gates.
