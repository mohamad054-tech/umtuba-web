/**
 * Focused UM Core P8 in-memory feature flag registry tests.
 * Catalog only — FLAG REGISTRATION IS NOT FLAG EVALUATION.
 */

import { describe, expect, it } from "vitest";
import { createInMemoryCapabilityRegistry } from "../capability";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  UmFlagEvaluator,
  UmFlagRegistryCode,
  createInMemoryFlagRegistry,
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
        stability: "stable",
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

function registerPlatform(manifest = validManifest()) {
  const platforms = createInMemoryPlatformRegistry();
  expect(platforms.register({ manifest }).ok).toBe(true);
  return platforms;
}

function enabledFlag(
  overrides: Partial<
    Parameters<ReturnType<typeof createInMemoryFlagRegistry>["register"]>[0]["flag"]
  > = {},
) {
  return {
    flagId: "example.core.enabled",
    ownerPlatformId: "example",
    ownerRef: "owner.platform",
    defaultState: "off" as const,
    linkedCapabilityIds: ["example.core.ping"] as const,
    dangerElevated: false,
    auditRequired: false,
    description: "Enable core ping",
    ...overrides,
  };
}

describe("um.core P8 in-memory feature flag registry", () => {
  it("registers a flag owned by a registered platform", () => {
    const platforms = registerPlatform();
    const flags = createInMemoryFlagRegistry({ platforms });
    const result = flags.register({
      flag: enabledFlag(),
      registration: { registeredAt: "2026-08-07T00:00:00.000Z" },
    });
    expect(result.ok).toBe(true);
    expect(result.record?.killSwitch).toBe(true);
    expect(result.record?.registeredAt).toBe("2026-08-07T00:00:00.000Z");
    expect(flags.size()).toBe(1);
  });

  it("rejects unknown owner platforms and leaves registry unchanged", () => {
    const platforms = createInMemoryPlatformRegistry();
    const flags = createInMemoryFlagRegistry({ platforms });
    const result = flags.register({
      flag: enabledFlag({ ownerPlatformId: "missing" }),
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmFlagRegistryCode.UNKNOWN_PLATFORM,
    );
    expect(flags.size()).toBe(0);
  });

  it("rejects flags absent from the owner manifest", () => {
    const platforms = registerPlatform();
    const flags = createInMemoryFlagRegistry({ platforms });
    const result = flags.register({
      flag: enabledFlag({ flagId: "example.core.undeclared" }),
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmFlagRegistryCode.MANIFEST_MISMATCH,
    );
  });

  it("rejects duplicate flag ids", () => {
    const platforms = registerPlatform();
    const flags = createInMemoryFlagRegistry({ platforms });
    expect(flags.register({ flag: enabledFlag() }).ok).toBe(true);
    const dup = flags.register({ flag: enabledFlag() });
    expect(dup.ok).toBe(false);
    expect(dup.findings.map((f) => f.code)).toContain(
      UmFlagRegistryCode.DUPLICATE_FLAG_ID,
    );
    expect(flags.size()).toBe(1);
  });

  it("rejects namespace violations", () => {
    const platforms = registerPlatform();
    const flags = createInMemoryFlagRegistry({ platforms });
    const result = flags.register({
      flag: enabledFlag({ flagId: "other.platform.enabled" }),
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmFlagRegistryCode.PLATFORM_NAMESPACE,
    );
  });

  it("rejects invalid default state and elevated default-on / missing audit", () => {
    const platforms = registerPlatform();
    const flags = createInMemoryFlagRegistry({ platforms });
    const invalidDefault = flags.register({
      flag: enabledFlag({
        defaultState: "maybe" as "off",
      }),
    });
    expect(invalidDefault.findings.map((f) => f.code)).toContain(
      UmFlagRegistryCode.DEFAULT_STATE_INVALID,
    );

    const elevated = flags.register({
      flag: enabledFlag({
        flagId: "example.core.admin",
        linkedCapabilityIds: ["example.core.admin"],
        dangerElevated: true,
        defaultState: "on",
        auditRequired: false,
      }),
    });
    expect(elevated.ok).toBe(false);
    const codes = elevated.findings.map((f) => f.code);
    expect(codes).toContain(UmFlagRegistryCode.ELEVATED_DEFAULT_ON);
    expect(codes).toContain(UmFlagRegistryCode.ELEVATED_AUDIT_REQUIRED);
    expect(flags.size()).toBe(0);
  });

  it("rejects unknown linked capabilities and ownership mismatches via P5 registry", () => {
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

    const flags = createInMemoryFlagRegistry({ platforms, capabilities });
    const unknown = flags.register({
      flag: enabledFlag({
        linkedCapabilityIds: ["example.core.missing"],
      }),
    });
    expect(unknown.findings.map((f) => f.code)).toContain(
      UmFlagRegistryCode.LINKED_CAPABILITY_UNKNOWN,
    );

    const missingInP5 = flags.register({
      flag: enabledFlag({
        flagId: "example.core.admin",
        linkedCapabilityIds: ["example.core.admin"],
        dangerElevated: true,
        auditRequired: true,
        defaultState: "off",
      }),
    });
    expect(missingInP5.ok).toBe(false);
    expect(missingInP5.findings.map((f) => f.code)).toContain(
      UmFlagRegistryCode.LINKED_CAPABILITY_UNKNOWN,
    );

    const ownershipStub = {
      get(capabilityId: string) {
        if (capabilityId !== "example.core.ping") return undefined;
        return {
          capabilityId: "example.core.ping",
          platformId: "other",
          moduleId: "example.core",
          displayName: "Ping",
          sideEffectClasses: ["read"] as const,
          authClass: "authenticated" as const,
          stability: "stable" as const,
          version: "1.0.0",
        };
      },
      list: () => [],
      listByPlatform: () => [],
      listByModule: () => [],
      listBySideEffectClass: () => [],
      listByStability: () => [],
      has: () => false,
      size: () => 0,
    };
    const ownershipFlags = createInMemoryFlagRegistry({
      platforms,
      capabilities: ownershipStub,
    });
    const ownership = ownershipFlags.register({ flag: enabledFlag() });
    expect(ownership.findings.map((f) => f.code)).toContain(
      UmFlagRegistryCode.LINKED_CAPABILITY_OWNERSHIP,
    );
  });

  it("supports deterministic lookups and list ordering", () => {
    const platforms = registerPlatform();
    const flags = createInMemoryFlagRegistry({ platforms });
    flags.register({
      flag: enabledFlag({
        flagId: "example.core.admin",
        linkedCapabilityIds: ["example.core.admin"],
        dangerElevated: true,
        auditRequired: true,
      }),
    });
    flags.register({ flag: enabledFlag() });

    expect(flags.list().map((f) => f.flagId)).toEqual([
      "example.core.admin",
      "example.core.enabled",
    ]);
    expect(flags.listByPlatform("example")).toHaveLength(2);
    expect(flags.listByLinkedCapability("example.core.ping")).toHaveLength(1);
    expect(flags.listByDangerElevated(true)).toHaveLength(1);
    expect(flags.get("example.core.enabled")?.defaultState).toBe("off");
  });

  it("emits deterministically ordered findings and does not invent registeredAt", () => {
    const platforms = registerPlatform();
    const flags = createInMemoryFlagRegistry({ platforms });
    const bad = flags.register({
      flag: enabledFlag({ flagId: "", ownerRef: "" }),
    });
    const sorted = [...bad.findings].sort((a, b) => {
      const rank = { error: 0, warning: 1, info: 2 } as const;
      const s = rank[a.severity] - rank[b.severity];
      if (s !== 0) return s;
      const c = a.code.localeCompare(b.code);
      return c !== 0 ? c : (a.path ?? "").localeCompare(b.path ?? "");
    });
    expect(bad.findings).toEqual(sorted);

    const ok = flags.register({ flag: enabledFlag() });
    expect(ok.record?.registeredAt).toBeUndefined();
  });

  it("does not implement UmFlagEvaluator and clear empties catalog", () => {
    const platforms = registerPlatform();
    const flags = createInMemoryFlagRegistry({ platforms });
    flags.register({ flag: enabledFlag() });
    expect("evaluate" in flags).toBe(false);
    expect("evaluateBatch" in flags).toBe(false);
    const evaluator: UmFlagEvaluator | undefined = undefined;
    expect(evaluator).toBeUndefined();
    flags.clear();
    expect(flags.size()).toBe(0);
  });
});
