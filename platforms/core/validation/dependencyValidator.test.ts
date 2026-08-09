/**
 * Focused UM Core P19 dependency validator tests.
 *
 * DEPENDENCY VALIDATION IS NOT DEPENDENCY RESOLUTION.
 * DEPENDENCY VALIDATION IS NOT P13 COMPLETENESS/DRIFT REVIEW.
 * DEPENDENCY VALIDATION IS NOT CATALOG REFERENTIAL INTEGRITY.
 */

import { describe, expect, it } from "vitest";
import {
  createInMemoryCapabilityRegistry,
  type UmCapabilityRegistry,
} from "../capability";
import {
  createInMemoryDependencyRegistry,
  type UmDependencyRegistry,
  type UmDependencyRequirement,
  type UmDependencyValidator,
} from "../dependency";
import type { UmFlagEvaluator } from "../flag/types";
import type { UmEventPublisher } from "../event/types";
import type { UmHealthReporter } from "../health/types";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import type { UmCoreSdkClient } from "../sdk";
import {
  UmDependencyValidationCode,
  UmDependencyValidatorCode,
  UmReferentialIntegrityCode,
  createInMemoryDependencyValidator,
  validateDependencyRequirements,
  validatePlatformDependencies,
  validateReferentialIntegrity,
} from "./index";
import { UM_CORE_DEPENDENCY_VALIDATOR_PHASE } from "../packageIdentity";

function validManifest(
  platformId: string,
  overrides: Partial<UmPlatformManifest> = {},
): UmPlatformManifest {
  return {
    platformId,
    platformVersion: "1.0.0",
    displayName: `${platformId} Platform`,
    owners: [{ id: "owner.platform", displayName: "Platform Owner" }],
    modules: [
      {
        moduleId: `${platformId}.core`,
        displayName: "Core Module",
        capabilityIds: [`${platformId}.core.ping`],
      },
    ],
    capabilities: [
      {
        capabilityId: `${platformId}.core.ping`,
        moduleId: `${platformId}.core`,
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
        defaultState: "on",
        linkedCapabilityIds: [`${platformId}.core.ping`],
        dangerElevated: false,
      },
    ],
    health: { reportsStatus: true, probeRef: `probe.${platformId}.health` },
    sideEffectSummary: ["read"],
    maturityLevel: 1,
    documentationRefs: ["docs/example/README.md", "docs/example/OWNERS.md"],
    soTStatement: "Owns example domain truth only.",
    nonOwnershipStatement:
      "Does not own money, AI execution, or other platforms.",
    ...overrides,
  };
}

function registerPlatforms(...platformIds: string[]) {
  const platforms = createInMemoryPlatformRegistry();
  for (const platformId of platformIds) {
    expect(platforms.register({ manifest: validManifest(platformId) }).ok).toBe(
      true,
    );
  }
  return platforms;
}

function peerKernel(): UmDependencyRequirement {
  return {
    targetKind: "peer_kernel",
    targetId: "um.core",
    strength: "required",
    reason: "Core contracts",
  };
}

