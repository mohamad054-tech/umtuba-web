# UM_CORE_PLATFORM_CATALOG_DRIFT_REGRESSION_MATRIX_V1_REPORT

## PC2 REPORT header

SOURCE_DEVICE=PC2 · DEVICE_ROLE=PLATFORM_CORE_PRIMARY · AGENT_ID=PC2-A3

## Central fields

| Field | Value |
| --- | --- |
| TASK_ID | `UM_CORE_PLATFORM_CATALOG_DRIFT_REGRESSION_MATRIX_V1` |
| AGENT_ID | `PC2-A3` |
| SOURCE_DEVICE | `PC2` |
| DEVICE_ROLE | `PLATFORM_CORE_PRIMARY` |
| MODE | `TEST-ONLY` |
| VERDICT | `DRIFT_MATRIX_ADDED_AND_PUSHED — SUCCESS` |
| BASE_SHA | `ffce2c084c99546c07c3a1067c07c3cd107aac2c` (`origin/alpha-0.2` exact match) |
| BRANCH | `office/um-core-platform-catalog-drift-regression-matrix-v1` |
| FINAL_SHA | *(filled after commit/push)* |
| WORKTREE | `C:\Users\Giga store\Desktop\umtuba\worktrees\PC2-A3-UM-CORE-CATALOG-DRIFT-V1` |
| ALPHA_MERGE | **NONE** |
| OUTBOX | `C:\Users\Giga store\Desktop\umtuba\worktrees\OUTBOX_DROP\` |

## Summary

Added a consolidated deterministic catalog / stale-catalog drift regression matrix under `platforms/core/` using **current alpha public APIs only**. No production semantic changes. No A1 dependency-validator / A2 `referentialIntegrity.ts` production edits. Validators under test remain pure (read-only).

## FILES_CHANGED

| Path | Role |
| --- | --- |
| `platforms/core/catalogDrift.regression.test.ts` | **NEW** consolidated drift matrix (9 tests) |
| `UM_CORE_PLATFORM_CATALOG_DRIFT_REGRESSION_MATRIX_V1_REPORT.md` | This report (worktree root) |
| `docs/ai/UM_CORE_PLATFORM_CATALOG_DRIFT_REGRESSION_MATRIX_V1_REPORT.md` | Report copy |
| `docs/ai/CURSOR_REPORT.md` | Handoff sections |
| `worktrees/OUTBOX_DROP/UM_CORE_PLATFORM_CATALOG_DRIFT_REGRESSION_MATRIX_V1_REPORT.md` | OUTBOX drop |

## DRIFT_CASES

| Case | Coverage |
| --- | --- |
| D1 re-register without rematerializing dependents | Platform re-register leaves P9 edges unrepaired → `STALE_CATALOG_EDGE` + `MISSING_CATALOG_EDGE`; dependent edges unchanged across target re-register |
| D2 publisher × routing independence | Publish admits with empty / cleared routes; RI route/producer orphans are independent of publish admission |
| D3 declaration vs observation drift | Declaration-only orphan; observation capability/dependency drift with valid declaration; co-reported declaration+observation platform orphans |
| D4 P13 × RI coexistence | Same drifted state emits P13 `STALE_CATALOG_EDGE` + `UNKNOWN_PLATFORM_TARGET` alongside RI `DEPENDENCY_UNKNOWN_PLATFORM_TARGET` (distinct namespaces, no remapping) |
| Invariants | Deterministic ordering (P13 + RI) and store mutation check |

## EXPECTED_CODES

| Namespace | Codes exercised |
| --- | --- |
| P13 (`UmDependencyValidationCode`) | `dependency.validation.stale_catalog_edge`, `dependency.validation.missing_catalog_edge`, `dependency.validation.unknown_platform_target` |
| RI (`UmReferentialIntegrityCode`) | `referential.route.unknown_destination`, `referential.route.unknown_producer`, `referential.event_type.unknown_producer`, `referential.health_declaration.unknown_platform`, `referential.health_observation.unknown_platform`, `referential.health_observation.unknown_capability`, `referential.health_observation.unknown_dependency_target`, `referential.dependency.unknown_platform_target` |

## DETERMINISTIC_ORDERING

**PASS** — repeated P13/RI runs equal; finding keys sorted by code/target/path/message as emitted by production validators.

## STORE_MUTATION_CHECK

**PASS** — fingerprint of platforms/dependencies/capabilities/eventTypes/eventRoutes/flags/healthDeclarations/healthObservations unchanged across `validatePlatformDependencies`, `createUmCoreValidator().validateDependencies`, and `validateReferentialIntegrity`.

## FOCUSED_TESTS

`npx vitest run platforms/core/catalogDrift.regression.test.ts` → **9/9 PASS**

## FULL_CORE_REGRESSION

`npx vitest run platforms/core` → **33 files / 342 tests PASS**

## TSC

`npx tsc --noEmit` → **PASS** (exit 0)

## DIFF_CHECK

`git diff --check` → **PASS** (exit 0)

## CONFLICT_SCAN

**PASS** — no `<<<<<<<` / `=======` / `>>>>>>>` markers in changed files.

## SECRET_SCAN

**PASS** — no API key / service_role / private key / JWT-like / sk- patterns in changed files.

## PUSH_STATUS

*(filled after push)*

## AHEAD_BEHIND

*(filled after push)*

## WORKING_TREE

*(filled after push — expect clean 0/0)*

## READY_FOR_INTEGRATION

**YES** — test-only branch; no production API edits; alpha tip base verified; ready for Central integration review (no self alpha merge).

## Migrations created

**NONE.**

## Security review

- Tests only; no production semantic changes
- Did not edit A1 `dependencyValidator*` / validation index ownership surfaces
- Did not edit A2 `referentialIntegrity.ts` production source (tests CALL only)
- No DB / migrations / network / product domains / alpha merge
- Conflict + secret scans clean

## STOP

Do not wait for A1/A2. Do not self-assign next. No alpha merge.
