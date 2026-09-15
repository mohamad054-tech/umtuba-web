# UM_CORE_PLATFORM_REGRESSION_AND_GAP_AUDIT_V1_REPORT

**TASK_ID:** `UM_CORE_PLATFORM_REGRESSION_AND_GAP_AUDIT_V1`  
**MODE:** `READ_ONLY_AUDIT`  
**AGENT:** `PC2-A3` / device `PC2`  
**WORKTREE:** `C:\Users\Giga store\Desktop\umtuba\worktrees\PC2-A3`  
**BRANCH:** `office/pc2-a3-ready` @ `bc09e1379da595a08e27b3146ff00f3bca5fcb01`  
**DATE:** 2026-08-09  

---

## VERDICT

**GO_WITH_GATES — P1–P16 UM Core is internally coherent and unit-tested (162/162 pass), but the onto-alpha port tip currently carries unresolved `docs/ai` conflict markers and must not be double-integrated with the original off-alpha chain. Highest-value next foundation is Health Reporter (P17).**

Product code under `platforms/core` + `docs/core` is byte-identical between original P16 tip and preserved port tip. Control-plane (P1–P13) + runtime-port starters (P14–P16) form a consistent layered architecture. Alpha itself does **not** contain UM Core yet.

---

## ALPHA_SHA_VERIFIED

| Ref | SHA | Match |
| --- | --- | --- |
| Expected alpha | `bc09e1379da595a08e27b3146ff00f3bca5fcb01` | — |
| `origin/alpha-0.2` after `git fetch --all --prune` | `bc09e1379da595a08e27b3146ff00f3bca5fcb01` | **YES** |
| `office/pc2-a3-ready` HEAD | `bc09e1379da595a08e27b3146ff00f3bca5fcb01` | **YES** |

`platforms/core` file count on alpha: **0** (UM Core not on alpha).

---

## AUDITED_SCOPE

Read-only inspection of UM Core at:

1. Original chain tip P16: `3120432f2cd84a30498192838b2ca58794308352` (`origin/office/um-core-platform-event-publisher-foundation-p16`)
2. Preserved onto-alpha port tip: `6fedc172e95dc15a71133c5edc3c379d8940bf6b` (`office/um-core-platform-onto-alpha-port-v1`) — **not checked out by this agent**

| Area | Location | Status at P16 |
| --- | --- | --- |
| Platform foundation | `platforms/core` P1 contracts / identity | Implemented (contracts) |
| Manifests / validation | `validation/manifestValidator`, `registrationValidator` | Implemented (P2) |
| Compliance | `compliance/complianceEngine` | Implemented (P3) |
| Platform registry | `registry/platformRegistry` | Implemented (P4) |
| Capability registry | `capability/capabilityRegistry` | Implemented (P5) |
| Event type registry | `event/eventTypeRegistry` | Implemented (P6) |
| Event routing | `event/eventRouting` | Implemented (P7 catalog only) |
| Feature flag registry | `flag/flagRegistry` | Implemented (P8) |
| Dependency registry | `dependency/dependencyRegistry` | Implemented (P9) |
| Health declarations/catalog | `health/healthRegistry` | Implemented (P10 catalog only) |
| Naming registry | `naming/namingRegistry` | Implemented (P11) |
| Aggregate/core registry facade | `registry/coreRegistry` | Implemented (P12 Model A) |
| Validator composition | `validation/coreValidator` | Implemented (P13) |
| Flag evaluator | `flag/flagEvaluator` | Implemented (P14 defaults only) |
| Capability asserter | `capability/capabilityAsserter` | Implemented (P15) |
| Event publisher | `event/eventPublisher` | Implemented (P16 admission only) |
| Shared contracts / SDK ports | `sdk/interfaces`, typed barrels | Interfaces only (no SDK impl) |
| Observability foundations | health types + P10 catalog | Declarations only; no reporter/runtime |

**Not audited as product work:** Translation V1/V2, Commerce, Learning, Collaboration, DB/migrations, paid AI.

---

## EXISTING_TEST_COVERAGE

16 focused test files under `platforms/core/**/*.test.ts` (included via `vitest.config.ts` on the port/original chains):

