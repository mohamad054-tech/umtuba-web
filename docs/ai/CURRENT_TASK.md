# Current Task

## Task title

UMTUBA Ads Platform — Ranking & Scoring Foundation V1 Test Hardening

## Goal

Close Final Review gaps: explicit edge-case tests, input immutability,
reachable tie-break sequence only, and reduced trust-narrowing casts.

## Allowed scope

- `lib/ads/platform/ranking*`
- `lib/ads/platform/scoring*`
- `lib/ads/platform/index.ts` (only if export surface must stay consistent)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- `app/discover/components/DiscoverShell.tsx`
- Unrelated Ads modules
- Learning / Store / World / Messages / Live
- Commit / push without explicit approval

## Branch

`alpha-0.2`

## Status

`completed`
