# Current Task

## Task title

UMTUBA Ads Platform — Auction Foundation V1 Test Hardening

## Goal

Close Final Review gaps for Auction Foundation V1: explicit invalid-number,
duplicate-rank, and auctionWinner-injection tests; clarify defensive
same-rank comparator coverage; remove latent inputIndex sort fallback.

## Allowed scope

- `lib/ads/platform/auction*`
- `lib/ads/platform/index.ts`
- Direct supporting contracts only if strictly required
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- `app/discover/components/DiscoverShell.tsx`
- Learning / Store / World / Messages / Live
- Unrelated Ads modules
- Budget / pacing / billing mutation
- Bidding engine / payments / ledger / production delivery
- Learning / AI / ML / randomness / wall-clock
- Commit / push without explicit approval

## Branch

`alpha-0.2`

## Status

`completed`
