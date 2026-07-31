# Cursor Report

## Summary

**PASS + STAGED** for `commerce.inventory.seller_inventory_availability_foundation_v1` on `office/commerce-inventory-seller-availability-foundation-v1` (base `16f5754`).

## Exact milestone

`commerce.inventory.seller_inventory_availability_foundation_v1` — approved and implemented.

## Inventory behavior

- **Unlimited** — digital / service / subscription / bundle (finite warehouse math skipped)
- **Finite** — physical / booking via `product_inventory` + reserved/safety stock
- **Unavailable** — inactive statuses, missing/inconsistent inventory, zero stock without backorder, unknown type (fail closed)
- Client stock fields rejected; reserved remains system-managed
- Physical stays launch-gated (`commerce_confirm_enabled` default OFF); digital publish readiness + category gates unchanged

## Migration

**None** — reuses existing `product_inventory`.

## Boundaries

No Dashboard, no Admin UI, no AI, no shipping, no commit/push in this phase.
