/**
 * UM Core release-candidate regression pack (TEST-ONLY).
 *
 * TASK: UM_CORE_PLATFORM_RELEASE_CANDIDATE_REGRESSION_PACK_V1
 * AGENT: PC2-A2 · SOURCE_DEVICE=PC2 · DEVICE_ROLE=PLATFORM_CORE_PRIMARY
 * ALPHA TIP: origin/alpha-0.2 @ af1d8247d3af7a74210c2e187e11908d91fdb281
 *
 * Consolidated smoke of ACTUAL integrated Core public behavior on current
 * alpha. Complements (does not replace) golden-path, production-contract
 * suite, P1–P19 coherence matrix, catalog-drift matrix, property suite.
 *
 * CRITICAL NEGATIVE ASSERTIONS:
 * - P13 ≠ P19
 * - P19 ≠ Referential Integrity
 * - Health ≠ Lifecycle Readiness
 * - Capability Compatibility ≠ Health
 * - Capability Compatibility ≠ Lifecycle Readiness
 * - Pure validators do not mutate stores
 * - Repeated validation is deterministic
 *
 * MODE: TEST-ONLY — no production semantic changes.
 */

import { describe, expect, it } from "vitest";
import {
  UmCapabilityCompatibilityCode,
  UmCapabilityRegistryCode,
  UM_CORE_PLATFORM_CAPABILITY_COMPATIBILITY_PHASE,
  createCapabilityCompatibilityEvaluator,
  createInMemoryCapabilityAsserter,
  createInMemoryCapabilityRegistry,
} from "./capability";
import { assessPlatformCompliance } from "./compliance";
import { createInMemoryDependencyRegistry } from "./dependency";
import {
  UmEventRoutingCode,
  buildEventRouteId,
  createInMemoryEventPublisher,
  createInMemoryEventRoutingRegistry,
  createInMemoryEventTypeRegistry,
} from "./event";
import {
  UmFlagEvaluationCode,
  createInMemoryFlagEvaluator,
  createInMemoryFlagRegistry,
} from "./flag";
import {
  UmFleetHealthAggregationCode,
  UmHealthHistoryCode,
  UmHealthRegistryCode,
  UmHealthReportCode,
  aggregateFleetHealth,
  createHealthDiagnosticsJoin,
  createInMemoryHealthObservationHistory,
  createInMemoryHealthRegistry,
  createInMemoryHealthReporter,
  type UmHealthSnapshot,
} from "./health";
import type { UmPlatformManifest } from "./manifest/types";
import {
  UM_CORE_BOUNDED_HEALTH_HISTORY_PHASE,
  UM_CORE_DEPENDENCY_VALIDATOR_PHASE,
  UM_CORE_FLEET_HEALTH_AGGREGATION_PHASE,
  UM_CORE_FOUNDATION_PHASE,
  UM_CORE_HEALTH_DECLARATION_CATALOG_PHASE,
  UM_CORE_HEALTH_DIAGNOSTICS_JOIN_PHASE,
  UM_CORE_HEALTH_REPORTER_PHASE,
  UM_CORE_PACKAGE_ID,
  UM_CORE_SDK_CLIENT_FACTORY_PHASE,
  UM_CORE_VALIDATOR_COMPOSITION_PHASE,
} from "./packageIdentity";
import {
  UM_CORE_PLATFORM_LIFECYCLE_READINESS_PHASE,
  UmPlatformReadinessCode,
  createPlatformReadinessEvaluator,
} from "./readiness";
import { UmRegistryCode, createInMemoryPlatformRegistry } from "./registry";
import { createInMemoryUmCoreSdkFactory } from "./sdk";
import type { UmCoreSdkFactoryDeps } from "./sdk";
import {
  UmDependencyValidationCode,
  UmDependencyValidatorCode,
  UmManifestValidationCode,
  UmReferentialIntegrityCode,
  createInMemoryDependencyValidator,
  createUmCoreValidator,
  validateDependencyRequirements,
  validateManifestAdmission,
  validatePlatformDependencies,
  validatePlatformManifest,
  validateReferentialIntegrity,
} from "./validation";
import * as corePublic from "./index";

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
        defaultState: "on",
        linkedCapabilityIds: [capabilityId],
        dangerElevated: false,
      },
    ],
    health: { reportsStatus: true, probeRef: `probe.${platformId}.health` },
    sideEffectSummary: ["read"],
    maturityLevel: 1,
    documentationRefs: [
      `docs/${platformId}/README.md`,
      `docs/${platformId}/OWNERS.md`,
    ],
    soTStatement: `Owns ${platformId} domain truth only.`,
    nonOwnershipStatement:
      "Does not own money, AI execution, or other platforms.",
    ...overrides,
  };
}

function healthSnapshot(
  platformId: string,
  overrides: Partial<UmHealthSnapshot> = {},
): UmHealthSnapshot {
  return {
    platformId,
    status: "ready",
    checkedAt: "2026-08-09T12:00:00.000Z",
    affectedCapabilityIds: [`${platformId}.core.ping`],
    dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
    detail: "ok",
    ...overrides,
  };
}

