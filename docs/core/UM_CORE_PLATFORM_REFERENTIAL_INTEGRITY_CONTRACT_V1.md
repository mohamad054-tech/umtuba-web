# UM Core Platform Referential Integrity Contract V1

**TASK_ID:** `UM_CORE_PLATFORM_REFERENTIAL_INTEGRITY_CONTRACT_V1`
**Phase surface:** pure review helper under `platforms/core/validation/`
**Base:** verified `origin/alpha-0.2` (includes P1–P17)

## Law

- REFERENTIAL INTEGRITY REVIEW IS NOT DEPENDENCY RESOLUTION.
- REFERENTIAL INTEGRITY REVIEW IS NOT REGISTRY MUTATION.
- REFERENTIAL INTEGRITY REVIEW IS NOT HEALTH DIAGNOSTICS JOIN.
- Missing optional catalogs ⇒ those edges are **skipped**, not invented.
- `peer_kernel` targets remain opaque (P9 law) — no fabricated SoT.

## Registered entities in scope

| Entity | Registry / store | Phase |
| --- | --- | --- |
| Platforms | `UmPlatformRegistry` | P4 |
| Capabilities | `UmCapabilityRegistry` | P5 |
| Event types | `UmEventTypeRegistry` | P6 |
| Routing destinations / routes | `UmEventRoutingRegistry` | P7 |
| Flags | `UmFlagRegistry` | P8 |
| Dependency edges | `UmDependencyRegistry` | P9 |
| Health declarations | `UmHealthRegistry` | P10 |
| Health observations | `UmHealthReporter` / `list()` | P17 (on verified alpha) |

## Reference edges (actual)

| Source | Field | Target SoT | Admission today | Contract review |
| --- | --- | --- | --- | --- |
| Capability | `platformId` | P4 | reject | reject if missing |
| Capability | `flagId?` | P8 (when supplied) | **not gated** | reject if missing |
| Event type | `producerPlatformId` | P4 | reject | reject if missing |
| Route | `eventType` | P6 (when supplied) | reject | reject if missing |
| Route | `destinationPlatformId` | P4 | reject | reject if missing |
| Route | `producerPlatformId` | P4 | reject | reject if missing |
| Flag | `ownerPlatformId` | P4 | reject | reject if missing |
| Flag | `linkedCapabilityIds[]` | P5 (when supplied) | reject if caps wired | reject if missing |
| Dependency | `fromPlatformId` | P4 | reject | reject if missing |
| Dependency | `targetId` (`platform`) | P4 | reject | reject if missing |
| Dependency | `targetId` (`capability`) | P5 (when supplied) | reject if caps wired | reject if missing |
| Dependency | `targetId` (`peer_kernel`) | opaque | never | **never invent** |
| Health declaration | `platformId` | P4 | reject | reject if missing |
| Health observation | `platformId` | P4 | reject | reject if missing |
| Health observation | `affectedCapabilityIds[]` | P5 (when supplied) | shape only | reject if missing |
| Health observation | `dependencyStatuses[].targetId` | P9 targets for platform, else P4 / P5 | shape only | reject if unknown |

## API

`validateReferentialIntegrity(deps) → UmValidationResult`

- Fail-closed (`ok: false`) on any missing-reference finding.
- Findings sorted by `code`, then `path`, then `message`.
- No mutation of injected registries / observation store.
- No network, scheduler, DB, or product-domain wiring.

## Non-goals

- Changing P17 `report()` admission (separate future gate; avoid A1 health diagnostics collision).
- Declared-vs-observed join / unobserved reporter diagnostics (A1 health diagnostics lane).
- Implementing `UmDependencyValidator.validateRequirements` (distinct P13/P18 surface).
- DI / resolver / cycle solver / lifecycle orchestration.
