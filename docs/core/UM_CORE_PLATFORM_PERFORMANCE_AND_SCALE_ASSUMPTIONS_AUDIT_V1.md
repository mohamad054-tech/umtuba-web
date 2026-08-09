# UM Core — Performance & Scale Assumptions Audit V1

**Status:** Audit complete (evidence-based; no production semantic changes)  
**Task:** `UM_CORE_PLATFORM_PERFORMANCE_AND_SCALE_ASSUMPTIONS_AUDIT_V1`  
**Agent:** `PC2-A3` · Device `PC2`  
**Base:** `origin/alpha-0.2` @ `b6d48f915f97c5d20a3b5ca42ec32e83b58f1a57`  
**Branch:** `office/um-core-platform-performance-and-scale-assumptions-audit-v1`  
**Mode:** AUDIT FIRST

## Scope inspected (on BASE_SHA)

| Surface | Integrated on tip? | Primary files |
| --- | --- | --- |
| Platform / capability / event / flag / dependency / health catalogs | YES | `registry/`, `capability/`, `event/`, `flag/`, `dependency/`, `health/healthRegistry.ts` |
| Aggregate registry facade (P12) | YES | `registry/coreRegistry.ts` |
| Event routing + publish admission | YES | `event/eventRouting.ts`, `event/eventPublisher.ts` |
| Flag evaluate / capability assert | YES | `flag/flagEvaluator.ts`, `capability/capabilityAsserter.ts` |
| Health report / diagnostics join / fleet aggregate | YES | `healthReporter.ts`, `healthDiagnosticsJoin.ts`, `fleetHealthAggregation.ts` |
| Bounded health history (P22) | YES | `health/healthHistory.ts` |
| Referential integrity VALIDATE | YES | `validation/referentialIntegrity.ts` |
| Lifecycle readiness (P23) | YES (local barrel; not root re-export) | `readiness/platformReadiness.ts` |
| Capability compatibility matrix | **NO** on BASE_SHA | Exists only off-alpha (`PC2-A1-UM-CORE-CAPABILITY-COMPAT-V1`) |

## Scale model used for risk judgment

UM Core foundations are **in-process catalogs**, not telemetry backends.

| Dimension | Assumed realistic scale | Pathological (out of contract) |
| --- | --- | --- |
| Platforms `P` | 10–100 | ≥10k |
| Caps / events / flags / routes / deps | 10²–10³ | ≥10⁵ |
| Health observations (last-snapshot) | ≤ `P` | unbounded writers |
| History capacity `C` | 1–64 (explicit) | huge `C` without need |
| VALIDATE / REPORT / AGGREGATE cadence | startup, CI, infrequent ops | continuous high-Hz polling |

Ordinary **O(n)** / **O(n log n)** list sorts for determinism are **not** defects at this scale.

## Operation matrix (evidence)

| OPERATION | Surface | CURRENT_COMPLEXITY | EXPECTED_SCALE | RISK | PRIORITY | RECOMMENDED_ACTION |
| --- | --- | --- | --- | --- | --- | --- |
| REGISTER | P4 platform `register` | O(V) validation/compliance + Map set; clones module/capability catalogs | P ≤ 100 | Stores full manifest+validation+compliance per record (intentional SoT) | P2 | Document memory assumption; no change required now |
| REGISTER | P5/P6/P7/P8/P9/P10 catalogs | O(1) Map admit after field checks; P9 cycle = O(E+V) DFS | catalogs ≤ 10³ | Cycle rebuild on each required platform edge is fine at catalog size | P2 | Keep; only revisit if edge counts explode |
| LOOKUP | All `get` / `has` | O(1) Map | any catalog size in model | None | — | Keep Map primary keys |
| LOOKUP | Flag evaluate / capability assert / event publish | O(1) catalog get (+ small array includes) | hot path OK | None | — | Keep |
| LIST | All registry `list()` | O(n log n) copy+`localeCompare` sort | n ≤ 10³ | Deterministic ordering cost — intentional | P2 | Cache sorted snapshot only if LIST becomes hot |
| LIST (filtered) | `listByEventType` / `listByPlatform` / `listByModule` / `listRequirements` / naming `listByKind` | **sort-all then filter** → O(n log n) per call | n ≤ 10³ | Wasteful vs secondary index; not hot today | P2 | Add optional indexes when a consumer loops these APIs |
| ROUTE | P7 `listBy*` | same as filtered LIST | routes ≤ 10³ | Same | P2 | Index by eventType/producer/destination if routing queries heat up |
| VALIDATE | Manifest / registration / P13 dep completeness | O(requires × edges_for_platform) via `list().filter` | per-platform review | Ordinary; `dependencies.list()` sorts whole catalog each call | P2 | Prefer unsorted internal iteration or owner index for P13 |
| VALIDATE | Referential integrity + health observations | Per observation: **`dependencies.list()` full scan** → **O(O × D)** | O,D → hundreds–thousands | Accidental quadratic on observation×deps path | **P1** | Pre-index deps by `fromPlatformId` once before observation loop |
| REPORT | P17 `report` | O(snapshot fields) validate + clone + Map set | ≤ P | Defensive clone intentional | — | Keep |
| REPORT | P17 `list` / fleet+diagnostics consumers | O(P log P) sort + **deep clone every snapshot** | P ≤ 100; rare evaluate | Clone amplification if polled tightly | P2 | Avoid polling; or add readonly internal iterator for trusted Core joins |
| AGGREGATE | Fleet / diagnostics / readiness `evaluate` | O(P log P) union+sort + O(P) lookups; fleet also calls `observations.list()` then `getSnapshot` (extra clones) | P ≤ 100 | Duplicate LIST work; still linear in P | P2 | Single-pass observation Map when composing joins |
| HISTORY_APPEND | P22 `record` | O(snapshot) validate + clone; eviction via `Array.shift` → **O(C)** | C ≤ 64 | Ring shift cost negligible at stated C | P2 | Index-ring only if C grows large |
| HISTORY_QUERY | `getHistory` / `getLatest` | O(C) clone-all / O(1) clone-latest | C ≤ 64 | Intentional immutability clones | — | Keep |
| HISTORY_QUERY | `listPlatformIds` | O(P_hist log P_hist) + filter empty | platforms that ever recorded | Rings Map not auto-pruned on P4 absence | P2 | Document; optional GC helper later (semantic change — report only) |

