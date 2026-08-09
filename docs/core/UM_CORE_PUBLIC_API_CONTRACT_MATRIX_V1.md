# UM Core Public API Contract Matrix V1

**TASK_ID:** `UM_CORE_PLATFORM_PUBLIC_API_INVENTORY_AND_BC_FIXTURE_SYNC_V1`
*(extends original `UM_CORE_PLATFORM_PUBLIC_API_DOCUMENTATION_AND_CONTRACT_MATRIX_V1`)*
**AGENT:** `PC2-A1` · **DEVICE:** `PC2`
**BASE:** `origin/alpha-0.2` @ `26995e989d6aa78a2fdcaf885d1b6a7d030a2c01`
**PUBLIC BARREL:** `platforms/core/index.ts` (and sub-barrels it re-exports)
**MODE:** Documentation + contract verification (no production API refactor; no P23 root magnet wire)

## Law

- Public API = symbols reachable from `platforms/core/index.ts`.
- Deep imports of non-exported modules are **not** public contract.
- In-memory foundations only — no network, DB, probes, product domains.
- Result-returning fail-closed is the dominant pattern; **exceptions are called out**.
- This matrix is the authoritative inventory for integrated UM Core on the verified alpha tip.

## Integrated foundations on base tip

| Phase | Foundation | Module path |
| --- | --- | --- |
| P1 | Package identity + identity/manifest/maturity contracts | `packageIdentity`, `identity/`, `manifest/`, `maturity/` |
| P2 | Manifest + registration admission validation | `validation/` |
| P3 | Compliance assessment | `compliance/` |
| P4 | Platform registry | `registry/platformRegistry` |
| P5 | Capability registry | `capability/capabilityRegistry` |
| P6 | Event type registry | `event/eventTypeRegistry` |
| P7 | Event routing catalog | `event/eventRouting` |
| P8 | Feature flag registry | `flag/flagRegistry` |
| P9 | Dependency registry | `dependency/dependencyRegistry` |
| P10 | Health declaration catalog | `health/healthRegistry` |
| P11 | Naming registry (derived index) | `naming/namingRegistry` |
| P12 | Aggregate registry facade | `registry/coreRegistry` |
| P13 | Validator composition | `validation/coreValidator` |
| P14 | Flag evaluator | `flag/flagEvaluator` |
| P15 | Capability asserter | `capability/capabilityAsserter` |
| P16 | Event publisher (admission) | `event/eventPublisher` |
| P17 | Health reporter | `health/healthReporter` |
| P18 | Health diagnostics join | `health/healthDiagnosticsJoin` |
| P19 | Dependency requirement validator | `validation/dependencyValidator` |
| — | Referential integrity review | `validation/referentialIntegrity` |
| P20 | Fleet health aggregation | `health/fleetHealthAggregation` |
| P21 | SDK / client factory | `sdk/sdkFactory` |
| P22 | Bounded health observation history | `health/healthHistory` |
| P24 | Capability compatibility evaluator | `capability/capabilityCompatibility` |

**Not yet root-public (implemented, local barrel only):**

| Phase | Foundation | Status |
| --- | --- | --- |
| P23 | Lifecycle readiness (`readiness/**`) | Present on alpha under `platforms/core/readiness/**`; **not** re-exported from `platforms/core/index.ts`; phase marker is local (`UM_CORE_PLATFORM_LIFECYCLE_READINESS_PHASE`), not on `packageIdentity` root set. Do not treat as public until root magnet wire. |

---

## Column legend

| Column | Meaning |
| --- | --- |
| FOUNDATION | Phase / surface |
| EXPORT | Public symbol from root barrel |
| INPUT | Primary inputs |
| OUTPUT | Primary outputs |
| MUTATES_STATE | Whether the call mutates instance store(s) |
| FAILURE_BEHAVIOR | Result-returning / throw / empty |
| DETERMINISTIC | Same inputs ⇒ same outputs (ordering stabilized) |
| DEPENDENCIES | Required injected / peer surfaces |
| SIDE_EFFECTS | Beyond return value / local store |
| THREAD_STATE_NOTES | Concurrency / shared-state notes |
| TEST_COVERAGE | Primary test file(s) |
| PRODUCTION_READINESS | In-memory foundation readiness (not networked prod) |