| File | Approx. `it()` count | Layer |
| --- | --- | --- |
| `coreFoundationContracts.test.ts` | 2 | P1 identity |
| `validation/manifestValidation.test.ts` | 13 | P2 |
| `compliance/complianceEngine.test.ts` | 12 | P3 |
| `registry/platformRegistry.test.ts` | 10 | P4 |
| `capability/capabilityRegistry.test.ts` | 10 | P5 |
| `event/eventTypeRegistry.test.ts` | 10 | P6 |
| `event/eventRouting.test.ts` | 8 | P7 |
| `flag/flagRegistry.test.ts` | 10 | P8 |
| `dependency/dependencyRegistry.test.ts` | 15 | P9 |
| `health/healthRegistry.test.ts` | 10 | P10 |
| `naming/namingRegistry.test.ts` | 9 | P11 |
| `registry/coreRegistry.test.ts` | 6 | P12 |
| `validation/coreValidator.test.ts` | 15 | P13 |
| `flag/flagEvaluator.test.ts` | 10 | P14 |
| `capability/capabilityAsserter.test.ts` | 9 | P15 |
| `event/eventPublisher.test.ts` | 13 | P16 |

**Coverage character:** strong per-phase unit/admission tests; several suites already compose P4 platform registry as a dependency. P16 publisher tests assert independence from P7 routing. Explicit negative tests exist for kill-switch/override non-execution (P14) and for non-implementation of deferred ports.

**Absent:** SDK tests; HealthReporter tests; DependencyValidator implementation tests; full multi-registry golden-path harness (register → materialize all catalogs → evaluate/assert/publish); product-platform integration tests (correctly out of scope today).

---

## TEST_RESULTS

Executed read-only against preserved port tip worktree  
`C:\Users\Giga store\Desktop\umtuba\worktrees\PC2-A1-UM-CORE-ONTO-ALPHA-PORT-V1`  
(SHA `6fedc172…`, branch name not mutated; no product edits; no DB/network side effects):

```text
npx vitest run platforms/core
Test Files  16 passed (16)
     Tests  162 passed (162)
Duration  ~1.88s
```

A disposable temp worktree was created at  
`worktrees\_tmp-pc2-a3-um-core-audit` on throwaway branch `temp/pc2-a3-um-core-audit-readonly` from port SHA, then **removed**.  
`office/um-core-platform-onto-alpha-port-v1` SHA remained `6fedc172e95dc15a71133c5edc3c379d8940bf6b` throughout.  
`office/pc2-a3-ready` remained at alpha.

---

## P1_P16_INTERNAL_COHERENCE

**Verdict: COHERENT**

Evidence:

- Linear 16-commit original chain from merge-base `62c6c5d…` → P16 `3120432…`; rewritten 16-commit port series on current alpha → `6fedc17…` (same subjects, new SHAs).
- `platforms/core` and `docs/core` are **content-identical** between original P16 tip and port tip (`git diff --quiet` exit 0).
- Layering matches docs: catalogs (P4–P11) → facade (P12) → validator composition (P13) → runtime ports (P14–P16).
- Explicit architectural invariants encoded in code/docs/tests:
  - Publish ≠ delivery / bus; P16 does not use P7.
  - P12 facade has **no** routing slot (`"routing" in registry` asserted false).
  - Flag evaluator fail-closed; kill-switch/override sources not produced.
  - Capability assertion ≠ user/RBAC auth.
  - Health catalog ≠ monitoring / `UmHealthReporter`.
- No product-platform imports from `platforms/core` (no `lib/` / `app/` imports found).
- Package phase constants P1–P16 present and smoke-tested.

Residual coherence caveats (non-blocking for internal design):

- P7 routing exists but is intentionally outside `UmCoreRegistry`.
- Several SDK/runtime interfaces remain unimplemented by design (`UmHealthReporter`, `UmCoreSdk*`, `UmEventConsumer`, `UmDependencyValidator`).

---

## MISSING_REGRESSION_COVERAGE

Highest-value missing regression nets (still unit-level; no product wiring required):

