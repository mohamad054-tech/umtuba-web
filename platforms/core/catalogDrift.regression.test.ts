/**
 * UM Core catalog / stale-catalog drift regression matrix (TEST-ONLY).
 *
 * TASK: UM_CORE_PLATFORM_CATALOG_DRIFT_REGRESSION_MATRIX_V1
 * AGENT: PC2-A3
 *
 * Covers:
 * 1. re-register without rematerializing dependents
 * 2. publisher × routing independence
 * 3. declaration vs observation drift
 * 4. P13 drift codes and RI findings coexist correctly
 *
 * Deterministic ordering + pure validators (no store mutation).
 * Public alpha APIs only — no production semantic changes.
 */

import { describe, expect, it } from "vitest";
import { createInMemoryCapabilityRegistry } from "./capability";
import { createInMemoryDependencyRegistry } from "./dependency";
import {
  createInMemoryEventPublisher,
  createInMemoryEventRoutingRegistry,
  createInMemoryEventTypeRegistry,
  type UmPlatformEventEnvelope,
} from "./event";
import { createInMemoryFlagRegistry } from "./flag";
import {
  createInMemoryHealthRegistry,
  createInMemoryHealthReporter,
  type UmHealthSnapshot,
} from "./health";
import type { UmPlatformManifest } from "./manifest/types";
import { createInMemoryPlatformRegistry } from "./registry";
import {
  UmDependencyValidationCode,
  UmReferentialIntegrityCode,
  createUmCoreValidator,
  validatePlatformDependencies,
  validateReferentialIntegrity,
} from "./validation";

function platformManifest(
  platformId: string,
  overrides: Partial<UmPlatformManifest> = {},
): UmPlatformManifest {
  const moduleId = `${platformId}.core`;
  const capabilityId = `${platformId}.core.ping`;
  const flagId = `${platformId}.core.enabled`;
  const eventType = `${platformId}.core.pinged`;
  return {
    platformId,
    platformVersion: "1.0.0",
    displayName: `${platformId} Platform`,
    owners: [{ id: `owner.${platformId}`, displayName: "Owner" }],
    modules: [
      {
        moduleId,
        displayName: "Core Module",
        capabilityIds: [capabilityId],
      },
    ],
    capabilities: [
      {
        capabilityId,
        moduleId,
        displayName: "Ping",
        sideEffectClasses: ["read"],
        stability: "stable",
        version: "1.0.0",
        flagId,
      },
    ],
    providesEvents: [
      {
        eventType,
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
        flagId,
        defaultState: "off",
        linkedCapabilityIds: [capabilityId],
        dangerElevated: false,
      },
    ],
    health: { reportsStatus: true, probeRef: `probe.${platformId}.health` },
    sideEffectSummary: ["read"],
    maturityLevel: 1,
    documentationRefs: [`docs/${platformId}/README.md`, `docs/${platformId}/OWNERS.md`],
    soTStatement: `Owns ${platformId} domain truth only.`,
    nonOwnershipStatement: "Does not own money, AI execution, or other platforms.",
    ...overrides,
  };
}

function peerKernel(fromPlatformId: string) {
  return {
    fromPlatformId,
    targetKind: "peer_kernel" as const,
    targetId: "um.core",
    strength: "required" as const,
    reason: "Core contracts",
  };
}

function snapshotFingerprint(stores: {
  platforms: { size(): number; list(): readonly unknown[] };
  dependencies: { size(): number; list(): readonly unknown[] };
  capabilities?: { size(): number; list(): readonly unknown[] };
  eventTypes?: { size(): number; list(): readonly unknown[] };
  eventRoutes?: { size(): number; list(): readonly unknown[] };
  flags?: { size(): number; list(): readonly unknown[] };
  healthDeclarations?: { size(): number; list(): readonly unknown[] };
  healthObservations?: { list(): readonly unknown[] };
}) {
  return {
    platforms: stores.platforms.size(),
    platformList: stores.platforms.list(),
    dependencies: stores.dependencies.size(),
    depList: stores.dependencies.list(),
    capabilities: stores.capabilities?.size(),
    capList: stores.capabilities?.list(),
    eventTypes: stores.eventTypes?.size(),
    eventTypeList: stores.eventTypes?.list(),
    eventRoutes: stores.eventRoutes?.size(),
    routeList: stores.eventRoutes?.list(),
    flags: stores.flags?.size(),
    flagList: stores.flags?.list(),
    healthDeclarations: stores.healthDeclarations?.size(),
    healthDeclList: stores.healthDeclarations?.list(),
    healthObsList: stores.healthObservations?.list(),
  };
}