**PRODUCTION_READINESS values used here**

- `FOUNDATION_READY` — implemented, unit-tested, fail-closed, suitable for in-process composition
- `CONTRACT_ONLY` — types/constants only
- `TEST_HELPER_EXPOSED` — public but intended for tests/dev reset

---

## 1. Package identity (P1)

| FOUNDATION | EXPORT | INPUT | OUTPUT | MUTATES_STATE | FAILURE_BEHAVIOR | DETERMINISTIC | DEPENDENCIES | SIDE_EFFECTS | THREAD_STATE_NOTES | TEST_COVERAGE | PRODUCTION_READINESS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | `UM_CORE_PACKAGE_ID` | — | `"um.core"` | No | N/A | Yes | — | None | Immutable literal | `coreFoundationContracts.test.ts` | CONTRACT_ONLY |
| P1 | `UM_CORE_PACKAGE_LABEL` | — | `"UM Core Platform"` | No | N/A | Yes | — | None | Immutable literal | `coreFoundationContracts.test.ts` | CONTRACT_ONLY |
| P1 | `UM_CORE_FOUNDATION_PHASE` … `UM_CORE_BOUNDED_HEALTH_HISTORY_PHASE` + `UM_CORE_DEPENDENCY_VALIDATOR_PHASE` | — | `"P1"`…`"P22"` incl. `"P19"` | No | N/A | Yes | — | None | Phase markers on `packageIdentity`; `UM_CORE_FOUNDATION_PHASE` remains `"P1"` by design | `coreFoundationContracts.test.ts`, `publicApiContractMatrix.test.ts` | CONTRACT_ONLY |
| P24 | `UM_CORE_PLATFORM_CAPABILITY_COMPATIBILITY_PHASE` | — | `"P24"` | No | N/A | Yes | — | None | Exported via capability barrel (not duplicated in `packageIdentity`) | `capabilityCompatibility.test.ts`, public API matrix/BC tests | CONTRACT_ONLY |

---

## 2. Identity / manifest / maturity contracts (P1)

| FOUNDATION | EXPORT | INPUT | OUTPUT | MUTATES_STATE | FAILURE_BEHAVIOR | DETERMINISTIC | DEPENDENCIES | SIDE_EFFECTS | THREAD_STATE_NOTES | TEST_COVERAGE | PRODUCTION_READINESS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Identity types (`UmPlatformId`, `UmCapabilityId`, …, identity interfaces) | — | Type contracts | No | N/A | Yes | — | None | Pure types | Exercised via consumers | CONTRACT_ONLY |
| P1 | Manifest types (`UmPlatformManifest`, modules/caps/events/flags/nav) | — | Type contracts | No | N/A | Yes | — | None | Pure types | `manifestValidation.test.ts` | CONTRACT_ONLY |
| P1 | `UmMaturityLevel`, `UM_MATURITY_DESCRIPTORS` | — | Levels 0–4 descriptors | No | N/A | Yes | — | None | Frozen table | `coreFoundationContracts.test.ts` | CONTRACT_ONLY |

---

## 3. Validation (P2 / P13 / RI)

