/**
 * Focused UM Core P5 in-memory capability registry tests.
 * No execution, persistence, or networking.
 */

import { describe, expect, it } from "vitest";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  UmCapabilityRegistryCode,
  createInMemoryCapabilityRegistry,
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
        capabilityIds: ["example.core.ping", "example.core.write"],
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
        capabilityId: "example.core.write",
        moduleId: "example.core",
        displayName: "Write",
        sideEffectClasses: ["write"],
        stability: "experimental",
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
    sideEffectSummary: ["read", "write"],
    maturityLevel: 1,
    documentationRefs: ["docs/example/README.md", "docs/example/OWNERS.md"],
    soTStatement: "Owns example domain truth only.",
    nonOwnershipStatement: "Does not own money, AI execution, or other platforms.",
    ...overrides,
  };
}

function registerPlatform() {
  const platforms = createInMemoryPlatformRegistry();
  const result = platforms.register({ manifest: validManifest() });
  expect(result.ok).toBe(true);
  return platforms;
}

function pingDeclaration(
  overrides: Partial<Parameters<
    ReturnType<typeof createInMemoryCapabilityRegistry>["register"]
  >[0]["capability"]> = {},
) {
  return {
    capabilityId: "example.core.ping",
    platformId: "example",
    moduleId: "example.core",
    displayName: "Ping",
    sideEffectClasses: ["read"] as const,
    authClass: "authenticated" as const,
    stability: "stable" as const,
    version: "1.0.0",
    flagId: "example.core.enabled",
    documentationRef: "docs/example/ping.md",
    metadata: { surface: "internal" },
    ...overrides,
  };
}

describe("um.core P5 in-memory capability registry", () => {
  it("registers a capability owned by a registered platform", () => {
    const platforms = registerPlatform();
    const caps = createInMemoryCapabilityRegistry({ platforms });
    const result = caps.register({
      capability: pingDeclaration(),
      registration: { registeredAt: "2026-08-06T00:00:00.000Z" },
    });

    expect(result.ok).toBe(true);
    expect(result.record?.capabilityId).toBe("example.core.ping");
    expect(result.record?.authClass).toBe("authenticated");
    expect(result.record?.owningPlatformComplianceStatus).toBe("compliant");
    expect(result.record?.registeredAt).toBe("2026-08-06T00:00:00.000Z");
    expect(caps.has("example.core.ping")).toBe(true);
    expect(caps.size()).toBe(1);
  });

  it("rejects unknown platforms and unknown modules", () => {
    const platforms = createInMemoryPlatformRegistry();
    const caps = createInMemoryCapabilityRegistry({ platforms });
    const unknownPlatform = caps.register({
      capability: pingDeclaration({ platformId: "missing" }),
    });
    expect(unknownPlatform.ok).toBe(false);
    expect(unknownPlatform.findings.map((f) => f.code)).toContain(
      UmCapabilityRegistryCode.UNKNOWN_PLATFORM,
    );

    const withPlatform = registerPlatform();
    const caps2 = createInMemoryCapabilityRegistry({ platforms: withPlatform });
    const unknownModule = caps2.register({
      capability: pingDeclaration({ moduleId: "example.missing" }),
    });
    expect(unknownModule.ok).toBe(false);
    expect(unknownModule.findings.map((f) => f.code)).toContain(
      UmCapabilityRegistryCode.UNKNOWN_MODULE,
    );
  });

  it("rejects duplicate capability ids", () => {
    const platforms = registerPlatform();
    const caps = createInMemoryCapabilityRegistry({ platforms });
    expect(caps.register({ capability: pingDeclaration() }).ok).toBe(true);
    const dup = caps.register({ capability: pingDeclaration() });
    expect(dup.ok).toBe(false);
    expect(dup.findings.map((f) => f.code)).toContain(
      UmCapabilityRegistryCode.DUPLICATE_CAPABILITY_ID,
    );
    expect(caps.size()).toBe(1);
  });

  it("rejects capabilities outside the platform namespace", () => {
    const platforms = registerPlatform();
    const caps = createInMemoryCapabilityRegistry({ platforms });
    const result = caps.register({
      capability: pingDeclaration({
        capabilityId: "other.platform.action",
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmCapabilityRegistryCode.PLATFORM_NAMESPACE,
    );
  });

  it("rejects invalid side-effects, versions, and auth/stability", () => {
    const platforms = registerPlatform();
    const caps = createInMemoryCapabilityRegistry({ platforms });
    const result = caps.register({
      capability: pingDeclaration({
        // @ts-expect-error intentional invalid side-effect for runtime guard
        sideEffectClasses: ["explode"],
        version: "not a version",
        // @ts-expect-error intentional invalid auth
        authClass: "magic",
        // @ts-expect-error intentional invalid stability
        stability: "maybe",
      }),
    });
    expect(result.ok).toBe(false);
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain(UmCapabilityRegistryCode.SIDE_EFFECT_INVALID);
    expect(codes).toContain(UmCapabilityRegistryCode.VERSION_INVALID);
    expect(codes).toContain(UmCapabilityRegistryCode.AUTH_CLASS_INVALID);
    expect(codes).toContain(UmCapabilityRegistryCode.STABILITY_INVALID);
  });

  it("rejects module/capability reference mismatches", () => {
    const platforms = registerPlatform();
    const caps = createInMemoryCapabilityRegistry({ platforms });
    const result = caps.register({
      capability: pingDeclaration({
        capabilityId: "example.core.undeclared",
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmCapabilityRegistryCode.MODULE_CAPABILITY_REF_MISMATCH,
    );
  });

  it("supports deterministic lookups by platform, module, side-effect, stability", () => {
    const platforms = registerPlatform();
    const caps = createInMemoryCapabilityRegistry({ platforms });
    caps.register({ capability: pingDeclaration() });
    caps.register({
      capability: pingDeclaration({
        capabilityId: "example.core.write",
        displayName: "Write",
        sideEffectClasses: ["write"],
        stability: "experimental",
        authClass: "capability_scoped",
      }),
    });

    expect(caps.list().map((r) => r.capabilityId)).toEqual([
      "example.core.ping",
      "example.core.write",
    ]);
    expect(caps.listByPlatform("example")).toHaveLength(2);
    expect(caps.listByModule("example.core").map((r) => r.capabilityId)).toEqual([
      "example.core.ping",
      "example.core.write",
    ]);
    expect(caps.listBySideEffectClass("write")).toHaveLength(1);
    expect(caps.listByStability("experimental")[0]?.capabilityId).toBe(
      "example.core.write",
    );
    expect(caps.get("example.core.ping")?.displayName).toBe("Ping");
  });

  it("emits deterministically ordered findings", () => {
    const platforms = registerPlatform();
    const caps = createInMemoryCapabilityRegistry({ platforms });
    const result = caps.register({
      capability: pingDeclaration({
        capabilityId: "Bad_ID",
        version: "",
        displayName: "  ",
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
    const platforms = registerPlatform();
    const caps = createInMemoryCapabilityRegistry({ platforms });
    const result = caps.register({ capability: pingDeclaration() });
    expect(result.ok).toBe(true);
    expect(result.record?.registeredAt).toBeUndefined();
  });

  it("clear empties the in-memory catalog only", () => {
    const platforms = registerPlatform();
    const caps = createInMemoryCapabilityRegistry({ platforms });
    caps.register({ capability: pingDeclaration() });
    caps.clear();
    expect(caps.size()).toBe(0);
    expect(caps.list()).toEqual([]);
  });
});
