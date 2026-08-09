# CURSOR_REPORT — PC2-A2 / UM_CORE_PLATFORM_RELEASE_CANDIDATE_REGRESSION_PACK_V1

## Summary

TEST-ONLY release-candidate regression pack for UM Core on `origin/alpha-0.2` @ `af1d8247d3af7a74210c2e187e11908d91fdb281`. Added isolated `platforms/core/releaseCandidate.regression.pack.test.ts` (22 tests) covering critical negatives (P13≠P19, P19≠RI, Health≠Lifecycle Readiness, CapCompat≠Health/Readiness), pure-validator non-mutation, and deterministic repeated validation, plus smoke of registration/manifest/compliance/events/health/join/fleet/SDK/history/immutability/catalog-drift. **VERDICT = RC_PACK_ADDED_AND_PUSHED — SUCCESS**. **SEMANTIC_DEFECT_FOUND = NO**. No production changes.

## Exact files changed

- `platforms/core/releaseCandidate.regression.pack.test.ts` (new)
- `docs/ai/UM_CORE_PLATFORM_RELEASE_CANDIDATE_REGRESSION_PACK_V1_REPORT.md` (new)
- `UM_CORE_PLATFORM_RELEASE_CANDIDATE_REGRESSION_PACK_V1_REPORT.md` (worktree root copy)
- `docs/ai/CURSOR_REPORT.md` (this file)

## Migrations created

None.

## Security review

Tests/docs only. No secrets, network, DB, or remote migration activity.

## Tests

- RC pack: 22/22 PASS
- Full `platforms/core`: 38 files / 398 tests PASS

## TypeScript

`npx tsc --noEmit` → exit 0

## Build

Skipped (tests/docs only).

## git diff --check

PASS

## git status --short

Clean after tip finalize (`0/0` on own remote branch).

## Open issues

- P23 readiness not on root barrel (local import only).
- OUTBOX unavailable on this device.