function codesSorted(codes: readonly string[]): string[] {
  return [...codes].sort((a, b) => a.localeCompare(b));
}

describe("UM Core catalog drift regression matrix V1", () => {
  describe("D1: re-register without rematerializing dependents", () => {
    it("re-registering a platform leaves stale/missing P9 edges until rematerialized", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({
          manifest: platformManifest("alpha", {
            requires: [
              peerKernel("alpha"),
              {
                targetKind: "peer_kernel",
                targetId: "um.extra",
                strength: "optional",
                reason: "Temporary peer",
              },
            ],
          }),
        }).ok,
      ).toBe(true);

      const dependencies = createInMemoryDependencyRegistry({ platforms });
      expect(
        dependencies.register({ dependency: peerKernel("alpha") }).ok,
      ).toBe(true);
      expect(
        dependencies.register({
          dependency: {
            fromPlatformId: "alpha",
            targetKind: "peer_kernel",
            targetId: "um.extra",
            strength: "optional",
            reason: "Temporary peer",
          },
        }).ok,
      ).toBe(true);

      const depCountBeforeReregister = dependencies.size();
      const depListBeforeReregister = dependencies.list();

      // Re-register alpha with a narrower requires[] — dependents/catalog are NOT rematerialized.
      platforms.clear();
      expect(
        platforms.register({
          manifest: platformManifest("alpha", {
            requires: [
              peerKernel("alpha"),
              {
                targetKind: "peer_kernel",
                targetId: "um.fresh",
                strength: "required",
                reason: "Replacement peer",
              },
            ],
          }),
        }).ok,
      ).toBe(true);

      expect(dependencies.size()).toBe(depCountBeforeReregister);
      expect(dependencies.list()).toEqual(depListBeforeReregister);

      const result = validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
      });
      expect(result.ok).toBe(false);
      const codes = result.findings.map((f) => f.code);
      expect(codes).toContain(UmDependencyValidationCode.STALE_CATALOG_EDGE);
      expect(codes).toContain(UmDependencyValidationCode.MISSING_CATALOG_EDGE);
      expect(
        result.findings.some(
          (f) =>
            f.code === UmDependencyValidationCode.STALE_CATALOG_EDGE &&
            f.targetId === "um.extra",
        ),
      ).toBe(true);
      expect(
        result.findings.some(
          (f) =>
            f.code === UmDependencyValidationCode.MISSING_CATALOG_EDGE &&
            f.targetId === "um.fresh",
        ),
      ).toBe(true);
    });

    it("re-registering a dependency target leaves dependent catalog edges unrepaired", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({
          manifest: platformManifest("provider"),
        }).ok,
      ).toBe(true);
      expect(
        platforms.register({
          manifest: platformManifest("consumer", {
            requires: [
              peerKernel("consumer"),
              {
                targetKind: "platform",
                targetId: "provider",
                strength: "required",
                reason: "Needs provider",
              },
            ],
          }),
        }).ok,
      ).toBe(true);

      const dependencies = createInMemoryDependencyRegistry({ platforms });
      expect(
        dependencies.register({ dependency: peerKernel("consumer") }).ok,
      ).toBe(true);
      expect(
        dependencies.register({
          dependency: {
            fromPlatformId: "consumer",
            targetKind: "platform",
            targetId: "provider",
            strength: "required",
            reason: "Needs provider",
          },
        }).ok,
      ).toBe(true);

      const consumerEdgesBefore = dependencies
        .list()
        .filter((e) => e.fromPlatformId === "consumer");

      // Drop + re-register provider only — consumer edges are not rematerialized/cleared.
      platforms.clear();
      expect(
        platforms.register({
          manifest: platformManifest("provider", {
            platformVersion: "2.0.0",
          }),
        }).ok,
      ).toBe(true);
      expect(
        platforms.register({
          manifest: platformManifest("consumer", {
            requires: [
              peerKernel("consumer"),
              {
                targetKind: "platform",
                targetId: "provider",
                strength: "required",
                reason: "Needs provider",
              },
            ],
          }),
        }).ok,
      ).toBe(true);

      expect(
        dependencies.list().filter((e) => e.fromPlatformId === "consumer"),
      ).toEqual(consumerEdgesBefore);

      const p13 = validatePlatformDependencies("consumer", {
        platforms,
        dependencies,
      });
      expect(p13.ok).toBe(true);

      // Consumer edge still points at provider identity; RI remains green when both exist.
      const ri = validateReferentialIntegrity({ platforms, dependencies });
      expect(ri.ok).toBe(true);
    });
  });

  describe("D2: publisher × routing independence", () => {
    it("publish succeeds with empty routing; routes do not gate admission", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({ manifest: platformManifest("example") }).ok,
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
            subjectRefExpectations: ["ping"],
          },
        }).ok,
      ).toBe(true);

      const eventRoutes = createInMemoryEventRoutingRegistry({
        platforms,
        eventTypes,
      });
      expect(eventRoutes.size()).toBe(0);

      const publisher = createInMemoryEventPublisher({ eventTypes });
      const envelope: UmPlatformEventEnvelope<{ ok: boolean }> = {
        eventId: "evt-drift-001",
        eventType: "example.core.pinged",
        occurredAt: "2026-08-09T12:00:00.000Z",
        producerPlatformId: "example",
        subjectRef: { kind: "ping", id: "ping-1" },
        correlationId: "corr-drift-001",
        idempotencyKey: "idem-drift-001",
        schemaVersion: "1.0.0",
        payload: { ok: true },
      };

      expect(publisher.publish(envelope).ok).toBe(true);
      expect(eventRoutes.size()).toBe(0);

      // Registering a route does not change publish admission semantics.
      expect(
        eventRoutes.register({
          route: {
            eventType: "example.core.pinged",
            destinationPlatformId: "example",
          },
        }).ok,
      ).toBe(true);
      expect(publisher.publish({ ...envelope, eventId: "evt-drift-002" }).ok).toBe(
        true,
      );

      // Clearing routes leaves publisher admission intact; RI route findings appear separately.
      eventRoutes.clear();
      expect(publisher.publish({ ...envelope, eventId: "evt-drift-003" }).ok).toBe(
        true,
      );

      expect(
        eventRoutes.register({
          route: {
            eventType: "example.core.pinged",
            destinationPlatformId: "example",
          },
        }).ok,
      ).toBe(true);
      platforms.clear();
      expect(
        platforms.register({
          manifest: platformManifest("other"),
        }).ok,
      ).toBe(true);

      const ri = validateReferentialIntegrity({
        platforms,
        eventTypes,
        eventRoutes,
      });
      expect(ri.ok).toBe(false);
      const riCodes = ri.findings.map((f) => f.code);
      expect(riCodes).toContain(UmReferentialIntegrityCode.ROUTE_UNKNOWN_DESTINATION);
      expect(riCodes).toContain(UmReferentialIntegrityCode.ROUTE_UNKNOWN_PRODUCER);
      expect(riCodes).toContain(
        UmReferentialIntegrityCode.EVENT_TYPE_UNKNOWN_PRODUCER,
      );

      // Publish still admits against P6 alone (independent of RI / routing drift).
      expect(publisher.publish({ ...envelope, eventId: "evt-drift-004" }).ok).toBe(
        true,
      );
    });
  });

  describe("D3: declaration vs observation drift", () => {
    it("detects declaration orphans without inventing observation join semantics", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({ manifest: platformManifest("example") }).ok,
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
      // No observation recorded — declaration alone is not an RI failure.
      const green = validateReferentialIntegrity({
        platforms,
        healthDeclarations,
        healthObservations,
      });
      expect(green.ok).toBe(true);

      platforms.clear();
      const drifted = validateReferentialIntegrity({
        platforms,
        healthDeclarations,
        healthObservations,
      });
      expect(drifted.ok).toBe(false);
      expect(drifted.findings.map((f) => f.code)).toEqual([
        UmReferentialIntegrityCode.HEALTH_DECLARATION_UNKNOWN_PLATFORM,
      ]);
    });

    it("detects observation capability/dependency drift against catalogs independently of declarations", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({ manifest: platformManifest("example") }).ok,
      ).toBe(true);

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

      const dependencies = createInMemoryDependencyRegistry({
        platforms,
        capabilities,
      });
      expect(
        dependencies.register({ dependency: peerKernel("example") }).ok,
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
        status: "degraded",
        checkedAt: "2026-08-09T13:00:00.000Z",
        affectedCapabilityIds: ["example.core.missing"],
        dependencyStatuses: [
          { targetId: "example.missing.target", status: "unavailable" },
        ],
      };
      expect(healthObservations.report(snapshot).ok).toBe(true);

      const result = validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
        healthDeclarations,
        healthObservations,
      });
      expect(result.ok).toBe(false);
      expect(codesSorted(result.findings.map((f) => f.code))).toEqual(
        codesSorted([
          UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_CAPABILITY,
          UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_DEPENDENCY_TARGET,
        ]),
      );
      // Declaration remains referentially valid — observation drift is independent.
      expect(
        result.findings.some(
          (f) =>
            f.code ===
            UmReferentialIntegrityCode.HEALTH_DECLARATION_UNKNOWN_PLATFORM,
        ),
      ).toBe(false);
    });

    it("co-reports declaration and observation platform orphans when both are stale", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({ manifest: platformManifest("example") }).ok,
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
      expect(
        healthObservations.report({
          platformId: "example",
          status: "ready",
          checkedAt: "2026-08-09T12:00:00.000Z",
          affectedCapabilityIds: [],
          dependencyStatuses: [],
        }).ok,
      ).toBe(true);

      platforms.clear();
      const result = validateReferentialIntegrity({
        platforms,
        healthDeclarations,
        healthObservations,
      });
      expect(result.ok).toBe(false);
      expect(codesSorted(result.findings.map((f) => f.code))).toEqual(
        codesSorted([
          UmReferentialIntegrityCode.HEALTH_DECLARATION_UNKNOWN_PLATFORM,
          UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_PLATFORM,
        ]),
      );
    });
  });

  describe("D4: P13 drift codes and RI findings coexist", () => {
    it("emits both P13 stale/unknown-target codes and RI dependency orphans on the same state", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({
          manifest: platformManifest("alpha", {
            requires: [
              {
                targetKind: "platform",
                targetId: "beta",
                strength: "required",
                reason: "Needs beta",
              },
              {
                targetKind: "peer_kernel",
                targetId: "um.extra",
                strength: "optional",
                reason: "Temporary peer",
              },
            ],
          }),
        }).ok,
      ).toBe(true);
      expect(
        platforms.register({
          manifest: platformManifest("beta"),
        }).ok,
      ).toBe(true);

      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      expect(
        capabilities.register({
          capability: {
            capabilityId: "alpha.core.ping",
            platformId: "alpha",
            moduleId: "alpha.core",
            displayName: "Ping",
            sideEffectClasses: ["read"],
            authClass: "authenticated",
            stability: "stable",
            version: "1.0.0",
            flagId: "alpha.core.enabled",
          },
        }).ok,
      ).toBe(true);

      const flags = createInMemoryFlagRegistry({ platforms, capabilities });
      expect(
        flags.register({
          flag: {
            flagId: "alpha.core.enabled",
            ownerPlatformId: "alpha",
            ownerRef: "alpha.owners",
            defaultState: "off",
            linkedCapabilityIds: ["alpha.core.ping"],
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
            fromPlatformId: "alpha",
            targetKind: "platform",
            targetId: "beta",
            strength: "required",
            reason: "Needs beta",
          },
        }).ok,
      ).toBe(true);
      expect(
        dependencies.register({
          dependency: {
            fromPlatformId: "alpha",
            targetKind: "peer_kernel",
            targetId: "um.extra",
            strength: "optional",
            reason: "Temporary peer",
          },
        }).ok,
      ).toBe(true);

      // Re-register alpha without um.extra; drop beta entirely → P13 stale + unknown target, RI orphans.
      platforms.clear();
      expect(
        platforms.register({
          manifest: platformManifest("alpha", {
            requires: [
              {
                targetKind: "platform",
                targetId: "beta",
                strength: "required",
                reason: "Needs beta",
              },
            ],
          }),
        }).ok,
      ).toBe(true);

      const before = snapshotFingerprint({
        platforms,
        dependencies,
        capabilities,
        flags,
      });

      const p13 = validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
        capabilities,
      });
      const composed = createUmCoreValidator({
        platforms,
        dependencies,
        capabilities,
      }).validateDependencies("alpha");
      const ri = validateReferentialIntegrity({
        platforms,
        capabilities,
        flags,
        dependencies,
      });

      expect(p13).toEqual(composed);
      expect(p13.ok).toBe(false);
      expect(ri.ok).toBe(false);

      const p13Codes = codesSorted(p13.findings.map((f) => f.code));
      expect(p13Codes).toEqual(
        codesSorted([
          UmDependencyValidationCode.STALE_CATALOG_EDGE,
          UmDependencyValidationCode.UNKNOWN_PLATFORM_TARGET,
        ]),
      );
      expect(
        p13.findings.some(
          (f) =>
            f.code === UmDependencyValidationCode.STALE_CATALOG_EDGE &&
            f.targetId === "um.extra",
        ),
      ).toBe(true);
      expect(
        p13.findings.some(
          (f) =>
            f.code === UmDependencyValidationCode.UNKNOWN_PLATFORM_TARGET &&
            f.targetId === "beta",
        ),
      ).toBe(true);

      const riCodes = codesSorted(ri.findings.map((f) => f.code));
      expect(riCodes).toContain(
        UmReferentialIntegrityCode.DEPENDENCY_UNKNOWN_PLATFORM_TARGET,
      );
      // Capability/flag rows still reference alpha (re-registered) — no capability platform orphan.
      expect(riCodes).not.toContain(
        UmReferentialIntegrityCode.CAPABILITY_UNKNOWN_PLATFORM,
      );

      // Distinct namespaces coexist without collision or remapping.
      expect(
        new Set([...p13Codes, ...riCodes]).size,
      ).toBe(p13Codes.length + riCodes.length);

      expect(snapshotFingerprint({ platforms, dependencies, capabilities, flags })).toEqual(
        before,
      );
    });
  });

  describe("matrix invariants: deterministic ordering + pure validators", () => {
    it("orders P13 and RI findings deterministically across repeated runs", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({
          manifest: platformManifest("example", {
            requires: [
              {
                targetKind: "peer_kernel",
                targetId: "um.z",
                strength: "required",
                reason: "Z",
              },
              {
                targetKind: "peer_kernel",
                targetId: "um.a",
                strength: "required",
                reason: "A",
              },
            ],
          }),
        }).ok,
      ).toBe(true);

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
            subjectRefExpectations: ["ping"],
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
      // Intentionally leave requirements unmaterialized for P13 ordering sample.

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
      expect(
        healthObservations.report({
          platformId: "example",
          status: "ready",
          checkedAt: "2026-08-09T12:00:00.000Z",
          affectedCapabilityIds: ["example.core.ping"],
          dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
        }).ok,
      ).toBe(true);

      platforms.clear();

      const p13a = validatePlatformDependencies("example", {
        platforms,
        dependencies,
        capabilities,
      });
      const p13b = validatePlatformDependencies("example", {
        platforms,
        dependencies,
        capabilities,
      });
      expect(p13a).toEqual(p13b);
      const p13Keys = p13a.findings.map(
        (f) => `${f.code}:${f.targetId ?? ""}:${f.relatedCapabilityId ?? ""}`,
      );
      expect(p13Keys).toEqual([...p13Keys].sort((a, b) => a.localeCompare(b)));

      const ria = validateReferentialIntegrity({
        platforms,
        capabilities,
        eventTypes,
        eventRoutes,
        flags,
        dependencies,
        healthDeclarations,
        healthObservations,
      });
      const rib = validateReferentialIntegrity({
        platforms,
        capabilities,
        eventTypes,
        eventRoutes,
        flags,
        dependencies,
        healthDeclarations,
        healthObservations,
      });
      expect(ria).toEqual(rib);
      const riKeys = ria.findings.map(
        (f) => `${f.code}:${f.path ?? ""}:${f.message}`,
      );
      expect(riKeys).toEqual([...riKeys].sort((a, b) => a.localeCompare(b)));
    });

    it("P13 and RI validators do not mutate catalog stores", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({ manifest: platformManifest("example") }).ok,
      ).toBe(true);

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
            subjectRefExpectations: ["ping"],
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
        dependencies.register({ dependency: peerKernel("example") }).ok,
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
      expect(
        healthObservations.report({
          platformId: "example",
          status: "ready",
          checkedAt: "2026-08-09T12:00:00.000Z",
          affectedCapabilityIds: ["example.core.ping"],
          dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
        }).ok,
      ).toBe(true);

      const before = snapshotFingerprint({
        platforms,
        dependencies,
        capabilities,
        eventTypes,
        eventRoutes,
        flags,
        healthDeclarations,
        healthObservations,
      });

      validatePlatformDependencies("example", {
        platforms,
        dependencies,
        capabilities,
      });
      createUmCoreValidator({
        platforms,
        dependencies,
        capabilities,
      }).validateDependencies("example");
      validateReferentialIntegrity({
        platforms,
        capabilities,
        eventTypes,
        eventRoutes,
        flags,
        dependencies,
        healthDeclarations,
        healthObservations,
      });

      expect(
        snapshotFingerprint({
          platforms,
          dependencies,
          capabilities,
          eventTypes,
          eventRoutes,
          flags,
          healthDeclarations,
          healthObservations,
        }),
      ).toEqual(before);
    });
  });
});