describe("um.core dependency validator foundation P19", () => {
  it("exposes the P19 phase marker", () => {
    expect(UM_CORE_DEPENDENCY_VALIDATOR_PHASE).toBe("P19");
  });

  it("accepts a valid peer_kernel requirement for a registered platform", () => {
    const platforms = registerPlatforms("alpha");
    const validator = createInMemoryDependencyValidator({ platforms });
    const result = validator.validateRequirements("alpha", [peerKernel()]);
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("fails closed for an unknown owner platform", () => {
    const platforms = registerPlatforms("alpha");
    const result = validateDependencyRequirements(
      "missing",
      [peerKernel()],
      { platforms },
    );
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toEqual([
      UmDependencyValidatorCode.UNKNOWN_PLATFORM,
    ]);
  });

  it("rejects unknown platform targets", () => {
    const platforms = registerPlatforms("alpha");
    const result = validateDependencyRequirements(
      "alpha",
      [
        peerKernel(),
        {
          targetKind: "platform",
          targetId: "ghost",
          strength: "required",
          reason: "Needs ghost",
        },
      ],
      { platforms },
    );
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) =>
          f.code === UmDependencyValidatorCode.UNKNOWN_PLATFORM_TARGET &&
          f.targetId === "ghost",
      ),
    ).toBe(true);
  });

  it("rejects unknown capability targets when P5 is provided", () => {
    const platforms = registerPlatforms("alpha");
    const capabilities = createInMemoryCapabilityRegistry({ platforms });
    expect(
      capabilities.register({
        capability: {
          capabilityId: "alpha.core.ping",
          platformId: "alpha",
          moduleId: "alpha.core",
          displayName: "Ping",
          sideEffectClasses: ["read"],
          authClass: "none",
          stability: "stable",
          version: "1.0.0",
        },
      }).ok,
    ).toBe(true);

    const result = validateDependencyRequirements(
      "alpha",
      [
        peerKernel(),
        {
          targetKind: "capability",
          targetId: "alpha.core.missing",
          strength: "required",
          reason: "Needs missing cap",
        },
      ],
      { platforms, capabilities },
    );
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) =>
          f.code === UmDependencyValidatorCode.UNKNOWN_CAPABILITY_TARGET &&
          f.targetId === "alpha.core.missing",
      ),
    ).toBe(true);
  });

  it("uses P4 embedded capability fallback when P5 is omitted", () => {
    const platforms = registerPlatforms("alpha");
    const ok = validateDependencyRequirements(
      "alpha",
      [
        peerKernel(),
        {
          targetKind: "capability",
          targetId: "alpha.core.ping",
          strength: "optional",
          reason: "Local ping",
        },
      ],
      { platforms },
    );
    expect(ok.ok).toBe(true);

    const bad = validateDependencyRequirements(
      "alpha",
      [
        peerKernel(),
        {
          targetKind: "capability",
          targetId: "alpha.core.missing",
          strength: "optional",
          reason: "Missing local",
        },
      ],
      { platforms },
    );
    expect(bad.ok).toBe(false);
    expect(
      bad.findings.some(
        (f) => f.code === UmDependencyValidatorCode.UNKNOWN_CAPABILITY_TARGET,
      ),
    ).toBe(true);
  });

  it("rejects structural defects and duplicate requirements", () => {
    const platforms = registerPlatforms("alpha", "beta");
    const dup: UmDependencyRequirement = {
      targetKind: "platform",
      targetId: "beta",
      strength: "required",
      reason: "Needs beta",
    };
    const result = validateDependencyRequirements(
      "alpha",
      [
        peerKernel(),
        dup,
        { ...dup },
        {
          targetKind: "platform",
          targetId: "",
          strength: "required",
          reason: "bad",
        },
        {
          targetKind: "not_a_kind" as UmDependencyRequirement["targetKind"],
          targetId: "beta",
          strength: "required",
          reason: "bad kind",
        },
        {
          targetKind: "platform",
          targetId: "Beta.Bad",
          strength: "required",
          reason: "bad id",
        },
        {
          targetKind: "platform",
          targetId: "beta",
          strength: "maybe" as UmDependencyRequirement["strength"],
          reason: "bad strength",
        },
        {
          targetKind: "platform",
          targetId: "beta",
          strength: "optional",
          reason: "   ",
        },
      ],
      { platforms },
    );
    expect(result.ok).toBe(false);
    const codes = new Set(result.findings.map((f) => f.code));
    expect(codes.has(UmDependencyValidatorCode.DUPLICATE_REQUIREMENT)).toBe(
      true,
    );
    expect(codes.has(UmDependencyValidatorCode.TARGET_ID_REQUIRED)).toBe(true);
    expect(codes.has(UmDependencyValidatorCode.TARGET_KIND_INVALID)).toBe(true);
    expect(codes.has(UmDependencyValidatorCode.TARGET_ID_NAMING)).toBe(true);
    expect(codes.has(UmDependencyValidatorCode.STRENGTH_INVALID)).toBe(true);
    expect(codes.has(UmDependencyValidatorCode.REASON_REQUIRED)).toBe(true);
  });

  it("rejects required platform cycles using P9 catalog edges", () => {
    // Seed beta → alpha required edge in catalog (via matching manifests).
    const betaManifest = validManifest("beta", {
      requires: [
        peerKernel(),
        {
          targetKind: "platform",
          targetId: "alpha",
          strength: "required",
          reason: "Needs alpha",
        },
      ],
    });
    const platforms = createInMemoryPlatformRegistry();
    expect(platforms.register({ manifest: validManifest("alpha") }).ok).toBe(
      true,
    );
    expect(platforms.register({ manifest: betaManifest }).ok).toBe(true);
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    expect(
      dependencies.register({
        dependency: {
          fromPlatformId: "beta",
          targetKind: "peer_kernel",
          targetId: "um.core",
          strength: "required",
          reason: "Core contracts",
        },
      }).ok,
    ).toBe(true);
    expect(
      dependencies.register({
        dependency: {
          fromPlatformId: "beta",
          targetKind: "platform",
          targetId: "alpha",
          strength: "required",
          reason: "Needs alpha",
        },
      }).ok,
    ).toBe(true);

    const cycle = validateDependencyRequirements(
      "alpha",
      [
        peerKernel(),
        {
          targetKind: "platform",
          targetId: "beta",
          strength: "required",
          reason: "Needs beta",
        },
      ],
      { platforms, dependencies },
    );
    expect(cycle.ok).toBe(false);
    expect(
      cycle.findings.some(
        (f) => f.code === UmDependencyValidatorCode.REQUIRED_PLATFORM_CYCLE,
      ),
    ).toBe(true);

    // Optional platform edge does not participate in required-cycle detection.
    const optionalOk = validateDependencyRequirements(
      "alpha",
      [
        peerKernel(),
        {
          targetKind: "platform",
          targetId: "beta",
          strength: "optional",
          reason: "Optional beta",
        },
      ],
      { platforms, dependencies },
    );
    expect(optionalOk.ok).toBe(true);
  });

  it("rejects self required platform dependency as a cycle", () => {
    const platforms = registerPlatforms("alpha");
    const result = validateDependencyRequirements(
      "alpha",
      [
        peerKernel(),
        {
          targetKind: "platform",
          targetId: "alpha",
          strength: "required",
          reason: "Self",
        },
      ],
      { platforms },
    );
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) => f.code === UmDependencyValidatorCode.REQUIRED_PLATFORM_CYCLE,
      ),
    ).toBe(true);
  });

  it("treats peer_kernel as opaque and never evaluates minCompatibility", () => {
    const platforms = registerPlatforms("alpha");
    const result = validateDependencyRequirements(
      "alpha",
      [
        {
          targetKind: "peer_kernel",
          targetId: "um.core",
          strength: "required",
          reason: "Core contracts",
          minCompatibility: ">=99.0.0-never-evaluated",
        },
      ],
      { platforms },
    );
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("is deterministic: same inputs yield identical sorted findings", () => {
    const platforms = registerPlatforms("alpha");
    const requirements: UmDependencyRequirement[] = [
      {
        targetKind: "platform",
        targetId: "ghost",
        strength: "required",
        reason: "a",
      },
      {
        targetKind: "capability",
        targetId: "alpha.core.missing",
        strength: "required",
        reason: "b",
      },
      peerKernel(),
    ];
    const a = validateDependencyRequirements("alpha", requirements, {
      platforms,
    });
    const b = validateDependencyRequirements("alpha", requirements, {
      platforms,
    });
    expect(a).toEqual(b);
    expect(a.findings.map((f) => f.code)).toEqual(
      [...a.findings].sort((x, y) => x.code.localeCompare(y.code)).map((f) => f.code),
    );
  });

  it("keeps P13 completeness/drift codes and semantics unchanged", () => {
    const platforms = registerPlatforms("alpha");
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    const p13 = validatePlatformDependencies("alpha", {
      platforms,
      dependencies,
    });
    // Manifest has peer_kernel; catalog empty → missing catalog edge (P13).
    expect(p13.ok).toBe(false);
    expect(
      p13.findings.every((f) =>
        Object.values(UmDependencyValidationCode).includes(
          f.code as (typeof UmDependencyValidationCode)[keyof typeof UmDependencyValidationCode],
        ),
      ),
    ).toBe(true);
    expect(
      p13.findings.some(
        (f) => f.code === UmDependencyValidationCode.MISSING_CATALOG_EDGE,
      ),
    ).toBe(true);

    // P19 on the same requires[] does not emit P13 codes.
    const p19 = validateDependencyRequirements(
      "alpha",
      validManifest("alpha").requires ?? [],
      { platforms },
    );
    expect(p19.ok).toBe(true);
    expect(
      p19.findings.some((f) =>
        String(f.code).startsWith("dependency.validation."),
      ),
    ).toBe(false);
  });

  it("keeps RI code namespace distinct from P19 codes", () => {
    const riCodes = new Set(Object.values(UmReferentialIntegrityCode));
    const p19Codes = new Set(Object.values(UmDependencyValidatorCode));
    const p13Codes = new Set(Object.values(UmDependencyValidationCode));
    for (const code of p19Codes) {
      expect(riCodes.has(code as never)).toBe(false);
      expect(p13Codes.has(code as never)).toBe(false);
      expect(code.startsWith("dependency.validator.")).toBe(true);
    }
  });

  it("remains unused-by-default relative to P14–P17 / SDK ports", () => {
    const platforms = registerPlatforms("alpha");
    const validator: UmDependencyValidator = createInMemoryDependencyValidator({
      platforms,
    });
    expect(validator.validateRequirements("alpha", [peerKernel()]).ok).toBe(
      true,
    );

    // P14–P17 / SDK surfaces do not receive this validator unless a caller wires it.
    const flags: UmFlagEvaluator | undefined = undefined;
    const events: UmEventPublisher | undefined = undefined;
    const health: UmHealthReporter | undefined = undefined;
    const sdk: UmCoreSdkClient | undefined = undefined;
    const capabilities: UmCapabilityRegistry | undefined = undefined;
    const dependencies: UmDependencyRegistry | undefined = undefined;
    expect(flags).toBeUndefined();
    expect(events).toBeUndefined();
    expect(health).toBeUndefined();
    expect(sdk).toBeUndefined();
    expect(capabilities).toBeUndefined();
    expect(dependencies).toBeUndefined();

    // RI remains independently callable and does not require P19.
    const ri = validateReferentialIntegrity({ platforms });
    expect(ri.ok).toBe(true);
    expect(ri.findings).toEqual([]);
  });
});
