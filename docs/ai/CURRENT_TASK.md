# Current Task

## Task title

UMTUBA Ads Platform — Campaign Management Foundation V1

## Goal

Implement the complete internal campaign management foundation: campaign/ad-set/
creative contracts, budget, scheduling, targeting, approval workflow, centralized
validation, and admin contracts — without enabling production serving, billing,
real delivery, payments, UI, or public endpoints.

## Allowed scope

- `lib/ads/campaignManagement/**`
- `lib/ads/index.ts` (safe exports only)
- `docs/ads/ADS_CAMPAIGN_MANAGEMENT_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Modifying Canonical Stack / Provenance / Billing / Measurement / Kill switches
- Enabling productionEnabled / deliveryEnabled / billingEnabled /
  productionAccepted / authoritativeProductionServing
- Production APIs, public endpoints, UI, payment providers
- Games / Learning / Store / World
- Commit / push unless explicitly requested

## Branch

`alpha-0.2`

## Status

`implemented — validation complete in this handoff; not committed.`