| FOUNDATION | EXPORT | INPUT | OUTPUT | MUTATES_STATE | FAILURE_BEHAVIOR | DETERMINISTIC | DEPENDENCIES | SIDE_EFFECTS | THREAD_STATE_NOTES | TEST_COVERAGE | PRODUCTION_READINESS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P2 | `validatePlatformManifest` | `UmPlatformManifest` | `UmValidationResult` | No | `ok:false` + findings | Yes (sorted findings) | Naming helpers | None | Stateless | `manifestValidation.test.ts` | FOUNDATION_READY |
| P2 | `createManifestValidator` | — | `UmManifestValidator` | No | Delegates to validate | Yes | — | None | Stateless port | `manifestValidation.test.ts` | FOUNDATION_READY |
| P2 | `validateManifestAdmission` | `UmPlatformManifest` | `UmValidationResult` | No | `ok:false` + findings | Yes | Naming helpers | None | Stateless | `manifestValidation.test.ts` | FOUNDATION_READY |
| P2 | `createRegistrationValidator` | — | `UmRegistrationValidator` | No | Delegates to validate | Yes | — | None | Stateless port | `manifestValidation.test.ts` | FOUNDATION_READY |
| P2 | `isNonEmptyTrimmed` / `isUmMachineId` / `isUmVersionToken` / `isScopedUnderPlatform` | value(s) | `boolean` | No | `false` | Yes | — | None | Pure predicates | Indirect via validators/SDK | FOUNDATION_READY |
| P2 | `UmManifestValidationCode` (+ name type) | — | Code constants | No | N/A | Yes | — | None | Immutable | `manifestValidation.test.ts` | CONTRACT_ONLY |
| P13 | `validatePlatformDependencies` | `platformId`, deps | `UmDependencyValidationResult` | No | `ok:false` on missing/stale/drift | Yes | P4 + P9 (+ optional P5) | None | Read-only | `coreValidator.test.ts` | FOUNDATION_READY |
| P13 | `createUmCoreValidator` | `UmCoreValidatorDeps` | `UmCoreValidator` | No (does not mutate deps) | Review returns `ok:false` | Yes | P4 + P9 (+ optional P5 / P2 ports) | None | Composed port; no store | `coreValidator.test.ts` | FOUNDATION_READY |
| P13 | `UmDependencyValidationCode` | — | Code constants | No | N/A | Yes | — | None | Immutable | `coreValidator.test.ts` | CONTRACT_ONLY |
| P19 | `validateDependencyRequirements` | platformId, requirements, deps | `UmDependencyValidationResult` (P19 codes) | No | `ok:false` + findings | Yes (sorted) | P4 (+ optional P5/P9) | None | Stateless; **not** P13 drift / **not** RI / **not** resolver | `dependencyValidator.test.ts` | FOUNDATION_READY |
| P19 | `createInMemoryDependencyValidator` | `UmDependencyValidatorDeps` | `UmDependencyValidator` | No | Delegates to validateRequirements | Yes | Same | None | Unused-by-default; no automatic P4/P13/RI consumer | `dependencyValidator.test.ts` | FOUNDATION_READY |
| P19 | `UmDependencyValidatorCode` (+ types) | — | Code constants (`dependency.validator.*`) | No | N/A | Yes | — | None | Distinct from `dependency.validation.*` (P13) | `dependencyValidator.test.ts` | CONTRACT_ONLY |
| RI | `validateReferentialIntegrity` | `UmReferentialIntegrityDeps` | `UmValidationResult` | No | `ok:false` on missing refs; optional catalogs skipped if absent | Yes (sorted findings) | P4 + optional P5–P10 + optional P17 list | None | Read-only; not join | `referentialIntegrity.test.ts` | FOUNDATION_READY |
| RI | `UmReferentialIntegrityCode` | — | Code constants | No | N/A | Yes | — | None | Immutable | `referentialIntegrity.test.ts` | CONTRACT_ONLY |
| P2/P13 | Interfaces `UmManifestValidator`, `UmRegistrationValidator`, `UmCoreValidator`, finding/result types | — | Port contracts | No | N/A | Yes | — | None | Pure types | Via impl tests | CONTRACT_ONLY |

**Duplicate surface (documented, intentional):** free functions (`validatePlatformManifest`, `validateManifestAdmission`) and factory ports (`createManifestValidator`, `createRegistrationValidator`) expose the same semantics.

**P19 duplicate surface:** `validateDependencyRequirements` ≡ `createInMemoryDependencyValidator(deps).validateRequirements`.

---

## 4. Compliance (P3)

