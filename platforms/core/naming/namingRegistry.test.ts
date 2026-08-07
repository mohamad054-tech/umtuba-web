/**
 * Focused UM Core P11 in-memory naming registry tests.
 * Derived index only — NAMING INDEXING IS NOT NAME AUTHORING.
 */

import { describe, expect, it } from "vitest";
import { createInMemoryCapabilityRegistry } from "../capability";
import { createInMemoryEventTypeRegistry } from "../event";
import { createInMemoryFlagRegistry } from "../flag";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import { createInMemoryNamingRegistry } from "./index";

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
        capabilityIds: ["example.core.ping", "example.core.admin"],
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
      {
        capabilityId: "example.core.admin",
        moduleId: "example.core",
        displayName: "Admin",
        sideEffectClasses: ["admin"],
        stability: "experimental",
        version: "1.0.0",
        flagId: "example.core.admin",
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
      {
        flagId: "example.core.admin",
        defaultState: "off",
        linkedCapabilityIds: ["example.core.admin"],
        dangerElevated: true,
      },
    ],
    health: { reportsStatus: true, probeRef: "probe.example.health" },
    sideEffectSummary: ["read", "admin"],
    maturityLevel: 1,
    documentationRefs: ["docs/example/README.md", "docs/example/OWNERS.md"],
    soTStatement: "Owns example domain truth only.",
    nonOwnershipStatement: "Does not own money, AI execution, or other platforms.",
    ...overrides,
  };
}

function registerPlatform(
  manifest = validManifest(),
  platforms = createInMemoryPlatformRegistry(),
) {
  expect(platforms.register({ manifest }).ok).toBe(true);
  return platforms;
}

