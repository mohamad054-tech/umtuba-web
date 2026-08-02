# Seller Inventory Quantity Foundation V1

Capability: `commerce.inventory.seller_inventory_quantity_foundation_v1`
Branch: `office/seller-inventory-quantity-v1`
Base: `e577d5137c25d3640eae55e86cbfdf55ebd4ec6f` (`origin/office/seller-inventory-availability-v1`)

## Repository audit

| Concern | Finding |
| --- | --- |
| Source of Truth | `product_inventory.on_hand`, `reserved`, `safety_stock`, `allow_backorder` |
| Available quantity | **Derived** via `availableUnits` = `max(0, on_hand - reserved - safety_stock)` — not stored |
| Seed validation | Existing `validateInventoryInput` |
| Availability foundation | Orthogonal status labels; quantity is the numeric layer underneath |
| Migration | **Not required** |

## Quantity model

| Field | Storage | Notes |
| --- | --- | --- |
| `onHand` | `product_inventory.on_hand` | Seller seed editable (draft/in_review) |
| `reserved` | `product_inventory.reserved` | System-managed; sellers cannot set |
| `safetyStock` | `product_inventory.safety_stock` | Reused as-is |
| `available` | none | Derived only |

Digital/unlimited product types expose `tracking: "unlimited"` with null quantities (never fake finite stock).

## Wiring

- Catalog list quantity chip via `indexSellerInventoryQuantityByProductId`
- Product edit shows on-hand / reserved / available / safety summary
- Seed helper `validateSellerInventoryQuantitySeed` forces reserved=0 for seller input

## Related

Hold-ledger / reserved-pressure read contracts continue in
`SELLER_INVENTORY_RESERVATION_FOUNDATION_V1.md` (Commerce Safety remains runtime SoT).

## Out of scope

Purchase decrement, reservation runtime, warehouses, checkout enforcement, shipping, pricing, preorder, entitlement, delivery.