| FOUNDATION | EXPORT | INPUT | OUTPUT | MUTATES_STATE | FAILURE_BEHAVIOR | DETERMINISTIC | DEPENDENCIES | SIDE_EFFECTS | THREAD_STATE_NOTES | TEST_COVERAGE | PRODUCTION_READINESS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P3 | `assessPlatformCompliance` | `UmComplianceAssessmentInput` | `UmComplianceResult` | No | Status/score/findings (not throw); may run P2 if validation omitted | Yes (sorted findings) | Manifest (+ optional validation/admission/waivers) | May invoke P2 validators internally | Stateless | `complianceEngine.test.ts` | FOUNDATION_READY |
| P3 | `createComplianceEngine` | — | `UmComplianceEngine` | No | Delegates to assess | Yes | — | None | Stateless port | `complianceEngine.test.ts` | FOUNDATION_READY |
| P3 | `UmComplianceCode` + compliance types | — | Codes / types | No | N/A | Yes | — | None | Immutable / contracts | `complianceEngine.test.ts` | CONTRACT_ONLY |

**Duplicate surface:** `assessPlatformCompliance` ≡ `createComplianceEngine().assess`.

---

## 5. Platform registry + aggregate facade (P4 / P12)

| FOUNDATION | EXPORT | INPUT | OUTPUT | MUTATES_STATE | FAILURE_BEHAVIOR | DETERMINISTIC | DEPENDENCIES | SIDE_EFFECTS | THREAD_STATE_NOTES | TEST_COVERAGE | PRODUCTION_READINESS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P4 | `createInMemoryPlatformRegistry` | — | `UmInMemoryPlatformRegistry` | Creates empty store | N/A at create | Yes | May run P2/P3 if validation/compliance omitted on register | In-process Map only | Instance-local; not process-global; **not thread-safe** | `platformRegistry.test.ts` | FOUNDATION_READY |
| P4 | `registry.register` | `UmPlatformRegistrationInput` | `UmPlatformRegistrationResult` | Yes on ok | `ok:false` + findings; no write | Yes | P2/P3 engines optional | Store insert | Single-threaded assumption | `platformRegistry.test.ts` | FOUNDATION_READY |
| P4 | `registry.get/list/has/size` | ids / — | records / bool / number | No | `undefined` / empty | Yes (list sorted by platformId) | — | None | Read path | `platformRegistry.test.ts` | FOUNDATION_READY |
| P4 | `registry.clear` | — | void | Yes | N/A | Yes | — | Clears catalog | **Test/dev helper on public interface** | `platformRegistry.test.ts` | TEST_HELPER_EXPOSED |
| P4 | `UmRegistryCode` + registry interfaces/types | — | Codes / types | No | N/A | Yes | — | None | — | `platformRegistry.test.ts` | CONTRACT_ONLY |
| P12 | `createUmCoreRegistry` | `UmCoreRegistryDeps` (7 slots) | Frozen `UmCoreRegistry` | No (borrows refs) | No validation of deps at create | Yes | Caller-owned P4/P5/P6/P8/P10/P9/P11 | Freezes facade object only | Exact ref identity preserved; concurrent mutation of children is caller concern | `coreRegistry.test.ts` | FOUNDATION_READY |

**Compatibility-sensitive:** P12 seven-slot shape (platforms, capabilities, events, flags, health, dependencies, naming). No routing / validator / SDK / history slots.

---

## 6. Capability registry + asserter (P5 / P15)

