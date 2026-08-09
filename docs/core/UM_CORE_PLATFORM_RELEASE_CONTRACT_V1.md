# UM Core Platform — Release Contract V1

**Status:** Authoritative release-contract closeout (docs + evidence alignment)
**TASK_ID:** `UM_CORE_PLATFORM_SPEC_STANDARDS_RELEASE_CONTRACT_CLOSEOUT_V1`
**AGENT:** `PC2-A2` · **DEVICE:** `PC2` · **ROLE:** `PLATFORM_CORE_PRIMARY`
**BASE:** `origin/alpha-0.2` @ `a93f52235fee11e73ad9953993e109a894f99aac`
**PUBLIC BARREL:** `platforms/core/index.ts`
**CLOSEOUT_CLASSIFICATION:** `DOCS_ONLY` + `CONTRACT_MATRIX` + `RELEASE_STANDARD` + `TEST_EVIDENCE`
**MODE:** Capture landed law only — **no new foundation**, **no production API redesign**, **no invented runtime semantics**

## 1. Authority and evidence sources

This release contract is the umbrella normative closeout for Spec / Standards production-readiness packaging on the verified alpha tip. It does **not** replace per-foundation phase docs.

| Evidence | Role |
| --- | --- |
| `platforms/core/index.ts` (+ re-exported sub-barrels) | Actual public API SoT |
| `docs/core/UM_CORE_PUBLIC_API_CONTRACT_MATRIX_V1.md` | Inventory / readiness matrix (see §12 errata) |
| `platforms/core/test/publicApiBackwardCompatibility.fixture.json` | Frozen practical BC baseline |
| `platforms/core/publicApiBackwardCompatibility.guard.test.ts` | BC enforcement |
| `platforms/core/p1P19ContractCoherence.matrix.test.ts` | P13 ≠ P19 ≠ RI; Health ≠ Readiness |
| `docs/core/UM_CORE_SPECIFICATION_V1.md` | Cited Spec file (`@see UM_CORE_SPECIFICATION_V1`) |
| `docs/core/UM_CORE_ENGINEERING_STANDARDS_V1.md` | Cited Standards file (`@see UM_CORE_ENGINEERING_STANDARDS_V1`) |

**Law:** Public API = symbols reachable from `platforms/core/index.ts`. Deep imports of non-exported modules are **not** root-public contract.

---

## 2. Supported public Core surfaces (root-public)

Root-reachable integrated foundations on this tip:

| Phase | Surface | Root-public status |
| --- | --- | --- |
| P1 | Package identity + identity/manifest/maturity contracts | **ROOT_PUBLIC** |
| P2 | Manifest + registration admission validation | **ROOT_PUBLIC** |
| P3 | Compliance assessment | **ROOT_PUBLIC** |
| P4 | Platform registry | **ROOT_PUBLIC** |
| P5 | Capability registry | **ROOT_PUBLIC** |
| P6 | Event type registry | **ROOT_PUBLIC** |
| P7 | Event routing catalog | **ROOT_PUBLIC** |
| P8 | Feature flag registry | **ROOT_PUBLIC** |
| P9 | Dependency registry | **ROOT_PUBLIC** |
| P10 | Health declaration catalog | **ROOT_PUBLIC** |
| P11 | Naming registry (derived index) | **ROOT_PUBLIC** |
| P12 | Aggregate registry facade | **ROOT_PUBLIC** |
| P13 | Validator composition / completeness-drift | **ROOT_PUBLIC** |
| P14 | Flag evaluator | **ROOT_PUBLIC** |
| P15 | Capability asserter | **ROOT_PUBLIC** |
| P16 | Event publisher (admission) | **ROOT_PUBLIC** |
| P17 | Health reporter | **ROOT_PUBLIC** |
| P18 | Health diagnostics join | **ROOT_PUBLIC** |
| P19 | Dependency requirement validator | **ROOT_PUBLIC** · **UNUSED_BY_DEFAULT** (see §8) |
| P20 | Fleet health aggregation | **ROOT_PUBLIC** |
| P21 | SDK / client factory | **ROOT_PUBLIC** |
| P22 | Bounded health observation history | **ROOT_PUBLIC** |
| RI | Referential integrity review | **ROOT_PUBLIC** |
| P24 | Capability compatibility evaluator | **ROOT_PUBLIC** (exported via `capability/` barrel) |
| **P23** | Lifecycle readiness | **NOT ROOT_PUBLIC** (local barrel only; see §9) |

### 2.1 BC-frozen public callables (must remain)

The BC fixture `publicCallables` list is the **compatibility floor**. Every listed callable remains on the root barrel. Additive root exports (including P19 / P24 callables) are allowed without breaking that floor.

Frozen floor includes (non-exhaustive summary; fixture is SoT):
`validatePlatformManifest`, `createManifestValidator`, `validateManifestAdmission`, `createRegistrationValidator`, naming predicates, `validatePlatformDependencies`, `createUmCoreValidator`, `validateReferentialIntegrity`, compliance factories, `createInMemory*` registries/reporter/history, P12 `createUmCoreRegistry`, P14–P16 evaluators/asserter/publisher, P18/P20 join/fleet helpers, P21 SDK factory, deterministic id helpers.