## Findings detail

### P0

**None.** No evidence of unbounded growth on the success path of history (explicit capacity), no hot-path O(n²) in LOOKUP/assert/publish, and catalog sizes implied by Core’s in-memory model do not create credible production failure modes today.

### P1

1. **Referential integrity observation×dependency rescans**  
   - Evidence: `declaredDependencyTargets()` in `validation/referentialIntegrity.ts` calls `dependencies.list()` for **each** health observation.  
   - Effect: VALIDATE becomes **O(observations × dependency edges)** (+ each `list()` also sorts).  
   - Credible when RI is run as a routine gate over growing catalogs (hundreds of platforms / edges).  
   - Action: build `Map<fromPlatformId, Set<targetId>>` once; do not change finding semantics.

### P2 (deferred / non-blocking)

1. Filtered `listBy*` APIs sort the entire store before filtering (routing, capabilities, dependencies, health declarations, naming).  
2. Fleet / diagnostics / readiness call P17 `list()` which deep-clones all snapshots; fleet then clones again via `getSnapshot`.  
3. History eviction uses `shift()` (O(C)); fine for small C.  
4. No documented soft caps / memory budget for registry growth (by design unlimited catalog Map growth).  
5. Platform REGISTER retains heavyweight embedded validation/compliance objects.  
6. Capability compatibility matrix **not on BASE_SHA**; off-alpha tip builds matrices over platform×capability requirement sets — re-audit when integrated (do not treat as alpha debt until merge).

### Explicit non-defects

- Deterministic `localeCompare` sorts on LIST/VALIDATE findings.  
- Defensive snapshot cloning (immutability contract; covered by hardening tests).  
- Ordinary O(n) scans over catalog membership during VALIDATE/AGGREGATE.  
- `minCompatibility` stored but **never evaluated** (by law) — not a perf bug.  
- P12 aggregate facade is reference composition only (no extra copies).

## NO_CHANGE_AREAS

- LOOKUP hot paths (flag evaluate, capability assert, event publish admission).  
- Bounded history capacity / eviction **semantics**.  
- Deterministic ordering contracts.  
- Immutability clone-on-read contracts (unless a trusted internal read API is added carefully).  
- Product domains / DB / network / alpha merge.

## NEXT_PERFORMANCE_PRIORITY

1. **Index dependency targets by owner once** inside `validateReferentialIntegrity` observation review (P1).  
2. Re-audit filtered `listBy*` + clone amplification only after a real high-frequency consumer appears.  
3. When capability compatibility lands on alpha, score matrix construction separately (platform×requirement cardinality).

## Test note

A small Vitest scale-smoke (`platforms/core/umCoreScaleAssumptions.smoke.test.ts`) exercises ~48 platforms with deps, observations, bounded history fill, fleet aggregate, and RI VALIDATE — structural bounds only (no benchmark package).

## CENTRAL PACKAGING ERRATA (alpha integrate)

Landed onto lpha-0.2 by Central during `UM_CORE_PLATFORM_FINAL_CENTRAL_PRODUCTION_SIGNOFF_V1` as smallest packaging of existing office evidence (no new perf implementation).

**Subsequent alpha note:** the documented P1 RI observation×deps full-scan gap was later addressed on the integration line by `perf(core): pre-index RI observation dependency targets by fromPlatformId` (`84343fdd`) and hot-path scale regression evidence (`af1d8247`). Treat the historical P1 row as closed on current alpha; remaining items stay P2 documentation/scale assumptions.

