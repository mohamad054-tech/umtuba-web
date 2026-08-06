/**
 * Focused UM Core P2 manifest validation tests.
 * Pure validation only — no registry/runtime.
 */

import { describe, expect, it } from "vitest";
import type { UmPlatformManifest } from "../manifest/types";
import {
  UmManifestValidationCode,
  createManifestValidator,
  createRegistrationValidator,
  validateManifestAdmission,
  validatePlatformManifest,
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
    health: { reportsStatus: true },
    sideEffectSummary: ["read"],
    maturityLevel: 1,
    documentationRefs: ["docs/example/README.md"],
    soTStatement: "Owns example domain truth only.",
    nonOwnershipStatement: "Does not own money, AI execution, or other platforms.",
    ...overrides,
  };
}

describe("um.core P2 manifest validation", () => {
  it("accepts a complete valid manifest", () => {
    const result = validatePlatformManifest(validManifest());
    expect(result.ok).toBe(true);
    expect(result.findings.filter((f) => f.severity === "error")).toEqual([]);
  });

  it("emits deterministic ordered findings for identity failures", () => {
    const result = validatePlatformManifest(
      validManifest({
        platformId: "Bad_ID",
        platformVersion: "",
        displayName: "  ",
      }),
    );
    expect(result.ok).toBe(false);
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain(UmManifestValidationCode.PLATFORM_ID_NAMING);
    expect(codes).toContain(UmManifestValidationCode.PLATFORM_VERSION_REQUIRED);
    expect(codes).toContain(UmManifestValidationCode.PLATFORM_DISPLAY_NAME_REQUIRED);
    // Deterministic: errors sorted by code then path among same severity.
    const errors = result.findings.filter((f) => f.severity === "error");
    const sorted = [...errors].sort((a, b) => {
      const c = a.code.localeCompare(b.code);
      return c !== 0 ? c : (a.path ?? "").localeCompare(b.path ?? "");
    });
    expect(errors).toEqual(sorted);
  });

  it("rejects duplicate capability and module ids", () => {
    const result = validatePlatformManifest(
      validManifest({
        modules: [
          {
            moduleId: "example.core",
            displayName: "A",
            capabilityIds: ["example.core.ping"],
          },
          {
            moduleId: "example.core",
            displayName: "B",
            capabilityIds: [],
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
            capabilityId: "example.core.ping",
            moduleId: "example.core",
            displayName: "Ping Dup",
            sideEffectClasses: ["read"],
            stability: "stable",
            version: "1.0.1",
          },
        ],
      }),
    );
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain(UmManifestValidationCode.MODULE_ID_DUPLICATE);
    expect(codes).toContain(UmManifestValidationCode.CAPABILITY_ID_DUPLICATE);
  });

  it("rejects capability module mismatch and unscoped capability ids", () => {
    const result = validatePlatformManifest(
      validManifest({
        capabilities: [
          {
            capabilityId: "other.platform.action",
            moduleId: "missing.module",
            displayName: "Bad",
            sideEffectClasses: ["read"],
            stability: "stable",
            version: "1.0.0",
          },
        ],
        modules: [
          {
            moduleId: "example.core",
            displayName: "Core",
            capabilityIds: ["other.platform.action"],
          },
        ],
        sideEffectSummary: ["read"],
        flags: [],
      }),
    );
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain(UmManifestValidationCode.CAPABILITY_PLATFORM_SCOPE);
    expect(codes).toContain(UmManifestValidationCode.CAPABILITY_MODULE_UNKNOWN);
    expect(codes).toContain(UmManifestValidationCode.MODULE_CAPABILITY_REF_MISMATCH);
  });

  it("rejects missing ownership and documentation completeness", () => {
    const result = validatePlatformManifest(
      validManifest({
        owners: [],
        soTStatement: "",
        nonOwnershipStatement: " ",
        documentationRefs: [],
      }),
    );
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain(UmManifestValidationCode.OWNERS_REQUIRED);
    expect(codes).toContain(UmManifestValidationCode.SOT_STATEMENT_REQUIRED);
    expect(codes).toContain(
      UmManifestValidationCode.NON_OWNERSHIP_STATEMENT_REQUIRED,
    );
    expect(codes).toContain(UmManifestValidationCode.DOCUMENTATION_REFS_REQUIRED);
  });

  it("rejects self required platform dependency cycles", () => {
    const result = validatePlatformManifest(
      validManifest({
        requires: [
          {
            targetKind: "platform",
            targetId: "example",
            strength: "required",
            reason: "self",
          },
        ],
      }),
    );
    expect(
      result.findings.some(
        (f) => f.code === UmManifestValidationCode.DEPENDENCY_SELF_PLATFORM_CYCLE,
      ),
    ).toBe(true);
  });

  it("rejects elevated capabilities without flag binding", () => {
    const result = validatePlatformManifest(
      validManifest({
        capabilities: [
          {
            capabilityId: "example.core.charge",
            moduleId: "example.core",
            displayName: "Charge",
            sideEffectClasses: ["money"],
            stability: "experimental",
            version: "1.0.0",
          },
        ],
        modules: [
          {
            moduleId: "example.core",
            displayName: "Core",
            capabilityIds: ["example.core.charge"],
          },
        ],
        sideEffectSummary: ["money"],
        flags: [],
      }),
    );
    expect(
      result.findings.some(
        (f) =>
          f.code === UmManifestValidationCode.CAPABILITY_ELEVATED_FLAG_REQUIRED,
      ),
    ).toBe(true);
  });

  it("rejects sideEffectSummary incompleteness and warns on extras", () => {
    const result = validatePlatformManifest(
      validManifest({
        sideEffectSummary: ["write"],
      }),
    );
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain(UmManifestValidationCode.SIDE_EFFECT_SUMMARY_INCOMPLETE);
    expect(codes).toContain(UmManifestValidationCode.SIDE_EFFECT_SUMMARY_EXTRA);
    expect(result.ok).toBe(false);
  });

  it("rejects unknown in-platform capability dependencies", () => {
    const result = validatePlatformManifest(
      validManifest({
        requires: [
          {
            targetKind: "capability",
            targetId: "example.missing.capability",
            strength: "optional",
            reason: "local",
          },
        ],
      }),
    );
    expect(
      result.findings.some(
        (f) => f.code === UmManifestValidationCode.DEPENDENCY_CAPABILITY_UNKNOWN,
      ),
    ).toBe(true);
  });

  it("createManifestValidator matches pure function", () => {
    const manifest = validManifest();
    const viaFactory = createManifestValidator().validate(manifest);
    const viaPure = validatePlatformManifest(manifest);
    expect(viaFactory).toEqual(viaPure);
  });
});

describe("um.core P2 registration admission validation", () => {
  it("admits a valid registered-level manifest", () => {
    const result = validateManifestAdmission(validManifest({ maturityLevel: 1 }));
    expect(result.ok).toBe(true);
  });

  it("denies prototype maturity even when otherwise valid", () => {
    const result = validateManifestAdmission(validManifest({ maturityLevel: 0 }));
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) => f.code === UmManifestValidationCode.ADMISSION_MATURITY_TOO_LOW,
      ),
    ).toBe(true);
  });

  it("denies admission when manifest is invalid", () => {
    const result = createRegistrationValidator().validateAdmission(
      validManifest({ platformId: "" }),
    );
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) => f.code === UmManifestValidationCode.ADMISSION_MANIFEST_INVALID,
      ),
    ).toBe(true);
  });
});
