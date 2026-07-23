# Current Task

## Task title

UMTUBA Ads Platform — Production Serving Foundation V1

## Goal

Implement the next Ads foundation layer after canonical production authority
hardening: serving lifecycle contracts, ordered state transitions, correlation /
provenance, idempotency for delivery/measurement/billing handoffs, deterministic
rejection reasons, structured diagnostics, and fail-closed kill-switch /
environment gates — while keeping production delivery and billing disabled.

## Allowed scope

- `lib/ads/platform/*`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ads/ADS_PRODUCTION_SERVING_FOUNDATION_V1.md`

## Forbidden scope

- Games / Learning / Store / World / Messages / Live / product surfaces
- `app/discover/components/DiscoverShell.tsx`
- Merging into `alpha-0.2`
- Pushing directly to `alpha-0.2`
- Migrations / remote Supabase apply
- Enabling live billing or live delivery
- Weakening canonical authority guarantees
- Creating a second authoritative pipeline
- Commit / push unless explicitly requested

## Branch

`office/ads-canonical-authority-hardening-v1`

## Status

`implemented — verified (688/688 platform tests, tsc, build, git diff --check);
not committed.`
