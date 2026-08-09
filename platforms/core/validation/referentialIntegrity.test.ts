/**
 * Focused UM Core referential-integrity contract tests.
 * REFERENTIAL INTEGRITY REVIEW IS NOT DEPENDENCY RESOLUTION.
 * REFERENTIAL INTEGRITY REVIEW IS NOT REGISTRY MUTATION.
 */

import { describe, expect, it } from "vitest";
import { createInMemoryCapabilityRegistry } from "../capability";
import { createInMemoryDependencyRegistry } from "../dependency";
import {
  createInMemoryEventRoutingRegistry,
  createInMemoryEventTypeRegistry,
} from "../event";
import { createInMemoryFlagRegistry } from "../flag";
import {
  createInMemoryHealthRegistry,
  createInMemoryHealthReporter,
  type UmHealthSnapshot,
} from "../health";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  UmReferentialIntegrityCode,
  validateReferentialIntegrity,
} from "./index";

function validManifest(
  overrides: Partial<UmPlatformManifest> = {},
): UmPlatformManifest {
  return {
    platformId: "example",
    platformVersion: "1.0.0",
    displayName: "Example Platform",
    owners: [{ id: "owner.platform", displayName: "Platform Owner" }],
    modules: [
      {
        moduleId: "example.core",
        displayName: "Core Module",
        capabilityIds: ["example.core.ping"],
      },
    ],
    capabilities: [
      {
        capabilityId: "example.core.ping",
        moduleId: "example.core",
        displayName: "Ping",
        sideEffectClasses: ["read"],
        stability: "stable",
        version: "1.0.0",
        flagId: "example.core.enabled",
      },
    ],
    providesEvents: [
      {
        eventType: "example.core.pinged",
        schemaVersion: "1.0.0",
        stability: "stable",
      },
    ],
    requires: [
      {
        targetKind: "peer_kernel",
        targetId: "um.core",
        strength: "required",
        reason: "Core contracts",
      },
    ],
    flags: [
      {
        flagId: "example.core.enabled",
        defaultState: "off",
        linkedCapabilityIds: ["example.core.ping"],
        dangerElevated: false,
      },
    ],
    health: { reportsStatus: true, probeRef: "probe.example.health" },
    sideEffectSummary: ["read"],
    maturityLevel: 1,
    documentationRefs: ["docs/example/README.md", "docs/example/OWNERS.md"],
    soTStatement: "Owns example domain truth only.",
    nonOwnershipStatement: "Does not own money, AI execution, or other platforms.",
    ...overrides,
  };
}

function assembleCatalogs() {
  const platforms = createInMemoryPlatformRegistry();
  expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);

  const capabilities = createInMemoryCapabilityRegistry({ platforms });
  expect(
    capabilities.register({
      capability: {
        capabilityId: "example.core.ping",
        platformId: "example",
        moduleId: "example.core",
        displayName: "Ping",
        sideEffectClasses: ["read"],
        authClass: "authenticated",
        stability: "stable",
        version: "1.0.0",
        flagId: "example.core.enabled",
      },
    }).ok,
  ).toBe(true);

  const eventTypes = createInMemoryEventTypeRegistry({ platforms });
  expect(
    eventTypes.register({
      eventType: {
        eventType: "example.core.pinged",
        producerPlatformId: "example",
        schemaVersion: "1.0.0",
        compatibilityPolicy: "backward",
        payloadSchemaRef: "schema://example.core.pinged",
        piiClass: "none",
        deliveryExpectation: "best_effort",
        stability: "stable",
        subjectRefExpectations: ["example.ping"],
      },
    }).ok,
  ).toBe(true);

  const eventRoutes = createInMemoryEventRoutingRegistry({
    platforms,
    eventTypes,
  });
  expect(
    eventRoutes.register({
      route: {
        eventType: "example.core.pinged",
        destinationPlatformId: "example",
      },
    }).ok,
  ).toBe(true);

  const flags = createInMemoryFlagRegistry({ platforms, capabilities });
  expect(
    flags.register({
      flag: {
        flagId: "example.core.enabled",
        ownerPlatformId: "example",
        ownerRef: "example.owners",
        defaultState: "off",
        linkedCapabilityIds: ["example.core.ping"],
        dangerElevated: false,
        auditRequired: false,
      },
    }).ok,
  ).toBe(true);

  const dependencies = createInMemoryDependencyRegistry({
    platforms,
    capabilities,
  });
  expect(
    dependencies.register({
      dependency: {
        fromPlatformId: "example",
        targetKind: "peer_kernel",
        targetId: "um.core",
        strength: "required",
        reason: "Core contracts",
      },
    }).ok,
  ).toBe(true);

  const healthDeclarations = createInMemoryHealthRegistry({ platforms });
  expect(
    healthDeclarations.register({
      health: {
        platformId: "example",
        reportsStatus: true,
        probeRef: "probe.example.health",
      },
    }).ok,
  ).toBe(true);

  const healthObservations = createInMemoryHealthReporter({ platforms });
  const snapshot: UmHealthSnapshot = {
    platformId: "example",
    status: "ready",
    checkedAt: "2026-08-09T12:00:00.000Z",
    affectedCapabilityIds: ["example.core.ping"],
    dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
  };
  expect(healthObservations.report(snapshot).ok).toBe(true);

  return {
    platforms,
    capabilities,
    eventTypes,
    eventRoutes,
    flags,
    dependencies,
    healthDeclarations,
    healthObservations,
  };
}

