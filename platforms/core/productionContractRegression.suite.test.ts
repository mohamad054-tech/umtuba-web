/**
 * UM Core production-contract regression suite (PUBLIC APIs only).
 *
 * TASK: UM_CORE_PLATFORM_PRODUCTION_CONTRACT_REGRESSION_SUITE_V1
 * MODE: TEST-ONLY — complementary to umCoreGoldenPath.integration.test.ts
 *
 * Evidence base: Public API Contract Matrix V1 (branch artifact) verified
 * against current alpha tip public barrels only. Does not import pending
 * branch product code. Does not mutate production semantics.
 *
 * FILES_AREAS_RESERVED: this test file only (+ task reports).
 */

import { describe, expect, it } from "vitest";
import {
  createInMemoryCapabilityAsserter,
  createInMemoryCapabilityRegistry,
  UmCapabilityRegistryCode,
} from "./capability";
import { assessPlatformCompliance } from "./compliance";
import { createInMemoryDependencyRegistry } from "./dependency";
import {
  UmEventRoutingCode,
  UmEventTypeRegistryCode,
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
  UM_CORE_FLEET_HEALTH_AGGREGATION_PHASE,
  UM_CORE_HEALTH_DIAGNOSTICS_JOIN_PHASE,
  UM_CORE_HEALTH_REPORTER_PHASE,
  UM_CORE_PACKAGE_ID,
  UM_CORE_SDK_CLIENT_FACTORY_PHASE,
} from "./packageIdentity";
import { UmRegistryCode, createInMemoryPlatformRegistry } from "./registry";
import { createInMemoryUmCoreSdkFactory } from "./sdk";
import type { UmCoreSdkFactoryDeps } from "./sdk";
import {
  UmManifestValidationCode,
  UmReferentialIntegrityCode,
  validateManifestAdmission,
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

describe("um.core production-contract regression suite", () => {
  it("anchors integrated phase markers present on current alpha public barrel", () => {
    expect(UM_CORE_PACKAGE_ID).toBe("um.core");
    expect(UM_CORE_HEALTH_REPORTER_PHASE).toBe("P17");
    expect(UM_CORE_HEALTH_DIAGNOSTICS_JOIN_PHASE).toBe("P18");
    expect(UM_CORE_FLEET_HEALTH_AGGREGATION_PHASE).toBe("P20");
    expect(UM_CORE_SDK_CLIENT_FACTORY_PHASE).toBe("P21");
    expect(UM_CORE_BOUNDED_HEALTH_HISTORY_PHASE).toBe("P22");

    // P23 lifecycle readiness is intentionally NOT root-public (local barrel
    // only under platforms/core/readiness/**). Assert real symbol names so an
    // accidental root magnet wire fails this suite. Health token "ready" ≠
    // lifecycle READY/NOT_READY.
    const publicKeys = Object.keys(corePublic);
    expect(publicKeys.some((k) => /lifecycle/i.test(k))).toBe(false);
    expect(
      "UM_CORE_PLATFORM_LIFECYCLE_READINESS_PHASE" in corePublic ||
        "createPlatformReadinessEvaluator" in corePublic ||
        "derivePlatformReadiness" in corePublic ||
        "UmPlatformReadinessCode" in corePublic,
    ).toBe(false);
  });

  describe("deterministic registry + invalid manifest rejection", () => {
    it("lists registered platforms sorted by platformId (deterministic)", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(platforms.register({ manifest: platformManifest("zeta") }).ok).toBe(
        true,
      );
      expect(platforms.register({ manifest: platformManifest("alpha") }).ok).toBe(
        true,
      );
      expect(platforms.register({ manifest: platformManifest("mu") }).ok).toBe(
        true,
      );
      expect(platforms.list().map((r) => r.platformId)).toEqual([
        "alpha",
        "mu",
        "zeta",
      ]);
      expect(platforms.list().map((r) => r.platformId)).toEqual(
        platforms.list().map((r) => r.platformId),
      );
    });

    it("rejects invalid manifests fail-closed (no store write)", () => {
      const platforms = createInMemoryPlatformRegistry();
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
      expect(platforms.size()).toBe(0);
      expect(platforms.has("Bad_ID")).toBe(false);
    });
  });

  describe("compliance behavior", () => {
    it("marks a valid admission-ready manifest compliant", () => {
      const manifest = platformManifest("producer");
      const admission = validateManifestAdmission(manifest);
      expect(admission.ok).toBe(true);
      const compliance = assessPlatformCompliance({ manifest, admission });
      expect(compliance.status).toBe("compliant");
    });

    it("fails compliance when admission is invalid (no registry write)", () => {
      const platforms = createInMemoryPlatformRegistry();
      const manifest = platformManifest("producer", {
        owners: [],
      });
      const admission = validateManifestAdmission(manifest);
      expect(admission.ok).toBe(false);
      const compliance = assessPlatformCompliance({ manifest, admission });
      expect(compliance.status).not.toBe("compliant");

      const reg = platforms.register({ manifest });
      expect(reg.ok).toBe(false);
      expect(platforms.size()).toBe(0);
    });
  });

  describe("event / routing referential safety", () => {
    it("NEGATIVE INVALID_REFERENCE: unknown event type and unknown destination fail-closed", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(platforms.register({ manifest: platformManifest("producer") }).ok).toBe(
        true,
      );
      expect(platforms.register({ manifest: platformManifest("consumer") }).ok).toBe(
        true,
      );
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

      const unknownType = routing.register({
        route: {
          eventType: "producer.core.missing",
          destinationPlatformId: "consumer",
        },
      });
      expect(unknownType.ok).toBe(false);
      expect(unknownType.findings.map((f) => f.code)).toContain(
        UmEventRoutingCode.UNKNOWN_EVENT_TYPE,
      );

      const unknownDest = routing.register({
        route: {
          eventType: "producer.core.pinged",
          destinationPlatformId: "ghost",
        },
      });
      expect(unknownDest.ok).toBe(false);
      expect(unknownDest.findings.map((f) => f.code)).toContain(
        UmEventRoutingCode.UNKNOWN_DESTINATION,
      );
      expect(routing.size()).toBe(0);
    });

    it("builds deterministic route ids for admitted routes", () => {
      expect(buildEventRouteId("producer.core.pinged", "consumer")).toBe(
        buildEventRouteId("producer.core.pinged", "consumer"),
      );
    });
  });

  describe("health declaration + observation semantics", () => {
    it("declaration requires registered platform and matches manifest health", () => {
      const platforms = registerPlatform("producer");
      const declarations = createInMemoryHealthRegistry({ platforms });

      const ok = declarations.register({
        health: {
          platformId: "producer",
          reportsStatus: true,
          probeRef: "probe.producer.health",
        },
      });
      expect(ok.ok).toBe(true);
      expect(declarations.get("producer")?.reportsStatus).toBe(true);

      const mismatch = declarations.register({
        health: {
          platformId: "producer",
          reportsStatus: false,
          probeRef: "probe.producer.health",
        },
      });
      // duplicate or mismatch — either way fail-closed relative to first admit
      expect(mismatch.ok).toBe(false);
      expect(declarations.size()).toBe(1);
    });

    it("observation last-snapshot SoT; list sorted; foreign status rejected", () => {
      const platforms = registerPlatform("producer");
      const observations = createInMemoryHealthReporter({ platforms });

      expect(
        observations.report(
          healthSnapshot("producer", {
            checkedAt: "t1",
            status: "ready",
          }),
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
      expect(observations.getSnapshot("producer")?.status).toBe("degraded");
      expect(observations.list()).toHaveLength(1);
    });
  });

  describe("diagnostics determinism + referential integrity failure", () => {
    it("diagnostics join evaluates deterministically for declared_and_observed", () => {
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
      expect(observations.report(healthSnapshot("producer")).ok).toBe(true);

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
        status: "ready",
        hasObservation: true,
      });
      expect(a.statusTally.ready).toBe(1);
    });

    it("RI fails closed on capability→flag drift (INVALID_REFERENCE)", () => {
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
    });
  });

  describe("fleet aggregation determinism + snapshot / mutation isolation", () => {
    it("fleet aggregation is pure and order-stable for identical inputs", () => {
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
      expect(fleet1.coverage).toBe("full");
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
      expect(observations.getSnapshot("producer")?.affectedCapabilityIds).toEqual(
        ["producer.core.ping"],
      );
    });
  });

  describe("SDK factory + bounded history (integrated on alpha)", () => {
    it("NEGATIVE MISSING_REQUIRED_CONTRACT: SDK factory throws on missing deps", () => {
      const platforms = registerPlatform("producer");
      const flags = createInMemoryFlagRegistry({
        platforms,
        capabilities: createInMemoryCapabilityRegistry({ platforms }),
      });
      const flagEvaluator = createInMemoryFlagEvaluator({ flags });
      const capabilities = createInMemoryCapabilityRegistry({ platforms });
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
      expect(() =>
        createInMemoryUmCoreSdkFactory({
          ...complete,
          health: null as unknown as UmCoreSdkFactoryDeps["health"],
        }),
      ).toThrow(/health/);
    });

    it("bounded history rejects invalid capacity and unknown platforms; retains FIFO", () => {
      const platforms = registerPlatform("producer");
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

      const unknown = history.record(healthSnapshot("missing"));
      expect(unknown.ok).toBe(false);
      expect(unknown.findings.map((f) => f.code)).toContain(
        UmHealthHistoryCode.UNKNOWN_PLATFORM,
      );

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
  });
});

describe("um.core production-contract negative-path matrix", () => {
  it("NEGATIVE UNKNOWN_PLATFORM across declaration, observation, capability, fleet bag", () => {
    const platforms = registerPlatform("producer");

    const declarations = createInMemoryHealthRegistry({ platforms });
    const unknownDecl = declarations.register({
      health: {
        platformId: "ghost",
        reportsStatus: true,
        probeRef: "probe.ghost.health",
      },
    });
    expect(unknownDecl.ok).toBe(false);
    expect(unknownDecl.findings.map((f) => f.code)).toContain(
      UmHealthRegistryCode.UNKNOWN_PLATFORM,
    );

    const observations = createInMemoryHealthReporter({ platforms });
    const unknownObs = observations.report(healthSnapshot("ghost"));
    expect(unknownObs.ok).toBe(false);
    expect(unknownObs.findings.map((f) => f.code)).toContain(
      UmHealthReportCode.UNKNOWN_PLATFORM,
    );

    const capabilities = createInMemoryCapabilityRegistry({ platforms });
    const unknownCap = capabilities.register({
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
    });
    expect(unknownCap.ok).toBe(false);
    expect(unknownCap.findings.map((f) => f.code)).toContain(
      UmCapabilityRegistryCode.UNKNOWN_PLATFORM,
    );

    // Fleet bag path: observation for unregistered platform → fail-closed
    const fleet = aggregateFleetHealth({
      platforms,
      observations: {
        getSnapshot: () => undefined,
        list: () => [healthSnapshot("ghost")],
      },
      declarations,
    });
    expect(fleet.ok).toBe(false);
    expect(fleet.findings.map((f) => f.code)).toContain(
      UmFleetHealthAggregationCode.UNKNOWN_PLATFORM,
    );
  });

  it("NEGATIVE DUPLICATE_REGISTRATION for platform, event type, route, health declaration", () => {
    const platforms = createInMemoryPlatformRegistry();
    const manifest = platformManifest("producer");
    expect(platforms.register({ manifest }).ok).toBe(true);
    const dupPlatform = platforms.register({ manifest });
    expect(dupPlatform.ok).toBe(false);
    expect(dupPlatform.findings.map((f) => f.code)).toContain(
      UmRegistryCode.DUPLICATE_PLATFORM_ID,
    );

    expect(platforms.register({ manifest: platformManifest("consumer") }).ok).toBe(
      true,
    );

    const eventTypes = createInMemoryEventTypeRegistry({ platforms });
    const eventDef = {
      eventType: "producer.core.pinged" as const,
      producerPlatformId: "producer" as const,
      schemaVersion: "1.0.0" as const,
      compatibilityPolicy: "backward" as const,
      payloadSchemaRef: "schemas/producer.core.pinged.v1.json",
      piiClass: "none" as const,
      deliveryExpectation: "at_least_once" as const,
      stability: "stable" as const,
      subjectRefExpectations: ["ping"],
    };
    expect(eventTypes.register({ eventType: eventDef }).ok).toBe(true);
    const dupEvent = eventTypes.register({ eventType: eventDef });
    expect(dupEvent.ok).toBe(false);
    expect(dupEvent.findings.map((f) => f.code)).toContain(
      UmEventTypeRegistryCode.DUPLICATE_EVENT_TYPE,
    );

    const routing = createInMemoryEventRoutingRegistry({ platforms, eventTypes });
    const route = {
      eventType: "producer.core.pinged",
      destinationPlatformId: "consumer",
    };
    expect(routing.register({ route }).ok).toBe(true);
    const dupRoute = routing.register({ route });
    expect(dupRoute.ok).toBe(false);
    expect(dupRoute.findings.map((f) => f.code)).toContain(
      UmEventRoutingCode.DUPLICATE_ROUTE,
    );

    const declarations = createInMemoryHealthRegistry({ platforms });
    const health = {
      platformId: "producer",
      reportsStatus: true as const,
      probeRef: "probe.producer.health",
    };
    expect(declarations.register({ health }).ok).toBe(true);
    const dupHealth = declarations.register({ health });
    expect(dupHealth.ok).toBe(false);
    expect(dupHealth.findings.map((f) => f.code)).toContain(
      UmHealthRegistryCode.DUPLICATE_PLATFORM,
    );
  });

  it("NEGATIVE INVALID_HEALTH_INPUT stores nothing", () => {
    const platforms = registerPlatform("producer");
    const observations = createInMemoryHealthReporter({ platforms });

    expect(
      observations.report(
        healthSnapshot("producer", {
          status: "healthy" as UmHealthSnapshot["status"],
        }),
      ).ok,
    ).toBe(false);
    expect(
      observations
        .report(
          healthSnapshot("producer", {
            status: "healthy" as UmHealthSnapshot["status"],
          }),
        )
        .findings.map((f) => f.code),
    ).toContain(UmHealthReportCode.STATUS_INVALID);

    expect(
      observations.report(healthSnapshot("producer", { checkedAt: "" })).ok,
    ).toBe(false);
    expect(
      observations
        .report(healthSnapshot("producer", { checkedAt: "" }))
        .findings.map((f) => f.code),
    ).toContain(UmHealthReportCode.SNAPSHOT_INVALID);

    expect(observations.size()).toBe(0);
    expect(observations.getSnapshot("producer")).toBeUndefined();
  });

  it("NEGATIVE INVALID_REFERENCE: RI unknown observation capability / dependency", () => {
    const platforms = registerPlatform("producer");
    const capabilities = createInMemoryCapabilityRegistry({ platforms });
    const dependencies = createInMemoryDependencyRegistry({
      platforms,
      capabilities,
    });
    expect(
      dependencies.register({
        dependency: {
          fromPlatformId: "producer",
          targetKind: "peer_kernel",
          targetId: "um.core",
          strength: "required",
          reason: "Core contracts",
        },
      }).ok,
    ).toBe(true);

    const observations = createInMemoryHealthReporter({ platforms });
    expect(
      observations.report(
        healthSnapshot("producer", {
          affectedCapabilityIds: ["producer.core.missing"],
          dependencyStatuses: [{ targetId: "other.kernel", status: "ready" }],
        }),
      ).ok,
    ).toBe(true);

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

    const ri = validateReferentialIntegrity({
      platforms,
      capabilities,
      dependencies,
      healthDeclarations: declarations,
      healthObservations: observations,
    });
    expect(ri.ok).toBe(false);
    const codes = ri.findings.map((f) => f.code);
    expect(codes).toContain(
      UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_CAPABILITY,
    );
    expect(codes).toContain(
      UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_DEPENDENCY_TARGET,
    );
  });

  it("flag evaluator unknown flag is fail-closed (contract surface)", () => {
    const platforms = registerPlatform("producer");
    const capabilities = createInMemoryCapabilityRegistry({ platforms });
    const flags = createInMemoryFlagRegistry({ platforms, capabilities });
    const evaluator = createInMemoryFlagEvaluator({ flags });
    const result = evaluator.evaluate({ flagId: "producer.core.missing" });
    expect(result.source).toBe("unknown");
    expect(result.reasonCode).toBe(UmFlagEvaluationCode.UNKNOWN);
  });
});
