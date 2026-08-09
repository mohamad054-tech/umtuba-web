# UM_CORE_P17_HEALTH_REPORTER_CONTRACT_AND_COMPATIBILITY_AUDIT_V1_REPORT

**TASK_ID:** `UM_CORE_P17_HEALTH_REPORTER_CONTRACT_AND_COMPATIBILITY_AUDIT_V1`  
**MODE:** `READ_ONLY_AUDIT` (no P17 implementation; no A1 edits)  
**AGENT:** `PC2-A2`  
**DEVICE:** `PC2`  
**WORKTREE:** `C:\Users\Giga store\Desktop\umtuba\worktrees\PC2-A2`  
**WORKTREE_BRANCH:** `office/pc2-a2-ready`  
**AUDITED_AT:** 2026-08-09 (local)

---

## VERDICT

P17 must implement a **P4-gated, result-returning, in-memory observation admission/store** for `UmHealthSnapshot`, orthogonal to the P10 declaration catalog. Integrated alpha already contains P1–P16 (`platforms/core` present). A1 tip **is visible** on `origin/office/um-core-platform-health-reporter-foundation-p17` @ `ef890c6497cadd4978215d3615840b9b2c01cbbf` (parent = exact alpha SHA; **0 behind / 1 ahead**; merge-tree clean). Intended contract from P1–P16 and delivered A1 align on the critical declaration≠observation boundary, status taxonomy, fail-closed admission, and shared-file touch pattern (P16-style). Residual Central review items are listed below — **not blockers identified for contract shape**.

`IMPLEMENTATION_NOT_YET_VISIBLE` = **NO** (A1 tip fetched and inspected read-only).

---

## SYNC / SHA EVIDENCE

| Field | Value |
| --- | --- |
| `git fetch --all --prune` | Done |
| Expected `origin/alpha-0.2` | `0999fc1d5f1ec5a7db0c3c2e614bd10e67bc87a2` |
| Actual `origin/alpha-0.2` | `0999fc1d5f1ec5a7db0c3c2e614bd10e67bc87a2` |
| Alpha match | **YES** |
| Alpha tip subject | `fix(core): clean stale conflict markers from port reports` |
| A1 branch | `origin/office/um-core-platform-health-reporter-foundation-p17` |
| A1 tip | `ef890c6497cadd4978215d3615840b9b2c01cbbf` |
| A1 parent | `0999fc1d5f1ec5a7db0c3c2e614bd10e67bc87a2` (= alpha) |
| `alpha...A1` left-right | `0` / `1` |
| merge-tree `alpha` ← A1 | Clean tree `ee1af2d562a74c69e3b4a4ef2c236fc9aab2b854` |
| A1 worktree mutated by this audit? | **NO** |
| PC2-A2 HEAD mutated product code? | **NO** (report artifact only) |

---

## REQUIRED CONTRACT (from integrated P1–P16 on alpha)

### Layer map (health-related)

| Layer | Pn | Role for P17 |
| --- | --- | --- |
| Manifest `health` object | P1/P2 | Structural: `health` required; `reportsStatus` boolean |
| Compliance health evidence | P3 | Scores **declaration** (`reportsStatus` / `probeRef`) — not live snapshots |
| Platform registry | P4 | **SoT for platform existence**; P17 admission gate |
| Capability / dependency catalogs | P5 / P9 | Snapshot fields may *name* ids; P17 does **not** resolve them |
| Health declaration catalog | P10 | Intent/metadata only (`UmHealthRegistry`); **not** monitoring |
| Aggregate facade | P12 | Slot `health` remains **P10 declaration registry** — not reporter |
| Runtime ports P14–P16 | P14–P16 | Pattern template: result-returning, fail-closed, no throw |
| SDK surface | P1 (+ evolutions) | `UmCoreSdkClient.health: UmHealthReporter`; factory still unimplemented |

### Normative boundaries already frozen on alpha

