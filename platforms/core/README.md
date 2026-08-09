# UM Core — Foundation P1 (contracts only)

Isolated engineering skeleton for **UM Core Platform**.

Normative references:

- `UM_CORE_SPECIFICATION_V1`
- `UM_CORE_ENGINEERING_STANDARDS_V1`

## Phase P1 scope

This package contains **interfaces, type contracts, and documentation comments only**.

Package root: `platforms/core/` (independent platform layout; not a generic `lib/` utility).

Out of scope for P1:

- Runtime behavior
- Registry implementations
- Event bus, flag engine, health engine
- SDK logic
- Database schemas / migrations
- Integration with Commerce, Learning, AI, UEOS, Ads, Collaboration, or any product platform

## Dependency rule

`platforms/core` MUST NOT import product platforms.  
Product platforms MAY later depend on `platforms/core` (not in P1).

## Package identity

- Package id: `um.core`
- Phase: `P1`–`P16` (… → capability asserter → event publisher)

## Phase P3 scope

Pure **compliance assessment** under `platforms/core/compliance/`.

- Inputs: manifest, validation/admission results, ownership, capabilities,
  dependencies, flags, maturity, optional waivers/metadata
- Outputs: score, status, certification eligibility, findings, evidence gaps,
  failed standards, waivers, recommendation

Out of scope for P3: registry, runtime, event bus, persistence, networking,
SDK/health engines, product integration.

## Phase P4 scope

Pure **in-memory platform registry** under `platforms/core/registry/`.

- Stores identity, manifest, validation, compliance, module/capability catalogs,
  version + registration metadata
- Registers only platforms that pass P2 validation and P3 compliance
  (including Core Certified eligibility)

Out of scope for P4: persistence, networking, discovery services, plugin
loading, runtime execution, flag/health/SDK engines, product integration.

## Phase P5 scope

Pure **in-memory capability registry** under `platforms/core/capability/`.

- Catalog of capabilities owned by registered platforms
- Lookups by id, platform, module, side-effect class, stability
- Rejects unknown platform/module, duplicates, namespace violations,
  invalid side-effects/versions/ownership

Out of scope for P5: capability execution, AI, event routing, flag evaluation,
persistence, networking, SDK/health runtime, product integration.

## Phase P6 scope

Pure **in-memory event type registry** under `platforms/core/event/`.

- Catalog of event TYPE definitions owned by registered producer platforms
- Lookups by id, producer, schema version, stability, PII class, delivery
- Registration is **not** emission or consumption authorization

Out of scope for P6: event bus, publish/consume, outbox, retry, queues,
transport, persistence, networking, product integration.

## Phase P7 scope

Pure **in-memory event routing catalog** under `platforms/core/event/`.

- Rules from registered event type → destination platform(s)
- Validates event type + producer + destination against P4/P6 catalogs
- Lookups by event type, producer, destination

Out of scope for P7: event bus, publish/consume, delivery, outbox, retry,
queues, transport, persistence, networking, product integration.

## Phase P8 scope

Pure **in-memory feature flag catalog** under `platforms/core/flag/`.

- Flags owned by registered platforms; must match manifest `flags[]`
- Optional P5 capability integrity for linked capabilities
- Lookups by id, platform, linked capability, dangerElevated

Out of scope for P8: flag evaluation, overrides, cohorts, kill-switch
execution, event bus/delivery, persistence, networking, product integration.

## Phase P9 scope

Pure **in-memory dependency edge catalog** under `platforms/core/dependency/`.

- Materializes platform manifest `requires[]` as direct declared edges
- Binds owner platforms to P4; optional P5 capability-target integrity
- Lookups by edge id, requirements, dependents, target kind, strength
- Catalog integrity cycles only among required platform→platform edges

Out of scope for P9: runtime resolution, DI, discovery, startup orchestration,
health/SDK/naming registries, aggregate `UmCoreRegistry`, persistence,
networking, product integration, migrations.

## Phase P10 scope

Pure **in-memory health declaration catalog** under `platforms/core/health/`.

