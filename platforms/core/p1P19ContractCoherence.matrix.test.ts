/**
 * UM Core P1–P19 (+ adjacent P23/P24) contract coherence matrix (TEST-ONLY).
 *
 * TASK: UM_CORE_PLATFORM_P1_P19_CONTRACT_COHERENCE_MATRIX_V1
 * AGENT: PC2-A3 · SOURCE_DEVICE=PC2
 * ALPHA TIP: origin/alpha-0.2 @ 32a76207b149e68a27dc1e932d2c16aa47c9586e
 *
 * Verifies negative boundaries among foundations actually present on alpha.
 * Does not invent production semantics. Does not mutate production code.
 *
 * CRITICAL NEGATIVE ASSERTIONS:
 * - P13 ≠ P19
 * - P19 ≠ Referential Integrity
 * - Health ≠ Lifecycle Readiness
 * - Capability Compatibility ≠ Health
 * - Capability Compatibility ≠ Lifecycle Readiness
 */

import { describe, expect, it } from "vitest";
import {
  UmCapabilityCompatibilityCode,
  createCapabilityCompatibilityEvaluator,
  createInMemoryCapabilityRegistry,
  UM_CORE_PLATFORM_CAPABILITY_COMPATIBILITY_PHASE,
} from "./capability";
import { createInMemoryDependencyRegistry } from "./dependency";
import {
  UmHealthRegistryCode,
  UmHealthReportCode,
  createInMemoryHealthRegistry,
  createInMemoryHealthReporter,
  type UmHealthSnapshot,
} from "./health";
import type { UmPlatformManifest } from "./manifest/types";
import {
  UM_CORE_DEPENDENCY_VALIDATOR_PHASE,
  UM_CORE_FOUNDATION_PHASE,
  UM_CORE_HEALTH_DECLARATION_CATALOG_PHASE,
  UM_CORE_HEALTH_REPORTER_PHASE,
  UM_CORE_PACKAGE_ID,
  UM_CORE_VALIDATOR_COMPOSITION_PHASE,
} from "./packageIdentity";
import {
  UM_CORE_PLATFORM_LIFECYCLE_READINESS_PHASE,
  UmPlatformReadinessCode,
  createPlatformReadinessEvaluator,
} from "./readiness";
import { createInMemoryPlatformRegistry } from "./registry";
import {
  UmDependencyValidationCode,
  UmDependencyValidatorCode,
  UmReferentialIntegrityCode,
  createInMemoryDependencyValidator,
  createUmCoreValidator,
  validateDependencyRequirements,
  validatePlatformDependencies,
  validateReferentialIntegrity,
} from "./validation";