1. **HEALTH DECLARATION REGISTRATION IS NOT HEALTH MONITORING** (P10).
2. P10 explicitly defers `UmHealthReporter` / live snapshots / probes.
3. P12 `UmCoreRegistry.health` is `UmHealthRegistry` (declaration catalog), seven slots fixed — **no reporter slot**.
4. P3 `HEALTH_REPORTING_REQUIRED` / `HEALTH_PROBE_EVIDENCE_MISSING` evaluate **manifest declaration**, not observation store.
5. P1 retained types: `UmHealthStatus`, `UmHealthSnapshot`, `UmDependencyHealthStatus`, `UmHealthProbeRegistration`, `UmHealthReporter` (pre-P17: `report(...): void`).
6. Status taxonomy (Standards §18.3): **`ready` | `degraded` | `unavailable`** only.
7. P16 precedent for runtime ports: evolve void → `{ ok, findings }` result; separate `*Codes.ts`; no severity on admission findings; no bus/delivery side effects.

---

## INPUTS

P17 factory / `report` inputs that the contract requires:

| Input | Type / source | Required semantics |
| --- | --- | --- |
| `deps.platforms` | `UmPlatformRegistry` (P4) | Sole registry dependency for admission |
| `snapshot.platformId` | `UmPlatformId` | Non-empty trimmed + valid machine id; must exist in P4 |
| `snapshot.status` | `UmHealthStatus` | Exactly one of `ready` / `degraded` / `unavailable` |
| `snapshot.checkedAt` | `string` | Caller-supplied; non-empty; **no Core clock** |
| `snapshot.affectedCapabilityIds` | `readonly UmCapabilityId[]` | Array of valid machine ids (structural); **not** P5 lookup |
| `snapshot.dependencyStatuses` | `readonly UmDependencyHealthStatus[]` | Array of `{ targetId, status }` with valid status taxonomy |
| `snapshot.detail` | optional `string` | If present, must be string |

**Explicit non-inputs (must not be required):**

- P10 `UmHealthRegistry` / declaration rows
- P5 capability registry / P9 dependency registry
- P7 routing, P14 flags, P15 asserter, P16 publisher
- Network/probe/schedule/alert configuration
- Wall-clock / auto `checkedAt`

---

## OUTPUTS

| Output | Contract |
| --- | --- |
| `report(snapshot)` | Returns `UmHealthReportResult` `{ ok, platformId, findings }` — **does not throw** |
| Success | `ok: true`, empty `findings`, snapshot stored (last-write-wins per `platformId`) |
| Failure | `ok: false`, ≥1 findings, **store unchanged** |
| `getSnapshot(platformId)` | Last admitted snapshot or `undefined` (absence ≠ `unavailable`) |
| `list()` / `has()` / `size()` / `clear()` | In-memory observation store helpers (P17 writable surface) |
| Finding codes | Stable machine ids under `health.report.*` namespace (parallel to `health.registry.*` for P10 and `event.publish.*` for P16) |

### Required finding codes (admission)

| Code constant | Wire value | When |
| --- | --- | --- |
| `PLATFORM_ID_REQUIRED` | `health.report.platform_id_required` | Missing/empty `platformId` |
| `PLATFORM_ID_NAMING` | `health.report.platform_id_naming` | Invalid machine id |
| `UNKNOWN_PLATFORM` | `health.report.unknown_platform` | Not in P4 |
| `STATUS_INVALID` | `health.report.status_invalid` | Status outside §18.3 (incl. dependency statuses) |
| `SNAPSHOT_INVALID` | `health.report.snapshot_invalid` | Structural defects (`checkedAt`, arrays, detail type, etc.) |

Findings: `{ code, message, path? }` — **no severity** (P16 publish style), deterministic sort.

---

## STATE SEMANTICS

