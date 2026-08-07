/**
 * Focused UM Core P9 in-memory dependency registry tests.
 * Catalog only — DEPENDENCY REGISTRATION IS NOT DEPENDENCY RESOLUTION.
 */

import { describe, expect, it } from "vitest";
import { createInMemoryCapabilityRegistry } from "../capability";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  UmDependencyRegistryCode,
  buildDependencyEdgeId,
  createInMemoryDependencyRegistry,
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

function peerKernelDep(
  overrides: Partial<
    Parameters<
      ReturnType<typeof createInMemoryDependencyRegistry>["register"]
    >[0]["dependency"]
  > = {},
) {
  return {
    fromPlatformId: "example",
    targetKind: "peer_kernel" as const,
    targetId: "um.core",
    strength: "required" as const,
    reason: "Core contracts",
    ...overrides,
  };
}

describe("um.core P9 in-memory dependency registry", () => {
  it("registers a peer_kernel dependency for a registered platform", () => {
    const platforms = registerPlatform();
    const deps = createInMemoryDependencyRegistry({ platforms });
    const result = deps.register({
      dependency: peerKernelDep(),
      registration: { registeredAt: "2026-08-07T00:00:00.000Z" },
    });
    expect(result.ok).toBe(true);
    expect(result.edgeId).toBe(
      buildDependencyEdgeId("example", "peer_kernel", "um.core", "required"),
    );
    expect(result.record?.registeredAt).toBe("2026-08-07T00:00:00.000Z");
    expect(deps.size()).toBe(1);
    expect(deps.has(result.edgeId)).toBe(true);
    expect(deps.get(result.edgeId)?.targetKind).toBe("peer_kernel");
  });

  it("registers a required platform dependency when target exists in P4", () => {
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
        requires: [
          {
            targetKind: "platform",
            targetId: "beta",
            strength: "required",
            reason: "Needs beta APIs",
            minCompatibility: ">=1.0.0",
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
      }),
      platforms,
    );
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
            flagId: "beta.core.enabled",
            defaultState: "off",
            linkedCapabilityIds: ["beta.core.ping"],
            dangerElevated: false,
          },
        ],
        sideEffectSummary: ["read"],
      }),
      platforms,
    );

    const deps = createInMemoryDependencyRegistry({ platforms });
    const result = deps.register({
      dependency: {
        fromPlatformId: "alpha",
        targetKind: "platform",
        targetId: "beta",
        strength: "required",
        reason: "Needs beta APIs",
        minCompatibility: ">=1.0.0",
      },
    });
    expect(result.ok).toBe(true);
    expect(result.record?.minCompatibility).toBe(">=1.0.0");
    expect(deps.listByTargetKind("platform")).toHaveLength(1);
    expect(deps.listByStrength("required")).toHaveLength(1);
  });

  it("rejects unknown owner platform", () => {
    const platforms = createInMemoryPlatformRegistry();
    const deps = createInMemoryDependencyRegistry({ platforms });
    const result = deps.register({
      dependency: peerKernelDep({ fromPlatformId: "missing" }),
    });
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) => f.code === UmDependencyRegistryCode.UNKNOWN_OWNER_PLATFORM,
      ),
    ).toBe(true);
    expect(deps.size()).toBe(0);
  });

  it("rejects unknown required platform target", () => {
    const platforms = registerPlatform(
      validManifest({
        requires: [
          {
            targetKind: "platform",
            targetId: "missing.platform",
            strength: "required",
            reason: "Needs missing",
          },
        ],
      }),
    );
    const deps = createInMemoryDependencyRegistry({ platforms });
    const result = deps.register({
      dependency: {
        fromPlatformId: "example",
        targetKind: "platform",
        targetId: "missing.platform",
        strength: "required",
        reason: "Needs missing",
      },
    });
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) => f.code === UmDependencyRegistryCode.UNKNOWN_PLATFORM_TARGET,
      ),
    ).toBe(true);
  });

  it("rejects manifest mismatch", () => {
    const platforms = registerPlatform();
    const deps = createInMemoryDependencyRegistry({ platforms });
    const result = deps.register({
      dependency: peerKernelDep({ reason: "Wrong reason" }),
    });
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) => f.code === UmDependencyRegistryCode.MANIFEST_MISMATCH,
      ),
    ).toBe(true);
  });

  it("rejects duplicate edges and preserves prior state", () => {
    const platforms = registerPlatform();
    const deps = createInMemoryDependencyRegistry({ platforms });
    expect(deps.register({ dependency: peerKernelDep() }).ok).toBe(true);
    const before = deps.size();
    const dup = deps.register({ dependency: peerKernelDep() });
    expect(dup.ok).toBe(false);
    expect(
      dup.findings.some(
        (f) => f.code === UmDependencyRegistryCode.DUPLICATE_EDGE,
      ),
    ).toBe(true);
    expect(deps.size()).toBe(before);
  });

  it("validates capability targets against optional P5 registry", () => {
    const platforms = registerPlatform(
      validManifest({
        requires: [
          {
            targetKind: "capability",
            targetId: "example.core.ping",
            strength: "optional",
            reason: "Local ping",
          },
        ],
      }),
    );
    const capabilities = createInMemoryCapabilityRegistry({ platforms });
    expect(
      capabilities.register({
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

    const deps = createInMemoryDependencyRegistry({ platforms, capabilities });
    const ok = deps.register({
      dependency: {
        fromPlatformId: "example",
        targetKind: "capability",
        targetId: "example.core.ping",
        strength: "optional",
        reason: "Local ping",
      },
    });
    expect(ok.ok).toBe(true);

    const missingCaps = createInMemoryCapabilityRegistry({ platforms });
    const bad = createInMemoryDependencyRegistry({
      platforms,
      capabilities: missingCaps,
    }).register({
      dependency: {
        fromPlatformId: "example",
        targetKind: "capability",
        targetId: "example.core.ping",
        strength: "optional",
        reason: "Local ping",
      },
    });
    expect(bad.ok).toBe(false);
    expect(
      bad.findings.some(
        (f) => f.code === UmDependencyRegistryCode.UNKNOWN_CAPABILITY_TARGET,
      ),
    ).toBe(true);
  });

  it("without P5 accepts declared in-platform capability targets from P4 catalog", () => {
    const platforms = registerPlatform(
      validManifest({
        requires: [
          {
            targetKind: "capability",
            targetId: "example.core.ping",
            strength: "optional",
            reason: "Local ping",
          },
        ],
      }),
    );
    const deps = createInMemoryDependencyRegistry({ platforms });
    const ok = deps.register({
      dependency: {
        fromPlatformId: "example",
        targetKind: "capability",
        targetId: "example.core.ping",
        strength: "optional",
        reason: "Local ping",
      },
    });
    expect(ok.ok).toBe(true);
  });

  it("accepts opaque peer_kernel without resolving um.core as a platform", () => {
    const platforms = registerPlatform();
    const deps = createInMemoryDependencyRegistry({ platforms });
    const result = deps.register({ dependency: peerKernelDep() });
    expect(result.ok).toBe(true);
    expect(platforms.get("um.core")).toBeUndefined();
    expect(deps.listByTargetKind("peer_kernel")).toHaveLength(1);
  });

  it("passes through minCompatibility without evaluating it", () => {
    const platforms = registerPlatform(
      validManifest({
        requires: [
          {
            targetKind: "peer_kernel",
            targetId: "um.core",
            strength: "required",
            reason: "Core contracts",
            minCompatibility: ">=9.9.9-never-evaluated",
          },
        ],
      }),
    );
    const deps = createInMemoryDependencyRegistry({ platforms });
    const result = deps.register({
      dependency: {
        ...peerKernelDep(),
        minCompatibility: ">=9.9.9-never-evaluated",
      },
    });
    expect(result.ok).toBe(true);
    expect(result.record?.minCompatibility).toBe(">=9.9.9-never-evaluated");
  });

  it("lists requirements and dependents in the correct directions", () => {
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
        requires: [
          {
            targetKind: "platform",
            targetId: "beta",
            strength: "required",
            reason: "Needs beta",
          },
          {
            targetKind: "peer_kernel",
            targetId: "um.core",
            strength: "required",
            reason: "Core",
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
      }),
      platforms,
    );
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
        requires: [
          {
            targetKind: "peer_kernel",
            targetId: "um.core",
            strength: "required",
            reason: "Core",
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
      }),
      platforms,
    );

    const deps = createInMemoryDependencyRegistry({ platforms });
    expect(
      deps.register({
        dependency: {
          fromPlatformId: "alpha",
          targetKind: "platform",
          targetId: "beta",
          strength: "required",
          reason: "Needs beta",
        },
      }).ok,
    ).toBe(true);
    expect(
      deps.register({
        dependency: {
          fromPlatformId: "alpha",
          targetKind: "peer_kernel",
          targetId: "um.core",
          strength: "required",
          reason: "Core",
        },
      }).ok,
    ).toBe(true);

    const reqs = deps.listRequirements("alpha");
    expect(reqs.map((r) => r.targetId).sort()).toEqual(["beta", "um.core"]);
    const dependents = deps.listDependents("beta");
    expect(dependents).toHaveLength(1);
    expect(dependents[0]?.fromPlatformId).toBe("alpha");
  });

  it("orders list deterministically by edgeId", () => {
    const platforms = registerPlatform(
      validManifest({
        requires: [
          {
            targetKind: "peer_kernel",
            targetId: "um.core",
            strength: "required",
            reason: "Core",
          },
          {
            targetKind: "peer_kernel",
            targetId: "um.kernel.aux",
            strength: "optional",
            reason: "Aux",
          },
        ],
      }),
    );
    const deps = createInMemoryDependencyRegistry({ platforms });
    expect(
      deps.register({
        dependency: {
          fromPlatformId: "example",
          targetKind: "peer_kernel",
          targetId: "um.kernel.aux",
          strength: "optional",
          reason: "Aux",
        },
      }).ok,
    ).toBe(true);
    expect(
      deps.register({
        dependency: {
          fromPlatformId: "example",
          targetKind: "peer_kernel",
          targetId: "um.core",
          strength: "required",
          reason: "Core",
        },
      }).ok,
    ).toBe(true);
    const ids = deps.list().map((r) => r.edgeId);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
  });

  it("orders findings deterministically", () => {
    const platforms = createInMemoryPlatformRegistry();
    const deps = createInMemoryDependencyRegistry({ platforms });
    const result = deps.register({
      dependency: {
        fromPlatformId: "",
        targetKind: "platform" as const,
        targetId: "",
        strength: "required",
        reason: "",
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

  it("rejects required platform cycles and does not cycle on peer_kernel/optional", () => {
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
        requires: [
          {
            targetKind: "platform",
            targetId: "beta",
            strength: "required",
            reason: "Needs beta",
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
      }),
      platforms,
    );
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
        requires: [
          {
            targetKind: "platform",
            targetId: "alpha",
            strength: "required",
            reason: "Needs alpha",
          },
          {
            targetKind: "platform",
            targetId: "alpha",
            strength: "optional",
            reason: "Optional alpha",
          },
          {
            targetKind: "peer_kernel",
            targetId: "um.core",
            strength: "required",
            reason: "Core",
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
      }),
      platforms,
    );

    const deps = createInMemoryDependencyRegistry({ platforms });
    expect(
      deps.register({
        dependency: {
          fromPlatformId: "alpha",
          targetKind: "platform",
          targetId: "beta",
          strength: "required",
          reason: "Needs beta",
        },
      }).ok,
    ).toBe(true);

    const cycle = deps.register({
      dependency: {
        fromPlatformId: "beta",
        targetKind: "platform",
        targetId: "alpha",
        strength: "required",
        reason: "Needs alpha",
      },
    });
    expect(cycle.ok).toBe(false);
    expect(
      cycle.findings.some(
        (f) => f.code === UmDependencyRegistryCode.REQUIRED_PLATFORM_CYCLE,
      ),
    ).toBe(true);
    expect(deps.size()).toBe(1);

    // Optional platform edge does not participate in required-cycle detection.
    expect(
      deps.register({
        dependency: {
          fromPlatformId: "beta",
          targetKind: "platform",
          targetId: "alpha",
          strength: "optional",
          reason: "Optional alpha",
        },
      }).ok,
    ).toBe(true);

    // peer_kernel does not create platform cycles.
    expect(
      deps.register({
        dependency: {
          fromPlatformId: "beta",
          targetKind: "peer_kernel",
          targetId: "um.core",
          strength: "required",
          reason: "Core",
        },
      }).ok,
    ).toBe(true);
  });

  it("clear empties the catalog and exposes no resolver/SDK surface", () => {
    const platforms = registerPlatform();
    const deps = createInMemoryDependencyRegistry({ platforms });
    expect(deps.register({ dependency: peerKernelDep() }).ok).toBe(true);
    deps.clear();
    expect(deps.size()).toBe(0);
    expect(deps.list()).toEqual([]);
    expect("resolve" in deps).toBe(false);
    expect("evaluate" in deps).toBe(false);
    expect("discover" in deps).toBe(false);
    expect("install" in deps).toBe(false);
    expect("probe" in deps).toBe(false);
  });
});
