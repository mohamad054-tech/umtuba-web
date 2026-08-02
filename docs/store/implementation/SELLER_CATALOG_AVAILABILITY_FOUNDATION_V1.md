# Seller Catalog Availability (Inventory Availability Foundation) V1

Capability: `commerce.seller.catalog_availability_v1`
Trusted SSOT: `commerce.inventory.seller_inventory_availability_foundation_v1`
Branch: `office/seller-inventory-availability-v1`
Base: `097d8955c7d55bb1658aa4e0c95c7239f6b113ac`

## Repository audit summary

| Concern | Finding |
| --- | --- |
| Source of Truth | `product_inventory` (`on_hand`, `reserved`, `safety_stock`, `allow_backorder`) + `product_type` |
| Stored availability status | **None** — derived only |
| Preorder | **Absent** — deferred (no migration invented) |
| Trusted resolver | Existing `resolveTrustedInventoryAvailability` |
| Migration | **Not required** |

## Supported seller catalog statuses

| Status | Meaning |
| --- | --- |
| `in_stock` | Finite type, available units &gt; 0 |
| `out_of_stock` | Finite type, available units = 0, backorder off |
| `backorder` | Finite type, available units = 0, `allow_backorder` true |
| `unlimited` | Digital/service/subscription/bundle — not finite warehouse stock |
| `unavailable` | Missing/inconsistent inventory or unknown finite type |
| `unknown` | Incomplete quantity fields (legacy) — never treated as in stock |

Deferred: `preorder`.

## Digital vs physical

- Digital/unlimited types → `unlimited` (never forced `out_of_stock` / finite math)
- Physical/booking → finite seed fields; edit UX shows on-hand / safety / allow backorder
- Entitlement / delivery / versioning untouched

## Wiring

- Catalog list chip via `indexSellerCatalogAvailabilityByProductId`
- Product edit shows derived availability; hides finite seed controls for unlimited types
- Bulk field `availability` / `stock_quantity` remain deferred/forbidden (derived, not mass-assigned)

## Migration

**None.** Reuses existing inventory schema and foundation resolver.