| FOUNDATION | EXPORT | INPUT | OUTPUT | MUTATES_STATE | FAILURE_BEHAVIOR | DETERMINISTIC | DEPENDENCIES | SIDE_EFFECTS | THREAD_STATE_NOTES | TEST_COVERAGE | PRODUCTION_READINESS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P5 | `createInMemoryCapabilityRegistry` | `UmCapabilityRegistryDeps` | `UmInMemoryCapabilityRegistry` | Creates store | N/A at create | Yes | P4 (+ optional P8 for linked flags at register) | In-process Map | Instance-local; not thread-safe | `capabilityRegistry.test.ts` | FOUNDATION_READY |
| P5 | `caps.register` / lookups / `clear` | declaration | result / records | Yes on ok register; clear mutates | `ok:false` reject | Yes | P4 required | Store only | clear = test helper | `capabilityRegistry.test.ts` | FOUNDATION_READY / TEST_HELPER_EXPOSED (`clear`) |
| P5 | `UmCapabilityRegistryCode` + types | — | Codes / types | No | N/A | Yes | — | None | — | tests | CONTRACT_ONLY |
| P15 | `createInMemoryCapabilityAsserter` | `{ capabilities, flags }` | `UmCapabilityAsserter` | No | Result `enabled:false` + reasonCode | Yes | P5 + P14 | None | Stateless over injected ports | `capabilityAsserter.test.ts` | FOUNDATION_READY |
| P15 | `UmCapabilityAssertionCode` | — | Codes | No | N/A | Yes | — | None | — | `capabilityAsserter.test.ts` | CONTRACT_ONLY |
| P24 | `createCapabilityCompatibilityEvaluator` | `{ platforms, capabilities?, dependencies? }` | `UmCapabilityCompatibilityEvaluator` | No | Result `INCOMPATIBLE` + findings (no throw) | Yes | P4 (+ optional P5/P9) | None | Pure catalog compatibility; **not** health / readiness / discovery / P15 assertion | `capabilityCompatibility.test.ts` | FOUNDATION_READY |
| P24 | `UmCapabilityCompatibilityCode` + compatibility types / phase marker | — | Codes / types / `"P24"` | No | N/A | Yes | — | None | Immutable | `capabilityCompatibility.test.ts` | CONTRACT_ONLY |

**P24 methods (port shape):** `platformDeclaresCapability`, `requiredCapabilityExists`, `evaluatePlatformProvides`, `evaluatePlatformRequirements`, `evaluateMatrix`.

---

## 7. Event types, routing, publisher (P6 / P7 / P16)

| FOUNDATION | EXPORT | INPUT | OUTPUT | MUTATES_STATE | FAILURE_BEHAVIOR | DETERMINISTIC | DEPENDENCIES | SIDE_EFFECTS | THREAD_STATE_NOTES | TEST_COVERAGE | PRODUCTION_READINESS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P6 | `createInMemoryEventTypeRegistry` | deps (platforms) | `UmInMemoryEventTypeRegistry` | Creates store | Register `ok:false` | Yes | P4 | Store only | Instance-local | `eventTypeRegistry.test.ts` | FOUNDATION_READY |
| P6 | `UmEventTypeRegistryCode` + event types | — | Codes / types | No | N/A | Yes | — | None | — | tests | CONTRACT_ONLY |
| P7 | `buildEventRouteId` | producer, eventType, destination | string id | No | N/A (pure) | Yes | — | None | Pure helper | `eventRouting.test.ts` | FOUNDATION_READY |
| P7 | `createInMemoryEventRoutingRegistry` | deps | routing registry | Creates store | Register `ok:false` | Yes | P4 + P6 | Store only | Catalog only — not delivery | `eventRouting.test.ts` | FOUNDATION_READY |
| P7 | `UmEventRoutingCode` | — | Codes | No | N/A | Yes | — | None | — | `eventRouting.test.ts` | CONTRACT_ONLY |
| P16 | `createInMemoryEventPublisher` | `{ eventTypes }` | `UmEventPublisher` | No store | `publish` → `ok:false` findings | Yes | P6 | **No delivery / bus / outbox** | Stateless admission | `eventPublisher.test.ts` | FOUNDATION_READY |
| P16 | `UmEventPublishCode` | — | Codes | No | N/A | Yes | — | None | — | `eventPublisher.test.ts` | CONTRACT_ONLY |

---

## 8. Flags (P8 / P14)

| FOUNDATION | EXPORT | INPUT | OUTPUT | MUTATES_STATE | FAILURE_BEHAVIOR | DETERMINISTIC | DEPENDENCIES | SIDE_EFFECTS | THREAD_STATE_NOTES | TEST_COVERAGE | PRODUCTION_READINESS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P8 | `createInMemoryFlagRegistry` | deps | flag registry | Creates store | Register `ok:false` | Yes | P4 (+ optional P5) | Store only | Instance-local | `flagRegistry.test.ts` | FOUNDATION_READY |
| P8 | `UmFlagRegistryCode` + types | — | Codes / types | No | N/A | Yes | — | None | — | tests | CONTRACT_ONLY |
| P14 | `createInMemoryFlagEvaluator` | `{ flags }` | `UmFlagEvaluator` | No | Unknown → fail-closed `source:"unknown"`; known → `defaultState` only | Yes | P8 | No overrides/cohorts | Stateless | `flagEvaluator.test.ts` | FOUNDATION_READY |
| P14 | `UmFlagEvaluationCode` | — | Codes | No | N/A | Yes | — | None | — | `flagEvaluator.test.ts` | CONTRACT_ONLY |