| Concern | Required behavior |
| --- | --- |
| Store contents | Last successful observation per `platformId` only |
| Replace policy | Successful report **replaces** prior snapshot for same platform |
| Failed report | Never mutates store |
| Cloning | Stored snapshot must be defensive copy (arrays/objects not caller-aliased) |
| Ordering | `list()` sorted by `platformId` lexicographically |
| Absence | No row ⇒ `getSnapshot` `undefined` — **not** inferred `unavailable` / `degraded` |
| Clocks | None; `checkedAt` pass-through |
| Persistence | Heap only |
| Side effects | None (no probe exec, poll, network, alert, remediation) |
| P4 / P10 catalogs | Read P4 for admission; **never write** P4 or P10 |
| Aggregate facade | Unchanged; still seven slots; `health` remains declaration registry |

---

## UNREGISTERED BEHAVIOR

| Case | Required |
| --- | --- |
| `platformId` unknown to P4 | Reject with `health.report.unknown_platform`; store size unchanged |
| Platform registered in P4 but **no** P10 declaration row | **Still admissible** if snapshot valid (P17 does not require P10) |
| P10 declaration exists, never `report()` | `getSnapshot` remains `undefined` |
| Invalid id / status / structure | Reject fail-closed; no partial store |
| Unregistered platform after prior success for another id | Only the unknown id fails; other platforms’ snapshots untouched |

---

## DECLARATION-VS-OBSERVATION BOUNDARY

| | **Declaration (P10)** | **Observation (P17)** |
| --- | --- | --- |
| API | `createInMemoryHealthRegistry` / `register` | `createInMemoryHealthReporter` / `report` |
| SoT dependency | P4 + exact match to `manifest.health` | P4 existence only |
| Data | `reportsStatus`, opaque `probeRef`, `notes` | `UmHealthSnapshot` live status + capability/dep status lists |
| Proves health? | **No** — intent/metadata only | **No probe proof** — stores caller-supplied observation only |
| Codes namespace | `health.registry.*` | `health.report.*` |
| Aggregate slot | `UmCoreRegistry.health` | **Not a facade slot** |
| Compliance (P3) | Uses declaration fields | Must remain unused by P17 |
| Cross-mutation | P17 must not register/clear P10 | P10 must not create snapshots |

**Invariant sentence for Central:**  
*A P10 row never implies a P17 snapshot; a P17 snapshot never mutates or validates against a P10 row; both independently require a P4 platform.*

---

## COMPATIBILITY INVARIANTS

1. **Taxonomy freeze:** only `ready|degraded|unavailable`; reject `healthy`/`unhealthy`/`unknown`.
2. **P10 untouched behavior:** existing `health.registry.*` codes and `createInMemoryHealthRegistry` semantics remain byte-stable.
3. **P2/P3 untouched:** manifest validation + compliance engines must not gain observation logic.
4. **P12 slot freeze:** do not add an 8th aggregate slot for reporter; do not retype `UmCoreRegistry.health` to reporter.
5. **SDK alignment:** `UmCoreSdkClient.health` stays `UmHealthReporter`; `UmSdkReportHealth` return type tracks `ReturnType<UmHealthReporter["report"]>` (same evolution as `UmSdkPublishEvent` vs P16).
6. **Signature evolution (alpha → P17):** `UmHealthReporter.report: void → UmHealthReportResult` + add `getSnapshot` is **allowed and expected**, mirroring P16’s void→result publisher evolution. No concrete SDK client on alpha yet ⇒ no runtime callers to break inside Core.
7. **Code namespace separation:** never reuse `health.registry.*` for report findings.
8. **No product / DB / migration / networking.**
9. **Phase identity:** `UM_CORE_HEALTH_REPORTER_PHASE = "P17"`; doc canonical id `um.core.health_reporter_foundation_p17` (doc-only, same pattern as P13–P16).
10. **`reportsStatus: false` platforms:** admission is P4-only in required contract as delivered by A1 / as implied by P10 orthogonality — Central should **explicitly accept** that declaration-false does not hard-block observation (observation remains optional evidence, not compliance).

---

## REGRESSION MATRIX