- Materializes each registered platform’s `manifest.health` (one row per platform)
- Opaque `probeRef` metadata only — never fetched or executed
- Lookups by platform id and `reportsStatus`

Out of scope for P10: probe execution, polling, scheduling, live snapshots,
`UmHealthReporter`, networking, alerting, Naming/SDK/`UmCoreRegistry` facade,
persistence, product integration, migrations.

## Phase P11 scope

Pure **deterministic derived naming index** under `platforms/core/naming/`.

- Read-only cross-kind lookup over P4 (+ optional P5/P6/P8)
- Indexes `platform`, `module`, `capability`, `event_type`, `flag`
- Specialized registries remain identity SoT; `validation/naming.ts` remains policy

Out of scope for P11: name authoring, discovery, DNS, SDK runtime,
`UmCoreRegistry` facade, persistence, networking, product integration,
migrations.

## Phase P12 scope

Pure **Model A aggregate registry facade** under `platforms/core/registry/`.

- `createUmCoreRegistry(deps)` borrows already-created specialized registries
- Exact seven slots: platforms, capabilities, events, flags, health,
  dependencies, naming
- Caller retains ownership; facade does not construct or mutate registries

Out of scope for P12: mega-wire factory, event routing slot, validator
completion, SDK/runtime ports, DI/startup orchestration, persistence,
networking, product integration, migrations.

## Phase P13 scope

Pure **validator composition** under `platforms/core/validation/`.

- `createUmCoreValidator(deps)` composes existing P2 validators with
  registry-backed `validateDependencies(platformId)`
- Completeness (missing/stale materialization) + referential drift only
- Minimal DI: platforms + dependencies (+ optional capabilities/validators)

Out of scope for P13: `UmDependencyValidator`, dependency resolver, cycle
solver, SDK/runtime ports, persistence, networking, product integration,
migrations.

## Phase P14 scope

Pure **catalog-backed flag evaluator** under `platforms/core/flag/`.

- `createInMemoryFlagEvaluator({ flags })` implements `UmFlagEvaluator`
- Unknown flags fail closed (`source: "unknown"`)
- Known flags use P8 catalog `defaultState` only (`source: "default"`)
- Begins runtime-port layer after control-plane completion at P13

Out of scope for P14: overrides, cohorts, kill-switch execution,
`UmCapabilityAsserter`, SDK, event publisher, health reporter, networking,
persistence, product integration, migrations.

## Phase P15 scope

Pure **capability availability asserter** under `platforms/core/capability/`.

- `createInMemoryCapabilityAsserter({ capabilities, flags })` implements
  `UmCapabilityAsserter.assertEnabled`
- Composes P5 catalog + P14 evaluator; result-returning, fail closed
- Ungated cataloged capabilities may be enabled; linked flags follow P14

Out of scope for P15: user/RBAC authorization, SDK, event publisher, health
reporter, dependency validator, networking, persistence, product integration,
migrations.

## Phase P16 scope

Pure **P6-backed event publish admission** under `platforms/core/event/`.

- `createInMemoryEventPublisher({ eventTypes })` implements `UmEventPublisher`
- Validates envelope structure + catalog producer/schemaVersion/subject kind
- Returns deterministic `UmEventPublishResult` (admission only)
- Payload remains opaque; caller supplies ids/timestamps

Out of scope for P16: event delivery/bus, P7 routing execution, consumer
dispatch, queue/outbox/retry/DLQ, schema runtime, HealthReporter,
DependencyValidator, SDK client/factory, networking, persistence, product
integration, migrations.

## Phase P17 scope

Pure **in-memory health observation reporter** under `platforms/core/health/`.

- `createInMemoryHealthReporter({ platforms })` implements `UmHealthReporter`
- Admits caller-supplied snapshots for P4-registered platforms only
- Status taxonomy: `ready` | `degraded` | `unavailable`
- Result-returning, fail-closed; stores last snapshot per platform
- P10 declaration catalog remains orthogonal (declaration ≠ healthy)

Out of scope for P17: probe execution, polling, scheduling, networking,
alerting, remediation, DependencyValidator, SDK client/factory, persistence,
product integration, migrations.