---

## 9. Dependencies (P9)

| FOUNDATION | EXPORT | INPUT | OUTPUT | MUTATES_STATE | FAILURE_BEHAVIOR | DETERMINISTIC | DEPENDENCIES | SIDE_EFFECTS | THREAD_STATE_NOTES | TEST_COVERAGE | PRODUCTION_READINESS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P9 | `buildDependencyEdgeId` | edge parts | string id | No | N/A | Yes | — | None | Pure helper | `dependencyRegistry.test.ts` | FOUNDATION_READY |
| P9 | `createInMemoryDependencyRegistry` | `{ platforms, capabilities? }` | dependency registry | Creates store | Register `ok:false`; cycle checks on required platform→platform | Yes | P4 (+ optional P5); `peer_kernel` opaque | Store only — **not runtime DI** | Instance-local | `dependencyRegistry.test.ts` | FOUNDATION_READY |
| P9 | `UmDependencyRegistryCode` + types | — | Codes / types | No | N/A | Yes | — | None | — | tests | CONTRACT_ONLY |

---

## 10. Health declarations, reporter, join, fleet, history (P10 / P17 / P18 / P20 / P22)

| FOUNDATION | EXPORT | INPUT | OUTPUT | MUTATES_STATE | FAILURE_BEHAVIOR | DETERMINISTIC | DEPENDENCIES | SIDE_EFFECTS | THREAD_STATE_NOTES | TEST_COVERAGE | PRODUCTION_READINESS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P10 | `createInMemoryHealthRegistry` | `{ platforms }` | health declaration registry | Creates store | Register `ok:false` | Yes | P4; `probeRef` opaque never executed | Store only | Instance-local | `healthRegistry.test.ts` | FOUNDATION_READY |
| P10 | `UmHealthRegistryCode` + health declaration types | — | Codes / types | No | N/A | Yes | — | None | — | tests | CONTRACT_ONLY |
| P17 | `createInMemoryHealthReporter` | `{ platforms }` | `UmInMemoryHealthReporter` | Creates observation store | `report` `ok:false` no write | Yes (list sorted) | P4 | Last-snapshot SoT per platform; **no probes** | Instance-local; `clear` test helper | `healthReporter.test.ts` | FOUNDATION_READY |
| P17 | `UmHealthReportCode` | — | Codes | No | N/A | Yes | — | None | — | `healthReporter.test.ts` | CONTRACT_ONLY |
| P18 | `createHealthDiagnosticsJoin` | `{ platforms, declarations, observations }` | `{ evaluate() }` | No | Join view always produced (no throw) | Yes (sorted ids/lists) | P4 + P10 + P17 reads | None | Read-model; re-evaluate each call | `healthDiagnosticsJoin.test.ts` | FOUNDATION_READY |
| P20 | `aggregateFleetHealthFromMembers` | member bag (+ options) | `UmFleetHealthAggregationResult` | No | `ok:false` fail-closed | Yes | Normalized members | None | Pure | `fleetHealthAggregation.test.ts` | FOUNDATION_READY |
| P20 | `aggregateFleetHealth` | `UmFleetHealthAggregationDeps` | aggregation result | No | `ok:false` on invalid deps / unknown observation platforms | Yes | P4 + P17 (+ optional P10/P18) | None | Pure over injected reads | `fleetHealthAggregation.test.ts` | FOUNDATION_READY |
| P20 | `createFleetHealthAggregation` | deps | `{ evaluate() }` | No | Delegates to `aggregateFleetHealth` | Yes | Same as above | None | Port wrapper | `fleetHealthAggregation.test.ts` | FOUNDATION_READY |
| P20 | `UmFleetHealthAggregationCode` | — | Codes | No | N/A | Yes | — | None | — | tests | CONTRACT_ONLY |
| P22 | `createInMemoryHealthObservationHistory` | `{ platforms, capacity }` | create result (`ok` + history \| findings) | Creates rings only if capacity valid | Create `ok:false` if capacity invalid; record `ok:false` no append | Yes (oldest→newest clones) | P4 | Bounded FIFO rings; duplicates retained; companion to P17 | Instance-local; `clear` test helper | `healthHistory.test.ts`, `healthHistory.regression.test.ts`, `healthHistory.barrel.export.test.ts` | FOUNDATION_READY |
| P22 | `UmHealthHistoryCode` + history types | — | Codes / types | No | N/A | Yes | — | None | — | history tests | CONTRACT_ONLY |