### 2.2 Root-public surfaces synced into BC floor (post inventory sync)

On current tip, P19 and P24 practical contracts are included in the BC fixture / guard (inventory sync landed ahead of this closeout):

| Symbol class | Examples (fixture-covered) |
| --- | --- |
| P19 | `createInMemoryDependencyValidator`, `validateDependencyRequirements`, `UmDependencyValidatorCode`, `UM_CORE_DEPENDENCY_VALIDATOR_PHASE` |
| P24 | `createCapabilityCompatibilityEvaluator`, `UmCapabilityCompatibilityCode`, `UM_CORE_PLATFORM_CAPABILITY_COMPATIBILITY_PHASE` |

**Still unused-by-default:** P19 must not be auto-wired into P14–P17 / P21 despite BC freeze of its public symbols.
**Still not root-public:** P23 readiness symbols remain absent from root barrel and BC fixture.

---

## 3. Stability expectations

| Class | Expectation |
| --- | --- |
| Package identity | `UM_CORE_PACKAGE_ID = "um.core"`; `UM_CORE_PACKAGE_LABEL` stable string |
| Phase markers | Existing `UM_CORE_*_PHASE` string values in `packageIdentity.ts` and BC fixture constants are stable |
| Factory names | `createInMemory*` / free-function duals remain callable under those names |
| Result shape | Dominant public failure model is result-returning fail-closed (`ok` + sorted `findings` / codes) |
| Health taxonomy | Observation status tokens remain exactly `ready` \| `degraded` \| `unavailable` |
| P12 facade | Exactly seven slots: platforms, capabilities, events, flags, health, dependencies, naming |
| Maturity | Levels `0..4` via `UM_MATURITY_DESCRIPTORS` |

**Not frozen:** private helpers, file layout inside modules, algorithm internals, unexported types, local-only barrels.

---

## 4. Deterministic behavior expectations

For pure validators / pure read-models / catalog reviews on equal inputs and equal injected catalog snapshots:

1. Same `ok` / status verdict.
2. Same finding/code multiset; public suites require **stable sort** (code, then documented secondary keys).
3. Deterministic public id helpers remain fixed (`buildEventRouteId`, `buildDependencyEdgeId` — values frozen in BC fixture).
4. No wall-clock, randomness, network, or filesystem influence inside Core foundations.

Stateful stores are deterministic relative to the ordered mutation history applied by the caller.

---

## 5. Compatibility expectations

1. **BC floor:** `publicApiBackwardCompatibility.fixture.json` + guard tests define the non-breaking practical contract.
2. **Additive-only by default:** new root exports / new code keys may be added; removals, renames, or string-value changes of frozen codes require an explicit compatibility bump task.
3. **Deep imports** of `platforms/core/<internal>` paths that are not re-exported are unsupported for consumers.
4. **Matrix doc lag** does not authorize API churn; this release contract + barrel + BC fixture govern release packaging.

---

## 6. Error / finding code stability boundaries

| Namespace | Owner surface | Stability |
| --- | --- | --- |
| `manifest.*` / `admission.*` | P2 | BC-frozen table `UmManifestValidationCode` |
| `dependency.validation.*` | P13 | BC-frozen `UmDependencyValidationCode` |
| `dependency.validator.*` | P19 | Public table `UmDependencyValidatorCode` (BC-frozen on current tip) |
| `referential.*` | RI | BC-frozen `UmReferentialIntegrityCode` |
| `compliance.*` | P3 | BC-frozen |
| `registry.*` / `capability.registry.*` / `event_*.*` / `flag.*` / `health.*` | P4–P10, P14–P17, P20, P22 | BC-frozen tables listed in fixture |
| `capability.compat.*` | P24 | Public table (BC-frozen on current tip) |
| `readiness.*` | P23 | **Local barrel only** — not root-public on this tip |

**Boundary law (coherence):** P13 ≠ P19 ≠ RI — code strings and responsibilities remain disjoint. Health observation tokens ≠ lifecycle readiness verdicts.

---

## 7. Pure-validator expectations

Applies to P2, P13, P19, RI, P3 assessors, P18/P20 pure evaluate paths, P23/P24 evaluators (where present):

- No mutation of injected registries / reporters.
- No network, DB, probe execution, scheduling, or product-domain I/O.
- Result-returning fail-closed (no throw for ordinary validation failure).
- Optional deps remain optional; omitting optional catalogs does not invent edges/observations.
- Catalog rematerialization is **explicit caller work** — validators do not write P9/P5/P4 state.

---

## 8. P19 = UNUSED_BY_DEFAULT

**Normative:** P19 is root-exported for explicit composition and remains **UNUSED_BY_DEFAULT**.

P19 is **not** auto-wired into:

- P14 flag evaluator
- P15 capability asserter
- P16 event publisher
- P17 health reporter
- P21 SDK factory deps / client facade
- P12 aggregate facade slots

