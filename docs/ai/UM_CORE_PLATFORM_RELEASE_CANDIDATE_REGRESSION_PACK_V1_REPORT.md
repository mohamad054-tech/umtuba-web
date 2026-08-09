# UM_CORE_PLATFORM_RELEASE_CANDIDATE_REGRESSION_PACK_V1_REPORT

## PC2 REPORT header

- **SOURCE_DEVICE:** PC2
- **DEVICE_ROLE:** PLATFORM_CORE_PRIMARY
- **AGENT_ID:** PC2-A2
- **TASK_ID:** `UM_CORE_PLATFORM_RELEASE_CANDIDATE_REGRESSION_PACK_V1`

## Central fields

| Field | Value |
| --- | --- |
| TASK_ID | UM_CORE_PLATFORM_RELEASE_CANDIDATE_REGRESSION_PACK_V1 |
| AGENT_ID | PC2-A2 |
| SOURCE_DEVICE | PC2 |
| DEVICE_ROLE | PLATFORM_CORE_PRIMARY |
| MODE | TEST-ONLY / RELEASE REGRESSION |
| BASE_SHA | `af1d8247d3af7a74210c2e187e11908d91fdb281` (`origin/alpha-0.2` at start) |
| BRANCH | `office/um-core-platform-release-candidate-regression-pack-v1` |
| WORKTREE | `C:\Users\Giga store\Desktop\umtuba\worktrees\PC2-A2-UM-CORE-RC-REGRESSION-PACK-V1` |
| ALPHA_MERGE | **NONE** |
| VERDICT | **RC_PACK_ADDED_AND_PUSHED — SUCCESS** |
| SEMANTIC_DEFECT_FOUND | **NO** |
| PACK_COMMIT | `267db64e912fda4132bfe438b4b0b07bb6b1d8da` (test pack) |
| FINAL_SHA | `2a2e77969cfda7eb8b0a8355465b8f5809f19aaf` |
| REMOTE_BRANCH | `origin/office/um-core-platform-release-candidate-regression-pack-v1` |
| PUSH | **DONE** (tracking clean `0/0`) |
| OUTBOX | Not available on this device (no OUTBOX / OUTBOX_DROP path found) |

## Summary

Added consolidated release-candidate regression pack over **actual** integrated Core public behavior on current alpha tip `af1d824`. Pack complements golden-path, production-contract suite, P1–P19 coherence matrix, catalog-drift matrix, and property/hot-path suites — orchestrates smoke of production-critical invariants in one isolated file.

No production semantics were modified. No semantic defect was found → did not stop with `SEMANTIC_DEFECT_FOUND`.

## Exact files changed

- `platforms/core/releaseCandidate.regression.pack.test.ts` — new RC pack (22 tests)
- `docs/ai/UM_CORE_PLATFORM_RELEASE_CANDIDATE_REGRESSION_PACK_V1_REPORT.md` — this report
- `docs/ai/CURSOR_REPORT.md` — handoff mirror
- `UM_CORE_PLATFORM_RELEASE_CANDIDATE_REGRESSION_PACK_V1_REPORT.md` — worktree root copy

## TEST_MATRIX

| Area | Integrated on alpha? | Pack coverage |
| --- | --- | --- |
| Platform registration | Yes (P4) | Admit valid; reject invalid fail-closed; deterministic list order; duplicate fail-closed |
| Manifest validation | Yes (P2) | Naming reject; admission gate |
| Compliance | Yes (P3) | Compliant follows admission |
| P13 validator composition | Yes | Missing catalog edge; composed `createUmCoreValidator` equality; non-mutation |
| P19 dependency validator | Yes | peer_kernel ok without P9; cycle ≠ RI; code namespace `dependency.validator.*` |
| Referential Integrity | Yes | Cap→flag drift; green when catalogs clean; ≠ P19 |
| Events / routing | Yes (P6/P7) | UNKNOWN_EVENT_TYPE / UNKNOWN_DESTINATION; deterministic route ids |
| Health declaration vs observation | Yes (P10/P17) | Declaration register; last-snapshot SoT; join class |
| Lifecycle readiness | Yes (P23 local barrel) | Observation `ready` ≠ READY; READY when registered+declared+observed |
| Capability compatibility | Yes (P24 via capability barrel) | COMPATIBLE vs INCOMPATIBLE; ≠ health/readiness vocabularies |
| Diagnostics / join | Yes (P18) | Deterministic `declared_and_observed` |
| Fleet aggregation | Yes (P20) | Pure + order-stable; UNKNOWN_PLATFORM |
| SDK / factory | Yes (P21) | createClient; throw on missing deps |
| Bounded history | Yes (P22) | Capacity reject; FIFO eviction |
| Snapshot immutability | Yes | Input + returned snapshot mutation isolation |
| Public API backward compat | Yes (guard suite exists) | Root barrel key smoke; readiness intentionally not on root barrel |
| Catalog drift | Yes | P13 missing edges without rematerialization; RI green |
| Determinism / idempotency | Yes | Repeated P13/P19/RI/readiness/compat equality; sorted finding keys |
| Store non-mutation | Yes | Fingerprint before/after pure validators |

## NEGATIVE_PATHS

| Assertion | Status |
| --- | --- |
| P13 ≠ P19 | **PASS** |
| P19 ≠ Referential Integrity | **PASS** |
| Health ≠ Lifecycle Readiness | **PASS** |
| Capability Compatibility ≠ Health | **PASS** |
| Capability Compatibility ≠ Lifecycle Readiness | **PASS** |
| Pure validators do not mutate stores | **PASS** |
| Repeated validation is deterministic | **PASS** |
| UNKNOWN_PLATFORM (cap/health/fleet) | **PASS** |
| MUTATION_ISOLATION | **PASS** |
| INVALID manifest / DUPLICATE registration | **PASS** |

## SEMANTIC_DEFECT_FOUND

**NO**

## MINIMAL_REPRODUCTION

N/A — no semantic defect.

## Tests

- RC pack: **22/22 PASS**
- Full `platforms/core`: **38 files / 398 tests PASS**
- `npx tsc --noEmit` → **PASS**
- `git diff --check` → **PASS**
- Push status → **0/0 clean**

## STOP

Do not wait for A1. Do not self-assign next.