**Duplicate surface:** `aggregateFleetHealth` ≡ `createFleetHealthAggregation(deps).evaluate()`.

**Orthogonality (compatibility-sensitive):** P10 declaration ≠ healthy; P17 last snapshot ≠ P22 history; P18 join ≠ RI; absence of observation ≠ `unavailable`.

---

## 11. Naming (P11)

| FOUNDATION | EXPORT | INPUT | OUTPUT | MUTATES_STATE | FAILURE_BEHAVIOR | DETERMINISTIC | DEPENDENCIES | SIDE_EFFECTS | THREAD_STATE_NOTES | TEST_COVERAGE | PRODUCTION_READINESS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P11 | `createInMemoryNamingRegistry` | `{ platforms, capabilities?, events?, flags? }` | naming registry | Builds snapshot index | Lookups return undefined | Yes (sorted lists) | P4 (+ optional P5/P6/P8) | Snapshot at construct; `rebuild()` refreshes | Not live-watching; caller must rebuild after source mutations | `namingRegistry.test.ts` | FOUNDATION_READY |
| P11 | Naming types | — | Types | No | N/A | Yes | — | None | — | tests | CONTRACT_ONLY |

---

## 12. SDK / client factory (P21)

| FOUNDATION | EXPORT | INPUT | OUTPUT | MUTATES_STATE | FAILURE_BEHAVIOR | DETERMINISTIC | DEPENDENCIES | SIDE_EFFECTS | THREAD_STATE_NOTES | TEST_COVERAGE | PRODUCTION_READINESS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P21 | `createInMemoryUmCoreSdkFactory` | `UmCoreSdkFactoryDeps` | frozen `UmCoreSdkFactory` | No at factory create | **Throws** on missing/invalid deps | Yes | P14 + P15 + P16 publish + P17 + P4 `register` | Borrows exact refs | Facade freeze only | `sdkFactory.test.ts` | FOUNDATION_READY |
| P21 | `factory.createClient` | `UmServiceIdentityContext` | frozen `UmCoreSdkClient` | No | **Throws** on invalid identity | Yes | Same ports | `register` mutates P4 when ok | Thin pass-through | `sdkFactory.test.ts` | FOUNDATION_READY |
| P21 | SDK interfaces / `UmSdk*` operation types | — | Contracts / docs aids | No | N/A | Yes | — | None | Documentation-oriented types | `sdkFactory.test.ts` | CONTRACT_ONLY |

**Semantic note (not fixed here):** P21 factory/client construction **throws**, unlike the dominant result-returning fail-closed style of P2–P20/P22. Port methods delegated by the client remain result-returning.

---

## 13. Lifecycle readiness (P23) — NOT root-public yet

| FOUNDATION | EXPORT | STATUS |
| --- | --- | --- |
| P23 | `createPlatformReadinessEvaluator` | **Not** on `platforms/core/index.ts` |
| P23 | `UM_CORE_PLATFORM_LIFECYCLE_READINESS_PHASE` | Local module constant only |
| P23 | `UmPlatformReadinessCode` | Local to `readiness/` barrel |

Implementation + focused tests exist under `platforms/core/readiness/**`. Production consumers must not deep-import until Central magnet wire lands. Inventory/BC guards assert absence from the root barrel so accidental private exposure is not mistaken for public freeze.

---

## Findings (inventory analysis)

