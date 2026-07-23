# Current Task

## Task title

UMTUBA Ads Platform — Ads Measurement Pipeline V1 Final Hardening

## Goal

Close medium findings from the Measurement Pipeline V1 final review: stale
foundation header comment, focused qualified_view / dedupe / resolution /
event-report tests, and an explicit Internal Measurement Pipeline V1 section in
platform measurement docs. Internal / contract-only — no production delivery.

## Allowed scope

- `lib/ads/platform/measurementPipeline.ts`
- `lib/ads/platform/measurementPipeline.test.ts`
- `lib/ads/platform/measurementFoundation.ts`
- `lib/ads/platform/measurementFoundation.test.ts`
- `lib/ads/platform/measurementEventFlow.ts`
- `lib/ads/platform/measurementEventFlow.test.ts`
- `lib/ads/platform/reportingHandleResolution.ts`
- `lib/ads/platform/reportingHandleResolution.test.ts`
- `lib/ads/platform/reportingHandle.ts`
- `lib/ads/platform/reportingHandle.test.ts`
- `lib/ads/platform/eventReportContracts.ts`
- `lib/ads/platform/eventReportContracts.test.ts`
- `lib/ads/platform/index.ts`
- `docs/ads/platform/05_MEASUREMENT_AND_REPORTING.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- `app/discover/components/DiscoverShell.tsx` (unrelated local changes — do not touch)
- Billing / auction / bidding / payments / production delivery / fraud / AI ranking
- Migrations / remote Supabase apply
- Enabling `ADS_DELIVERY_ENABLED` or placement flags
- Event storage, network, Supabase imports, product surface wiring
- Unrelated refactors outside the measurement pipeline contracts
- Commit / push without explicit approval

## Branch

`alpha-0.2`

## Status

`hardened locally — verified (tsc, platform tests 384/384, build); no commit/push.`
