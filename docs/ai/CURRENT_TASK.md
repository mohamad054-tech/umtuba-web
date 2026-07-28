# Current Task

## Task title

Commerce Premium Seller Inventory & Reservation Visibility V1

## Status

`complete`

## Branch

`office/commerce-premium-seller-inventory-reservation-visibility-v1`

## Base

Trusted catalog commit `65ec1b8459147d9dadd3e9a544ad856b331850d6`
Parent branch: `office/commerce-premium-seller-catalog-product-management-v1`

## Deliverable

Seller `/seller/store/inventory` visibility workspace: on-hand / reserved / safety / available-to-sell separation via trusted `availableUnits`, low-stock/out/fully-reserved/missing attention, owner-manager reservation holds (buyer PII excluded), product-editor stock labeled as draft seed with inventory links. Read-only for movements (none exist). No payment provider. No Warehouse/Shipping Network. No frozen Commerce architecture edits.

## Constraints

- Inventory remains source of truth
- Never treat unknown quantity as zero
- Do not invent allocated/damaged/quarantine
- Fail closed on auth / store scope

## Next after this task

Trading-domain alignment, or seller analytics polish — still no payment provider / Shipping Network unless requested.
