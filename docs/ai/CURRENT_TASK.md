# Current Task

## Task title

Commerce Premium Seller Orders Operations Experience V1

## Status

`complete`

## Branch

`office/commerce-premium-seller-orders-operations-v1`

## Base

Trusted buyer-orders commit `cce1e5708fecf38b86bdb4239145de7a55332eba`
Parent branch: `office/commerce-premium-buyer-orders-experience-v1`

## Deliverable

Premium seller `/seller/store/orders` list and detail with separated states, payment-blocked ship/deliver guards (UI + server action), stale-transition rejection, minimized buyer list identity, and SellerOpsShell visual continuity. No payment provider. No Shipping Network.

## Constraints

- Store-scoped authorization fail-closed
- Do not create a second order system
- Do not manually mark payment successful
- Do not edit inventory quantities directly
- Do not modify frozen Commerce architecture docs

## Next after this task

Seller catalog/product ops polish, inventory reservation visibility, or Trading-domain alignment — not another architecture document unless requested.
