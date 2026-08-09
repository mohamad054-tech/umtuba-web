/**
 * Deterministic serialization + snapshot/read-model safety
 * (UM_CORE_PLATFORM_DETERMINISTIC_SERIALIZATION_AND_SNAPSHOT_SAFETY_V1).
 *
 * Focus: catalog get/list clones, JSON stability, empty/optional consistency,
 * and representation-equivalent repeated reads. No DTO framework.
 */

import { describe, expect, it } from "vitest";
import { createInMemoryCapabilityRegistry } from "./capability";
import { createInMemoryDependencyRegistry } from "./dependency";
import { createInMemoryEventRoutingRegistry, createInMemoryEventTypeRegistry } from "./event";
import { createInMemoryFlagRegistry } from "./flag";
import {
  createInMemoryHealthObservationHistory,
  createInMemoryHealthRegistry,
  createInMemoryHealthReporter,
} from "./health";
import type { UmPlatformManifest } from "./manifest/types";
import { createInMemoryNamingRegistry } from "./naming";
import { createInMemoryPlatformRegistry } from "./registry";

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

function assertJsonSafePlain(value: unknown): void {
  const encoded = JSON.stringify(value);
  expect(encoded).toBeTypeOf("string");
  const roundTrip = JSON.parse(encoded as string);
  expect(roundTrip).toEqual(JSON.parse(JSON.stringify(value)));
  expect(encoded).not.toMatch(/function\s*\(|\[Function|\[object /i);
}

describe("UM Core deterministic serialization + snapshot safety", () => {
  it("empty catalog reads are deterministic and JSON-stable", () => {
    const platforms = createInMemoryPlatformRegistry();
    const caps = createInMemoryCapabilityRegistry({ platforms });
    const flags = createInMemoryFlagRegistry({ platforms, capabilities: caps });
    const events = createInMemoryEventTypeRegistry({ platforms });
    const routes = createInMemoryEventRoutingRegistry({
      platforms,
      eventTypes: events,
    });
    const deps = createInMemoryDependencyRegistry({
      platforms,
      capabilities: caps,
    });
    const health = createInMemoryHealthRegistry({ platforms });
    const naming = createInMemoryNamingRegistry({ platforms });
    const reporter = createInMemoryHealthReporter({ platforms });
    const historyCreate = createInMemoryHealthObservationHistory({
      platforms,
      capacity: 3,
    });
    expect(historyCreate.ok).toBe(true);
    const history = historyCreate.history!;

    expect(platforms.list()).toEqual([]);
    expect(caps.list()).toEqual([]);
    expect(flags.list()).toEqual([]);
    expect(events.list()).toEqual([]);
    expect(routes.list()).toEqual([]);
    expect(deps.list()).toEqual([]);
    expect(health.list()).toEqual([]);
    expect(naming.list()).toEqual([]);
    expect(reporter.list()).toEqual([]);
    expect(history.getHistory("example")).toEqual([]);
    expect(history.getLatest("example")).toBeUndefined();

    assertJsonSafePlain(platforms.list());
    assertJsonSafePlain(reporter.list());
    assertJsonSafePlain(history.getHistory("example"));
  });

  it("catalog get/list clones block caller mutation of nested fields", () => {
    const platforms = createInMemoryPlatformRegistry();
    const manifest = validManifest();
    expect(platforms.register({ manifest }).ok).toBe(true);

    const gotPlatform = platforms.get("example");
    expect(gotPlatform).toBeDefined();
    (gotPlatform!.displayName as string) = "mutated-display";
    (gotPlatform!.modules[0]!.capabilityIds as string[]).push("evil.cap");
    (gotPlatform!.manifest.displayName as string) = "mutated-manifest";
    (manifest.displayName as string) = "caller-mutated-input";

    const again = platforms.get("example");
    expect(again?.displayName).toBe("Example Platform");
    expect(again?.modules[0]?.capabilityIds).toEqual(["example.core.ping"]);
    expect(again?.manifest.displayName).toBe("Example Platform");
    expect(platforms.list()[0]?.displayName).toBe("Example Platform");

    const caps = createInMemoryCapabilityRegistry({ platforms });
    expect(
      caps.register({
        capability: {
          capabilityId: "example.core.ping",
          platformId: "example",
          moduleId: "example.core",
          displayName: "Ping",
          sideEffectClasses: ["read"],
          authClass: "none",
          stability: "stable",
          version: "1.0.0",
          metadata: { k: "v" },
        },
      }).ok,
    ).toBe(true);

    const gotCap = caps.get("example.core.ping");
    (gotCap!.sideEffectClasses as string[]).push("write");
    (gotCap!.metadata as Record<string, string>).k = "mutated";
    (gotCap!.displayName as string) = "mutated-cap";

    expect(caps.get("example.core.ping")?.sideEffectClasses).toEqual(["read"]);
    expect(caps.get("example.core.ping")?.metadata).toEqual({ k: "v" });
    expect(caps.get("example.core.ping")?.displayName).toBe("Ping");
    expect(caps.listByPlatform("example")[0]?.sideEffectClasses).toEqual([
      "read",
    ]);

    const flags = createInMemoryFlagRegistry({ platforms, capabilities: caps });
    expect(
      flags.register({
        flag: {
          flagId: "example.core.enabled",
          ownerPlatformId: "example",
          ownerRef: "owner.platform",
          defaultState: "off",
          linkedCapabilityIds: ["example.core.ping"],
          dangerElevated: false,
          auditRequired: false,
        },
      }).ok,
    ).toBe(true);

    const gotFlag = flags.get("example.core.enabled");
    (gotFlag!.linkedCapabilityIds as string[]).push("evil.cap");
    expect(flags.get("example.core.enabled")?.linkedCapabilityIds).toEqual([
      "example.core.ping",
    ]);
  });

  it("routing / event / dependency / health / naming reads isolate store state", () => {
    const platforms = createInMemoryPlatformRegistry();
    expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
    const caps = createInMemoryCapabilityRegistry({ platforms });
    expect(
      caps.register({
        capability: {
          capabilityId: "example.core.ping",
          platformId: "example",
          moduleId: "example.core",
          displayName: "Ping",
          sideEffectClasses: ["read"],
          authClass: "none",
          stability: "stable",
          version: "1.0.0",
        },
      }).ok,
    ).toBe(true);

    const events = createInMemoryEventTypeRegistry({ platforms });
    expect(
      events.register({
        eventType: {
          eventType: "example.core.pinged",
          producerPlatformId: "example",
          schemaVersion: "1.0.0",
          compatibilityPolicy: "backward",
          payloadSchemaRef: "schemas/example.core.pinged.v1.json",
          piiClass: "none",
          deliveryExpectation: "at_least_once",
          stability: "stable",
          subjectRefExpectations: ["ping"],
          documentationRefs: ["docs/example/events.md"],
          metadata: { topic: "ping" },
        },
      }).ok,
    ).toBe(true);

    const gotEvent = events.get("example.core.pinged");
    (gotEvent!.subjectRefExpectations as string[]).push("evil");
    (gotEvent!.documentationRefs as string[]).push("evil.md");
    (gotEvent!.metadata as Record<string, string>).topic = "mutated";
    expect(events.get("example.core.pinged")?.subjectRefExpectations).toEqual([
      "ping",
    ]);
    expect(events.get("example.core.pinged")?.documentationRefs).toEqual([
      "docs/example/events.md",
    ]);
    expect(events.get("example.core.pinged")?.metadata).toEqual({
      topic: "ping",
    });

    expect(
      platforms.register({
        manifest: validManifest({
          platformId: "consumer",
          displayName: "Consumer",
          modules: [
            {
              moduleId: "consumer.core",
              displayName: "Consumer Core",
              capabilityIds: ["consumer.core.read"],
            },
          ],
          capabilities: [
            {
              capabilityId: "consumer.core.read",
              moduleId: "consumer.core",
              displayName: "Read",
              sideEffectClasses: ["read"],
              stability: "stable",
              version: "1.0.0",
            },
          ],
          providesEvents: [
            {
              eventType: "consumer.core.read",
              schemaVersion: "1.0.0",
              stability: "stable",
            },
          ],
          flags: [
            {
              flagId: "consumer.core.enabled",
              defaultState: "off",
              linkedCapabilityIds: ["consumer.core.read"],
              dangerElevated: false,
            },
          ],
          health: { reportsStatus: false },
        }),
      }).ok,
    ).toBe(true);

    const routes = createInMemoryEventRoutingRegistry({
      platforms,
      eventTypes: events,
    });
    const routeResult = routes.register({
      route: {
        eventType: "example.core.pinged",
        destinationPlatformId: "consumer",
        metadata: { lane: "a" },
      },
    });
    expect(routeResult.ok).toBe(true);
    const routeId = routeResult.routeId!;
    const gotRoute = routes.get(routeId);
    (gotRoute!.metadata as Record<string, string>).lane = "mutated";
    expect(routes.get(routeId)?.metadata).toEqual({ lane: "a" });

    const deps = createInMemoryDependencyRegistry({
      platforms,
      capabilities: caps,
    });
    const depResult = deps.register({
      dependency: {
        fromPlatformId: "example",
        targetKind: "peer_kernel",
        targetId: "um.core",
        strength: "required",
        reason: "Core contracts",
      },
    });
    expect(depResult.ok).toBe(true);
    const gotDep = deps.get(depResult.edgeId);
    (gotDep!.reason as string) = "mutated";
    expect(deps.get(depResult.edgeId)?.reason).toBe("Core contracts");

    const health = createInMemoryHealthRegistry({ platforms });
    expect(
      health.register({
        health: {
          platformId: "example",
          reportsStatus: true,
          probeRef: "probe.example.health",
        },
      }).ok,
    ).toBe(true);
    const gotHealth = health.get("example");
    (gotHealth!.probeRef as string) = "mutated-probe";
    expect(health.get("example")?.probeRef).toBe("probe.example.health");

    const naming = createInMemoryNamingRegistry({
      platforms,
      capabilities: caps,
      eventTypes: events,
    });
    const named = naming.get("platform", "example");
    (named!.displayName as string) = "mutated-name";
    expect(naming.get("platform", "example")?.displayName).toBe(
      "Example Platform",
    );
  });

  it("repeated reads are representation-equivalent and JSON-stable", () => {
    const platforms = createInMemoryPlatformRegistry();
    expect(
      platforms.register({
        manifest: validManifest({
          platformId: "beta",
          displayName: "Beta",
          modules: [
            {
              moduleId: "beta.core",
              displayName: "Beta Core",
              capabilityIds: ["beta.core.ping"],
            },
          ],
          capabilities: [
            {
              capabilityId: "beta.core.ping",
              moduleId: "beta.core",
              displayName: "Ping",
              sideEffectClasses: ["read"],
              stability: "stable",
              version: "1.0.0",
            },
          ],
          providesEvents: [
            {
              eventType: "beta.core.pinged",
              schemaVersion: "1.0.0",
              stability: "stable",
            },
          ],
          flags: [
            {
              flagId: "beta.core.enabled",
              defaultState: "off",
              linkedCapabilityIds: ["beta.core.ping"],
              dangerElevated: false,
            },
          ],
          health: { reportsStatus: true, probeRef: "probe.beta.health" },
        }),
      }).ok,
    ).toBe(true);
    expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);

    const first = platforms.list();
    const second = platforms.list();
    expect(first.map((r) => r.platformId)).toEqual(["beta", "example"]);
    expect(second.map((r) => r.platformId)).toEqual(["beta", "example"]);
    expect(first).toEqual(second);
    expect(first[0]).not.toBe(second[0]);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    assertJsonSafePlain(first);

    const reporter = createInMemoryHealthReporter({ platforms });
    expect(
      reporter.report({
        platformId: "example",
        status: "ready",
        checkedAt: "2026-08-09T12:00:00.000Z",
        affectedCapabilityIds: ["example.core.ping"],
        dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
      }).ok,
    ).toBe(true);
    expect(
      reporter.report({
        platformId: "beta",
        status: "degraded",
        checkedAt: "2026-08-09T12:01:00.000Z",
        affectedCapabilityIds: ["beta.core.ping"],
        dependencyStatuses: [],
        detail: "warm",
      }).ok,
    ).toBe(true);

    const snapA = reporter.list();
    const snapB = reporter.list();
    expect(snapA.map((s) => s.platformId)).toEqual(["beta", "example"]);
    expect(snapA).toEqual(snapB);
    expect(snapA[0]).not.toBe(snapB[0]);
    expect(JSON.stringify(snapA)).toBe(JSON.stringify(snapB));

    // optional detail omitted vs present stays consistent across clones
    expect("detail" in (reporter.getSnapshot("example") as object)).toBe(false);
    expect(reporter.getSnapshot("beta")?.detail).toBe("warm");
    assertJsonSafePlain(snapA);
  });

  it("register result record is isolated from subsequent store reads", () => {
    const platforms = createInMemoryPlatformRegistry();
    const result = platforms.register({ manifest: validManifest() });
    expect(result.ok).toBe(true);
    expect(result.record).toBeDefined();
    (result.record!.displayName as string) = "from-register-result";
    (result.record!.capabilities[0]!.sideEffectClasses as string[]).push(
      "write",
    );

    expect(platforms.get("example")?.displayName).toBe("Example Platform");
    expect(platforms.get("example")?.capabilities[0]?.sideEffectClasses).toEqual(
      ["read"],
    );
  });
});
