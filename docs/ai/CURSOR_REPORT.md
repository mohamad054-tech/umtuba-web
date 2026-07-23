# Cursor Execution Report

## Task

UMTUBA Ads Platform — Final Quarantine Fix
(`alpha-0.2`)

## Summary

Closed the final Stack Unification V1 gate:

1. **Export quarantine** — `prepareAdsMeasurementFoundation` is no longer
   flat-exported from `lib/ads/platform/index.ts`. It remains available only
   via `adsPlatformCompatibility`. Canonical V1 measurement exports
   (`prepareAdsMeasurementFromDeliveryV1` and package contracts) stay flat.
2. **executionLayer header** — documents that issued provenance is **required**,
   not optional (caller-reconstructed / spread provenance fails closed).
3. **Export quarantine tests** — new `exportQuarantine.test.ts` locks the
   barrel contract.

`runAdsStackPipelineV1` remains the preferred canonical public entrypoint.
Kill switches remain false. No render/delivery/network/DB/billing/auction.

**`app/discover/components/DiscoverShell.tsx` was not modified.**

**No commit, push, merge, or remote Supabase migration apply.**

## Exact files changed

| Path | Action |
| --- | --- |
| `lib/ads/platform/index.ts` | Selective measurement exports; no flat `prepareAdsMeasurementFoundation` |
| `lib/ads/platform/executionLayer.ts` | Header: issued provenance required |
| `lib/ads/platform/measurementFoundation.ts` | Quarantine comments on foundation path |
| `lib/ads/platform/exportQuarantine.test.ts` | Added — barrel quarantine tests |
| `docs/ai/CURRENT_TASK.md` | this handoff |
| `docs/ai/CURSOR_REPORT.md` | this report |

## Migrations created

- None.

## Security review

- No new runtime surfaces; export surface only.
- Issued provenance requirement documentation aligned with code.
- No network/DB/Supabase/product-surface/billing/auction/ranking wiring.
- DiscoverShell untouched.

## Tests

`npx vitest run lib/ads/platform` — **29 files, 494 tests, all passed**
(was 489; +5 export quarantine tests).

## TypeScript

`npx tsc --noEmit` — **pass**.

## Build

`npm run build` — **passed**.

## git diff --check

`git diff --check` — **clean** (CRLF warnings only).

## git status --short

Includes prior Stack Unification work plus this quarantine fix; DiscoverShell
remains a separate unrelated local modification — do not stage it.

## Open issues

- None for the Stack Unification V1 final quarantine gate.
- Stage only ads platform + docs/ai handoff files for commit (exclude DiscoverShell).