1. **Multi-registry golden path** — one harness: P2/P3/P4 admit → materialize P5/P6/P7/P8/P9/P10 → P11 rebuild → P12 facade → P13 dependency review → P14/P15/P16 happy + fail paths.
2. **Stale catalog / drift matrix** — platform re-register or manifest change without rematerializing dependent catalogs (health/flags/deps/naming).
3. **Publisher × routing negative contract** — publish success with zero routes / wrong routes (partially present; worth consolidating as a named invariant suite).
4. **Elevated capability × missing flag × asserter** — cross P5/P8/P14/P15 edge matrix as a single table-driven test.
5. **Facade identity / freeze regressions** — already partially covered in P12; extend when HealthReporter/SDK arrive so new slots do not silently expand Model A.
6. **No SDK / HealthReporter / DependencyValidator suites** — expected until those foundations exist; add with P17+.

---

## CONTRACT_GAPS

| Contract | Gap |
| --- | --- |
| `UmHealthReporter` / `UmHealthSnapshot` | Interface-only; no in-memory reporter, no validation of snapshot shape against P10 declarations |
| `UmCoreSdkClient` / `UmCoreSdkFactory` | Interface-only; no composition of P14–P16 (+ future health) |
| `UmDependencyValidator` | Interface-only; P13 does completeness/drift review, not full dependency validator |
| `UmEventConsumer` / delivery | Interface-only; no bus/outbox/retry |
| P7 vs publish | Intentional: routing not consulted on publish — consumers must not assume route-gated emission |
| P14 evaluation context | Accepted but ignored (no cohorts/overrides/kill-switch execution) — contract must stay explicit to avoid false security assumptions |
| Payload schema | `payloadSchemaRef` catalog metadata only; no runtime schema validation in P16 |
| Aggregate registry | No event-routing slot; no validator/runtime ports on facade |

---

## INTEGRATION_RISKS

1. **Double-integration risk (CRITICAL process):** Original off-alpha chain (base `62c6c5d…`) and onto-alpha port (base `bc09e137…`) are parallel rewritten histories. Integrating both would duplicate `platforms/core`. **Use port OR cherry-pick port series only; do not merge original P1–P16 onto alpha after port.**
2. **Preserved port tip has unresolved conflict markers in `docs/ai/CURRENT_TASK.md` and `docs/ai/CURSOR_REPORT.md`** (introduced around port P5 `6816175`). Product tests still pass because markers are docs-only, but the branch is **not merge-clean** for handoff docs.
3. **Shared `vitest.config.ts` include** (`platforms/core/**/*.test.ts`) will collide with any parallel alpha work that also edits Vitest includes.
4. **No alpha consumers yet** — first product platform to depend on `platforms/core` will define real integration risk (ID namespaces, maturity/admission bar, flag defaults).
5. **Name confusion with AI Hub** `lib/ai/hub/capabilityRegistry.ts` (display catalog) vs UM Core capability registry — different packages/semantics, but easy to misuse in reviews/imports.
6. **Observability expectation gap** — operators may assume P10 “health registry” means live monitoring; it does not.

---

## SHARED_FILE_COLLISION_RISKS

Conflict-sensitive files changed on **both** original UM Core chain and alpha since merge-base `62c6c5d…`:

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `vitest.config.ts`

On the **preserved port** (`alpha…port`):

| File | Port status |
| --- | --- |
| `platforms/core/**` | Add-only (clean vs alpha) |
| `docs/core/**` | Add-only (clean vs alpha) |
| `vitest.config.ts` | **Modified** (single include line) |
| `docs/ai/CURRENT_TASK.md` | **Modified + conflict markers present** |
| `docs/ai/CURSOR_REPORT.md` | **Modified + conflict markers present** |

Recommendation for future work: keep UM Core commits away from `docs/ai/*` where possible; resolve port docs conflicts in a dedicated docs-only fix before any alpha merge GO; treat `vitest.config.ts` as a serialized touchpoint.

---

## DUPLICATE_OR_OVERLAPPING_FOUNDATIONS

| Existing alpha concept | Overlap with UM Core | Risk |
| --- | --- | --- |
| `lib/ai/hub/capabilityRegistry.ts` | Name-level only (UI/hub cards) | Medium confusion; low functional overlap |
| `lib/ai/*` / `lib/ads/*` “platform foundations” | Product-domain foundations | Must not import into `platforms/core`; reverse dependency later is OK |
| Ads/AI health helpers (`lib/ads/operations/health.ts`, `lib/privateAi/runtimeHealth.ts`) | Operational health vs UM Core declaration catalog | Conceptual overlap; separate ownership |
| Original P1–P16 chain vs onto-alpha port | Full content duplicate of `platforms/core` | **Do not merge both** |

