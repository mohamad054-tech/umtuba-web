/**
 * Focused UM Core P10 in-memory health declaration catalog tests.
 * Catalog only — HEALTH DECLARATION REGISTRATION IS NOT HEALTH MONITORING.
 */

import { describe, expect, it } from "vitest";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  UmHealthRegistryCode,
  createInMemoryHealthRegistry,
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
    health: {
      reportsStatus: true,
      probeRef: "probe.example.health",
      notes: "Example health surface",
    },
    sideEffectSummary: ["read"],
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

function healthDecl(
  overrides: Partial<
    Parameters<
      ReturnType<typeof createInMemoryHealthRegistry>["register"]
    >[0]["health"]
  > = {},
) {
  return {
    platformId: "example",
    reportsStatus: true,
    probeRef: "probe.example.health",
    notes: "Example health surface",
    ...overrides,
  };
}

describe("um.core P10 in-memory health declaration catalog", () => {
  it("registers a health declaration matching manifest.health", () => {
    const platforms = registerPlatform();
    const health = createInMemoryHealthRegistry({ platforms });
    const result = health.register({
      health: healthDecl(),
      registration: { registeredAt: "2026-08-07T00:00:00.000Z" },
    });
    expect(result.ok).toBe(true);
    expect(result.platformId).toBe("example");
    expect(result.record?.reportsStatus).toBe(true);
    expect(result.record?.probeRef).toBe("probe.example.health");
    expect(result.record?.notes).toBe("Example health surface");
    expect(result.record?.registeredAt).toBe("2026-08-07T00:00:00.000Z");
    expect(health.size()).toBe(1);
    expect(health.has("example")).toBe(true);
    expect(health.get("example")?.platformId).toBe("example");
  });

  it("rejects unknown platform", () => {
    const platforms = createInMemoryPlatformRegistry();
    const health = createInMemoryHealthRegistry({ platforms });
    const result = health.register({
      health: healthDecl({ platformId: "missing" }),
    });
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) => f.code === UmHealthRegistryCode.UNKNOWN_PLATFORM,
      ),
    ).toBe(true);
    expect(health.size()).toBe(0);
  });

  it("rejects reportsStatus mismatch", () => {
    const platforms = registerPlatform();
    const health = createInMemoryHealthRegistry({ platforms });
    const result = health.register({
      health: healthDecl({ reportsStatus: false }),
    });
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) =>
          f.code === UmHealthRegistryCode.MANIFEST_MISMATCH &&
          f.path === "health.reportsStatus",
      ),
    ).toBe(true);
  });

  it("rejects probeRef mismatch", () => {
    const platforms = registerPlatform();
    const health = createInMemoryHealthRegistry({ platforms });
    const result = health.register({
      health: healthDecl({ probeRef: "probe.other" }),
    });
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) =>
          f.code === UmHealthRegistryCode.MANIFEST_MISMATCH &&
          f.path === "health.probeRef",
      ),
    ).toBe(true);
  });

  it("rejects notes mismatch", () => {
    const platforms = registerPlatform();
    const health = createInMemoryHealthRegistry({ platforms });
    const result = health.register({
      health: healthDecl({ notes: "Different notes" }),
    });
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) =>
          f.code === UmHealthRegistryCode.MANIFEST_MISMATCH &&
          f.path === "health.notes",
      ),
    ).toBe(true);
  });

  it("rejects duplicate platform declaration and preserves prior state", () => {
    const platforms = registerPlatform();
    const health = createInMemoryHealthRegistry({ platforms });
    expect(health.register({ health: healthDecl() }).ok).toBe(true);
    const before = health.size();
    const dup = health.register({ health: healthDecl() });
    expect(dup.ok).toBe(false);
    expect(
      dup.findings.some(
        (f) => f.code === UmHealthRegistryCode.DUPLICATE_PLATFORM,
      ),
    ).toBe(true);
    expect(health.size()).toBe(before);
  });

  it("lists and filters by reportsStatus with deterministic platformId order", () => {
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
        health: { reportsStatus: false },
      }),
      platforms,
    );

    const health = createInMemoryHealthRegistry({ platforms });
    expect(
      health.register({
        health: {
          platformId: "zeta",
          reportsStatus: true,
          probeRef: "probe.zeta.health",
        },
      }).ok,
    ).toBe(true);
    expect(
      health.register({
        health: { platformId: "alpha", reportsStatus: false },
      }).ok,
    ).toBe(true);

    const ids = health.list().map((r) => r.platformId);
    expect(ids).toEqual(["alpha", "zeta"]);
    expect(health.listByReportsStatus(true).map((r) => r.platformId)).toEqual([
      "zeta",
    ]);
    expect(health.listByReportsStatus(false).map((r) => r.platformId)).toEqual([
      "alpha",
    ]);
  });

  it("passes through opaque probeRef without executing it", () => {
    const platforms = registerPlatform(
      validManifest({
        health: {
          reportsStatus: true,
          probeRef: "opaque://never-fetched/probe.example",
        },
      }),
    );
    const health = createInMemoryHealthRegistry({ platforms });
    const result = health.register({
      health: {
        platformId: "example",
        reportsStatus: true,
        probeRef: "opaque://never-fetched/probe.example",
      },
    });
    expect(result.ok).toBe(true);
    expect(result.record?.probeRef).toBe("opaque://never-fetched/probe.example");
  });

  it("clear empties the catalog and exposes no monitoring runtime surface", () => {
    const platforms = registerPlatform();
    const health = createInMemoryHealthRegistry({ platforms });
    expect(health.register({ health: healthDecl() }).ok).toBe(true);
    health.clear();
    expect(health.size()).toBe(0);
    expect(health.list()).toEqual([]);
    expect("report" in health).toBe(false);
    expect("getSnapshot" in health).toBe(false);
    expect("registerProbe" in health).toBe(false);
    expect("poll" in health).toBe(false);
    expect("schedule" in health).toBe(false);
    expect("fetch" in health).toBe(false);
  });

  it("orders findings deterministically", () => {
    const platforms = createInMemoryPlatformRegistry();
    const health = createInMemoryHealthRegistry({ platforms });
    const result = health.register({
      health: {
        platformId: "",
        reportsStatus: "nope" as unknown as boolean,
      },
    });
    expect(result.ok).toBe(false);
    const findings = result.findings;
    for (let i = 1; i < findings.length; i += 1) {
      const a = findings[i - 1]!;
      const b = findings[i]!;
      const rank = { error: 0, warning: 1, info: 2 } as const;
      const sev = rank[a.severity] - rank[b.severity];
      if (sev === 0) {
        const code = a.code.localeCompare(b.code);
        if (code === 0) {
          expect((a.path ?? "").localeCompare(b.path ?? "")).toBeLessThanOrEqual(
            0,
          );
        } else {
          expect(code).toBeLessThanOrEqual(0);
        }
      } else {
        expect(sev).toBeLessThanOrEqual(0);
      }
    }
  });
});
