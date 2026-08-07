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
- Phase: `P1`–`P9` (… → feature flag registry → dependency registry)

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