describe("um.core P11 in-memory naming registry", () => {
  it("indexes platforms and modules from P4", () => {
    const platforms = registerPlatform();
    const naming = createInMemoryNamingRegistry({ platforms });

    const platform = naming.get("platform", "example");
    expect(platform?.kind).toBe("platform");
    expect(platform?.ownerPlatformId).toBe("example");
    expect(platform?.displayName).toBe("Example Platform");
    expect(platform?.stability).toBeUndefined();

    const mod = naming.get("module", "example.core");
    expect(mod?.kind).toBe("module");
    expect(mod?.ownerPlatformId).toBe("example");
    expect(mod?.displayName).toBe("Core Module");
    expect(mod?.stability).toBeUndefined();

    expect(naming.has("platform", "example")).toBe(true);
    expect(naming.listByKind("platform").map((a) => a.id)).toEqual(["example"]);
    expect(naming.listByKind("module").map((a) => a.id)).toEqual([
      "example.core",
    ]);
  });

  it("indexes capabilities from P5 when supplied and does not duplicate P4", () => {
    const platforms = registerPlatform();
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
        },
      }).ok,
    ).toBe(true);

    const naming = createInMemoryNamingRegistry({ platforms, capabilities });
    const caps = naming.listByKind("capability");
    expect(caps).toHaveLength(1);
    expect(caps[0]?.id).toBe("example.core.ping");
    expect(caps[0]?.stability).toBe("stable");
    expect(caps[0]?.displayName).toBe("Ping");
    // P4 still has two embedded caps, but P5 is preferred SoT → only registered P5 rows.
    expect(naming.get("capability", "example.core.admin")).toBeUndefined();
  });

  it("falls back to P4 embedded capabilities when P5 is omitted", () => {
    const platforms = registerPlatform();
    const naming = createInMemoryNamingRegistry({ platforms });
    const caps = naming.listByKind("capability");
    expect(caps.map((c) => c.id).sort()).toEqual([
      "example.core.admin",
      "example.core.ping",
    ]);
    expect(naming.get("capability", "example.core.admin")?.stability).toBe(
      "experimental",
    );
  });

  it("indexes event types from P6 and flags from P8", () => {
    const platforms = registerPlatform();
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
          description: "Pinged event",
        },
      }).ok,
    ).toBe(true);

    const flags = createInMemoryFlagRegistry({ platforms });
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
          description: "Enable ping",
        },
      }).ok,
    ).toBe(true);

    const naming = createInMemoryNamingRegistry({
      platforms,
      eventTypes,
      flags,
    });

    const event = naming.get("event_type", "example.core.pinged");
    expect(event?.stability).toBe("stable");
    expect(event?.displayName).toBeUndefined();
    expect(event?.ownerPlatformId).toBe("example");

    const flag = naming.get("flag", "example.core.enabled");
    expect(flag?.stability).toBeUndefined();
    expect(flag?.displayName).toBeUndefined();
    expect(flag?.ownerPlatformId).toBe("example");
  });

  it("supports get hit/miss and kind-scoped same IDs", () => {
    const platforms = createInMemoryPlatformRegistry();
    registerPlatform(
      validManifest({
        platformId: "alpha",
        modules: [
          {
            moduleId: "alpha",
            displayName: "Alpha Module",
            capabilityIds: ["alpha.core.ping"],
          },
        ],
        capabilities: [
          {
            capabilityId: "alpha.core.ping",
            moduleId: "alpha",
            displayName: "Ping",
            sideEffectClasses: ["read"],
            stability: "stable",
            version: "1.0.0",
          },
        ],
        providesEvents: [
          {
            eventType: "alpha.core.pinged",
            schemaVersion: "1.0.0",
            stability: "stable",
          },
        ],
        flags: [
          {
            flagId: "alpha.core.enabled",
            defaultState: "off",
            linkedCapabilityIds: ["alpha.core.ping"],
            dangerElevated: false,
          },
        ],
        sideEffectSummary: ["read"],
        health: { reportsStatus: true, probeRef: "probe.alpha.health" },
      }),
      platforms,
    );

    const naming = createInMemoryNamingRegistry({ platforms });
    expect(naming.get("platform", "alpha")?.kind).toBe("platform");
    expect(naming.get("module", "alpha")?.kind).toBe("module");
    expect(naming.get("platform", "missing")).toBeUndefined();
    expect(naming.has("platform", "missing")).toBe(false);
  });

  it("lists with deterministic ordering and platform filters", () => {
    const platforms = createInMemoryPlatformRegistry();
    registerPlatform(
      validManifest({
        platformId: "zeta",
        modules: [
          {
            moduleId: "zeta.core",
            displayName: "Zeta",
            capabilityIds: ["zeta.core.ping"],
          },
        ],
        capabilities: [
          {
            capabilityId: "zeta.core.ping",
            moduleId: "zeta.core",
            displayName: "Ping",
            sideEffectClasses: ["read"],
            stability: "stable",
            version: "1.0.0",
          },
        ],
        providesEvents: [
          {
            eventType: "zeta.core.pinged",
            schemaVersion: "1.0.0",
            stability: "stable",
          },
        ],
        flags: [
          {
            flagId: "zeta.core.enabled",
            defaultState: "off",
            linkedCapabilityIds: ["zeta.core.ping"],
            dangerElevated: false,
          },
        ],
        sideEffectSummary: ["read"],
        health: { reportsStatus: true, probeRef: "probe.zeta.health" },
      }),
      platforms,
    );
    registerPlatform(
      validManifest({
        platformId: "alpha",
        modules: [
          {
            moduleId: "alpha.core",
            displayName: "Alpha",
            capabilityIds: ["alpha.core.ping"],
          },
        ],
        capabilities: [
          {
            capabilityId: "alpha.core.ping",
            moduleId: "alpha.core",
            displayName: "Ping",
            sideEffectClasses: ["read"],
            stability: "stable",
            version: "1.0.0",
          },
        ],
        providesEvents: [
          {
            eventType: "alpha.core.pinged",
            schemaVersion: "1.0.0",
            stability: "stable",
          },
        ],
        flags: [
          {
            flagId: "alpha.core.enabled",
            defaultState: "off",
            linkedCapabilityIds: ["alpha.core.ping"],
            dangerElevated: false,
          },
        ],
        sideEffectSummary: ["read"],
        health: { reportsStatus: true, probeRef: "probe.alpha.health" },
      }),
      platforms,
    );

    const naming = createInMemoryNamingRegistry({ platforms });
    expect(naming.listByKind("platform").map((a) => a.id)).toEqual([
      "alpha",
      "zeta",
    ]);
    const all = naming.list();
    for (let i = 1; i < all.length; i += 1) {
      const prev = all[i - 1]!;
      const cur = all[i]!;
      if (prev.kind === cur.kind) {
        expect(prev.id.localeCompare(cur.id)).toBeLessThanOrEqual(0);
      }
    }
    const byPlatform = naming.listByPlatform("alpha");
    expect(byPlatform.every((a) => a.ownerPlatformId === "alpha")).toBe(true);
    expect(byPlatform.map((a) => `${a.kind}:${a.id}`)).toEqual([
      "platform:alpha",
      "module:alpha.core",
      "capability:alpha.core.ping",
    ]);
    expect(naming.size()).toBeGreaterThan(0);
  });

  it("leaves deferred kinds empty and omits optional deps cleanly", () => {
    const platforms = registerPlatform();
    const naming = createInMemoryNamingRegistry({ platforms });
    expect(naming.listByKind("event_type")).toEqual([]);
    expect(naming.listByKind("flag")).toEqual([]);
    expect(naming.get("service", "example.svc")).toBeUndefined();
    expect(naming.listByKind("job")).toEqual([]);
    expect(naming.listByKind("contract")).toEqual([]);
    expect(naming.listByKind("extension")).toEqual([]);
    expect(naming.listByKind("runtime")).toEqual([]);
  });

  it("does not index dependency edges, routes, or health and exposes no authoring API", () => {
    const platforms = registerPlatform();
    const naming = createInMemoryNamingRegistry({ platforms });
    const ids = naming.list().map((a) => a.id);
    expect(ids.some((id) => id.includes("=>"))).toBe(false);
    expect(naming.get("platform", "probe.example.health")).toBeUndefined();

    expect("register" in naming).toBe(false);
    expect("registerName" in naming).toBe(false);
    expect("createName" in naming).toBe(false);
    expect("reserveName" in naming).toBe(false);
    expect("discover" in naming).toBe(false);
    expect("resolve" in naming).toBe(false);

    const before = platforms.size();
    naming.rebuild();
    expect(platforms.size()).toBe(before);
  });

  it("rebuild refreshes the snapshot after source registry changes", () => {
    const platforms = createInMemoryPlatformRegistry();
    registerPlatform(
      validManifest({
        platformId: "alpha",
        modules: [
          {
            moduleId: "alpha.core",
            displayName: "Alpha",
            capabilityIds: ["alpha.core.ping"],
          },
        ],
        capabilities: [
          {
            capabilityId: "alpha.core.ping",
            moduleId: "alpha.core",
            displayName: "Ping",
            sideEffectClasses: ["read"],
            stability: "stable",
            version: "1.0.0",
          },
        ],
        providesEvents: [
          {
            eventType: "alpha.core.pinged",
            schemaVersion: "1.0.0",
            stability: "stable",
          },
        ],
        flags: [
          {
            flagId: "alpha.core.enabled",
            defaultState: "off",
            linkedCapabilityIds: ["alpha.core.ping"],
            dangerElevated: false,
          },
        ],
        sideEffectSummary: ["read"],
        health: { reportsStatus: true, probeRef: "probe.alpha.health" },
      }),
      platforms,
    );

    const naming = createInMemoryNamingRegistry({ platforms });
    expect(naming.has("platform", "alpha")).toBe(true);
    expect(naming.has("platform", "beta")).toBe(false);

    registerPlatform(
      validManifest({
        platformId: "beta",
        modules: [
          {
            moduleId: "beta.core",
            displayName: "Beta",
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
        sideEffectSummary: ["read"],
        health: { reportsStatus: true, probeRef: "probe.beta.health" },
      }),
      platforms,
    );

    expect(naming.has("platform", "beta")).toBe(false);
    naming.rebuild();
    expect(naming.has("platform", "beta")).toBe(true);
  });
});
