/**
 * UM Core golden-path integration (in-process, PUBLIC APIs only).
 *
 * TASK: UM_CORE_PLATFORM_INTEGRATION_GOLDEN_PATH_E2E_FOUNDATION_V1
 * MODE: IN-PROCESS INTEGRATION TEST ONLY — not browser/network E2E.
 *
 * Exercises foundations present on verified alpha tip through public barrels.
 * Does not mutate production semantics.
 */

import { describe, expect, it } from "vitest";
import {
  createInMemoryCapabilityAsserter,
  createInMemoryCapabilityRegistry,
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
import {
  UmReferentialIntegrityCode,
  validateManifestAdmission,
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

/**
 * Wire catalogs present on current alpha through PUBLIC factory/API surfaces.
 * Deterministic timestamps and ids only.
 */
function assembleGoldenPath() {
  const producerManifest = platformManifest("producer");
  const consumerManifest = platformManifest("consumer");

  // P2 — manifest / admission validation (definition → validation)
  const admission = validateManifestAdmission(producerManifest);
  expect(admission.ok).toBe(true);

  // P3 — compliance assessment
  const compliance = assessPlatformCompliance({
    manifest: producerManifest,
    admission,
  });
  expect(compliance.status).toBe("compliant");

  // P4 — platform registry (registers only after validation+compliance)
  const platforms = createInMemoryPlatformRegistry();
  const producerReg = platforms.register({
    manifest: producerManifest,
    registration: {
      registeredAt: "2026-08-09T10:00:00.000Z",
      registrationSource: "golden-path",
    },
  });
  expect(producerReg.ok).toBe(true);
  expect(producerReg.record?.complianceStatus).toBe("compliant");
  expect(platforms.register({ manifest: consumerManifest }).ok).toBe(true);

  // P5 — capability catalog (both platforms observed later need RI-complete rows)
  const capabilities = createInMemoryCapabilityRegistry({ platforms });
  for (const platformId of ["producer", "consumer"] as const) {
    expect(
      capabilities.register({
        capability: {
          capabilityId: `${platformId}.core.ping`,
          platformId,
          moduleId: `${platformId}.core`,
          displayName: "Ping",
          sideEffectClasses: ["read"],
          authClass: "authenticated",
          stability: "stable",
          version: "1.0.0",
          flagId: `${platformId}.core.enabled`,
        },
      }).ok,
    ).toBe(true);
  }

  // P6 — event type registration
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
        documentationRefs: ["docs/producer/events/pinged.md"],
        description: "Producer ping completed",
      },
      registration: { registeredAt: "2026-08-09T10:01:00.000Z" },
    }).ok,
  ).toBe(true);

  // P7 — routing
  const eventRoutes = createInMemoryEventRoutingRegistry({
    platforms,
    eventTypes,
  });
  const routeResult = eventRoutes.register({
    route: {
      eventType: "producer.core.pinged",
      destinationPlatformId: "consumer",
      notes: "golden-path fan-out",
    },
    registration: { registeredAt: "2026-08-09T10:02:00.000Z" },
  });
  expect(routeResult.ok).toBe(true);
  expect(routeResult.routeId).toBe(
    buildEventRouteId("producer.core.pinged", "consumer"),
  );

  // P8 — flags
  const flags = createInMemoryFlagRegistry({ platforms, capabilities });
  for (const platformId of ["producer", "consumer"] as const) {
    expect(
      flags.register({
        flag: {
          flagId: `${platformId}.core.enabled`,
          ownerPlatformId: platformId,
          ownerRef: `owner.${platformId}`,
          defaultState: "on",
          linkedCapabilityIds: [`${platformId}.core.ping`],
          dangerElevated: false,
          auditRequired: false,
          description: `Enable ${platformId} ping`,
        },
      }).ok,
    ).toBe(true);
  }

  // P9 — dependency edges (declared targets required for observation RI)
  const dependencies = createInMemoryDependencyRegistry({
    platforms,
    capabilities,
  });
  for (const platformId of ["producer", "consumer"] as const) {
    expect(
      dependencies.register({
        dependency: {
          fromPlatformId: platformId,
          targetKind: "peer_kernel",
          targetId: "um.core",
          strength: "required",
          reason: "Core contracts",
        },
      }).ok,
    ).toBe(true);
  }

  // P10 — health declaration
  const healthDeclarations = createInMemoryHealthRegistry({ platforms });
  expect(
    healthDeclarations.register({
      health: {
        platformId: "producer",
        reportsStatus: true,
        probeRef: "probe.producer.health",
      },
      registration: { registeredAt: "2026-08-09T10:03:00.000Z" },
    }).ok,
  ).toBe(true);
  expect(
    healthDeclarations.register({
      health: {
        platformId: "consumer",
        reportsStatus: true,
        probeRef: "probe.consumer.health",
      },
    }).ok,
  ).toBe(true);

  // P17 — health observation / report
  const healthObservations = createInMemoryHealthReporter({ platforms });
  const producerSnapshot = healthSnapshot("producer");
  expect(healthObservations.report(producerSnapshot).ok).toBe(true);
  expect(
    healthObservations.report(
      healthSnapshot("consumer", {
        checkedAt: "2026-08-09T12:05:00.000Z",
        status: "degraded",
        detail: "partial",
      }),
    ).ok,
  ).toBe(true);

  // P18 — diagnostics join
  const diagnostics = createHealthDiagnosticsJoin({
    platforms,
    declarations: healthDeclarations,
    observations: healthObservations,
  });

  // P20 — fleet aggregation
  const fleet = aggregateFleetHealth({
    platforms,
    observations: healthObservations,
    declarations: healthDeclarations,
  });

  // P14/P15/P16 + P21 — evaluator/asserter/publisher → SDK factory
  const flagEvaluator = createInMemoryFlagEvaluator({ flags });
  const capabilityAsserter = createInMemoryCapabilityAsserter({
    capabilities,
    flags: flagEvaluator,
  });
  const eventPublisher = createInMemoryEventPublisher({ eventTypes });
  const sdkFactory = createInMemoryUmCoreSdkFactory({
    flags: flagEvaluator,
    capabilities: capabilityAsserter,
    events: eventPublisher,
    health: healthObservations,
    platforms,
  });

  // P22 — bounded observation history
  const historyCreate = createInMemoryHealthObservationHistory({
    platforms,
    capacity: 3,
  });
  expect(historyCreate.ok).toBe(true);
  if (!historyCreate.ok) {
    throw new Error("expected bounded history create ok");
  }
  const history = historyCreate.history;

  return {
    producerManifest,
    platforms,
    capabilities,
    eventTypes,
    eventRoutes,
    flags,
    dependencies,
    healthDeclarations,
    healthObservations,
    diagnostics,
    fleet,
    sdkFactory,
    history,
    flagEvaluator,
    capabilityAsserter,
    eventPublisher,
    producerSnapshot,
  };
}

