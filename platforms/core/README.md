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
- Phase: `P1`–`P5` (contracts → validation → compliance → platform registry → capability registry)

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
