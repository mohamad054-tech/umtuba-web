# Current Task

## Task title

UMTUBA Ads Platform Phase 1 — Contracts & Platform Foundation

## Goal

Implement reusable, typed Ads Platform contracts for placements, creatives,
campaign objects, and product-facing placement resolution. All placements stay
disabled and hidden by default. This phase contains no delivery, serving,
targeting execution, ranking, billing, measurement, or UI behavior.

## Allowed scope

- `lib/ads/platform/**`
- `lib/ads/index.ts` only to export the new platform contracts
- Focused Ads Platform contract tests under `lib/ads/platform/**`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Billing, UEOS calls, auctions, bidding, fraud, AI, reporting, measurement
- Delivery/serving engines, targeting execution, ranking, pacing, or selection
- Supabase, migrations, database access, APIs, server actions, routes, or UI
- Existing advertiser pages and existing Ads business behavior
- Commit, push, or remote migration apply

## Design inputs (read-only)

- `docs/ads/platform/**`
- `docs/ads/ADS_PLATFORM_FOUNDATION_V1.md`
- `docs/ads/ADS_ADMIN_REVIEW_FOUNDATION_V1.md`

## Branch

`alpha-0.2`

Base: `721d4ce636082a60bcfd36491009e653d275eef7`

## Status

`implemented locally — Phase 1 contracts saved in a local commit for handoff.
Awaiting review before push. No migration or remote apply authorized.`