| # | Scenario | Expect |
| --- | --- | --- |
| R1 | Valid snapshot + registered platform | `ok:true`, empty findings, `getSnapshot` equals admitted snapshot |
| R2 | Unknown platform | `ok:false` + `unknown_platform`; size 0 / unchanged |
| R3 | Empty / whitespace `platformId` | `platform_id_required` |
| R4 | Invalid machine id (`Bad-Id`) | `platform_id_naming` |
| R5 | Status `healthy` / other non-taxonomy | `status_invalid`; no store |
| R6 | Empty `checkedAt` | `snapshot_invalid` @ `checkedAt` |
| R7 | Bad capability id in `affectedCapabilityIds` | `snapshot_invalid` |
| R8 | Empty dep `targetId` | `snapshot_invalid` |
| R9 | Dep status `unknown` | `status_invalid` |
| R10 | Second successful report same platform | size stays 1; last snapshot wins |
| R11 | Multi-platform `list()` | sorted by `platformId` |
| R12 | P10 register only, no `report` | `getSnapshot` undefined; P10 size unchanged by reporter |
| R13 | Identical valid snapshots twice | deterministic identical results + store |
| R14 | `clear()` | empties observations; no probe/poll/schedule/fetch/alert surface |
| R15 | Multi-finding reject | findings sorted deterministically; other ports untouched |
| R16 | Full `platforms/core` suite | P10 + P1–P16 tests still green after P17 land |
| R17 | `tsc --noEmit` | pass |
| R18 | No conflict markers / `git diff --check` | pass |

A1 focused suite maps to R1–R15 (11 tests). A1 self-report claims full Core 173 tests + tsc pass — **not re-executed in this audit** (read-only contract audit).

---

## INTENDED (P1–P16) vs DELIVERED (A1) — READ-ONLY COMPARE

| Contract item | Required by alpha P1–P16 | A1 @ `ef890c6` | Match |
| --- | --- | --- | --- |
| Factory `createInMemoryHealthReporter({ platforms })` | Implied by deferred reporter + P16 pattern | Yes | **YES** |
| Result-returning `report` | P16-style evolution of void port | Yes | **YES** |
| P4 gate / unknown reject | Registry law | Yes | **YES** |
| No P10 dependency in deps | P10 docs: reporter separate | `UmHealthReporterDeps = { platforms }` only | **YES** |
| Status taxonomy §18.3 | P1 types | Enforced | **YES** |
| No probe/poll/network | P10/P12/P16 non-goals | Documented + tested surface absence | **YES** |
| Codes `health.report.*` | Namespace split from P10 | `reporterCodes.ts` | **YES** |
| Shared file touch set | packageIdentity / sdk / README / health types+index | Same set + new reporter files/doc | **YES** |
| Does not edit `healthRegistry.ts` / P2 / P3 / P12 impl | Compatibility | Diff name-only confirms | **YES** |
| Aggregate slot unchanged | P12 freeze | No facade changes | **YES** |
| Canonical doc identity | P13–P16 pattern | Present in P17 doc | **YES** |
| Machine id constant in `packageIdentity` beyond phase | Not required historically | Phase only (same as P13–P16) | **YES** |
| Gate on `reportsStatus===true` | **Not** required by P10 orthogonality | Not gated | **ALIGNED** (confirm intentionally) |
| `checkedAt` ISO validation | Not specified on alpha | Non-empty string only | **ALIGNED** |
| P5/P9 referential checks on snapshot ids | Not required for foundation | Structural only | **ALIGNED** |

**Files A1 changes (inspect only):**

- new: `healthReporter.ts`, `healthReporter.test.ts`, `reporterCodes.ts`, `docs/core/UM_CORE_PLATFORM_HEALTH_REPORTER_FOUNDATION_P17.md`
- shared: `health/types.ts`, `health/index.ts`, `packageIdentity.ts`, `sdk/interfaces.ts`, `README.md`

---

## SHARED-FILE RISKS