function registerPlatform(platformId: string) {
  const platforms = createInMemoryPlatformRegistry();
  const result = platforms.register({ manifest: platformManifest(platformId) });
  expect(result.ok).toBe(true);
  return platforms;
}

function storeFingerprint(stores: {
  platforms: { size(): number; list(): readonly unknown[] };
  dependencies?: { size(): number; list(): readonly unknown[] };
  capabilities?: { size(): number; list(): readonly unknown[] };
  flags?: { size(): number; list(): readonly unknown[] };
  declarations?: { size(): number; list(): readonly unknown[] };
  observations?: { size(): number; list(): readonly unknown[] };
}) {
  return {
    platforms: stores.platforms.size(),
    platformIds: stores.platforms.list().map((r) => {
      const row = r as { platformId: string };
      return row.platformId;
    }),
    dependencies: stores.dependencies?.size(),
    depList: stores.dependencies?.list(),
    capabilities: stores.capabilities?.size(),
    capList: stores.capabilities?.list(),
    flags: stores.flags?.size(),
    flagList: stores.flags?.list(),
    declarations: stores.declarations?.size(),
    declList: stores.declarations?.list(),
    observations: stores.observations?.size(),
    obsList: stores.observations?.list(),
  };
}

describe("UM Core release-candidate regression pack V1", () => {
  describe("alpha inventory (integrated surfaces only)", () => {
    it("anchors package identity + integrated phase markers on current alpha", () => {
      expect(UM_CORE_PACKAGE_ID).toBe("um.core");
      expect(UM_CORE_FOUNDATION_PHASE).toBe("P1");
      expect(UM_CORE_VALIDATOR_COMPOSITION_PHASE).toBe("P13");
      expect(UM_CORE_DEPENDENCY_VALIDATOR_PHASE).toBe("P19");
      expect(UM_CORE_HEALTH_DECLARATION_CATALOG_PHASE).toBe("P10");
      expect(UM_CORE_HEALTH_REPORTER_PHASE).toBe("P17");
      expect(UM_CORE_HEALTH_DIAGNOSTICS_JOIN_PHASE).toBe("P18");
      expect(UM_CORE_FLEET_HEALTH_AGGREGATION_PHASE).toBe("P20");
      expect(UM_CORE_SDK_CLIENT_FACTORY_PHASE).toBe("P21");
      expect(UM_CORE_BOUNDED_HEALTH_HISTORY_PHASE).toBe("P22");
      // Local barrels present on alpha (not wired into root packageIdentity):
      expect(UM_CORE_PLATFORM_LIFECYCLE_READINESS_PHASE).toBe("P23");
      expect(UM_CORE_PLATFORM_CAPABILITY_COMPATIBILITY_PHASE).toBe("P24");

      expect(typeof createInMemoryPlatformRegistry).toBe("function");
      expect(typeof createUmCoreValidator).toBe("function");
      expect(typeof createInMemoryDependencyValidator).toBe("function");
      expect(typeof validateReferentialIntegrity).toBe("function");
      expect(typeof createPlatformReadinessEvaluator).toBe("function");
      expect(typeof createCapabilityCompatibilityEvaluator).toBe("function");
      expect(typeof createHealthDiagnosticsJoin).toBe("function");
      expect(typeof aggregateFleetHealth).toBe("function");
      expect(typeof createInMemoryUmCoreSdkFactory).toBe("function");
      expect(typeof createInMemoryHealthObservationHistory).toBe("function");
    });

    it("root barrel exposes integrated public surface (readiness stays local)", () => {
      const keys = Object.keys(corePublic);
      expect(keys).toContain("UM_CORE_PACKAGE_ID");
      expect(keys).toContain("createInMemoryPlatformRegistry");
      expect(keys).toContain("createUmCoreValidator");
      expect(keys).toContain("validateReferentialIntegrity");
      expect(keys).toContain("createInMemoryDependencyValidator");
      expect(keys).toContain("createCapabilityCompatibilityEvaluator");
      expect(keys).toContain("aggregateFleetHealth");
      expect(keys).toContain("createInMemoryUmCoreSdkFactory");
      // Lifecycle readiness is integrated locally but intentionally not
      // re-exported from platforms/core/index.ts on this alpha tip.
      expect(keys.some((k) => /lifecycle/i.test(k))).toBe(false);
      expect("createPlatformReadinessEvaluator" in corePublic).toBe(false);
    });
  });

  describe("CRITICAL NEGATIVE ASSERTIONS", () => {
    it("P13 ≠ P19 (phase markers + code namespaces)", () => {
      expect(UM_CORE_VALIDATOR_COMPOSITION_PHASE).not.toBe(
        UM_CORE_DEPENDENCY_VALIDATOR_PHASE,
      );
      expect(UM_CORE_VALIDATOR_COMPOSITION_PHASE).not.toBe("P19");
      expect(UM_CORE_DEPENDENCY_VALIDATOR_PHASE).not.toBe("P13");

      const p13 = new Set(Object.values(UmDependencyValidationCode));
      const p19 = new Set(Object.values(UmDependencyValidatorCode));
      for (const code of p13) {
        expect(code.startsWith("dependency.validation.")).toBe(true);
        expect(p19.has(code as never)).toBe(false);
      }
      for (const code of p19) {
        expect(code.startsWith("dependency.validator.")).toBe(true);
        expect(p13.has(code as never)).toBe(false);
      }
    });

    it("P19 ≠ Referential Integrity (code namespaces + behavioral divergence)", () => {
      const p19 = new Set(Object.values(UmDependencyValidatorCode));
      const ri = new Set(Object.values(UmReferentialIntegrityCode));
      for (const code of p19) {
        expect(ri.has(code as never)).toBe(false);
        expect(code.startsWith("referential.")).toBe(false);
      }
      for (const code of ri) {
        expect(p19.has(code as never)).toBe(false);
        expect(code.startsWith("dependency.validator.")).toBe(false);
      }

      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({ manifest: platformManifest("alpha") }).ok,
      ).toBe(true);
      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      const dependencies = createInMemoryDependencyRegistry({
        platforms,
        capabilities,
      });

      const p19Result = validateDependencyRequirements(
        "alpha",
        [
          {
            targetKind: "peer_kernel",
            targetId: "um.core",
            strength: "required",
            reason: "Core contracts",
          },
          {
            targetKind: "platform",
            targetId: "alpha",
            strength: "required",
            reason: "Self",
          },
        ],
        { platforms, capabilities, dependencies },
      );
      expect(p19Result.ok).toBe(false);
      expect(
        p19Result.findings.some(
          (f) => f.code === UmDependencyValidatorCode.REQUIRED_PLATFORM_CYCLE,
        ),
      ).toBe(true);
      expect(
        p19Result.findings.every((f) =>
          String(f.code).startsWith("dependency.validator."),
        ),
      ).toBe(true);

      const riResult = validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
      });
      expect(riResult.ok).toBe(true);
      expect(
        riResult.findings.some((f) =>
          String(f.code).startsWith("dependency.validator."),
        ),
      ).toBe(false);
    });

    it("P13 ≠ P19: unmaterialized peer_kernel → P13 missing edge; P19 peer_kernel ok", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({ manifest: platformManifest("alpha") }).ok,
      ).toBe(true);
      const dependencies = createInMemoryDependencyRegistry({ platforms });

      const p13 = validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
      });
      const composed = createUmCoreValidator({
        platforms,
        dependencies,
      }).validateDependencies("alpha");
      expect(p13).toEqual(composed);
      expect(p13.ok).toBe(false);
      expect(
        p13.findings.some(
          (f) => f.code === UmDependencyValidationCode.MISSING_CATALOG_EDGE,
        ),
      ).toBe(true);

      const requires = platforms.get("alpha")?.manifest.requires ?? [];
      const p19 = validateDependencyRequirements("alpha", requires, {
        platforms,
      });
      expect(p19.ok).toBe(true);
      expect(p19.findings).toEqual([]);
    });

    it("Health ≠ Lifecycle Readiness (namespaces + observation ready ≠ READY)", () => {
      const healthCodes = [
        ...Object.values(UmHealthRegistryCode),
        ...Object.values(UmHealthReportCode),
      ];
      const readinessCodes = Object.values(UmPlatformReadinessCode);
      const readinessSet = new Set(readinessCodes);
      for (const code of healthCodes) {
        expect(code.startsWith("health.")).toBe(true);
        expect(readinessSet.has(code as never)).toBe(false);
      }
      for (const code of readinessCodes) {
        expect(code.startsWith("readiness.")).toBe(true);
        expect(code.startsWith("health.")).toBe(false);
      }

      const platforms = createInMemoryPlatformRegistry();
      const declarations = createInMemoryHealthRegistry({ platforms });
      const observations = createInMemoryHealthReporter({ platforms });
      const readiness = createPlatformReadinessEvaluator({
        platforms,
        declarations,
        observations,
      });
      expect(
        platforms.register({ manifest: platformManifest("example") }).ok,
      ).toBe(true);
      expect(observations.report(healthSnapshot("example")).ok).toBe(true);

      const observation = observations.getSnapshot("example");
      expect(observation?.status).toBe("ready");
      const row = readiness.evaluatePlatform("example");
      expect(row.observationStatus).toBe("ready");
      expect(row.status).toBe("NOT_READY");
      expect(row.reasons.map((r) => r.code)).toContain(
        UmPlatformReadinessCode.HEALTH_UNDECLARED,
      );
      expect(row.status).not.toBe(observation?.status);
    });

    it("Capability Compatibility ≠ Health and ≠ Lifecycle Readiness", () => {
      const compat = Object.values(UmCapabilityCompatibilityCode);
      const health = new Set([
        ...Object.values(UmHealthRegistryCode),
        ...Object.values(UmHealthReportCode),
      ]);
      const readiness = new Set(Object.values(UmPlatformReadinessCode));
      for (const code of compat) {
        expect(code.startsWith("capability.compat.")).toBe(true);
        expect(health.has(code as never)).toBe(false);
        expect(readiness.has(code as never)).toBe(false);
      }

      const platforms = createInMemoryPlatformRegistry();
      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      const dependencies = createInMemoryDependencyRegistry({
        platforms,
        capabilities,
      });
      const declarations = createInMemoryHealthRegistry({ platforms });
      const observations = createInMemoryHealthReporter({ platforms });
      const readinessEval = createPlatformReadinessEvaluator({
        platforms,
        declarations,
        observations,
      });
      const compatEval = createCapabilityCompatibilityEvaluator({
        platforms,
        capabilities,
        dependencies,
      });

      expect(
        platforms.register({
          manifest: platformManifest("example", {
            capabilities: [
              {
                capabilityId: "example.core.ping",
                moduleId: "example.core",
                displayName: "Ping",
                sideEffectClasses: ["read"],
                stability: "stable",
                version: "1.0.0",
              },
            ],
          }),
        }).ok,
      ).toBe(true);
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
          },
        }).ok,
      ).toBe(true);

      const readyRow = readinessEval.evaluatePlatform("example");
      expect(readyRow.status).toBe("NOT_READY");

      const compatRow = compatEval.evaluatePlatformProvides("example", [
        "example.core.ping",
      ]);
      expect(compatRow.status).toBe("COMPATIBLE");
      expect(compatRow.status).not.toBe(readyRow.status);
      expect(["COMPATIBLE", "INCOMPATIBLE"]).toContain(compatRow.status);
      expect(["READY", "NOT_READY"]).toContain(readyRow.status);
      expect(
        compatRow.findings.every((f) =>
          String(f.code).startsWith("capability.compat."),
        ),
      ).toBe(true);
    });
  });

  describe("registration / manifest / compliance (integrated)", () => {
    it("admits valid platform; rejects invalid fail-closed with no store write", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({ manifest: platformManifest("producer") }).ok,
      ).toBe(true);
      expect(platforms.size()).toBe(1);
      expect(platforms.list().map((r) => r.platformId)).toEqual(["producer"]);

      const invalid = platformManifest("Bad_ID");
      const validation = validatePlatformManifest(invalid);
      expect(validation.ok).toBe(false);
      expect(validation.findings.map((f) => f.code)).toContain(
        UmManifestValidationCode.PLATFORM_ID_NAMING,
      );
      const admission = validateManifestAdmission(invalid);
      expect(admission.ok).toBe(false);
      const reg = platforms.register({ manifest: invalid });
      expect(reg.ok).toBe(false);
      expect(reg.findings.map((f) => f.code)).toContain(
        UmRegistryCode.MANIFEST_INVALID,
      );
      expect(platforms.size()).toBe(1);
      expect(platforms.has("Bad_ID")).toBe(false);
    });

    it("compliance follows admission; lists platforms in deterministic order", () => {
      const manifest = platformManifest("producer");
      const admission = validateManifestAdmission(manifest);
      expect(admission.ok).toBe(true);
      expect(
        assessPlatformCompliance({ manifest, admission }).status,
      ).toBe("compliant");

      const platforms = createInMemoryPlatformRegistry();
      expect(platforms.register({ manifest: platformManifest("zeta") }).ok).toBe(
        true,
      );
      expect(
        platforms.register({ manifest: platformManifest("alpha") }).ok,
      ).toBe(true);
      expect(platforms.register({ manifest: platformManifest("mu") }).ok).toBe(
        true,
      );
      expect(platforms.list().map((r) => r.platformId)).toEqual([
        "alpha",
        "mu",
        "zeta",
      ]);
    });
  });

  describe("events / routing + catalog drift smoke", () => {
    it("routing fails closed on unknown type/destination; route ids deterministic", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({ manifest: platformManifest("producer") }).ok,
      ).toBe(true);
      expect(
        platforms.register({ manifest: platformManifest("consumer") }).ok,
      ).toBe(true);
      const eventTypes = createInMemoryEventTypeRegistry({ platforms });
      expect(
        eventTypes.register({
          eventType: {
            eventType: "producer.core.pinged",
            producerPlatformId: "producer",
            schemaVersion: "1.0.0",
            compatibilityPolicy: "backward",
            payloadSchemaRef: "schemas/producer.core.pinged.v1.json",
            piiClass: "none",
            deliveryExpectation: "at_least_once",
            stability: "stable",
            subjectRefExpectations: ["ping"],
          },
        }).ok,
      ).toBe(true);
      const routing = createInMemoryEventRoutingRegistry({
        platforms,
        eventTypes,
      });

      expect(
        routing.register({
          route: {
            eventType: "producer.core.missing",
            destinationPlatformId: "consumer",
          },
        }).ok,
      ).toBe(false);
      expect(
        routing
          .register({
            route: {
              eventType: "producer.core.missing",
              destinationPlatformId: "consumer",
            },
          })
          .findings.map((f) => f.code),
      ).toContain(UmEventRoutingCode.UNKNOWN_EVENT_TYPE);

      expect(
        routing.register({
          route: {
            eventType: "producer.core.pinged",
            destinationPlatformId: "ghost",
          },
        }).ok,
      ).toBe(false);
      expect(
        routing
          .register({
            route: {
              eventType: "producer.core.pinged",
              destinationPlatformId: "ghost",
            },
          })
          .findings.map((f) => f.code),
      ).toContain(UmEventRoutingCode.UNKNOWN_DESTINATION);
      expect(routing.size()).toBe(0);

      expect(buildEventRouteId("producer.core.pinged", "consumer")).toBe(
        buildEventRouteId("producer.core.pinged", "consumer"),
      );
    });

    it("catalog drift: P13 missing edges + RI green when catalogs have no dangling refs", () => {
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
                targetId: "um.core",
                strength: "required",
                reason: "Core contracts",
              },
            ],
          }),
        }).ok,
      ).toBe(true);
      expect(
        platforms.register({ manifest: platformManifest("beta") }).ok,
      ).toBe(true);
      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      const dependencies = createInMemoryDependencyRegistry({
        platforms,
        capabilities,
      });
      // No P9 materialization — explicit rematerialization required.

      const before = storeFingerprint({ platforms, dependencies, capabilities });
      const p13 = validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
        capabilities,
      });
      expect(p13.ok).toBe(false);
      expect(
        p13.findings.some(
          (f) => f.code === UmDependencyValidationCode.MISSING_CATALOG_EDGE,
        ),
      ).toBe(true);
      const ri = validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
      });
      expect(ri.ok).toBe(true);
      expect(
        storeFingerprint({ platforms, dependencies, capabilities }),
      ).toEqual(before);
      expect(dependencies.size()).toBe(0);
    });
  });

  describe("health declaration vs observation + diagnostics/join + fleet", () => {
    it("declaration vs observation + join determinism", () => {
      const platforms = registerPlatform("producer");
      const declarations = createInMemoryHealthRegistry({ platforms });
      expect(
        declarations.register({
          health: {
            platformId: "producer",
            reportsStatus: true,
            probeRef: "probe.producer.health",
          },
        }).ok,
      ).toBe(true);
      const observations = createInMemoryHealthReporter({ platforms });
      expect(
        observations.report(
          healthSnapshot("producer", { checkedAt: "t1", status: "ready" }),
        ).ok,
      ).toBe(true);
      expect(
        observations.report(
          healthSnapshot("producer", {
            checkedAt: "t2",
            status: "degraded",
            detail: "partial",
          }),
        ).ok,
      ).toBe(true);
      expect(observations.size()).toBe(1);
      expect(observations.getSnapshot("producer")?.checkedAt).toBe("t2");

      const join = createHealthDiagnosticsJoin({
        platforms,
        declarations,
        observations,
      });
      const a = join.evaluate();
      const b = join.evaluate();
      expect(a).toEqual(b);
      expect(a.rows).toHaveLength(1);
      expect(a.rows[0]).toMatchObject({
        platformId: "producer",
        joinClass: "declared_and_observed",
        status: "degraded",
        hasObservation: true,
      });
    });

    it("fleet aggregation pure + order-stable; unknown platform fail-closed", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(platforms.register({ manifest: platformManifest("b") }).ok).toBe(
        true,
      );
      expect(platforms.register({ manifest: platformManifest("a") }).ok).toBe(
        true,
      );
      const declarations = createInMemoryHealthRegistry({ platforms });
      for (const id of ["a", "b"] as const) {
        expect(
          declarations.register({
            health: {
              platformId: id,
              reportsStatus: true,
              probeRef: `probe.${id}.health`,
            },
          }).ok,
        ).toBe(true);
      }
      const observations = createInMemoryHealthReporter({ platforms });
      expect(
        observations.report(
          healthSnapshot("b", { checkedAt: "2026-08-09T12:05:00.000Z" }),
        ).ok,
      ).toBe(true);
      expect(
        observations.report(
          healthSnapshot("a", {
            checkedAt: "2026-08-09T12:00:00.000Z",
            status: "degraded",
          }),
        ).ok,
      ).toBe(true);

      const fleet1 = aggregateFleetHealth({
        platforms,
        observations,
        declarations,
      });
      const fleet2 = aggregateFleetHealth({
        platforms,
        observations,
        declarations,
      });
      expect(fleet1.ok).toBe(true);
      expect(fleet1).toEqual(fleet2);
      expect(fleet1.members.map((m) => m.platformId)).toEqual(["a", "b"]);
      expect(fleet1.observedWorstStatus).toBe("degraded");

      const unknown = aggregateFleetHealth({
        platforms,
        observations: {
          getSnapshot: () => undefined,
          list: () => [healthSnapshot("ghost")],
        },
        declarations,
      });
      expect(unknown.ok).toBe(false);
      expect(unknown.findings.map((f) => f.code)).toContain(
        UmFleetHealthAggregationCode.UNKNOWN_PLATFORM,
      );
    });
  });

  describe("lifecycle readiness + capability compatibility smoke", () => {
    it("readiness READY only when registered + declared + observed ready", () => {
      const platforms = createInMemoryPlatformRegistry();
      const declarations = createInMemoryHealthRegistry({ platforms });
      const observations = createInMemoryHealthReporter({ platforms });
      const readiness = createPlatformReadinessEvaluator({
        platforms,
        declarations,
        observations,
      });

      expect(
        platforms.register({ manifest: platformManifest("example") }).ok,
      ).toBe(true);
      expect(readiness.evaluatePlatform("example").status).toBe("NOT_READY");

      expect(
        declarations.register({
          health: {
            platformId: "example",
            reportsStatus: true,
            probeRef: "probe.example.health",
          },
        }).ok,
      ).toBe(true);
      expect(readiness.evaluatePlatform("example").status).toBe("NOT_READY");
      expect(
        readiness
          .evaluatePlatform("example")
          .reasons.map((r) => r.code),
      ).toContain(UmPlatformReadinessCode.HEALTH_UNOBSERVED);

      expect(observations.report(healthSnapshot("example")).ok).toBe(true);
      const ready = readiness.evaluatePlatform("example");
      expect(ready.status).toBe("READY");
      // Health token vocabulary remains distinct from readiness vocabulary.
      expect(ready.status).not.toBe(
        observations.getSnapshot("example")?.status,
      );
    });

    it("capability compatibility missing required → INCOMPATIBLE (not health/readiness)", () => {
      const platforms = registerPlatform("provider");
      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      expect(
        capabilities.register({
          capability: {
            capabilityId: "provider.core.ping",
            platformId: "provider",
            moduleId: "provider.core",
            displayName: "Ping",
            sideEffectClasses: ["read"],
            authClass: "authenticated",
            stability: "stable",
            version: "1.0.0",
            flagId: "provider.core.enabled",
          },
        }).ok,
      ).toBe(true);
      const compat = createCapabilityCompatibilityEvaluator({
        platforms,
        capabilities,
      });
      const missing = compat.evaluatePlatformProvides("provider", [
        "provider.core.ping",
        "provider.core.missing",
      ]);
      expect(missing.status).toBe("INCOMPATIBLE");
      // Provides-path uses UNDECLARED (manifest declaration gap).
      // MISSING is reserved for consumer requirements / catalog presence.
      expect(missing.findings.map((f) => f.code)).toContain(
        UmCapabilityCompatibilityCode.REQUIRED_CAPABILITY_UNDECLARED,
      );
      expect(
        missing.findings.every((f) =>
          String(f.code).startsWith("capability.compat."),
        ),
      ).toBe(true);
    });
  });

  describe("SDK / factory + bounded history + snapshot immutability", () => {
    it("SDK factory requires deps; bounded history FIFO + capacity guard", () => {
      const platforms = registerPlatform("producer");
      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      const flags = createInMemoryFlagRegistry({ platforms, capabilities });
      const flagEvaluator = createInMemoryFlagEvaluator({ flags });
      const capabilityAsserter = createInMemoryCapabilityAsserter({
        capabilities,
        flags: flagEvaluator,
      });
      const eventTypes = createInMemoryEventTypeRegistry({ platforms });
      const events = createInMemoryEventPublisher({ eventTypes });
      const health = createInMemoryHealthReporter({ platforms });
      const complete: UmCoreSdkFactoryDeps = {
        flags: flagEvaluator,
        capabilities: capabilityAsserter,
        events,
        health,
        platforms,
      };
      expect(typeof createInMemoryUmCoreSdkFactory(complete).createClient).toBe(
        "function",
      );
      expect(() =>
        createInMemoryUmCoreSdkFactory({
          ...complete,
          flags: null as unknown as UmCoreSdkFactoryDeps["flags"],
        }),
      ).toThrow(/flags/);

      const bad = createInMemoryHealthObservationHistory({
        platforms,
        capacity: 0,
      });
      expect(bad.ok).toBe(false);
      if (bad.ok) throw new Error("expected capacity reject");
      expect(bad.findings.map((f) => f.code)).toContain(
        UmHealthHistoryCode.CAPACITY_INVALID,
      );

      const created = createInMemoryHealthObservationHistory({
        platforms,
        capacity: 2,
      });
      expect(created.ok).toBe(true);
      if (!created.ok) throw new Error("history create");
      const history = created.history;
      expect(
        history.record(healthSnapshot("producer", { checkedAt: "h1" })).ok,
      ).toBe(true);
      expect(
        history.record(
          healthSnapshot("producer", { checkedAt: "h2", status: "degraded" }),
        ).ok,
      ).toBe(true);
      const third = history.record(
        healthSnapshot("producer", { checkedAt: "h3", status: "unavailable" }),
      );
      expect(third.ok).toBe(true);
      expect(third.evicted).toBe(true);
      expect(history.getHistory("producer").map((s) => s.checkedAt)).toEqual([
        "h2",
        "h3",
      ]);
    });

    it("NEGATIVE MUTATION_ISOLATION: mutating returned snapshot does not corrupt store", () => {
      const platforms = registerPlatform("producer");
      const observations = createInMemoryHealthReporter({ platforms });
      const input = healthSnapshot("producer", {
        checkedAt: "iso-1",
        affectedCapabilityIds: ["producer.core.ping"],
      });
      expect(observations.report(input).ok).toBe(true);

      (input.affectedCapabilityIds as string[]).push("producer.core.extra");
      (input as { checkedAt: string }).checkedAt = "mutated-input";

      const stored = observations.getSnapshot("producer");
      expect(stored?.checkedAt).toBe("iso-1");
      expect(stored?.affectedCapabilityIds).toEqual(["producer.core.ping"]);

      (stored as { detail: string }).detail = "mutated-read";
      (stored!.affectedCapabilityIds as string[]).push("x");
      expect(observations.getSnapshot("producer")?.detail).toBe("ok");
      expect(
        observations.getSnapshot("producer")?.affectedCapabilityIds,
      ).toEqual(["producer.core.ping"]);
    });
  });

  describe("public API backward-compat smoke + RI / flags", () => {
    it("RI fails closed on capability→flag drift; flag unknown is fail-closed", () => {
      const platforms = registerPlatform("producer");
      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      expect(
        capabilities.register({
          capability: {
            capabilityId: "producer.core.ping",
            platformId: "producer",
            moduleId: "producer.core",
            displayName: "Ping",
            sideEffectClasses: ["read"],
            authClass: "authenticated",
            stability: "stable",
            version: "1.0.0",
            flagId: "producer.core.enabled",
          },
        }).ok,
      ).toBe(true);
      const flags = createInMemoryFlagRegistry({ platforms, capabilities });
      const ri = validateReferentialIntegrity({
        platforms,
        capabilities,
        flags,
      });
      expect(ri.ok).toBe(false);
      expect(ri.findings.map((f) => f.code)).toContain(
        UmReferentialIntegrityCode.CAPABILITY_UNKNOWN_FLAG,
      );

      const evaluator = createInMemoryFlagEvaluator({ flags });
      const result = evaluator.evaluate({ flagId: "producer.core.missing" });
      expect(result.source).toBe("unknown");
      expect(result.reasonCode).toBe(UmFlagEvaluationCode.UNKNOWN);
    });

    it("unknown platform fail-closed across capability + health declaration/observation", () => {
      const platforms = registerPlatform("producer");
      const declarations = createInMemoryHealthRegistry({ platforms });
      expect(
        declarations.register({
          health: {
            platformId: "ghost",
            reportsStatus: true,
            probeRef: "probe.ghost.health",
          },
        }).ok,
      ).toBe(false);
      expect(
        declarations
          .register({
            health: {
              platformId: "ghost",
              reportsStatus: true,
              probeRef: "probe.ghost.health",
            },
          })
          .findings.map((f) => f.code),
      ).toContain(UmHealthRegistryCode.UNKNOWN_PLATFORM);

      const observations = createInMemoryHealthReporter({ platforms });
      expect(observations.report(healthSnapshot("ghost")).ok).toBe(false);
      expect(
        observations.report(healthSnapshot("ghost")).findings.map((f) => f.code),
      ).toContain(UmHealthReportCode.UNKNOWN_PLATFORM);

      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      expect(
        capabilities.register({
          capability: {
            capabilityId: "ghost.core.ping",
            platformId: "ghost",
            moduleId: "ghost.core",
            displayName: "Ping",
            sideEffectClasses: ["read"],
            authClass: "authenticated",
            stability: "stable",
            version: "1.0.0",
          },
        }).ok,
      ).toBe(false);
      expect(
        capabilities
          .register({
            capability: {
              capabilityId: "ghost.core.ping",
              platformId: "ghost",
              moduleId: "ghost.core",
              displayName: "Ping",
              sideEffectClasses: ["read"],
              authClass: "authenticated",
              stability: "stable",
              version: "1.0.0",
            },
          })
          .findings.map((f) => f.code),
      ).toContain(UmCapabilityRegistryCode.UNKNOWN_PLATFORM);
    });
  });

  describe("deterministic ordering + store non-mutation + idempotency", () => {
    it("pure validators do not mutate stores (P13 / P19 / RI / readiness / compat)", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({
          manifest: platformManifest("alpha", {
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
              {
                targetKind: "platform",
                targetId: "missing.platform",
                strength: "required",
                reason: "Ghost",
              },
            ],
          }),
        }).ok,
      ).toBe(true);
      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      const dependencies = createInMemoryDependencyRegistry({
        platforms,
        capabilities,
      });
      const flags = createInMemoryFlagRegistry({ platforms, capabilities });
      const declarations = createInMemoryHealthRegistry({ platforms });
      const observations = createInMemoryHealthReporter({ platforms });
      const readiness = createPlatformReadinessEvaluator({
        platforms,
        declarations,
        observations,
      });
      const compat = createCapabilityCompatibilityEvaluator({
        platforms,
        capabilities,
        dependencies,
      });

      const before = storeFingerprint({
        platforms,
        dependencies,
        capabilities,
        flags,
        declarations,
        observations,
      });

      const requires = platforms.get("alpha")?.manifest.requires ?? [];
      void validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
        capabilities,
      });
      void validateDependencyRequirements("alpha", requires, {
        platforms,
        capabilities,
        dependencies,
      });
      void createInMemoryDependencyValidator({
        platforms,
        capabilities,
        dependencies,
      }).validateRequirements("alpha", requires);
      void validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
        flags,
        healthDeclarations: declarations,
        healthObservations: observations,
      });
      void readiness.evaluatePlatform("alpha");
      void readiness.evaluate();
      void compat.evaluatePlatformProvides("alpha", ["alpha.core.ping"]);
      void createUmCoreValidator({
        platforms,
        dependencies,
        capabilities,
      }).validateDependencies("alpha");
      void assessPlatformCompliance({
        manifest: platformManifest("alpha"),
        admission: validateManifestAdmission(platformManifest("alpha")),
      });

      expect(
        storeFingerprint({
          platforms,
          dependencies,
          capabilities,
          flags,
          declarations,
          observations,
        }),
      ).toEqual(before);
    });

    it("repeated validation is deterministic (ordering + equality)", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({
          manifest: platformManifest("alpha", {
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
              {
                targetKind: "platform",
                targetId: "missing.platform",
                strength: "required",
                reason: "Ghost",
              },
            ],
          }),
        }).ok,
      ).toBe(true);
      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      const dependencies = createInMemoryDependencyRegistry({
        platforms,
        capabilities,
      });
      const requires = platforms.get("alpha")?.manifest.requires ?? [];

      const p13a = validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
        capabilities,
      });
      const p13b = validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
        capabilities,
      });
      expect(p13a).toEqual(p13b);
      const p13Keys = p13a.findings.map(
        (f) => `${f.code}:${f.targetId ?? ""}:${f.relatedCapabilityId ?? ""}`,
      );
      expect(p13Keys).toEqual([...p13Keys].sort((a, b) => a.localeCompare(b)));

      const p19a = validateDependencyRequirements("alpha", requires, {
        platforms,
        capabilities,
        dependencies,
      });
      const p19b = validateDependencyRequirements("alpha", requires, {
        platforms,
        capabilities,
        dependencies,
      });
      expect(p19a).toEqual(p19b);
      const p19Keys = p19a.findings.map(
        (f) => `${f.code}:${f.targetId ?? ""}:${f.relatedCapabilityId ?? ""}`,
      );
      expect(p19Keys).toEqual([...p19Keys].sort((a, b) => a.localeCompare(b)));

      const ria = validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
      });
      const rib = validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
      });
      expect(ria).toEqual(rib);

      const declarations = createInMemoryHealthRegistry({ platforms });
      const observations = createInMemoryHealthReporter({ platforms });
      const readiness = createPlatformReadinessEvaluator({
        platforms,
        declarations,
        observations,
      });
      expect(readiness.evaluate()).toEqual(readiness.evaluate());
      expect(readiness.evaluatePlatform("alpha")).toEqual(
        readiness.evaluatePlatform("alpha"),
      );

      const compat = createCapabilityCompatibilityEvaluator({
        platforms,
        capabilities,
        dependencies,
      });
      expect(
        compat.evaluatePlatformProvides("alpha", ["alpha.core.ping"]),
      ).toEqual(compat.evaluatePlatformProvides("alpha", ["alpha.core.ping"]));
    });


    it("idempotent duplicate registration remains fail-closed (no silent overwrite)", () => {
      const platforms = createInMemoryPlatformRegistry();
      const manifest = platformManifest("producer");
      expect(platforms.register({ manifest }).ok).toBe(true);
      const dup = platforms.register({ manifest });
      expect(dup.ok).toBe(false);
      expect(dup.findings.map((f) => f.code)).toContain(
        UmRegistryCode.DUPLICATE_PLATFORM_ID,
      );
      expect(platforms.size()).toBe(1);
    });
  });
});