function platformManifest(
  platformId: string,
  overrides: Partial<UmPlatformManifest> = {},
): UmPlatformManifest {
  const moduleId = `${platformId}.core`;
  const capabilityId = `${platformId}.core.ping`;
  const flagId = `${platformId}.core.enabled`;
  return {
    platformId,
    platformVersion: "1.0.0",
    displayName: `${platformId} Platform`,
    owners: [{ id: `owner.${platformId}`, displayName: "Owner" }],
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
        flagId,
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
        flagId,
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

function snapshotFingerprint(stores: {
  platforms: { size(): number; list(): readonly unknown[] };
  dependencies: { size(): number; list(): readonly unknown[] };
  capabilities?: { size(): number; list(): readonly unknown[] };
  healthDeclarations?: { size(): number; list(): readonly unknown[] };
  healthObservations?: { list(): readonly unknown[] };
}) {
  return {
    platforms: stores.platforms.size(),
    platformList: stores.platforms.list(),
    dependencies: stores.dependencies.size(),
    depList: stores.dependencies.list(),
    capabilities: stores.capabilities?.size(),
    capList: stores.capabilities?.list(),
    healthDeclarations: stores.healthDeclarations?.size(),
    healthDeclList: stores.healthDeclarations?.list(),
    healthObsList: stores.healthObservations?.list(),
  };
}

function namespaceOf(code: string): string {
  const parts = code.split(".");
  return parts.slice(0, 2).join(".");
}

describe("UM Core P1–P19 contract coherence matrix V1", () => {
  describe("alpha integration inventory (phase markers)", () => {
    it("keeps package identity + P13/P19 phase markers distinct and present", () => {
      expect(UM_CORE_PACKAGE_ID).toBe("um.core");
      expect(UM_CORE_FOUNDATION_PHASE).toBe("P1");
      expect(UM_CORE_VALIDATOR_COMPOSITION_PHASE).toBe("P13");
      expect(UM_CORE_DEPENDENCY_VALIDATOR_PHASE).toBe("P19");
      expect(UM_CORE_HEALTH_DECLARATION_CATALOG_PHASE).toBe("P10");
      expect(UM_CORE_HEALTH_REPORTER_PHASE).toBe("P17");
      // Local barrels (on alpha tip; not wired into packageIdentity):
      expect(UM_CORE_PLATFORM_LIFECYCLE_READINESS_PHASE).toBe("P23");
      expect(UM_CORE_PLATFORM_CAPABILITY_COMPATIBILITY_PHASE).toBe("P24");

      // CRITICAL: P13 ≠ P19
      expect(UM_CORE_VALIDATOR_COMPOSITION_PHASE).not.toBe(
        UM_CORE_DEPENDENCY_VALIDATOR_PHASE,
      );
      expect(UM_CORE_VALIDATOR_COMPOSITION_PHASE).not.toBe("P19");
      expect(UM_CORE_DEPENDENCY_VALIDATOR_PHASE).not.toBe("P13");
    });
  });

  describe("negative code-namespace boundaries", () => {
    it("P13 ≠ P19 ≠ RI code tables (no shared finding strings)", () => {
      const p13 = new Set(Object.values(UmDependencyValidationCode));
      const p19 = new Set(Object.values(UmDependencyValidatorCode));
      const ri = new Set(Object.values(UmReferentialIntegrityCode));

      for (const code of p13) {
        expect(code.startsWith("dependency.validation.")).toBe(true);
        expect(p19.has(code as never)).toBe(false);
        expect(ri.has(code as never)).toBe(false);
      }
      for (const code of p19) {
        expect(code.startsWith("dependency.validator.")).toBe(true);
        expect(p13.has(code as never)).toBe(false);
        expect(ri.has(code as never)).toBe(false);
      }
      for (const code of ri) {
        expect(code.startsWith("referential.")).toBe(true);
        expect(p13.has(code as never)).toBe(false);
        expect(p19.has(code as never)).toBe(false);
      }
    });

    it("Health ≠ Lifecycle Readiness code namespaces", () => {
      const health = [
        ...Object.values(UmHealthRegistryCode),
        ...Object.values(UmHealthReportCode),
      ];
      const readiness = Object.values(UmPlatformReadinessCode);
      const healthSet = new Set(health);
      const readinessSet = new Set(readiness);

      for (const code of health) {
        expect(code.startsWith("health.")).toBe(true);
        expect(readinessSet.has(code as never)).toBe(false);
        expect(code.startsWith("readiness.")).toBe(false);
      }
      for (const code of readiness) {
        expect(code.startsWith("readiness.")).toBe(true);
        expect(healthSet.has(code as never)).toBe(false);
        expect(code.startsWith("health.")).toBe(false);
      }
    });

    it("Capability Compatibility ≠ Health and ≠ Lifecycle Readiness", () => {
      const compat = Object.values(UmCapabilityCompatibilityCode);
      const health = new Set([
        ...Object.values(UmHealthRegistryCode),
        ...Object.values(UmHealthReportCode),
      ]);
      const readiness = new Set(Object.values(UmPlatformReadinessCode));

      for (const code of compat) {
        expect(code.startsWith("capability.compat.")).toBe(true);
        expect(health.has(code as never)).toBe(false);
        expect(readiness.has(code as never)).toBe(false);
        expect(namespaceOf(code)).toBe("capability.compat");
      }
    });
  });

  describe("behavioral boundaries on shared fixtures", () => {
    it("P13 ≠ P19: same unmaterialized requires[] → P13 missing edge; P19 peer_kernel ok", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({ manifest: platformManifest("alpha") }).ok,
      ).toBe(true);
      const dependencies = createInMemoryDependencyRegistry({ platforms });
      // Intentionally leave peer_kernel unmaterialized in P9.

      const p13 = validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
      });
      const composed = createUmCoreValidator({
        platforms,
        dependencies,
      }).validateDependencies("alpha");
      expect(p13).toEqual(composed);
      expect(p13.ok).toBe(false);
      expect(
        p13.findings.some(
          (f) => f.code === UmDependencyValidationCode.MISSING_CATALOG_EDGE,
        ),
      ).toBe(true);
      expect(
        p13.findings.every((f) =>
          String(f.code).startsWith("dependency.validation."),
        ),
      ).toBe(true);

      const requires = platforms.get("alpha")?.manifest.requires ?? [];
      const p19 = validateDependencyRequirements("alpha", requires, {
        platforms,
      });
      expect(p19.ok).toBe(true);
      expect(p19.findings).toEqual([]);
      expect(
        p19.findings.some((f) =>
          String(f.code).startsWith("dependency.validation."),
        ),
      ).toBe(false);
      expect(
        p19.findings.some((f) => String(f.code).startsWith("referential.")),
      ).toBe(false);
    });

    it("P19 ≠ RI: P19 cycle/structure codes never appear as referential.* findings", () => {
      // Self required-platform edge is a P19 cycle SoT finding. RI has no cycle
      // concept and stays green when catalogs have no dangling references.
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({ manifest: platformManifest("alpha") }).ok,
      ).toBe(true);

      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      const dependencies = createInMemoryDependencyRegistry({
        platforms,
        capabilities,
      });

      const p19 = validateDependencyRequirements(
        "alpha",
        [
          {
            targetKind: "peer_kernel",
            targetId: "um.core",
            strength: "required",
            reason: "Core contracts",
          },
          {
            targetKind: "platform",
            targetId: "alpha",
            strength: "required",
            reason: "Self",
          },
        ],
        { platforms, capabilities, dependencies },
      );
      expect(p19.ok).toBe(false);
      expect(
        p19.findings.some(
          (f) => f.code === UmDependencyValidatorCode.REQUIRED_PLATFORM_CYCLE,
        ),
      ).toBe(true);
      expect(
        p19.findings.every((f) =>
          String(f.code).startsWith("dependency.validator."),
        ),
      ).toBe(true);

      const ri = validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
      });
      expect(ri.ok).toBe(true);
      expect(
        ri.findings.some((f) =>
          String(f.code).startsWith("dependency.validator."),
        ),
      ).toBe(false);
      expect(
        ri.findings.some((f) =>
          String(f.code).startsWith("dependency.validation."),
        ),
      ).toBe(false);
    });

    it("Health ≠ Lifecycle Readiness: observation token ready alone is not READY", () => {
      const platforms = createInMemoryPlatformRegistry();
      const declarations = createInMemoryHealthRegistry({ platforms });
      const observations = createInMemoryHealthReporter({ platforms });
      const readiness = createPlatformReadinessEvaluator({
        platforms,
        declarations,
        observations,
      });

      expect(
        platforms.register({ manifest: platformManifest("example") }).ok,
      ).toBe(true);

      const snap: UmHealthSnapshot = {
        platformId: "example",
        status: "ready",
        checkedAt: "2026-08-09T12:00:00.000Z",
        affectedCapabilityIds: ["example.core.ping"],
        dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
      };
      expect(observations.report(snap).ok).toBe(true);

      const observation = observations.getSnapshot("example");
      expect(observation?.status).toBe("ready");

      const row = readiness.evaluatePlatform("example");
      expect(row.observationStatus).toBe("ready");
      expect(row.status).toBe("NOT_READY");
      expect(row.reasons.map((r) => r.code)).toContain(
        UmPlatformReadinessCode.HEALTH_UNDECLARED,
      );
      expect(row.status).not.toBe(observation?.status);
    });

    it("Capability Compatibility ≠ Health and ≠ Lifecycle Readiness on one fixture", () => {
      const platforms = createInMemoryPlatformRegistry();
      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      const dependencies = createInMemoryDependencyRegistry({
        platforms,
        capabilities,
      });
      const declarations = createInMemoryHealthRegistry({ platforms });
      const observations = createInMemoryHealthReporter({ platforms });
      const readiness = createPlatformReadinessEvaluator({
        platforms,
        declarations,
        observations,
      });
      const compat = createCapabilityCompatibilityEvaluator({
        platforms,
        capabilities,
        dependencies,
      });

      expect(
        platforms.register({
          manifest: platformManifest("example", {
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
          }),
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

      // Health undeclared / unobserved — readiness NOT_READY.
      const readyRow = readiness.evaluatePlatform("example");
      expect(readyRow.status).toBe("NOT_READY");

      // Compatibility only cares about declaration/presence — COMPATIBLE.
      const compatRow = compat.evaluatePlatformProvides("example", [
        "example.core.ping",
      ]);
      expect(compatRow.status).toBe("COMPATIBLE");
      expect(
        compatRow.findings.every((f) =>
          String(f.code).startsWith("capability.compat."),
        ),
      ).toBe(true);
      expect(
        compatRow.findings.some((f) => String(f.code).startsWith("health.")),
      ).toBe(false);
      expect(
        compatRow.findings.some((f) =>
          String(f.code).startsWith("readiness."),
        ),
      ).toBe(false);

      // Distinct verdict vocabularies.
      expect(compatRow.status).not.toBe(readyRow.status);
      expect(["COMPATIBLE", "INCOMPATIBLE"]).toContain(compatRow.status);
      expect(["READY", "NOT_READY"]).toContain(readyRow.status);
    });
  });

  describe("catalog rematerialization remains explicit", () => {
    it("P19 review and P13/RI reads do not rematerialize P9 edges", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({
          manifest: platformManifest("alpha", {
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
                reason: "Core contracts",
              },
            ],
          }),
        }).ok,
      ).toBe(true);
      expect(
        platforms.register({ manifest: platformManifest("beta") }).ok,
      ).toBe(true);

      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      const dependencies = createInMemoryDependencyRegistry({
        platforms,
        capabilities,
      });
      // No P9 materialization.

      const before = snapshotFingerprint({
        platforms,
        dependencies,
        capabilities,
      });

      const requires = platforms.get("alpha")?.manifest.requires ?? [];
      const p19 = createInMemoryDependencyValidator({
        platforms,
        capabilities,
        dependencies,
      }).validateRequirements("alpha", requires);
      expect(p19.ok).toBe(true);

      const p13 = validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
        capabilities,
      });
      expect(p13.ok).toBe(false);
      expect(
        p13.findings.filter(
          (f) => f.code === UmDependencyValidationCode.MISSING_CATALOG_EDGE,
        ).length,
      ).toBeGreaterThan(0);

      const ri = validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
      });
      expect(ri.ok).toBe(true);

      expect(
        snapshotFingerprint({ platforms, dependencies, capabilities }),
      ).toEqual(before);
      expect(dependencies.size()).toBe(0);
    });
  });

  describe("deterministic ordering + store non-mutation", () => {
    it("orders P13 / P19 / RI findings deterministically across repeated runs", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({
          manifest: platformManifest("alpha", {
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
              {
                targetKind: "platform",
                targetId: "missing.platform",
                strength: "required",
                reason: "Ghost",
              },
            ],
          }),
        }).ok,
      ).toBe(true);

      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      const dependencies = createInMemoryDependencyRegistry({
        platforms,
        capabilities,
      });

      const requires = platforms.get("alpha")?.manifest.requires ?? [];

      const p13a = validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
        capabilities,
      });
      const p13b = validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
        capabilities,
      });
      expect(p13a).toEqual(p13b);
      const p13Keys = p13a.findings.map(
        (f) => `${f.code}:${f.targetId ?? ""}:${f.relatedCapabilityId ?? ""}`,
      );
      expect(p13Keys).toEqual([...p13Keys].sort((a, b) => a.localeCompare(b)));

      const p19a = validateDependencyRequirements("alpha", requires, {
        platforms,
        capabilities,
        dependencies,
      });
      const p19b = validateDependencyRequirements("alpha", requires, {
        platforms,
        capabilities,
        dependencies,
      });
      expect(p19a).toEqual(p19b);
      const p19Keys = p19a.findings.map(
        (f) => `${f.code}:${f.targetId ?? ""}:${f.relatedCapabilityId ?? ""}`,
      );
      expect(p19Keys).toEqual([...p19Keys].sort((a, b) => a.localeCompare(b)));
      expect(p19a.ok).toBe(false);
      expect(
        p19a.findings.some(
          (f) =>
            f.code === UmDependencyValidatorCode.UNKNOWN_PLATFORM_TARGET,
        ),
      ).toBe(true);

      const ria = validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
      });
      const rib = validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
      });
      expect(ria).toEqual(rib);
      const riKeys = ria.findings.map(
        (f) => `${f.code}:${f.path ?? ""}:${f.message}`,
      );
      expect(riKeys).toEqual([...riKeys].sort((a, b) => a.localeCompare(b)));
    });

    it("pure validators / evaluators do not mutate catalog or health stores", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({ manifest: platformManifest("example") }).ok,
      ).toBe(true);

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

      const dependencies = createInMemoryDependencyRegistry({
        platforms,
        capabilities,
      });
      const healthDeclarations = createInMemoryHealthRegistry({ platforms });
      expect(
        healthDeclarations.register({
          health: {
            platformId: "example",
            reportsStatus: true,
            probeRef: "probe.example.health",
          },
        }).ok,
      ).toBe(true);
      const healthObservations = createInMemoryHealthReporter({ platforms });
      expect(
        healthObservations.report({
          platformId: "example",
          status: "ready",
          checkedAt: "2026-08-09T12:00:00.000Z",
          affectedCapabilityIds: ["example.core.ping"],
          dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
        }).ok,
      ).toBe(true);

      const readiness = createPlatformReadinessEvaluator({
        platforms,
        declarations: healthDeclarations,
        observations: healthObservations,
      });
      const compat = createCapabilityCompatibilityEvaluator({
        platforms,
        capabilities,
        dependencies,
      });

      const before = snapshotFingerprint({
        platforms,
        dependencies,
        capabilities,
        healthDeclarations,
        healthObservations,
      });

      const requires = platforms.get("example")?.manifest.requires ?? [];
      validatePlatformDependencies("example", {
        platforms,
        dependencies,
        capabilities,
      });
      validateDependencyRequirements("example", requires, {
        platforms,
        capabilities,
        dependencies,
      });
      validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
        healthDeclarations,
        healthObservations,
      });
      readiness.evaluatePlatform("example");
      readiness.evaluate();
      compat.evaluatePlatformProvides("example", ["example.core.ping"]);
      compat.evaluatePlatformRequirements("example");
      compat.evaluateMatrix();
      compat.platformDeclaresCapability("example", "example.core.ping");

      expect(
        snapshotFingerprint({
          platforms,
          dependencies,
          capabilities,
          healthDeclarations,
          healthObservations,
        }),
      ).toEqual(before);
    });
  });

  describe("no duplicate finding semantics across boundaries", () => {
    it("coexisting P13 + P19 + RI findings keep disjoint namespaces on one drift state", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({
          manifest: platformManifest("alpha", {
            requires: [
              {
                targetKind: "platform",
                targetId: "beta",
                strength: "required",
                reason: "Needs beta",
              },
              {
                targetKind: "peer_kernel",
                targetId: "um.extra",
                strength: "optional",
                reason: "Temporary peer",
              },
            ],
          }),
        }).ok,
      ).toBe(true);
      expect(
        platforms.register({ manifest: platformManifest("beta") }).ok,
      ).toBe(true);

      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      const dependencies = createInMemoryDependencyRegistry({
        platforms,
        capabilities,
      });
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
      expect(
        dependencies.register({
          dependency: {
            fromPlatformId: "alpha",
            targetKind: "peer_kernel",
            targetId: "um.extra",
            strength: "optional",
            reason: "Temporary peer",
          },
        }).ok,
      ).toBe(true);

      // Drop beta; narrow alpha requires → P13 stale + unknown target; RI orphan.
      platforms.clear();
      expect(
        platforms.register({
          manifest: platformManifest("alpha", {
            requires: [
              {
                targetKind: "platform",
                targetId: "beta",
                strength: "required",
                reason: "Needs beta",
              },
            ],
          }),
        }).ok,
      ).toBe(true);

      const p13 = validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
        capabilities,
      });
      const p19 = validateDependencyRequirements(
        "alpha",
        [
          {
            targetKind: "platform",
            targetId: "beta",
            strength: "required",
            reason: "Needs beta",
          },
        ],
        { platforms, capabilities, dependencies },
      );
      const ri = validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
      });

      expect(p13.ok).toBe(false);
      expect(p19.ok).toBe(false);
      expect(ri.ok).toBe(false);

      const p13Codes = p13.findings.map((f) => f.code);
      const p19Codes = p19.findings.map((f) => f.code);
      const riCodes = ri.findings.map((f) => f.code);

      expect(
        p13Codes.every((c) => c.startsWith("dependency.validation.")),
      ).toBe(true);
      expect(
        p19Codes.every((c) => c.startsWith("dependency.validator.")),
      ).toBe(true);
      expect(riCodes.every((c) => c.startsWith("referential."))).toBe(true);

      const union = new Set([...p13Codes, ...p19Codes, ...riCodes]);
      expect(union.size).toBe(p13Codes.length + p19Codes.length + riCodes.length);

      expect(p19Codes).toContain(
        UmDependencyValidatorCode.UNKNOWN_PLATFORM_TARGET,
      );
      expect(riCodes).toContain(
        UmReferentialIntegrityCode.DEPENDENCY_UNKNOWN_PLATFORM_TARGET,
      );
      // Same conceptual orphan, distinct finding strings — not remapped/collapsed.
      expect(UmDependencyValidatorCode.UNKNOWN_PLATFORM_TARGET).not.toBe(
        UmReferentialIntegrityCode.DEPENDENCY_UNKNOWN_PLATFORM_TARGET,
      );
      expect(UmDependencyValidationCode.UNKNOWN_PLATFORM_TARGET).not.toBe(
        UmDependencyValidatorCode.UNKNOWN_PLATFORM_TARGET,
      );
    });
  });
});