No second `platforms/core` tree on alpha today.

---

## OBSERVABILITY_GAPS

After P1–P16, observability is still mostly **declarative**:

- P10 stores `reportsStatus` / opaque `probeRef` only.
- No probe execution, polling, scheduling, alerting, or live snapshots.
- `UmHealthReporter.report(snapshot)` unimplemented — also the missing SDK health port.
- No correlation between P16 publish admission and health/degradation signaling.
- No dependency health materialization (`UmDependencyHealthStatus` unused).
- No metrics/tracing/audit sink contracts beyond event envelope fields.

This is the main platform gap blocking a minimal “runtime observability port” story.

---

## HIGHEST_VALUE_NEXT_FOUNDATION

**P17 — UM Core Health Reporter Foundation** (`UmHealthReporter` in-memory / deterministic admission over P10 declarations + snapshot contracts).

Rationale:

1. Completes the SDK runtime quartet already sketched in `UmCoreSdkClient` (`flags` P14, `capabilities` P15, `events` P16, **`health` missing**).
2. Natural sequel to P10 (catalog) the same way P14 followed P8 and P16 followed P6.
3. Unlocks later SDK factory without inventing product monitoring.
4. Aligns with prior PC2-A1 selection guidance (onto-alpha port, then Health Reporter P17).
5. Avoids premature event-bus/delivery complexity still correctly deferred after P16.

**Suggested sequencing after P17:** SDK client/factory (thin composition) → then either DependencyValidator or constrained delivery/routing execution — only with a separate GO.

**Prerequisite gate:** fix port `docs/ai` conflict markers (and keep using the onto-alpha port tip, not the original off-alpha chain) before / as part of landing onto alpha.

---

## SAFE_PARALLELISM_RECOMMENDATION

| Lane | Parallel-safe? | Notes |
| --- | --- | --- |
| UM Core P17 Health Reporter on port tip (after docs conflict cleanup) | Yes (solo UM Core owner) | Touch `platforms/core/health/**`, docs/core P17, tests; avoid `docs/ai` churn if possible |
| Original off-alpha P1–P16 chain further commits | **No** parallel to port | Risk of double-integrate / divergence |
| Translation / Commerce / Learning / Collaboration | Yes, if they do not edit `vitest.config.ts` or claim `platforms/core` | Stay out of UM Core package |
| Vitest include list changes | **Serialize** | Single-file collision |
| Product platform adoption of `um.core` | After alpha land + GO | Not parallel with unfinished port hygiene |

**Do not** start P17 implementation from this audit agent/session.

---

## PRESERVED_PORT_BRANCH_STATUS

| Check | Result |
| --- | --- |
| Branch name | `office/um-core-platform-onto-alpha-port-v1` |
| Tip SHA (start) | `6fedc172e95dc15a71133c5edc3c379d8940bf6b` |
| Tip SHA (end) | `6fedc172e95dc15a71133c5edc3c379d8940bf6b` (**unchanged**) |
| Checked out by PC2-A3? | **No** (existing worktree `PC2-A1-UM-CORE-ONTO-ALPHA-PORT-V1` already had it; used read-only for tests) |
| Mutated (checkout/reset/rebase/merge/cherry-pick/push)? | **No** |
| Ahead of `origin/alpha-0.2` | 16 commits (rewritten P1–P16) |
| Product tree vs original P16 | `platforms/core` + `docs/core` identical |
| Docs hygiene | **FAIL** — unresolved conflict markers in `docs/ai/CURRENT_TASK.md` and `docs/ai/CURSOR_REPORT.md` |
| Temp audit worktree | Created then removed; throwaway branch deleted |

---

## READY_FOR_CENTRAL_REVIEW

**YES — audit complete; ready for central review.**

Gates for any subsequent implementation GO (not started here):

1. Treat onto-alpha port as the only integration vehicle; do not also merge original P1–P16.
2. Resolve `docs/ai` conflict markers on the port before merge consideration.
3. Next foundation recommendation stands: **Health Reporter P17**.
4. UM Core unit suite is green (162/162) on port tip.

**STOP.** No implementation started.
