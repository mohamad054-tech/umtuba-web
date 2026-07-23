# Current Task

## Task title

UMTUBA Ads Platform — Candidate Provenance Foundation V1

## Goal

Replace the fragile pipe-joined candidate `bindingToken` with a structured,
bounded, deterministic Candidate Provenance contract that works across Inventory
Bridge, Diagnostic Runner, and Canonical Stack — without enabling
delivery/billing or weakening `runAdsCanonicalStackV1`.

## Allowed scope

- `lib/ads/platform/candidateProvenance.ts`
- `lib/ads/platform/candidateProvenance.test.ts`
- `lib/ads/platform/candidateSelection.ts` (provenance identity on candidates)
- `lib/ads/platform/selectionRenderAdapter.ts` (+ related fixtures/tests)
- `lib/ads/inventoryBridge.ts` (+ related bridge tests)
- `lib/ads/diagnosticRunner.ts` / `diagnosticRunnerServer.ts` / tests
- `app/admin/ads/diagnostics/**` (provenance display)
- `docs/ads/ADS_CANDIDATE_PROVENANCE_FOUNDATION_V1.md`
- `docs/ads/ADS_DIAGNOSTIC_RUNNER_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- Related Ads platform tests that assert token format

## Forbidden scope

- Games / Learning / Store / World product surfaces
- Merging into `alpha-0.2`
- Pushing / applying migrations
- Enabling live delivery or live billing
- Alternate decision pipelines
- Commit / push unless explicitly requested

## Branch

`office/ads-canonical-authority-hardening-v1`

## Status

`implemented — validation complete in this handoff; not committed.`