### Undocumented / under-documented vs phase docs

1. Root barrel re-exports a large **type + code** surface not fully tabulated in individual P-docs (this matrix closes that gap).
2. `platforms/core/README.md` intro still frames the package as **“Foundation P1 (contracts only)”** while P2–P22 runtimes are present — **stale package README** (not modified by this task; note only).
3. `coreFoundationContracts.test.ts` previously asserted phases only through **P16** — extended by A3 contract test work.

### Stale exports

- None removed from code. Phase constant `UM_CORE_FOUNDATION_PHASE = "P1"` is **intentionally sticky** (foundation phase marker), not a stale P22 package id.
- No orphaned public factory found that lacks an implementation on this tip.

### Duplicate APIs (intentional pairs)

| Pair | Notes |
| --- | --- |
| `validatePlatformManifest` / `createManifestValidator().validate` | Free fn + port |
| `validateManifestAdmission` / `createRegistrationValidator().validateAdmission` | Free fn + port |
| `assessPlatformCompliance` / `createComplianceEngine().assess` | Free fn + port |
| `aggregateFleetHealth` / `createFleetHealthAggregation().evaluate` | Free fn + port |
| `aggregateFleetHealthFromMembers` | Pure bag path parallel to port-backed aggregate |

### Internal APIs accidentally exposed

| Export | Risk | Notes |
| --- | --- | --- |
| `clear()` on in-memory registries / reporter / history | Medium (compat) | Documented as test/dev helper but part of public interfaces |
| Naming / validation predicates (`isUmMachineId`, …) | Low | Shared helpers; useful and stable |
| `UmSdk*` convenience types | Low | Explicitly documentation aids |

### Missing contract tests (pre-A3)

| Gap | A3 action |
| --- | --- |
| No root-barrel public factory inventory test | **Added** `platforms/core/publicApiContractMatrix.test.ts` |
| Phase constants P17/P18/P20/P21/P22 not asserted in P1 smoke | **Extended** `coreFoundationContracts.test.ts` |
| Per-foundation unit suites | Already present for integrated surfaces (see TEST_COVERAGE columns) |

### Compatibility-sensitive surfaces

1. Public barrel path `platforms/core` (+ stable factory names `createInMemory*`).
2. Result shapes with `ok` + sorted `findings` / code enums.
3. P12 seven-slot aggregate deps.
4. P21 throw-on-invalid-deps (behavioral outlier).
5. Health status taxonomy: `ready` \| `degraded` \| `unavailable` only (no foreign coercion).
6. P22 capacity create-result discriminated union.

### Semantic defects observed (report-only; not fixed)

1. **Failure-model split:** SDK factory throws; most other foundations return results.
2. **Test helpers on public interfaces:** widespread `clear()` mutators.
3. **Stale README framing** at package root (P1-only language).
4. **P23 packaging lag:** readiness foundation implemented but not root-exported (tracked as separate magnet task; intentionally **not** closed by this inventory sync).

### Inventory sync closeout (this revision)

| Gap closed | Evidence |
| --- | --- |
| P19 missing from PUBLIC_CALLABLES / BC fixture / foundation smoke | Added callables, `UmDependencyValidatorCode`, `UM_CORE_DEPENDENCY_VALIDATOR_PHASE` |
| P24 missing from public inventory | Added `createCapabilityCompatibilityEvaluator`, code table, phase marker |
| Stale “no P19” matrix claim | Corrected; P19 is root-reachable via `validation` barrel |
| P23 false advertising | Explicit not-yet-root-public section + negative root-barrel assertions |

No production API redesign. No P23 root wire. No new foundation.

---

## Verification references

- Public barrel: `platforms/core/index.ts`
- Contract tests: `platforms/core/publicApiContractMatrix.test.ts`, `platforms/core/coreFoundationContracts.test.ts`, `platforms/core/publicApiBackwardCompatibility.guard.test.ts`
- BC fixture: `platforms/core/test/publicApiBackwardCompatibility.fixture.json`
- Avoid collision: this sync does **not** perform A1 P23 root magnet wire and does **not** touch A2 property/fuzz suites.