Callers may invoke `createInMemoryDependencyValidator` / `validateDependencyRequirements` explicitly. Absence of a Central-approved consumer does **not** authorize silent auto-wiring.

---

## 9. P23 visibility (NOT root-public)

**Normative on this tip:** Platform Lifecycle Readiness (P23) lives under `platforms/core/readiness/` with a **local barrel only**.

| Check | Expected |
| --- | --- |
| Root `platforms/core/index.ts` re-exports `./readiness` | **NO** |
| Root exports `createPlatformReadinessEvaluator` / `UmPlatformReadinessCode` / `UM_CORE_PLATFORM_LIFECYCLE_READINESS_PHASE` | **NO** |
| Local phase constant | `"P23"` inside readiness module |
| Root `packageIdentity.ts` P23 constant | **Absent** (wiring deferred; A1 magnet owns shared barrel closeout) |

Deep import of readiness is an integration/WIP path, **not** a supported root-public release surface until a dedicated wiring closeout lands.

---

## 10. Stateful-component expectations

In-memory registries / reporter / history (P4–P11, P17, P22):

- Own local store only; no cross-process persistence.
- `register` / `report` / history append are explicit mutating APIs; reads do not mutate.
- `clear()` where present is a **test/dev helper** retained on public interfaces for now (compatibility-sensitive; not a product ops API).
- P12 facade borrows caller-owned registries; it does not construct or own stores.
- P21 client facade is frozen/thin and delegates to injected ports.

---

## 11. Mutation / immutability guarantees

| Guarantee | Rule |
| --- | --- |
| Input manifests / snapshots | Treated as immutable inputs; Core must not mutate caller-owned plain objects |
| Returned findings / views | Treat as immutable snapshots; consumers must not rely on in-place edits reflecting later store changes |
| Pure evaluate paths | Zero store writes |
| History / reporter | Mutate only through their documented write APIs |
| SDK client | Frozen facade object |

Unsupported: shared mutable aliasing across registries, concurrent multi-writer safety beyond single-threaded in-process use, persistence of in-memory stores.

---

## 12. Intentionally internal / non-root-public surfaces

| Surface | Location | Visibility |
| --- | --- | --- |
| P23 lifecycle readiness | `platforms/core/readiness/` | Local barrel; **not** root-public |
| Unexported helpers inside foundation folders | e.g. private utils | Internal |
| Product platforms / apps | outside `platforms/core` | Out of Core release contract |
| Network/DB/migration layers | none in Core foundations | Unsupported |

---

## 13. Unsupported behavior (explicit non-goals)

UM Core release packaging on this tip does **not** support or promise:

- Networked probes, polling, monitoring runtimes, alerting, remediation
- DB persistence, migrations, remote registries
- Dependency injection frameworks, installers, version solvers, dependency graphs as runtime resolvers
- Product-domain enablement (Commerce / Learning / Collaboration / Translation / Ads / AI execution)
- Treating health token `ready` as lifecycle READY (P23 semantics remain local and distinct)
- Silent auto-wire of P19 into P14–P17 / SDK
- Alpha merge / production cutover authorization (Central GO required elsewhere)

---

## 14. Version / change-control expectations

| Change type | Control |
| --- | --- |
| Docs-only packaging (this closeout) | Allowed; no runtime semantic invention |
| Additive public export | Allowed; update matrix/BC in owning inventory task |
| Rename/remove BC-frozen callable or code string | Breaking — requires dedicated compatibility task + fixture bump |
| Wire P23 to root barrel | Reserved to magnet/wiring closeout (not this task) |
| Auto-wire P19 consumers | Forbidden without Central consumer GO |
| New foundation / product API redesign | Out of scope |

Normative cited names used across code comments:

- `UM_CORE_SPECIFICATION_V1` → `docs/core/UM_CORE_SPECIFICATION_V1.md`
- `UM_CORE_ENGINEERING_STANDARDS_V1` → `docs/core/UM_CORE_ENGINEERING_STANDARDS_V1.md`
- This umbrella → `docs/core/UM_CORE_PLATFORM_RELEASE_CONTRACT_V1.md`

---

## 15. Matrix / BC alignment note

Public API matrix + BC fixture on current tip already list P19/P24 as root-public inventory (A1 inventory sync). This closeout does **not** rewrite inventory rows or shared barrels; it adds Spec / Standards / release packaging that locks:

- P19 **UNUSED_BY_DEFAULT** (composition-only; no auto-wire into P14–P17 / P21)
- P23 **NOT root-public** (local `readiness/` barrel only)
- Compatibility floor = BC fixture + guard

---

## 16. Verification hooks

| Gate | Evidence |
| --- | --- |
| Docs present | Spec + Standards + this release contract under `docs/core/` |
| Public API match | Barrel export checks in `releaseContractAlignment.test.ts` + matrix/BC suites |
| BC match | Guard suite vs fixture floor |
| P23 visibility | Root must **not** export readiness symbols |
| P19 unused-by-default | Documented here + foundation P19 doc; no auto-wire claims |
| Coherence | Existing `p1P19ContractCoherence.matrix.test.ts` |