describe("um.core golden-path integration (public APIs)", () => {
  it("proves platform definition → validation → registry → compliance → events → routing → health → join → RI → fleet → SDK → history", () => {
    expect(UM_CORE_PACKAGE_ID).toBe("um.core");
    expect(UM_CORE_HEALTH_REPORTER_PHASE).toBe("P17");
    expect(UM_CORE_HEALTH_DIAGNOSTICS_JOIN_PHASE).toBe("P18");
    expect(UM_CORE_FLEET_HEALTH_AGGREGATION_PHASE).toBe("P20");
    expect(UM_CORE_SDK_CLIENT_FACTORY_PHASE).toBe("P21");
    expect(UM_CORE_BOUNDED_HEALTH_HISTORY_PHASE).toBe("P22");

    const gp = assembleGoldenPath();

    // Registry + compliance retained
    expect(gp.platforms.has("producer")).toBe(true);
    expect(gp.platforms.has("consumer")).toBe(true);
    expect(gp.platforms.get("producer")?.complianceStatus).toBe("compliant");
    expect(gp.platforms.size()).toBe(2);

    // Event type + route catalogs
    expect(gp.eventTypes.has("producer.core.pinged")).toBe(true);
    expect(gp.eventRoutes.size()).toBe(1);
    expect(
      gp.eventRoutes.get(
        buildEventRouteId("producer.core.pinged", "consumer"),
      )?.producerPlatformId,
    ).toBe("producer");

    // Health declaration + observation
    expect(gp.healthDeclarations.get("producer")?.reportsStatus).toBe(true);
    expect(gp.healthObservations.getSnapshot("producer")).toEqual(
      gp.producerSnapshot,
    );

    // Diagnostics join classifies declared_and_observed
    const joinView = gp.diagnostics.evaluate();
    expect(joinView.rows).toHaveLength(2);
    const producerRow = joinView.rows.find((r) => r.platformId === "producer");
    expect(producerRow).toMatchObject({
      registered: true,
      hasDeclaration: true,
      reportsStatus: true,
      hasObservation: true,
      status: "ready",
      joinClass: "declared_and_observed",
    });
    expect(joinView.statusTally.ready).toBe(1);
    expect(joinView.statusTally.degraded).toBe(1);

    // Referential integrity across wired catalogs
    const ri = validateReferentialIntegrity({
      platforms: gp.platforms,
      capabilities: gp.capabilities,
      eventTypes: gp.eventTypes,
      eventRoutes: gp.eventRoutes,
      flags: gp.flags,
      dependencies: gp.dependencies,
      healthDeclarations: gp.healthDeclarations,
      healthObservations: gp.healthObservations,
    });
    expect(ri.ok).toBe(true);
    expect(ri.findings).toEqual([]);

    // Fleet aggregation reflects both observations; worst = degraded
    expect(gp.fleet.ok).toBe(true);
    expect(gp.fleet.fleetSize).toBe(2);
    expect(gp.fleet.observedCount).toBe(2);
    expect(gp.fleet.observedWorstStatus).toBe("degraded");
    expect(gp.fleet.coverage).toBe("full");

    // SDK factory client delegates to wired ports
    const client = gp.sdkFactory.createClient({
      serviceId: "svc.producer",
      platformId: "producer",
      runtimeId: "runtime-golden-1",
    });
    expect(client.identity.platformId).toBe("producer");
    expect(client.flags.evaluate({ flagId: "producer.core.enabled" }).reasonCode).toBe(
      UmFlagEvaluationCode.DEFAULT_ON,
    );
    expect(client.capabilities.assertEnabled("producer.core.ping").enabled).toBe(
      true,
    );
    expect(
      client.events.publish({
        eventId: "evt-golden-001",
        eventType: "producer.core.pinged",
        occurredAt: "2026-08-09T12:10:00.000Z",
        producerPlatformId: "producer",
        subjectRef: { kind: "ping", id: "ping-1" },
        correlationId: "corr-golden-001",
        idempotencyKey: "idem-golden-001",
        schemaVersion: "1.0.0",
        payload: { ok: true },
      }).ok,
    ).toBe(true);
    expect(client.health.getSnapshot("producer")).toEqual(gp.producerSnapshot);

    // Bounded history retains ordered observations
    expect(
      gp.history.record(healthSnapshot("producer", { checkedAt: "t1" })),
    ).toMatchObject({ ok: true, retainedCount: 1, evicted: false });
    expect(
      gp.history.record(
        healthSnapshot("producer", {
          checkedAt: "t2",
          status: "degraded",
        }),
      ),
    ).toMatchObject({ ok: true, retainedCount: 2, evicted: false });
    expect(gp.history.getHistory("producer").map((s) => s.checkedAt)).toEqual([
      "t1",
      "t2",
    ]);
    expect(gp.history.getLatest("producer")?.status).toBe("degraded");
  });
});

