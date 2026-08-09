/**
 * Focused UM Core P24 capability compatibility matrix tests.
 *
 * CAPABILITY COMPATIBILITY IS NOT RUNTIME HEALTH.
 * CAPABILITY COMPATIBILITY IS NOT LIFECYCLE READINESS.
 * CAPABILITY COMPATIBILITY IS NOT SERVICE DISCOVERY.
 */

import { describe, expect, it } from "vitest";
import { createInMemoryDependencyRegistry } from "../dependency";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  UM_CORE_PLATFORM_CAPABILITY_COMPATIBILITY_PHASE,
  UmCapabilityCompatibilityCode,
  createCapabilityCompatibilityEvaluator,
  createInMemoryCapabilityRegistry,
} from "./index";

function baseManifest(
  platformId: string,
  capabilityId: string,
  overrides: Partial<UmPlatformManifest> = {},
): UmPlatformManifest {
  const moduleId = `${platformId}.core`;
  return {
    platformId,
    platformVersion: "1.0.0",
    displayName: `${platformId} Platform`,
    owners: [{ id: `owner.${platformId}`, displayName: "Platform Owner" }],
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
        eventType: `${platformId}.core.pinged`,
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

function harness() {
  const platforms = createInMemoryPlatformRegistry();
  const capabilities = createInMemoryCapabilityRegistry({ platforms });
  const dependencies = createInMemoryDependencyRegistry({
    platforms,
    capabilities,
  });
  const compat = createCapabilityCompatibilityEvaluator({
    platforms,
    capabilities,
    dependencies,
  });
  return { platforms, capabilities, dependencies, compat };
}

describe("UM Core capability compatibility matrix foundation P24", () => {
  it("exports local phase constant P24", () => {
    expect(UM_CORE_PLATFORM_CAPABILITY_COMPATIBILITY_PHASE).toBe("P24");
  });

  it("C1: platform declares capability X", () => {
    const { platforms, compat } = harness();
    expect(
      platforms.register({
        manifest: baseManifest("example", "example.core.ping"),
      }).ok,
    ).toBe(true);

    expect(
      compat.platformDeclaresCapability("example", "example.core.ping"),
    ).toBe(true);
    expect(
      compat.platformDeclaresCapability("example", "example.core.other"),
    ).toBe(false);
  });

  it("C2: required capability exists via P5", () => {
    const { platforms, capabilities, compat } = harness();
    expect(
      platforms.register({
        manifest: baseManifest("example", "example.core.ping"),
      }).ok,
    ).toBe(true);
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

    expect(compat.requiredCapabilityExists("example.core.ping")).toBe(true);
    expect(compat.requiredCapabilityExists("example.core.missing")).toBe(
      false,
    );
  });

  it("C3: provider-side required capabilities satisfied", () => {
    const { platforms, compat } = harness();
    expect(
      platforms.register({
        manifest: baseManifest("example", "example.core.ping", {
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
              stability: "stable",
              version: "1.0.0",
            },
          ],
          sideEffectSummary: ["read", "write"],
          flags: [
            {
              flagId: "example.core.enabled",
              defaultState: "off",
              linkedCapabilityIds: ["example.core.ping"],
              dangerElevated: false,
            },
          ],
        }),
      }).ok,
    ).toBe(true);

    const result = compat.evaluatePlatformProvides("example", [
      "example.core.write",
      "example.core.ping",
    ]);
    expect(result.status).toBe("COMPATIBLE");
    expect(result.missingRequiredCapabilityIds).toEqual([]);
    expect(result.declaredCapabilityIds).toEqual([
      "example.core.ping",
      "example.core.write",
    ]);
  });

  it("C4: missing required capabilities (provider-side)", () => {
    const { platforms, compat } = harness();
    expect(
      platforms.register({
        manifest: baseManifest("example", "example.core.ping"),
      }).ok,
    ).toBe(true);

    const result = compat.evaluatePlatformProvides("example", [
      "example.core.ping",
      "example.core.admin",
    ]);
    expect(result.status).toBe("INCOMPATIBLE");
    expect(result.missingRequiredCapabilityIds).toEqual([
      "example.core.admin",
    ]);
    expect(result.findings.map((f) => f.code)).toContain(
      UmCapabilityCompatibilityCode.REQUIRED_CAPABILITY_UNDECLARED,
    );
  });

  it("C5: consumer-side required capability deps satisfied via P5", () => {
    const { platforms, capabilities, dependencies, compat } = harness();
    expect(
      platforms.register({
        manifest: baseManifest("provider", "provider.core.ping"),
      }).ok,
    ).toBe(true);
    expect(
      platforms.register({
        manifest: baseManifest("consumer", "consumer.core.use", {
          requires: [
            {
              targetKind: "peer_kernel",
              targetId: "um.core",
              strength: "required",
              reason: "Core contracts",
            },
            {
              targetKind: "capability",
              targetId: "provider.core.ping",
              strength: "required",
              reason: "Needs provider ping",
            },
          ],
        }),
      }).ok,
    ).toBe(true);

    expect(
      capabilities.register({
        capability: {
          capabilityId: "provider.core.ping",
          platformId: "provider",
          moduleId: "provider.core",
          displayName: "Ping",
          sideEffectClasses: ["read"],
          authClass: "authenticated",
          stability: "stable",
          version: "1.0.0",
        },
      }).ok,
    ).toBe(true);
    expect(
      capabilities.register({
        capability: {
          capabilityId: "consumer.core.use",
          platformId: "consumer",
          moduleId: "consumer.core",
          displayName: "Use",
          sideEffectClasses: ["read"],
          authClass: "authenticated",
          stability: "stable",
          version: "1.0.0",
        },
      }).ok,
    ).toBe(true);

    expect(
      dependencies.register({
        dependency: {
          fromPlatformId: "consumer",
          targetKind: "capability",
          targetId: "provider.core.ping",
          strength: "required",
          reason: "Needs provider ping",
        },
      }).ok,
    ).toBe(true);

    const result = compat.evaluatePlatformRequirements("consumer");
    expect(result.status).toBe("COMPATIBLE");
    expect(result.requiredCapabilityIds).toEqual(["provider.core.ping"]);
    expect(result.missingRequiredCapabilityIds).toEqual([]);
  });

  it("C6: consumer-side missing required capability → INCOMPATIBLE", () => {
    const { platforms, compat } = harness();
    expect(
      platforms.register({
        manifest: baseManifest("consumer", "consumer.core.use", {
          requires: [
            {
              targetKind: "peer_kernel",
              targetId: "um.core",
              strength: "required",
              reason: "Core contracts",
            },
            {
              targetKind: "capability",
              targetId: "provider.core.ping",
              strength: "required",
              reason: "Needs provider ping",
            },
          ],
        }),
      }).ok,
    ).toBe(true);

    const result = compat.evaluatePlatformRequirements("consumer");
    expect(result.status).toBe("INCOMPATIBLE");
    expect(result.missingRequiredCapabilityIds).toEqual([
      "provider.core.ping",
    ]);
    expect(result.findings.map((f) => f.code)).toContain(
      UmCapabilityCompatibilityCode.REQUIRED_CAPABILITY_MISSING,
    );
  });

  it("C7: unknown platform fail-closed", () => {
    const { compat } = harness();
    const provides = compat.evaluatePlatformProvides("missing.platform", [
      "example.core.ping",
    ]);
    expect(provides.status).toBe("INCOMPATIBLE");
    expect(provides.registered).toBe(false);
    expect(provides.findings.map((f) => f.code)).toContain(
      UmCapabilityCompatibilityCode.UNKNOWN_PLATFORM,
    );

    const requirements = compat.evaluatePlatformRequirements("missing.platform");
    expect(requirements.status).toBe("INCOMPATIBLE");
    expect(requirements.findings.map((f) => f.code)).toContain(
      UmCapabilityCompatibilityCode.UNKNOWN_PLATFORM,
    );

    expect(
      compat.platformDeclaresCapability("missing.platform", "example.core.ping"),
    ).toBe(false);
  });

  it("C8: deterministic matrix cells + requirement rows", () => {
    const { platforms, capabilities, compat } = harness();
    expect(
      platforms.register({
        manifest: baseManifest("alpha", "alpha.core.ping"),
      }).ok,
    ).toBe(true);
    expect(
      platforms.register({
        manifest: baseManifest("beta", "beta.core.ping", {
          requires: [
            {
              targetKind: "peer_kernel",
              targetId: "um.core",
              strength: "required",
              reason: "Core contracts",
            },
            {
              targetKind: "capability",
              targetId: "alpha.core.ping",
              strength: "required",
              reason: "Needs alpha ping",
              minCompatibility: ">=1.0.0-never-evaluated",
            },
          ],
        }),
      }).ok,
    ).toBe(true);

    expect(
      capabilities.register({
        capability: {
          capabilityId: "alpha.core.ping",
          platformId: "alpha",
          moduleId: "alpha.core",
          displayName: "Ping",
          sideEffectClasses: ["read"],
          authClass: "authenticated",
          stability: "stable",
          version: "1.0.0",
        },
      }).ok,
    ).toBe(true);
    expect(
      capabilities.register({
        capability: {
          capabilityId: "beta.core.ping",
          platformId: "beta",
          moduleId: "beta.core",
          displayName: "Ping",
          sideEffectClasses: ["read"],
          authClass: "authenticated",
          stability: "stable",
          version: "1.0.0",
        },
      }).ok,
    ).toBe(true);

    const matrixA = compat.evaluateMatrix();
    const matrixB = compat.evaluateMatrix();
    expect(matrixA).toEqual(matrixB);
    expect(matrixA.platformIds).toEqual(["alpha", "beta"]);
    expect(matrixA.capabilityIds).toEqual([
      "alpha.core.ping",
      "beta.core.ping",
    ]);
    expect(
      matrixA.cells.find(
        (c) =>
          c.platformId === "alpha" && c.capabilityId === "alpha.core.ping",
      )?.declared,
    ).toBe(true);
    expect(
      matrixA.cells.find(
        (c) => c.platformId === "alpha" && c.capabilityId === "beta.core.ping",
      )?.declared,
    ).toBe(false);

    const betaRow = matrixA.rows.find((r) => r.platformId === "beta");
    expect(betaRow?.status).toBe("COMPATIBLE");
    expect(betaRow?.requiredCapabilityIds).toEqual(["alpha.core.ping"]);
  });

  it("C9: BOUNDARY — optional capability deps and minCompatibility are ignored", () => {
    const { platforms, compat } = harness();
    expect(
      platforms.register({
        manifest: baseManifest("consumer", "consumer.core.use", {
          requires: [
            {
              targetKind: "peer_kernel",
              targetId: "um.core",
              strength: "required",
              reason: "Core contracts",
            },
            {
              targetKind: "capability",
              targetId: "provider.core.optional",
              strength: "optional",
              reason: "Nice to have",
              minCompatibility: ">=99.0.0",
            },
          ],
        }),
      }).ok,
    ).toBe(true);

    const result = compat.evaluatePlatformRequirements("consumer");
    expect(result.status).toBe("COMPATIBLE");
    expect(result.requiredCapabilityIds).toEqual([]);
    expect(result.missingRequiredCapabilityIds).toEqual([]);
  });

  it("C10: invalid ids fail closed without throw", () => {
    const { compat } = harness();
    expect(compat.platformDeclaresCapability("", "x")).toBe(false);
    expect(compat.requiredCapabilityExists("Not A Machine Id")).toBe(false);

    const bad = compat.evaluatePlatformProvides("Bad Id!", ["also bad!"]);
    expect(bad.status).toBe("INCOMPATIBLE");
    expect(bad.findings.map((f) => f.code)).toContain(
      UmCapabilityCompatibilityCode.PLATFORM_ID_NAMING,
    );
  });
});