| File | Risk | Mitigation / note |
| --- | --- | --- |
| `platforms/core/health/types.ts` | Concurrent edits with any future health work; signature change of `UmHealthReporter` | Only P17 should evolve reporter now; keep P10 interfaces stable |
| `platforms/core/health/index.ts` | Export collisions | Additive exports only (`reporterCodes`, factory) |
| `platforms/core/packageIdentity.ts` | Every Pn appends — classic conflict magnet | Single-line additive `P17` constant; ff from alpha is clean today |
| `platforms/core/sdk/interfaces.ts` | Parallel SDK port evolutions | Touch only `UmSdkReportHealth` return type |
| `platforms/core/README.md` | Doc append races | Additive `## Phase P17 scope` section |
| `platforms/core/health/healthRegistry.ts` | **Must remain untouched** | A1 compliant |
| `platforms/core/registry/interfaces.ts` / `platformRegistry.ts` | Aggregate / P4 drift | A1 does not touch |
| `platforms/core/compliance/*`, `validation/*` | Declaration vs observation bleed | A1 does not touch |
| Product domains / migrations | Forbidden | Absent from A1 diff |

**Integration note:** A1 is already a clean +1 commit on current alpha ⇒ lowest shared-file conflict risk among open Core branches.

---

## CENTRAL REVIEW CHECKLIST

Use this as the integration gate (contract + compatibility):

- [ ] Alpha SHA still `0999fc1d5f1ec5a7db0c3c2e614bd10e67bc87a2` (or re-audit if moved)
- [ ] P17 branch parent is that alpha tip (ff-only merge preferred)
- [ ] `UmHealthReporter.report` is result-returning; no throw
- [ ] Finding codes use `health.report.*` only (not `health.registry.*`)
- [ ] Status taxonomy enforced for snapshot **and** dependency statuses
- [ ] Unknown / invalid platform never stores
- [ ] Failed report never mutates store; success replaces per platform
- [ ] No Core clock; `checkedAt` caller-owned
- [ ] P10 catalog not in deps; not read/written on report path
- [ ] Explicit test: P10 declaration alone ⇒ no snapshot
- [ ] `UmCoreRegistry` still exactly seven slots; `health` still declaration registry
- [ ] P2/P3/P10 tests still pass unchanged in behavior
- [ ] `packageIdentity` adds `UM_CORE_HEALTH_REPORTER_PHASE = "P17"` only
- [ ] SDK `UmSdkReportHealth` aligned to reporter result type; no SDK client/factory implementation sneaks in
- [ ] No probe execution, networking, persistence, migrations, product wiring
- [ ] README/docs state declaration≠observation and non-goals
- [ ] Full `platforms/core` vitest + `tsc --noEmit` + `git diff --check` + conflict-marker scan
- [ ] **Policy accept:** `reportsStatus: false` does not hard-block P17 observation (or document a deliberate future gate if Central rejects)
- [ ] No second parallel P17 implementation branch merged alongside A1

---

## OPEN ISSUES / NON-BLOCKERS FOR CENTRAL

1. **Policy confirm:** observation admission ignoring `manifest.health.reportsStatus` / P10 row — recommended **ACCEPT** (keeps layers orthogonal; compliance stays declaration-based).
2. **`checkedAt` format:** not ISO-enforced — acceptable for foundation; future milestone if needed.
3. **No P5/P9 referential integrity** on snapshot capability/dependency ids — acceptable for P17 foundation (structural machine-id only).
4. A1 “other ports untouched” test uses `undefined` typed placeholders — weak as a regression guard; does not undermine contract correctness.
5. This audit did **not** re-run vitest/tsc (contract/compatibility scope only). Execution evidence remains A1’s report unless Central orders a verify pass.

---

## READY_FOR_CENTRAL_REVIEW

**YES**

- Required P17 contract derived from integrated P1–P16 on alpha.
- A1 tip visible and compared read-only; **IMPLEMENTATION_NOT_YET_VISIBLE = false**.
- No A1 files edited; no second P17 implemented; no push; no DB/migrations.
- Report artifact written for Central handoff.

---

## STOP

No next work self-assigned. Awaiting Central.
