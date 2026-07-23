# Current Task

## Task title

UMTUBA Ads Platform — Reporting & Analytics Foundation V1

## Goal

Implement the complete internal reporting foundation: reporting domain, analytics
models, aggregation, filtering/dimensions, export contracts, centralized
validation, and internal inspection contracts — without enabling production
serving, billing, real event ingestion, production dashboards, or public APIs.

## Allowed scope

- `lib/ads/reporting/**`
- `lib/ads/index.ts` (safe exports only)
- `docs/ads/ADS_REPORTING_ANALYTICS_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Modifying Canonical Stack, Provenance, Operations, Campaign Management,
  Billing, or Measurement foundations
- Enabling productionEnabled / deliveryEnabled / billingEnabled /
  productionAccepted / authoritativeProductionServing
- Public APIs, admin UI, production endpoints, live ingestion
- Games / Learning / Store / World
- Commit / push unless explicitly requested

## Branch

`alpha-0.2`

## Status

`complete` — PASS (not committed)
