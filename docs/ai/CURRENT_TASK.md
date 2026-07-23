# Current Task

## Task title

UMTUBA Ads Platform — Diagnostic Runner Authorization Boundary Hardening V1

## Goal

Close the Diagnostic Runner library-level authorization gap: require
DB-backed `assertPlatformAdminDb` at the execution boundary, quarantine unsafe
exports/gate constructors, and harden request UUID/correlation validation —
without enabling delivery/billing or committing.

## Allowed scope

- `lib/ads/diagnosticRunner.ts`
- `lib/ads/diagnosticRunnerServer.ts`
- `lib/ads/diagnosticRunner.test.ts`
- `lib/ads/index.ts`
- `lib/ads/adsAdminReviewFoundation.test.ts`
- `app/admin/ads/diagnostics/**`
- `docs/ads/ADS_DIAGNOSTIC_RUNNER_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Games / Learning / Store / World product surfaces
- Merging into `alpha-0.2`
- Pushing / applying migrations
- Enabling live delivery or live billing
- Commit / push unless explicitly requested

## Branch

`office/ads-canonical-authority-hardening-v1`

## Status

`implemented — validation complete in this handoff; not committed.`
