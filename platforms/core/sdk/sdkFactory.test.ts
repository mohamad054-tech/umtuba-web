/**
 * Focused UM Core SDK / client factory tests.
 * SDK FACTORY IS NOT REGISTRY CONSTRUCTION.
 * SDK FACTORY IS NOT DIAGNOSTICS JOIN / FLEET / RI.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createInMemoryCapabilityAsserter,
  createInMemoryCapabilityRegistry,
} from "../capability";
import {
  UmEventPublishCode,
  createInMemoryEventPublisher,
  createInMemoryEventTypeRegistry,
  type UmPlatformEventEnvelope,
} from "../event";
import {
  UmFlagEvaluationCode,
  createInMemoryFlagEvaluator,
  createInMemoryFlagRegistry,
} from "../flag";
import {
  UmHealthReportCode,
  createInMemoryHealthReporter,
  type UmHealthSnapshot,
} from "../health";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  createInMemoryUmCoreSdkFactory,
  type UmCoreSdkClient,
  type UmCoreSdkFactoryDeps,
  type UmServiceIdentityContext,
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
        defaultState: "on",
        linkedCapabilityIds: ["example.core.ping"],
        dangerElevated: false,
      },
      {
        flagId: "example.core.preview",
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

function assemblePorts() {
  const platforms = createInMemoryPlatformRegistry();
  expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);

  const flagRegistry = createInMemoryFlagRegistry({ platforms });
  expect(
    flagRegistry.register({
      flag: {
        flagId: "example.core.enabled",
        ownerPlatformId: "example",
        ownerRef: "owner.platform",
        defaultState: "on",
        linkedCapabilityIds: ["example.core.ping"],
        dangerElevated: false,
        auditRequired: false,
        description: "Enable core ping",
      },
    }).ok,
  ).toBe(true);
  expect(
    flagRegistry.register({
      flag: {
        flagId: "example.core.preview",
        ownerPlatformId: "example",
        ownerRef: "owner.platform",
        defaultState: "off",
        linkedCapabilityIds: ["example.core.ping"],
        dangerElevated: false,
        auditRequired: false,
        description: "Preview surface",
      },
    }).ok,
  ).toBe(true);

  const capabilityRegistry = createInMemoryCapabilityRegistry({ platforms });
  expect(
    capabilityRegistry.register({
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

  const flags = createInMemoryFlagEvaluator({ flags: flagRegistry });
  const capabilities = createInMemoryCapabilityAsserter({
    capabilities: capabilityRegistry,
    flags,
  });
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
        documentationRefs: ["docs/example/events/pinged.md"],
        description: "Emitted when ping completes",
      },
      registration: { registeredAt: "2026-08-06T00:00:00.000Z" },
    }).ok,
  ).toBe(true);
  const events = createInMemoryEventPublisher({ eventTypes });
  const health = createInMemoryHealthReporter({ platforms });

  const deps: UmCoreSdkFactoryDeps = {
    flags,
    capabilities,
    events,
    health,
    platforms,
  };

  return { platforms, deps, flags, capabilities, events, health };
}

function validIdentity(
  overrides: Partial<UmServiceIdentityContext> = {},
): UmServiceIdentityContext {
  return {
    serviceId: "svc.example",
    platformId: "example",
    runtimeId: "runtime-1",
    ...overrides,
  };
}

function validEvent(
  overrides: Partial<UmPlatformEventEnvelope<unknown>> = {},
): UmPlatformEventEnvelope<unknown> {
  return {
    eventId: "evt-001",
    eventType: "example.core.pinged",
    occurredAt: "2026-08-07T12:00:00.000Z",
    producerPlatformId: "example",
    subjectRef: { kind: "ping", id: "ping-1" },
    correlationId: "corr-001",
    idempotencyKey: "idem-001",
    schemaVersion: "1.0.0",
    payload: { ok: true },
    ...overrides,
  };
}

function validSnapshot(
  overrides: Partial<UmHealthSnapshot> = {},
): UmHealthSnapshot {
  return {
    platformId: "example",
    status: "ready",
    checkedAt: "2026-08-09T12:00:00.000Z",
    affectedCapabilityIds: ["example.core.ping"],
    dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
    detail: "ok",
    ...overrides,
  };
}

describe("um.core SDK client factory foundation", () => {
  it("S1: factory create with complete deps returns createClient", () => {
    const { deps } = assemblePorts();
    const factory = createInMemoryUmCoreSdkFactory(deps);
    expect(typeof factory.createClient).toBe("function");
  });

  it("S2: missing required dep throws", () => {
    const { deps } = assemblePorts();
    expect(() =>
      createInMemoryUmCoreSdkFactory({
        ...deps,
        flags: null as unknown as UmCoreSdkFactoryDeps["flags"],
      }),
    ).toThrow(/flags/);
    expect(() =>
      createInMemoryUmCoreSdkFactory({
        ...deps,
        platforms: null as unknown as UmCoreSdkFactoryDeps["platforms"],
      }),
    ).toThrow(/platforms/);
  });

  it("S3: createClient freezes identity matching input", () => {
    const { deps } = assemblePorts();
    const factory = createInMemoryUmCoreSdkFactory(deps);
    const identity = validIdentity();
    const client = factory.createClient(identity);
    expect(client.identity).toEqual(identity);
    expect(Object.isFrozen(client.identity)).toBe(true);
    expect(Object.isFrozen(client)).toBe(true);
  });

  it("S4: invalid/empty identity throws", () => {
    const { deps } = assemblePorts();
    const factory = createInMemoryUmCoreSdkFactory(deps);
    expect(() => factory.createClient(validIdentity({ serviceId: "  " }))).toThrow(
      /serviceId/,
    );
    expect(() =>
      factory.createClient(validIdentity({ platformId: "" })),
    ).toThrow(/platformId/);
    expect(() =>
      factory.createClient(validIdentity({ platformId: "Bad-Id" })),
    ).toThrow(/machine id/);
  });

  it("S5: client ports are the same references as deps", () => {
    const { deps, flags, capabilities, events, health } = assemblePorts();
    const client = createInMemoryUmCoreSdkFactory(deps).createClient(
      validIdentity(),
    );
    expect(client.flags).toBe(flags);
    expect(client.capabilities).toBe(capabilities);
    expect(client.events).toBe(events);
    expect(client.health).toBe(health);
  });

  it("S6: flags.evaluate delegates without reimplementation drift", () => {
    const { deps, flags } = assemblePorts();
    const client = createInMemoryUmCoreSdkFactory(deps).createClient(
      validIdentity(),
    );
    const request = { flagId: "example.core.enabled" };
    expect(client.flags.evaluate(request)).toEqual(flags.evaluate(request));
    expect(client.flags.evaluate(request).reasonCode).toBe(
      UmFlagEvaluationCode.DEFAULT_ON,
    );
  });

  it("S7: capabilities.assertEnabled delegates", () => {
    const { deps, capabilities } = assemblePorts();
    const client = createInMemoryUmCoreSdkFactory(deps).createClient(
      validIdentity(),
    );
    expect(client.capabilities.assertEnabled("example.core.ping")).toEqual(
      capabilities.assertEnabled("example.core.ping"),
    );
    expect(
      client.capabilities.assertEnabled("example.core.ping").enabled,
    ).toBe(true);
  });

  it("S8: events.publish returns P16 shape; unknown type ok:false", () => {
    const { deps } = assemblePorts();
    const client = createInMemoryUmCoreSdkFactory(deps).createClient(
      validIdentity(),
    );
    expect(client.events.publish(validEvent()).ok).toBe(true);
    const unknown = client.events.publish(
      validEvent({ eventType: "example.core.missing" }),
    );
    expect(unknown.ok).toBe(false);
    expect(unknown.findings.map((f) => f.code)).toContain(
      UmEventPublishCode.UNKNOWN_TYPE,
    );
  });

  it("S9: health.report / getSnapshot return P17 shapes; unknown platform ok:false", () => {
    const { deps } = assemblePorts();
    const client = createInMemoryUmCoreSdkFactory(deps).createClient(
      validIdentity(),
    );
    const snapshot = validSnapshot();
    expect(client.health.report(snapshot)).toEqual({
      ok: true,
      platformId: "example",
      findings: [],
    });
    expect(client.health.getSnapshot("example")).toEqual(snapshot);

    const missing = client.health.report(
      validSnapshot({ platformId: "missing" }),
    );
    expect(missing.ok).toBe(false);
    expect(missing.findings.map((f) => f.code)).toContain(
      UmHealthReportCode.UNKNOWN_PLATFORM,
    );
  });

  it("S10: register pass-through yields P4 result; does not invent modules", () => {
    const { deps, platforms } = assemblePorts();
    const client = createInMemoryUmCoreSdkFactory(deps).createClient(
      validIdentity(),
    );
    const other = validManifest({
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
    });
    const result = client.register(other);
    expect(result.ok).toBe(true);
    expect(result.platformId).toBe("other");
    expect(platforms.get("other")?.platformId).toBe("other");
    expect(platforms.get("other")?.modules.map((m) => m.moduleId)).toEqual([
      "other.core",
    ]);
  });

  it("S11: two clients share ports; identities remain distinct", () => {
    const { deps, flags } = assemblePorts();
    const factory = createInMemoryUmCoreSdkFactory(deps);
    const a = factory.createClient(
      validIdentity({ serviceId: "svc.a", runtimeId: "r-a" }),
    );
    const b = factory.createClient(
      validIdentity({ serviceId: "svc.b", runtimeId: "r-b" }),
    );
    expect(a.flags).toBe(flags);
    expect(b.flags).toBe(flags);
    expect(a.flags).toBe(b.flags);
    expect(a.identity.serviceId).toBe("svc.a");
    expect(b.identity.serviceId).toBe("svc.b");
    expect(a.identity).not.toBe(b.identity);
  });

  it("S12: determinism — repeated evaluate/publish/report matches", () => {
    const { deps } = assemblePorts();
    const client = createInMemoryUmCoreSdkFactory(deps).createClient(
      validIdentity(),
    );
    const flagReq = { flagId: "example.core.preview" };
    expect(client.flags.evaluate(flagReq)).toEqual(
      client.flags.evaluate(flagReq),
    );
    const event = validEvent();
    expect(client.events.publish(event)).toEqual(client.events.publish(event));
    const snapshot = validSnapshot({ detail: "deterministic" });
    expect(client.health.report(snapshot)).toEqual(
      client.health.report(snapshot),
    );
    expect(client.health.getSnapshot("example")).toEqual(snapshot);
  });

  it("S13: factory module does not import product domains", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "sdkFactory.ts"), "utf8");
    expect(source).not.toMatch(/lib\/ads/);
    expect(source).not.toMatch(/lib\/privateAi/);
    expect(source).not.toMatch(/translation/i);
    expect(source).not.toMatch(/commerce/i);
    expect(source).not.toMatch(/learning/i);
    expect(source).not.toMatch(/collaboration/i);
  });

  it("S14: no poll / schedule / fetch / probe APIs on factory or client", () => {
    const { deps } = assemblePorts();
    const factory = createInMemoryUmCoreSdkFactory(deps);
    const client = factory.createClient(validIdentity());
    for (const key of ["poll", "schedule", "fetch", "probe"] as const) {
      expect(key in factory).toBe(false);
      expect(key in client).toBe(false);
    }
  });

  it("S15: client surface has no diagnostics-join / fleet / RI methods", () => {
    const { deps } = assemblePorts();
    const client: UmCoreSdkClient = createInMemoryUmCoreSdkFactory(
      deps,
    ).createClient(validIdentity());
    for (const key of [
      "evaluateJoin",
      "join",
      "aggregateFleet",
      "fleet",
      "validateReferentialIntegrity",
      "referentialIntegrity",
    ] as const) {
      expect(key in client).toBe(false);
    }
    expect(Object.keys(client).sort()).toEqual(
      [
        "capabilities",
        "events",
        "flags",
        "health",
        "identity",
        "register",
      ].sort(),
    );
  });
});
