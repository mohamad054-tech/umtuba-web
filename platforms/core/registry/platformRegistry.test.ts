/**
 * Focused UM Core P4 in-memory platform registry tests.
 * No persistence, networking, or runtime execution.
 */

import { describe, expect, it } from "vitest";
import type { UmPlatformManifest } from "../manifest/types";
import {
  UmRegistryCode,
  createInMemoryPlatformRegistry,
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
        targetKind: "platform",
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

describe("um.core P4 in-memory platform registry", () => {
  it("registers a compliant platform and stores catalogs", () => {
    const registry = createInMemoryPlatformRegistry();
    const result = registry.register({
      manifest: validManifest(),
      registration: {
        registeredAt: "2026-08-06T00:00:00.000Z",
        registrationSource: "test",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.record?.platformId).toBe("example");
    expect(result.record?.modules).toHaveLength(1);
    expect(result.record?.capabilities[0]?.capabilityId).toBe("example.core.ping");
    expect(result.record?.registeredAt).toBe("2026-08-06T00:00:00.000Z");
    expect(registry.has("example")).toBe(true);
    expect(registry.size()).toBe(1);
    expect(registry.get("example")?.complianceStatus).toBe("compliant");
    expect(result.findings.some((f) => f.code === UmRegistryCode.REGISTERED)).toBe(
      true,
    );
  });

  it("rejects duplicate platform ids deterministically", () => {
    const registry = createInMemoryPlatformRegistry();
    expect(registry.register({ manifest: validManifest() }).ok).toBe(true);
    const dup = registry.register({ manifest: validManifest() });
    expect(dup.ok).toBe(false);
    expect(dup.findings.map((f) => f.code)).toContain(
      UmRegistryCode.DUPLICATE_PLATFORM_ID,
    );
    expect(registry.size()).toBe(1);
  });

  it("rejects invalid manifests / failed validation", () => {
    const registry = createInMemoryPlatformRegistry();
    const result = registry.register({
      manifest: validManifest({ platformId: "Bad_ID" }),
    });
    expect(result.ok).toBe(false);
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain(UmRegistryCode.MANIFEST_INVALID);
    expect(codes).toContain(UmRegistryCode.VALIDATION_FAILED);
    expect(registry.size()).toBe(0);
  });

  it("rejects missing ownership", () => {
    const registry = createInMemoryPlatformRegistry();
    const result = registry.register({
      manifest: validManifest({
        owners: [],
        soTStatement: "",
        nonOwnershipStatement: "",
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmRegistryCode.OWNERSHIP_MISSING,
    );
  });

  it("rejects maturity below Registered", () => {
    const registry = createInMemoryPlatformRegistry();
    const result = registry.register({
      manifest: validManifest({ maturityLevel: 0 }),
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmRegistryCode.MATURITY_TOO_LOW,
    );
  });

  it("rejects failed compliance / core certification ineligibility", () => {
    const registry = createInMemoryPlatformRegistry();
    // Thin evidence + no health probe tends toward non-compliant / blocked certs
    // when combined with invalid elevated defaults — use clear non-compliance.
    const result = registry.register({
      manifest: validManifest({
        capabilities: [
          {
            capabilityId: "example.core.admin",
            moduleId: "example.core",
            displayName: "Admin",
            sideEffectClasses: ["admin"],
            stability: "stable",
            version: "1.0.0",
            flagId: "example.core.admin",
          },
        ],
        modules: [
          {
            moduleId: "example.core",
            displayName: "Core",
            capabilityIds: ["example.core.admin"],
          },
        ],
        flags: [
          {
            flagId: "example.core.admin",
            defaultState: "on",
            linkedCapabilityIds: ["example.core.admin"],
            dangerElevated: true,
          },
        ],
        sideEffectSummary: ["admin"],
      }),
    });
    expect(result.ok).toBe(false);
    const codes = result.findings.map((f) => f.code);
    expect(
      codes.includes(UmRegistryCode.COMPLIANCE_FAILED) ||
        codes.includes(UmRegistryCode.CERTIFICATION_INELIGIBLE),
    ).toBe(true);
    expect(registry.size()).toBe(0);
  });

  it("lists registered platforms sorted by platformId", () => {
    const registry = createInMemoryPlatformRegistry();
    registry.register({
      manifest: validManifest({
        platformId: "zeta",
        modules: [
          {
            moduleId: "zeta.core",
            displayName: "Core",
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
      }),
    });
    registry.register({
      manifest: validManifest({
        platformId: "alpha",
        modules: [
          {
            moduleId: "alpha.core",
            displayName: "Core",
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
      }),
    });
    expect(registry.list().map((r) => r.platformId)).toEqual(["alpha", "zeta"]);
  });

  it("emits deterministically ordered findings on rejection", () => {
    const registry = createInMemoryPlatformRegistry();
    const result = registry.register({
      manifest: validManifest({
        platformId: "Bad_ID",
        owners: [],
        maturityLevel: 0,
      }),
    });
    const sorted = [...result.findings].sort((a, b) => {
      const rank = { error: 0, warning: 1, info: 2 } as const;
      const s = rank[a.severity] - rank[b.severity];
      if (s !== 0) return s;
      const c = a.code.localeCompare(b.code);
      return c !== 0 ? c : (a.path ?? "").localeCompare(b.path ?? "");
    });
    expect(result.findings).toEqual(sorted);
  });

  it("does not invent registeredAt timestamps", () => {
    const registry = createInMemoryPlatformRegistry();
    const result = registry.register({ manifest: validManifest() });
    expect(result.ok).toBe(true);
    expect(result.record?.registeredAt).toBeUndefined();
    expect(result.record?.registration.registeredAt).toBeUndefined();
  });

  it("clear empties the in-memory catalog only", () => {
    const registry = createInMemoryPlatformRegistry();
    registry.register({ manifest: validManifest() });
    registry.clear();
    expect(registry.size()).toBe(0);
    expect(registry.list()).toEqual([]);
  });
});
