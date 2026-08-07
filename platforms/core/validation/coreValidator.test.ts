/**
 * Focused UM Core P13 validator composition tests.
 * VALIDATOR COMPOSITION IS NOT DEPENDENCY RESOLUTION.
 */

import { describe, expect, it } from "vitest";
import { createInMemoryCapabilityRegistry } from "../capability";
import {
  createInMemoryDependencyRegistry,
  type UmDependencyValidator,
} from "../dependency";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  UmDependencyValidationCode,
  createManifestValidator,
  createRegistrationValidator,
  createUmCoreValidator,
  validatePlatformDependencies,
  validatePlatformManifest,
  type UmManifestValidator,
  type UmRegistrationValidator,
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
    health: { reportsStatus: true, probeRef: "probe.example.health" },
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

function peerKernelEdge(fromPlatformId = "example") {
  return {
    fromPlatformId,
    targetKind: "peer_kernel" as const,
    targetId: "um.core",
    strength: "required" as const,
    reason: "Core contracts",
  };
}

describe("um.core P13 validator composition", () => {
  it("reports unknown platform as not ok", () => {
    const platforms = createInMemoryPlatformRegistry();
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    const result = validatePlatformDependencies("missing", {
      platforms,
      dependencies,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toEqual([
      UmDependencyValidationCode.UNKNOWN_PLATFORM,
    ]);
  });

  it("accepts fully materialized manifest requirements", () => {
    const platforms = registerPlatform();
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    expect(
      dependencies.register({ dependency: peerKernelEdge() }).ok,
    ).toBe(true);

    const result = validatePlatformDependencies("example", {
      platforms,
      dependencies,
    });
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("detects missing P9 catalog materialization", () => {
    const platforms = registerPlatform();
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    const result = validatePlatformDependencies("example", {
      platforms,
      dependencies,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some(
      (f) => f.code === UmDependencyValidationCode.MISSING_CATALOG_EDGE,
    )).toBe(true);
  });

  it("detects stale P9 catalog entries", () => {
    const platforms = createInMemoryPlatformRegistry();
    registerPlatform(
      validManifest({
        requires: [
          peerKernelEdge(),
          {
            targetKind: "peer_kernel",
            targetId: "um.extra",
            strength: "optional",
            reason: "Temporary peer",
          },
        ],
      }),
      platforms,
    );
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    expect(
      dependencies.register({ dependency: peerKernelEdge() }).ok,
    ).toBe(true);
    expect(
      dependencies.register({
        dependency: {
          fromPlatformId: "example",
          targetKind: "peer_kernel",
          targetId: "um.extra",
          strength: "optional",
          reason: "Temporary peer",
        },
      }).ok,
    ).toBe(true);

    platforms.clear();
    registerPlatform(validManifest(), platforms);

    const result = validatePlatformDependencies("example", {
      platforms,
      dependencies,
    });
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) => f.code === UmDependencyValidationCode.STALE_CATALOG_EDGE,
      ),
    ).toBe(true);
    expect(
      result.findings.some(
        (f) =>
          f.code === UmDependencyValidationCode.STALE_CATALOG_EDGE &&
          f.targetId === "um.extra",
      ),
    ).toBe(true);
  });

  it("detects platform target referential drift", () => {
    const platforms = createInMemoryPlatformRegistry();
    registerPlatform(
      validManifest({
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
        requires: [
          {
            targetKind: "platform",
            targetId: "beta",
            strength: "required",
            reason: "Needs beta",
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
            displayName: "Core",
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
        requires: [peerKernelEdge("beta")],
        sideEffectSummary: ["read"],
      }),
      platforms,
    );

    const dependencies = createInMemoryDependencyRegistry({ platforms });
    expect(
      dependencies.register({
        dependency: {
          fromPlatformId: "alpha",
          targetKind: "platform",
          targetId: "beta",
          strength: "required",
          reason: "Needs beta",
        },
      }).ok,
    ).toBe(true);

    platforms.clear();
    registerPlatform(
      validManifest({
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
        requires: [
          {
            targetKind: "platform",
            targetId: "beta",
            strength: "required",
            reason: "Needs beta",
          },
        ],
        sideEffectSummary: ["read"],
      }),
      platforms,
    );

    const result = validatePlatformDependencies("alpha", {
      platforms,
      dependencies,
    });
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) =>
          f.code === UmDependencyValidationCode.UNKNOWN_PLATFORM_TARGET &&
          f.targetId === "beta",
      ),
    ).toBe(true);
  });

  it("detects capability target drift when P5 is supplied", () => {
    const platforms = registerPlatform(
      validManifest({
        requires: [
          {
            targetKind: "capability",
            targetId: "example.core.ping",
            strength: "required",
            reason: "Needs ping",
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
          version: "1.0.0",
          stability: "stable",
          sideEffectClasses: ["read"],
          authClass: "authenticated",
        },
      }).ok,
    ).toBe(true);

    const dependencies = createInMemoryDependencyRegistry({
      platforms,
      capabilities,
    });
    expect(
      dependencies.register({
        dependency: {
          fromPlatformId: "example",
          targetKind: "capability",
          targetId: "example.core.ping",
          strength: "required",
          reason: "Needs ping",
        },
      }).ok,
    ).toBe(true);

    capabilities.clear();
    const beforeDeps = dependencies.size();
    const result = validatePlatformDependencies("example", {
      platforms,
      dependencies,
      capabilities,
    });
    expect(dependencies.size()).toBe(beforeDeps);
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) =>
          f.code === UmDependencyValidationCode.UNKNOWN_CAPABILITY_TARGET &&
          f.targetId === "example.core.ping",
      ),
    ).toBe(true);
  });

  it("uses P4 embedded capability fallback when P5 is omitted", () => {
    const platforms = registerPlatform(
      validManifest({
        requires: [
          {
            targetKind: "capability",
            targetId: "example.core.ping",
            strength: "required",
            reason: "Needs ping",
          },
        ],
      }),
    );
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    expect(
      dependencies.register({
        dependency: {
          fromPlatformId: "example",
          targetKind: "capability",
          targetId: "example.core.ping",
          strength: "required",
          reason: "Needs ping",
        },
      }).ok,
    ).toBe(true);

    const result = validatePlatformDependencies("example", {
      platforms,
      dependencies,
    });
    expect(result.ok).toBe(true);
  });

  it("treats peer_kernel as opaque completeness only (no P4 resolution)", () => {
    const platforms = registerPlatform();
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    expect(
      dependencies.register({ dependency: peerKernelEdge() }).ok,
    ).toBe(true);

    const result = validatePlatformDependencies("example", {
      platforms,
      dependencies,
    });
    expect(result.ok).toBe(true);
    expect(platforms.get("um.core")).toBeUndefined();
    expect(
      result.findings.some(
        (f) => f.code === UmDependencyValidationCode.UNKNOWN_PLATFORM_TARGET,
      ),
    ).toBe(false);
  });

  it("never evaluates minCompatibility", () => {
    const platforms = registerPlatform(
      validManifest({
        requires: [
          {
            targetKind: "peer_kernel",
            targetId: "um.core",
            strength: "required",
            reason: "Core contracts",
            minCompatibility: "not-a-real-range!!!@@@",
          },
        ],
      }),
    );
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    expect(
      dependencies.register({
        dependency: {
          ...peerKernelEdge(),
          minCompatibility: "not-a-real-range!!!@@@",
        },
      }).ok,
    ).toBe(true);

    const result = validatePlatformDependencies("example", {
      platforms,
      dependencies,
    });
    expect(result.ok).toBe(true);
  });

  it("does not independently re-report dependency cycles", () => {
    const platforms = createInMemoryPlatformRegistry();
    registerPlatform(
      validManifest({
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
        requires: [
          {
            targetKind: "platform",
            targetId: "beta",
            strength: "required",
            reason: "Needs beta",
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
            displayName: "Core",
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
        requires: [peerKernelEdge("beta")],
        sideEffectSummary: ["read"],
      }),
      platforms,
    );
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    expect(
      dependencies.register({
        dependency: {
          fromPlatformId: "alpha",
          targetKind: "platform",
          targetId: "beta",
          strength: "required",
          reason: "Needs beta",
        },
      }).ok,
    ).toBe(true);

    const result = validatePlatformDependencies("alpha", {
      platforms,
      dependencies,
    });
    expect(result.ok).toBe(true);
    expect(
      result.findings.some((f) => f.code.toLowerCase().includes("cycle")),
    ).toBe(false);
  });

  it("does not mutate platforms, dependencies, or capabilities", () => {
    const platforms = registerPlatform();
    const capabilities = createInMemoryCapabilityRegistry({ platforms });
    expect(
      capabilities.register({
        capability: {
          capabilityId: "example.core.ping",
          platformId: "example",
          moduleId: "example.core",
          displayName: "Ping",
          version: "1.0.0",
          stability: "stable",
          sideEffectClasses: ["read"],
          authClass: "authenticated",
        },
      }).ok,
    ).toBe(true);
    const dependencies = createInMemoryDependencyRegistry({
      platforms,
      capabilities,
    });
    expect(
      dependencies.register({ dependency: peerKernelEdge() }).ok,
    ).toBe(true);

    const before = {
      platforms: platforms.size(),
      dependencies: dependencies.size(),
      capabilities: capabilities.size(),
      platformList: platforms.list(),
      depList: dependencies.list(),
      capList: capabilities.list(),
    };

    validatePlatformDependencies("example", {
      platforms,
      dependencies,
      capabilities,
    });

    expect(platforms.size()).toBe(before.platforms);
    expect(dependencies.size()).toBe(before.dependencies);
    expect(capabilities.size()).toBe(before.capabilities);
    expect(platforms.list()).toEqual(before.platformList);
    expect(dependencies.list()).toEqual(before.depList);
    expect(capabilities.list()).toEqual(before.capList);
  });

  it("orders findings deterministically by code then targetId", () => {
    const platforms = registerPlatform(
      validManifest({
        requires: [
          {
            targetKind: "peer_kernel",
            targetId: "um.z",
            strength: "required",
            reason: "Z",
          },
          {
            targetKind: "peer_kernel",
            targetId: "um.a",
            strength: "required",
            reason: "A",
          },
        ],
      }),
    );
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    const result = validatePlatformDependencies("example", {
      platforms,
      dependencies,
    });
    const codes = result.findings.map((f) => `${f.code}:${f.targetId ?? ""}`);
    expect(codes).toEqual([...codes].sort((a, b) => a.localeCompare(b)));
  });

  it("createUmCoreValidator composes P2 validators and dependency review", () => {
    const platforms = registerPlatform();
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    expect(
      dependencies.register({ dependency: peerKernelEdge() }).ok,
    ).toBe(true);

    const validator = createUmCoreValidator({ platforms, dependencies });
    const manifest = validManifest();
    expect(validator.manifests.validate(manifest)).toEqual(
      validatePlatformManifest(manifest),
    );
    expect(validator.registration.validateAdmission(manifest).ok).toBe(true);
    expect(validator.validateDependencies("example")).toEqual(
      validatePlatformDependencies("example", { platforms, dependencies }),
    );
  });

  it("respects injected manifest and registration validators", () => {
    const platforms = createInMemoryPlatformRegistry();
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    const manifests: UmManifestValidator = {
      validate: () => ({
        ok: false,
        findings: [
          {
            code: "test.manifest",
            severity: "error",
            message: "injected",
          },
        ],
      }),
    };
    const registration: UmRegistrationValidator = {
      validateAdmission: () => ({
        ok: false,
        findings: [
          {
            code: "test.registration",
            severity: "error",
            message: "injected",
          },
        ],
      }),
    };

    const validator = createUmCoreValidator({
      platforms,
      dependencies,
      manifests,
      registration,
    });
    expect(validator.manifests).toBe(manifests);
    expect(validator.registration).toBe(registration);
    expect(validator.manifests.validate(validManifest()).findings[0]?.code).toBe(
      "test.manifest",
    );
    expect(
      validator.registration.validateAdmission(validManifest()).findings[0]
        ?.code,
    ).toBe("test.registration");
  });

  it("does not require UmCoreRegistry and does not implement UmDependencyValidator", () => {
    const platforms = registerPlatform();
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    const validator = createUmCoreValidator({ platforms, dependencies });
    expect(validator.validateDependencies("example").ok).toBe(false);

    const unimplemented: UmDependencyValidator | undefined = undefined;
    expect(unimplemented).toBeUndefined();
    expect(createManifestValidator).toBeTypeOf("function");
    expect(createRegistrationValidator).toBeTypeOf("function");
  });
});
