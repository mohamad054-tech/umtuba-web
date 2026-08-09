# UM_CORE_PLATFORM_VALIDATION_FUZZ_PROPERTY_REGRESSION_V1_REPORT

## PC2 REPORT header

- **SOURCE_DEVICE:** PC2
- **DEVICE_ROLE:** PLATFORM_CORE_PRIMARY
- **AGENT_ID:** PC2-A2
- **TASK_ID:** `UM_CORE_PLATFORM_VALIDATION_FUZZ_PROPERTY_REGRESSION_V1`

## Central fields

| Field | Value |
| --- | --- |
| TASK_ID | UM_CORE_PLATFORM_VALIDATION_FUZZ_PROPERTY_REGRESSION_V1 |
| AGENT_ID | PC2-A2 |
| SOURCE_DEVICE | PC2 |
| DEVICE_ROLE | PLATFORM_CORE_PRIMARY |
| MODE | TEST-ONLY / DETERMINISTIC PROPERTY-STYLE REGRESSION |
| BASE_AT_START | `origin/alpha-0.2` @ `32a76207b149e68a27dc1e932d2c16aa47c9586e` |
| BASE_AT_COMMIT | `origin/alpha-0.2` @ `af1d8247d3af7a74210c2e187e11908d91fdb281` (ff mid-task) |
| BRANCH | `office/um-core-platform-validation-fuzz-property-regression-v1` |
| WORKTREE | `C:\Users\Giga store\Desktop\umtuba\worktrees\PC2-A2-UM-CORE-VALIDATION-PROPERTY-V1` |
| ALPHA_MERGE | **NONE** |
| IMPLEMENTED | **YES** |
| EXTERNAL_FUZZ_PACKAGE | **NONE** |
| SEMANTIC_DEFECT_FOUND | **NO** |
| MINIMAL_REPRODUCTION | **N/A** |
| VERDICT | **PROPERTY_REGRESSION_PUSHED — SUCCESS** |
| REMOTE_SYNC | **0/0** clean (post-push) |
| OUTBOX | `C:\Users\Giga store\Desktop\umtuba\worktrees\OUTBOX_DROP\` |

## DATASET_BOUNDARIES

| Bound | Value |
| --- | --- |
| maxCasesPerFamily | 24 |
| maxPlatforms | 6 |
| maxRequirements | 12 |
| maxCapabilities | 8 |
| maxDependencyEdges | 16 |
| maxRepeatedRuns | 3 |
| maxManifestMutations | 16 |

## DETERMINISTIC_SEEDS

| Seed | Value | Role |
| --- | --- | --- |
| DETERMINISTIC_SEED_PRIMARY | `0x5eedc0de` | Manifest case generation |
| DETERMINISTIC_SEED_SECONDARY | `0x0a11ce55` | P19 requirement families |
| DETERMINISTIC_SEED_DUPLICATE | `0xd00ce001` | Cross-validator duplicate matrix |
| DETERMINISTIC_SEED_UNKNOWN | `0xa11ce002` | Cross-validator unknown-platform matrix |

PRNG: mulberry32 (no `Math.random`, no external fuzz dependency).

## Properties covered

| Property | Manifest (P2) | P13 | P19 | RI |
| --- | --- | --- | --- | --- |
| DETERMINISTIC_OUTPUT | PASS | PASS | PASS | PASS |
| NO_STORE_MUTATION | n/a (pure) | PASS | PASS | PASS |
| NO_INPUT_MUTATION | PASS | PASS | PASS | PASS |
| STABLE_FINDING_ORDER | PASS | PASS | PASS | PASS |
| FAIL_CLOSED_INVALID_REFERENCE | PASS | PASS | PASS | PASS |
| DUPLICATE_INPUT_STABILITY | PASS | PASS | PASS | PASS |
| UNKNOWN_PLATFORM_STABILITY | n/a | PASS | PASS | PASS |
| REPEATED_VALIDATION_EQUIVALENCE | PASS | PASS | PASS | PASS |

## Summary

Added bounded deterministic property-style regression coverage for pure Core validators on current alpha tip. New isolated test file only — **no production semantic changes**, no A1 production edits, no network/DB/migrations, no external fuzz packages, no uncontrolled random long-running fuzzing.

Surfaces exercised via public integrated APIs:

- `validatePlatformManifest` (manifest / P2)
- `validatePlatformDependencies` (P13)
- `validateDependencyRequirements` (P19)
- `validateReferentialIntegrity` (RI)

**SEMANTIC_DEFECT_FOUND = NO.** Two early fixture failures were setup/admission mismatches (P9 refuse-ghost-admit; health status `down` vs `unavailable`) — corrected in the test suite only.

## Exact files changed

- `platforms/core/validation/validationProperty.regression.test.ts` (new)
- `UM_CORE_PLATFORM_VALIDATION_FUZZ_PROPERTY_REGRESSION_V1_REPORT.md` (this report)
- `docs/ai/UM_CORE_PLATFORM_VALIDATION_FUZZ_PROPERTY_REGRESSION_V1_REPORT.md` (copy)
- `docs/ai/CURSOR_REPORT.md` (handoff)
- `worktrees/OUTBOX_DROP/UM_CORE_PLATFORM_VALIDATION_FUZZ_PROPERTY_REGRESSION_V1_REPORT.md` (OUTBOX drop)

## Migrations created

None.

## Security review

- Tests/docs only
- No secrets / `.env` / service-role keys
- No network, DB, or remote migration activity
- Secret scan of new test file: CLEAN

## Tests

| Gate | Result |
| --- | --- |
| Property suite | **15/15 PASS** |
| Deterministic repeated-run (2×) | **PASS / PASS** |
| Full `platforms/core` | **38 files / 391 tests PASS** |

## TypeScript

`npx tsc --noEmit` → exit 0

## Build

Skipped (tests/docs only; no app UI/entry changes).

## git diff --check

PASS

## Conflict scan

Fast-forwarded mid-task from `32a7620` → `af1d824` (`origin/alpha-0.2`). No file conflict with alpha. Own branch only.

## git status --short

Clean after commit/push of own branch (see final agent message).

## Open issues

None blocking. Did not wait for A1; did not self-assign next.