describe("um.core golden-path negative / fail-closed assertions", () => {
  it("rejects unknown platform across health declaration, observation, and history", () => {
    const platforms = createInMemoryPlatformRegistry();
    expect(platforms.register({ manifest: platformManifest("producer") }).ok).toBe(
      true,
    );

    const declarations = createInMemoryHealthRegistry({ platforms });
    const unknownDecl = declarations.register({
      health: {
        platformId: "missing",
        reportsStatus: true,
        probeRef: "probe.missing.health",
      },
    });
    expect(unknownDecl.ok).toBe(false);
    expect(unknownDecl.findings.map((f) => f.code)).toContain(
      UmHealthRegistryCode.UNKNOWN_PLATFORM,
    );
    expect(declarations.size()).toBe(0);

    const observations = createInMemoryHealthReporter({ platforms });
    const unknownObs = observations.report(healthSnapshot("missing"));
    expect(unknownObs.ok).toBe(false);
    expect(unknownObs.findings.map((f) => f.code)).toContain(
      UmHealthReportCode.UNKNOWN_PLATFORM,
    );
    expect(observations.size()).toBe(0);

    const historyCreate = createInMemoryHealthObservationHistory({
      platforms,
      capacity: 2,
    });
    expect(historyCreate.ok).toBe(true);
    if (!historyCreate.ok) throw new Error("history create");
    const unknownHist = historyCreate.history.record(healthSnapshot("missing"));
    expect(unknownHist.ok).toBe(false);
    expect(unknownHist.findings.map((f) => f.code)).toContain(
      UmHealthHistoryCode.UNKNOWN_PLATFORM,
    );
    expect(historyCreate.history.entryCount()).toBe(0);
  });

  it("rejects invalid references (unknown event type route + RI capability/flag drift)", () => {
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

    const routing = createInMemoryEventRoutingRegistry({ platforms, eventTypes });
    const badRoute = routing.register({
      route: {
        eventType: "producer.core.missing",
        destinationPlatformId: "consumer",
      },
    });
    expect(badRoute.ok).toBe(false);
    expect(badRoute.findings.map((f) => f.code)).toContain(
      UmEventRoutingCode.UNKNOWN_EVENT_TYPE,
    );
    expect(routing.size()).toBe(0);

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
    // Leave flag catalog empty → RI must fail closed on capability flag ref
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

  it("rejects duplicate / invalid registration fail-closed (platform + event type + route)", () => {
    const platforms = createInMemoryPlatformRegistry();
    const manifest = platformManifest("producer");
    expect(platforms.register({ manifest }).ok).toBe(true);
    const dupPlatform = platforms.register({ manifest });
    expect(dupPlatform.ok).toBe(false);
    expect(dupPlatform.findings.map((f) => f.code)).toContain(
      UmRegistryCode.DUPLICATE_PLATFORM_ID,
    );
    expect(platforms.size()).toBe(1);

    const invalid = platforms.register({
      manifest: platformManifest("Bad_ID"),
    });
    expect(invalid.ok).toBe(false);
    expect(invalid.findings.map((f) => f.code)).toContain(
      UmRegistryCode.MANIFEST_INVALID,
    );
    expect(platforms.has("Bad_ID")).toBe(false);

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
    expect(eventTypes.size()).toBe(1);

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
    expect(routing.size()).toBe(1);
  });

  it("rejects invalid health input and stores nothing (fail-closed)", () => {
    const platforms = createInMemoryPlatformRegistry();
    expect(platforms.register({ manifest: platformManifest("producer") }).ok).toBe(
      true,
    );
    const observations = createInMemoryHealthReporter({ platforms });

    const badStatus = observations.report(
      healthSnapshot("producer", {
        status: "healthy" as UmHealthSnapshot["status"],
      }),
    );
    expect(badStatus.ok).toBe(false);
    expect(badStatus.findings.map((f) => f.code)).toContain(
      UmHealthReportCode.STATUS_INVALID,
    );

    const badCheckedAt = observations.report(
      healthSnapshot("producer", { checkedAt: "" }),
    );
    expect(badCheckedAt.ok).toBe(false);
    expect(badCheckedAt.findings.map((f) => f.code)).toContain(
      UmHealthReportCode.SNAPSHOT_INVALID,
    );

    const badNaming = observations.report(
      healthSnapshot("producer", { platformId: "Bad-Id" }),
    );
    expect(badNaming.ok).toBe(false);
    expect(badNaming.findings.map((f) => f.code)).toContain(
      UmHealthReportCode.PLATFORM_ID_NAMING,
    );

    expect(observations.size()).toBe(0);
    expect(observations.getSnapshot("producer")).toBeUndefined();

    const historyCreate = createInMemoryHealthObservationHistory({
      platforms,
      capacity: 0,
    });
    expect(historyCreate.ok).toBe(false);
    if (historyCreate.ok) throw new Error("expected capacity reject");
    expect(historyCreate.findings.map((f) => f.code)).toContain(
      UmHealthHistoryCode.CAPACITY_INVALID,
    );
  });
});
