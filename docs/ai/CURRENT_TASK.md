# Current Task

## Task title

Commerce Premium Storefront Experience Foundation V1

## Status

`complete`

## Branch

`office/commerce-premium-storefront-experience-foundation-v1`

## Deliverable

Production-quality customer-facing Store experience foundation on canonical routes (`/store`, search, PDP, seller storefront), reusing existing Commerce/Store adapters and components.

## Program note

Commerce consolidation is complete. The program has moved from documentation-only architecture into real implementation.

## Constraints

- Do not modify frozen Commerce architecture documents under `docs/commerce/**`
- Do not delete previous Store work
- No payment-provider integration
- No Shipping Network architecture
- No broad database redesign
- Fail closed on missing commerce data; no fabricated prices/stock/claims
- Home remains Discovery — do not convert Home into Store

## Next (after this task)

Continue storefront depth (seller policies UX, media polish) or Trading alignment in code; Shipping Network SA remains the recommended next architecture document when returning to docs.
