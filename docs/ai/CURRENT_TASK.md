# Current Task

## Task title

UMTUBA Ads Platform — Fraud & Invalid Traffic Foundation V1 Hardening

## Goal

Close Final Review findings for Fraud & Invalid Traffic Foundation V1:
explicit non-boolean / trust-level fail-closed tests, rejectionReason ↔
classification consistency in result validators, and crafted-result coverage.
Preserve runtime first-match IVT order and kill switches off.

## Allowed scope

- `lib/ads/platform/fraud*`
- `lib/ads/platform/invalidTraffic*`
- `lib/ads/platform/index.ts` (unchanged unless required)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- `app/discover/components/DiscoverShell.tsx`
- Learning / Store / World / Messages / Live
- unrelated Ads modules
- Migrations / remote Supabase apply
- Commit / push unless explicitly requested

## Branch

`alpha-0.2`

## Status

`implemented — verified (fraud 12/12, invalidTraffic 12/12, lib/ads/platform
649/649, tsc, build, git diff --check clean); Final Review gaps closed;
DiscoverShell untouched; no migrations.`
