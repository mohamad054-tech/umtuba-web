# Current Task

## Task title

UMTUBA Ads Platform — Ads Operations & Activation Foundation V1

## Goal

Implement the operational foundation required to safely operate the Ads Platform:
centralized operational state, feature flags, kill switches, readiness evaluation,
health checks, immutable ops audit records, and admin operations contracts —
without enabling production serving, billing, payments, or real campaign delivery.

## Allowed scope

- `lib/ads/operations/**`
- `lib/ads/operationsFoundation.ts` (if used as facade)
- `lib/ads/index.ts` (safe exports only)
- `lib/ads/operationsFoundation.test.ts` / `lib/ads/operations/**/*.test.ts`
- `docs/ads/ADS_OPERATIONS_ACTIVATION_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Games / Learning / Store / World product surfaces
- Enabling live delivery or live billing
- Payment providers / production endpoints / production UI
- Migrations that activate production
- Weakening kill switches or bypassing `runAdsCanonicalStackV1`
- Commit / push unless explicitly requested

## Branch

`alpha-0.2`

## Status

`implemented — validation complete in this handoff; not committed.`