describe("um.core referential integrity contract V1", () => {
  it("accepts a fully wired catalog set with observation refs", () => {
    const catalogs = assembleCatalogs();
    const result = validateReferentialIntegrity(catalogs);
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("rejects capability rows whose owner platform was cleared", () => {
    const catalogs = assembleCatalogs();
    catalogs.platforms.clear();
    const result = validateReferentialIntegrity({
      platforms: catalogs.platforms,
      capabilities: catalogs.capabilities,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmReferentialIntegrityCode.CAPABILITY_UNKNOWN_PLATFORM,
    );
  });

  it("rejects capability flagId missing from the flag catalog", () => {
    const catalogs = assembleCatalogs();
    catalogs.flags.clear();
    const result = validateReferentialIntegrity({
      platforms: catalogs.platforms,
      capabilities: catalogs.capabilities,
      flags: catalogs.flags,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toEqual([
      UmReferentialIntegrityCode.CAPABILITY_UNKNOWN_FLAG,
    ]);
  });

  it("rejects routes whose destination platform was cleared", () => {
    const catalogs = assembleCatalogs();
    catalogs.platforms.clear();
    const result = validateReferentialIntegrity({
      platforms: catalogs.platforms,
      eventTypes: catalogs.eventTypes,
      eventRoutes: catalogs.eventRoutes,
    });
    expect(result.ok).toBe(false);
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain(UmReferentialIntegrityCode.ROUTE_UNKNOWN_DESTINATION);
    expect(codes).toContain(UmReferentialIntegrityCode.ROUTE_UNKNOWN_PRODUCER);
    expect(codes).toContain(
      UmReferentialIntegrityCode.EVENT_TYPE_UNKNOWN_PRODUCER,
    );
  });

  it("rejects flag linked capabilities missing from the capability catalog", () => {
    const catalogs = assembleCatalogs();
    catalogs.capabilities.clear();
    const result = validateReferentialIntegrity({
      platforms: catalogs.platforms,
      capabilities: catalogs.capabilities,
      flags: catalogs.flags,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmReferentialIntegrityCode.FLAG_UNKNOWN_LINKED_CAPABILITY,
    );
  });

  it("rejects dependency owner/platform target drift after platform clear", () => {
    const platforms = createInMemoryPlatformRegistry();
    expect(
      platforms.register({
        manifest: validManifest({
          requires: [
            {
              targetKind: "peer_kernel",
              targetId: "um.core",
              strength: "required",
              reason: "Core contracts",
            },
            {
              targetKind: "platform",
              targetId: "other",
              strength: "required",
              reason: "Needs other",
            },
          ],
        }),
      }).ok,
    ).toBe(true);
    expect(
      platforms.register({
        manifest: validManifest({
          platformId: "other",
          modules: [
            {
              moduleId: "other.core",
              displayName: "Other",
              capabilityIds: ["other.core.ping"],
            },
          ],
          capabilities: [
            {
              capabilityId: "other.core.ping",
              moduleId: "other.core",
              displayName: "Ping",
              sideEffectClasses: ["read"],
              stability: "stable",
              version: "1.0.0",
            },
          ],
          providesEvents: [
            {
              eventType: "other.core.pinged",
              schemaVersion: "1.0.0",
              stability: "stable",
            },
          ],
          flags: [
            {
              flagId: "other.core.enabled",
              defaultState: "off",
              linkedCapabilityIds: ["other.core.ping"],
              dangerElevated: false,
            },
          ],
          sideEffectSummary: ["read"],
        }),
      }).ok,
    ).toBe(true);

    const dependencies = createInMemoryDependencyRegistry({ platforms });
    expect(
      dependencies.register({
        dependency: {
          fromPlatformId: "example",
          targetKind: "platform",
          targetId: "other",
          strength: "required",
          reason: "Needs other",
        },
      }).ok,
    ).toBe(true);

    platforms.clear();
    const result = validateReferentialIntegrity({ platforms, dependencies });
    expect(result.ok).toBe(false);
    const codes = result.findings.map((f) => f.code).sort();
    expect(codes).toEqual(
      [
        UmReferentialIntegrityCode.DEPENDENCY_UNKNOWN_OWNER,
        UmReferentialIntegrityCode.DEPENDENCY_UNKNOWN_PLATFORM_TARGET,
      ].sort(),
    );
  });

  it("rejects health declaration and observation platform orphans", () => {
    const catalogs = assembleCatalogs();
    catalogs.platforms.clear();
    const result = validateReferentialIntegrity({
      platforms: catalogs.platforms,
      healthDeclarations: catalogs.healthDeclarations,
      healthObservations: catalogs.healthObservations,
    });
    expect(result.ok).toBe(false);
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain(
      UmReferentialIntegrityCode.HEALTH_DECLARATION_UNKNOWN_PLATFORM,
    );
    expect(codes).toContain(
      UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_PLATFORM,
    );
  });

  it("rejects observation capability and dependency targets missing from catalogs", () => {
    const catalogs = assembleCatalogs();
    expect(
      catalogs.healthObservations.report({
        platformId: "example",
        status: "degraded",
        checkedAt: "2026-08-09T13:00:00.000Z",
        affectedCapabilityIds: ["example.core.missing"],
        dependencyStatuses: [{ targetId: "example.missing.target", status: "unavailable" }],
      }).ok,
    ).toBe(true);

    const result = validateReferentialIntegrity({
      platforms: catalogs.platforms,
      capabilities: catalogs.capabilities,
      dependencies: catalogs.dependencies,
      healthObservations: catalogs.healthObservations,
    });
    expect(result.ok).toBe(false);
    const codes = result.findings.map((f) => f.code).sort();
    expect(codes).toEqual(
      [
        UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_CAPABILITY,
        UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_DEPENDENCY_TARGET,
      ].sort(),
    );
  });

  it("does not invent peer_kernel SoT and skips omitted optional catalogs", () => {
    const catalogs = assembleCatalogs();
    const result = validateReferentialIntegrity({
      platforms: catalogs.platforms,
      dependencies: catalogs.dependencies,
    });
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("is deterministic for identical inputs", () => {
    const catalogs = assembleCatalogs();
    catalogs.platforms.clear();
    const a = validateReferentialIntegrity({
      platforms: catalogs.platforms,
      capabilities: catalogs.capabilities,
      eventTypes: catalogs.eventTypes,
      eventRoutes: catalogs.eventRoutes,
      flags: catalogs.flags,
      dependencies: catalogs.dependencies,
      healthDeclarations: catalogs.healthDeclarations,
      healthObservations: catalogs.healthObservations,
    });
    const b = validateReferentialIntegrity({
      platforms: catalogs.platforms,
      capabilities: catalogs.capabilities,
      eventTypes: catalogs.eventTypes,
      eventRoutes: catalogs.eventRoutes,
      flags: catalogs.flags,
      dependencies: catalogs.dependencies,
      healthDeclarations: catalogs.healthDeclarations,
      healthObservations: catalogs.healthObservations,
    });
    expect(a).toEqual(b);
    expect(a.ok).toBe(false);
  });
});
