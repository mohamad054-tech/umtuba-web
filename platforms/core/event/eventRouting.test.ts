/**
 * Focused UM Core P7 in-memory event routing tests.
 * Routing catalog only — no bus, publish, consume, or transport.
 */

import { describe, expect, it } from "vitest";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  UmEventRoutingCode,
  buildEventRouteId,
  createInMemoryEventRoutingRegistry,
  createInMemoryEventTypeRegistry,
} from "./index";

function validManifest(
  platformId: string,
  overrides: Partial<UmPlatformManifest> = {},
): UmPlatformManifest {
  const eventType = `${platformId}.core.pinged`;
  const moduleId = `${platformId}.core`;
  const capabilityId = `${platformId}.core.ping`;
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
        targetKind: "platform",
        targetId: "um.core",
        strength: "required",
        reason: "Core contracts",
      },
    ],
    flags: [
      {
        flagId: `${platformId}.core.enabled`,
        defaultState: "off",
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

function setupCatalogs() {
  const platforms = createInMemoryPlatformRegistry();
  expect(platforms.register({ manifest: validManifest("example") }).ok).toBe(
    true,
  );
  expect(platforms.register({ manifest: validManifest("consumer") }).ok).toBe(
    true,
  );

  const eventTypes = createInMemoryEventTypeRegistry({ platforms });
  expect(
    eventTypes.register({
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
      },
    }).ok,
  ).toBe(true);

  const routing = createInMemoryEventRoutingRegistry({ platforms, eventTypes });
  return { platforms, eventTypes, routing };
}

describe("um.core P7 in-memory event routing", () => {
  it("registers a route from event type to destination platform", () => {
    const { routing } = setupCatalogs();
    const result = routing.register({
      route: {
        eventType: "example.core.pinged",
        destinationPlatformId: "consumer",
        metadata: { priority: "normal" },
        notes: "Fan-out to consumer catalog",
      },
      registration: { registeredAt: "2026-08-07T00:00:00.000Z" },
    });

    expect(result.ok).toBe(true);
    expect(result.routeId).toBe(
      buildEventRouteId("example.core.pinged", "consumer"),
    );
    expect(result.record?.producerPlatformId).toBe("example");
    expect(result.record?.destinationPlatformId).toBe("consumer");
    expect(result.record?.metadata?.priority).toBe("normal");
    expect(result.record?.registeredAt).toBe("2026-08-07T00:00:00.000Z");
    expect(routing.size()).toBe(1);
  });

  it("rejects unknown event types and leaves registry unchanged", () => {
    const { routing } = setupCatalogs();
    const result = routing.register({
      route: {
        eventType: "example.core.missing",
        destinationPlatformId: "consumer",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmEventRoutingCode.UNKNOWN_EVENT_TYPE,
    );
    expect(routing.size()).toBe(0);
  });

  it("rejects unknown destination platforms", () => {
    const { routing } = setupCatalogs();
    const result = routing.register({
      route: {
        eventType: "example.core.pinged",
        destinationPlatformId: "missing",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmEventRoutingCode.UNKNOWN_DESTINATION,
    );
    expect(routing.size()).toBe(0);
  });

  it("rejects duplicate routes", () => {
    const { routing } = setupCatalogs();
    expect(
      routing.register({
        route: {
          eventType: "example.core.pinged",
          destinationPlatformId: "consumer",
        },
      }).ok,
    ).toBe(true);
    const dup = routing.register({
      route: {
        eventType: "example.core.pinged",
        destinationPlatformId: "consumer",
      },
    });
    expect(dup.ok).toBe(false);
    expect(dup.findings.map((f) => f.code)).toContain(
      UmEventRoutingCode.DUPLICATE_ROUTE,
    );
    expect(routing.size()).toBe(1);
  });

  it("supports lookups by event type, producer, and destination", () => {
    const { platforms, eventTypes, routing } = setupCatalogs();
    expect(
      platforms.register({
        manifest: validManifest("observer", {
          providesEvents: [
            {
              eventType: "observer.core.seen",
              schemaVersion: "1.0.0",
              stability: "stable",
            },
          ],
          modules: [
            {
              moduleId: "observer.core",
              displayName: "Core",
              capabilityIds: ["observer.core.ping"],
            },
          ],
          capabilities: [
            {
              capabilityId: "observer.core.ping",
              moduleId: "observer.core",
              displayName: "Ping",
              sideEffectClasses: ["read"],
              stability: "stable",
              version: "1.0.0",
            },
          ],
          flags: [
            {
              flagId: "observer.core.enabled",
              defaultState: "off",
              linkedCapabilityIds: ["observer.core.ping"],
              dangerElevated: false,
            },
          ],
        }),
      }).ok,
    ).toBe(true);
    // Also need consumer already present; register route to example as second dest
    expect(
      eventTypes.register({
        eventType: {
          eventType: "observer.core.seen",
          producerPlatformId: "observer",
          schemaVersion: "1.0.0",
          compatibilityPolicy: "none",
          payloadSchemaRef: "schemas/observer.core.seen.v1.json",
          piiClass: "none",
          deliveryExpectation: "best_effort",
          stability: "stable",
          subjectRefExpectations: ["sight"],
        },
      }).ok,
    ).toBe(true);

    routing.register({
      route: {
        eventType: "example.core.pinged",
        destinationPlatformId: "consumer",
      },
    });
    routing.register({
      route: {
        eventType: "example.core.pinged",
        destinationPlatformId: "observer",
      },
    });
    routing.register({
      route: {
        eventType: "observer.core.seen",
        destinationPlatformId: "example",
      },
    });

    expect(routing.listByEventType("example.core.pinged")).toHaveLength(2);
    expect(routing.listByProducer("example")).toHaveLength(2);
    expect(routing.listByDestination("consumer")).toHaveLength(1);
    expect(
      routing.get(buildEventRouteId("observer.core.seen", "example"))
        ?.producerPlatformId,
    ).toBe("observer");
  });

  it("lists routes in deterministic order by routeId", () => {
    const { platforms, routing } = setupCatalogs();
    expect(
      platforms.register({
        manifest: validManifest("zeta"),
      }).ok,
    ).toBe(true);
    // zeta has zeta.core.pinged in providesEvents from helper — but event type
    // not registered in eventTypes; only route example events.
    routing.register({
      route: {
        eventType: "example.core.pinged",
        destinationPlatformId: "zeta",
      },
    });
    routing.register({
      route: {
        eventType: "example.core.pinged",
        destinationPlatformId: "consumer",
      },
    });

    expect(routing.list().map((r) => r.routeId)).toEqual([
      "example.core.pinged=>consumer",
      "example.core.pinged=>zeta",
    ]);
  });

  it("emits deterministically ordered findings and does not invent registeredAt", () => {
    const { routing } = setupCatalogs();
    const bad = routing.register({
      route: {
        eventType: "",
        destinationPlatformId: "",
      },
    });
    const sorted = [...bad.findings].sort((a, b) => {
      const rank = { error: 0, warning: 1, info: 2 } as const;
      const s = rank[a.severity] - rank[b.severity];
      if (s !== 0) return s;
      const c = a.code.localeCompare(b.code);
      return c !== 0 ? c : (a.path ?? "").localeCompare(b.path ?? "");
    });
    expect(bad.findings).toEqual(sorted);

    const ok = routing.register({
      route: {
        eventType: "example.core.pinged",
        destinationPlatformId: "consumer",
      },
    });
    expect(ok.ok).toBe(true);
    expect(ok.record?.registeredAt).toBeUndefined();
  });

  it("has no publish/consume/runtime surface and clear empties catalog", () => {
    const { routing } = setupCatalogs();
    routing.register({
      route: {
        eventType: "example.core.pinged",
        destinationPlatformId: "consumer",
      },
    });
    expect("publish" in routing).toBe(false);
    expect("onEvent" in routing).toBe(false);
    expect("deliver" in routing).toBe(false);
    routing.clear();
    expect(routing.size()).toBe(0);
    expect(routing.list()).toEqual([]);
  });
});
