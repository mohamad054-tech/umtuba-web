/**
 * Bounded hot-path / scale regression evidence for UM Core validators.
 *
 * TASK: UM_CORE_PLATFORM_VALIDATION_HOT_PATH_PERFORMANCE_REGRESSION_V1
 * MODE: AUDIT / TEST FIRST — does not change production validator semantics.
 *
 * FILES_AREAS_RESERVED (this lane):
 * - platforms/core/validation/validationHotPath.scale.test.ts (NEW)
 * - UM_CORE_PLATFORM_VALIDATION_HOT_PATH_PERFORMANCE_REGRESSION_V1_REPORT.md
 *
 * DO_NOT_TOUCH: validation/index.ts, interfaces.ts, dependencyValidator*
 *
 * Proves at larger bounded inputs:
 * - semantic equivalence across repeated runs
 * - deterministic finding ordering
 * - stable duplicate finding behavior
 * - validators do not mutate registries / input manifests
 * - RI dependency-index still uses constant dependencies.list() calls
 * - no unbounded intermediate collections beyond input scale
 */

import { describe, expect, it } from "vitest";
import { createInMemoryCapabilityRegistry } from "../capability";
import type {
  UmDependencyRecord,
  UmDependencyRegistry,
  UmDependencyRequirement,
} from "../dependency";
import { assessPlatformCompliance } from "../compliance";
import type { UmHealthSnapshot } from "../health/types";
import type { UmSideEffectClass } from "../identity/types";
import type { UmManifestCapability, UmPlatformManifest } from "../manifest/types";
import { UM_CORE_DEPENDENCY_VALIDATOR_PHASE } from "../packageIdentity";
import { createInMemoryPlatformRegistry } from "../registry";
import type {
  UmInMemoryPlatformRegistry,
  UmPlatformRegistry,
} from "../registry/interfaces";
import {
  UmDependencyValidationCode,
  UmDependencyValidatorCode,
  UmManifestValidationCode,
  UmReferentialIntegrityCode,
  validateDependencyRequirements,
  validatePlatformDependencies,
  validatePlatformManifest,
  validateReferentialIntegrity,
} from "./index";

const PLATFORM_COUNT = 40;
const CAP_PER_PLATFORM = 8;
const REQUIRE_COUNT = 80;
const EDGE_COUNT = 160;
const OBSERVATION_COUNT = 120;
const MANIFEST_CAP_COUNT = 64;
const MANIFEST_REQUIRE_COUNT = 48;

function fingerprintFindings(
  findings: readonly { code: string; message: string; path?: string }[],
): string {
  return findings
    .map((f) => `${f.code}|${f.path ?? ""}|${f.message}`)
    .join("\n");
}

function fingerprintDepFindings(
  findings: readonly {
    code: string;
    message: string;
    targetId?: string;
    relatedCapabilityId?: string;
  }[],
): string {
  return findings
    .map(
      (f) =>
        `${f.code}|${f.targetId ?? ""}|${f.relatedCapabilityId ?? ""}|${f.message}`,
    )
    .join("\n");
}

function baseManifest(
  platformId: string,
  overrides: Partial<UmPlatformManifest> = {},
): UmPlatformManifest {
  return {
    platformId,
    platformVersion: "1.0.0",
    displayName: `${platformId} Platform`,
    owners: [{ id: `${platformId}.owner`, displayName: "Owner" }],
    modules: [
      {
        moduleId: `${platformId}.core`,
        displayName: "Core",
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
    flags: [],
    health: { reportsStatus: true, probeRef: `probe.${platformId}.health` },
    sideEffectSummary: ["read"],
    maturityLevel: 1,
    documentationRefs: [`docs/${platformId}/README.md`],
    soTStatement: "Owns test truth only.",
    nonOwnershipStatement: "Does not own other platforms.",
    ...overrides,
  };
}

function countingDependencyRegistry(
  records: readonly UmDependencyRecord[],
): UmDependencyRegistry & { listCallCount: () => number } {
  let listCalls = 0;
  const byId = new Map(records.map((r) => [r.edgeId, r]));
  return {
    listCallCount: () => listCalls,
    get(edgeId) {
      return byId.get(edgeId);
    },
    list() {
      listCalls += 1;
      return records;
    },
    listRequirements(platformId) {
      return records
        .filter((r) => r.fromPlatformId === platformId)
        .map((r) => ({
          targetKind: r.targetKind,
          targetId: r.targetId,
          strength: r.strength,
          reason: r.reason,
        }));
    },
    listDependents() {
      return [];
    },
    listByTargetKind(targetKind) {
      return records.filter((r) => r.targetKind === targetKind);
    },
    listByStrength(strength) {
      return records.filter((r) => r.strength === strength);
    },
    has(edgeId) {
      return byId.has(edgeId);
    },
    size() {
      return records.length;
    },
  };
}

function seedPlatforms(count: number): UmInMemoryPlatformRegistry {
  const platforms = createInMemoryPlatformRegistry();
  for (let i = 0; i < count; i += 1) {
    const platformId = `plat${i}`;
    expect(platforms.register({ manifest: baseManifest(platformId) }).ok).toBe(
      true,
    );
  }
  return platforms;
}

/**
 * Naive RI observation dependency check (test oracle only):
 * rescan dependencies.list() per observation — mirrors pre-index semantics.
 */
function naiveObservationUnknownTargets(
  platforms: UmPlatformRegistry,
  dependencies: UmDependencyRegistry,
  observations: readonly UmHealthSnapshot[],
  capabilityGet?: (id: string) => unknown,
): string[] {
  const paths: string[] = [];
  for (const snapshot of observations) {
    const declared = new Set(
      dependencies
        .list()
        .filter((r) => r.fromPlatformId === snapshot.platformId)
        .map((r) => r.targetId),
    );
    for (const dep of snapshot.dependencyStatuses) {
      const known =
        declared.has(dep.targetId) ||
        Boolean(platforms.get(dep.targetId)) ||
        Boolean(capabilityGet?.(dep.targetId));
      if (!known) {
        paths.push(
          `healthObservations[${snapshot.platformId}].dependencyStatuses|${dep.targetId}`,
        );
      }
    }
  }
  return paths.sort((a, b) => a.localeCompare(b));
}

describe("um.core validation hot-path scale regression V1", () => {
  it("P19 is integrated on alpha (phase marker)", () => {
    expect(UM_CORE_DEPENDENCY_VALIDATOR_PHASE).toBe("P19");
  });

  describe("manifest validation (P2)", () => {
    it("keeps deterministic order + duplicate stability at larger bounded input", () => {
      const capabilityIds: string[] = [];
      const capabilities: UmManifestCapability[] = Array.from(
        { length: MANIFEST_CAP_COUNT },
        (_, i) => {
          const capabilityId = `scale.core.cap${String(i).padStart(3, "0")}`;
          capabilityIds.push(capabilityId);
          return {
            capabilityId,
            moduleId: "scale.core",
            displayName: `Cap ${i}`,
            sideEffectClasses: ["read"] as UmSideEffectClass[],
            stability: "stable" as const,
            version: "1.0.0",
          };
        },
      );

      // Inject duplicate capability id + unknown elevated flag to force findings.
      capabilities.push({
        capabilityId: "scale.core.cap000",
        moduleId: "scale.core",
        displayName: "Dup Cap",
        sideEffectClasses: ["read"],
        stability: "stable",
        version: "1.0.0",
      });
      capabilities[3] = {
        ...capabilities[3]!,
        sideEffectClasses: ["money"],
        flagId: "scale.missing.flag",
      };

      const requires: UmDependencyRequirement[] = Array.from(
        { length: MANIFEST_REQUIRE_COUNT },
        (_, i) => ({
          targetKind: "peer_kernel" as const,
          targetId: `um.core.peer${String(i).padStart(3, "0")}`,
          strength: "required" as const,
          reason: `peer ${i}`,
        }),
      );
      // Stable duplicate requirement pair.
      requires.push({
        targetKind: "peer_kernel",
        targetId: "um.core.peer000",
        strength: "required",
        reason: "peer 0",
      });

      const manifest = baseManifest("scale", {
        modules: [
          {
            moduleId: "scale.core",
            displayName: "Core",
            capabilityIds,
          },
        ],
        capabilities,
        requires,
        flags: [],
        sideEffectSummary: ["read", "money"],
      });

      const before = structuredClone(manifest);
      const a = validatePlatformManifest(manifest);
      const b = validatePlatformManifest(manifest);
      expect(manifest).toEqual(before);
      expect(fingerprintFindings(a.findings)).toBe(
        fingerprintFindings(b.findings),
      );
      expect(a.ok).toBe(false);
      expect(a.findings.length).toBeGreaterThan(0);

      // Ordering: severity then code then path (errors first).
      for (let i = 1; i < a.findings.length; i += 1) {
        const prev = a.findings[i - 1]!;
        const cur = a.findings[i]!;
        const rank = { error: 0, warning: 1, info: 2 } as const;
        const sev = rank[prev.severity] - rank[cur.severity];
        if (sev !== 0) {
          expect(sev).toBeLessThan(0);
          continue;
        }
        const code = prev.code.localeCompare(cur.code);
        if (code !== 0) {
          expect(code).toBeLessThan(0);
          continue;
        }
        expect((prev.path ?? "").localeCompare(cur.path ?? "")).toBeLessThanOrEqual(
          0,
        );
      }

      const codes = a.findings.map((f) => f.code);
      expect(codes).toContain(UmManifestValidationCode.CAPABILITY_ID_DUPLICATE);
      expect(codes).toContain(UmManifestValidationCode.DEPENDENCY_DUPLICATE);
      expect(
        codes.filter((c) => c === UmManifestValidationCode.CAPABILITY_ID_DUPLICATE)
          .length,
      ).toBe(1);
      expect(
        codes.filter((c) => c === UmManifestValidationCode.DEPENDENCY_DUPLICATE)
          .length,
      ).toBe(1);
    });
  });

  describe("P13 dependency completeness/drift", () => {
    it("is deterministic, non-mutating, and bounded at larger requires×catalog", () => {
      const platforms = createInMemoryPlatformRegistry();
      const requires: UmDependencyRequirement[] = [
        {
          targetKind: "peer_kernel",
          targetId: "um.core",
          strength: "required",
          reason: "core",
        },
      ];
      // Unique peer_kernel targets — avoids P2 DEPENDENCY_DUPLICATE at admission.
      for (let i = 0; i < REQUIRE_COUNT; i += 1) {
        requires.push({
          targetKind: "peer_kernel",
          targetId: `um.core.req${String(i).padStart(3, "0")}`,
          strength: i % 2 === 0 ? "required" : "optional",
          reason: `peer req ${i}`,
        });
      }
      expect(
        platforms.register({
          manifest: baseManifest("owner", { requires }),
        }).ok,
      ).toBe(true);

      const records: UmDependencyRecord[] = [];
      // Materialize only even-index bulk requires → missing + stale mix.
      for (let i = 0; i < REQUIRE_COUNT; i += 2) {
        const req = requires[i + 1]!;
        records.push({
          edgeId: `owner=>${req.targetKind}:${req.targetId}:${req.strength}`,
          fromPlatformId: "owner",
          targetKind: req.targetKind,
          targetId: req.targetId,
          strength: req.strength,
          reason: req.reason,
          registeredAt: "2026-08-10T00:00:00.000Z",
        });
      }
      // Stale edge not in manifest.
      records.push({
        edgeId: "owner=>peer_kernel:um.core.stale:optional",
        fromPlatformId: "owner",
        targetKind: "peer_kernel",
        targetId: "um.core.stale",
        strength: "optional",
        reason: "stale",
        registeredAt: "2026-08-10T00:00:00.000Z",
      });

      const dependencies = countingDependencyRegistry(records);
      const sizeBefore = dependencies.size();
      const platformsSizeBefore = platforms.size();

      const a = validatePlatformDependencies("owner", {
        platforms,
        dependencies,
      });
      const b = validatePlatformDependencies("owner", {
        platforms,
        dependencies,
      });

      expect(fingerprintDepFindings(a.findings)).toBe(
        fingerprintDepFindings(b.findings),
      );
      expect(dependencies.size()).toBe(sizeBefore);
      expect(platforms.size()).toBe(platformsSizeBefore);
      // One list() per review (filter over full catalog) — not per require.
      expect(dependencies.listCallCount()).toBe(2);
      expect(a.ok).toBe(false);
      expect(
        a.findings.some(
          (f) => f.code === UmDependencyValidationCode.MISSING_CATALOG_EDGE,
        ),
      ).toBe(true);
      expect(
        a.findings.some(
          (f) => f.code === UmDependencyValidationCode.STALE_CATALOG_EDGE,
        ),
      ).toBe(true);

      for (let i = 1; i < a.findings.length; i += 1) {
        const prev = a.findings[i - 1]!;
        const cur = a.findings[i]!;
        const code = prev.code.localeCompare(cur.code);
        if (code !== 0) {
          expect(code).toBeLessThan(0);
          continue;
        }
        expect((prev.targetId ?? "").localeCompare(cur.targetId ?? "")).toBeLessThanOrEqual(
          0,
        );
      }
    });
  });

  describe("P19 dependency requirement validator", () => {
    it("scales requirement + cycle review without mutating registries", () => {
      const platforms = seedPlatforms(PLATFORM_COUNT);
      // Catalog chain via counting registry (avoids P9 manifest-match admission).
      const chain: UmDependencyRecord[] = [];
      for (let i = 0; i < PLATFORM_COUNT - 1; i += 1) {
        chain.push({
          edgeId: `plat${i}=>platform:plat${i + 1}:required`,
          fromPlatformId: `plat${i}`,
          targetKind: "platform",
          targetId: `plat${i + 1}`,
          strength: "required",
          reason: "chain",
          registeredAt: "2026-08-10T00:00:00.000Z",
        });
      }
      const dependencies = countingDependencyRegistry(chain);

      const requirements: UmDependencyRequirement[] = [
        {
          targetKind: "peer_kernel",
          targetId: "um.core",
          strength: "required",
          reason: "core",
        },
      ];
      for (let i = 1; i < 30; i += 1) {
        requirements.push({
          targetKind: "platform",
          targetId: `plat${i}`,
          strength: "optional",
          reason: `opt ${i}`,
        });
      }
      // Duplicate optional edge — stable single DUPLICATE finding.
      requirements.push({
        targetKind: "platform",
        targetId: "plat1",
        strength: "optional",
        reason: "opt 1",
      });
      // Closing the chain plat39 → plat0 would cycle through existing required path.
      requirements.push({
        targetKind: "platform",
        targetId: "plat0",
        strength: "required",
        reason: "cycle close",
      });

      const depSizeBefore = dependencies.size();
      const platSizeBefore = platforms.size();

      const a = validateDependencyRequirements("plat39", requirements, {
        platforms,
        dependencies,
      });
      const b = validateDependencyRequirements("plat39", requirements, {
        platforms,
        dependencies,
      });

      expect(fingerprintDepFindings(a.findings)).toBe(
        fingerprintDepFindings(b.findings),
      );
      expect(dependencies.size()).toBe(depSizeBefore);
      expect(platforms.size()).toBe(platSizeBefore);
      // Cycle review reads catalog once per validate call (not per requirement).
      expect(dependencies.listCallCount()).toBe(2);
      expect(a.ok).toBe(false);
      expect(
        a.findings.filter(
          (f) => f.code === UmDependencyValidatorCode.DUPLICATE_REQUIREMENT,
        ).length,
      ).toBe(1);
      expect(
        a.findings.some(
          (f) => f.code === UmDependencyValidatorCode.REQUIRED_PLATFORM_CYCLE,
        ),
      ).toBe(true);
    });
  });

  describe("referential integrity", () => {
    it("preserves index list() bound + semantic equivalence vs naive oracle", () => {
      const platforms = seedPlatforms(PLATFORM_COUNT);
      const capabilities = createInMemoryCapabilityRegistry({ platforms });
      for (let p = 0; p < PLATFORM_COUNT; p += 1) {
        for (let c = 0; c < CAP_PER_PLATFORM; c += 1) {
          const capabilityId = `plat${p}.core.cap${c}`;
          // Register only first capability via platform manifest path is insufficient —
          // capability registry needs explicit rows for RI capability checks.
          // Use ping already on platform for c=0; extra caps are intentional orphans for RI.
          if (c === 0) {
            expect(
              capabilities.register({
                capability: {
                  capabilityId: `plat${p}.core.ping`,
                  platformId: `plat${p}`,
                  moduleId: `plat${p}.core`,
                  displayName: "Ping",
                  sideEffectClasses: ["read"],
                  authClass: "authenticated",
                  stability: "stable",
                  version: "1.0.0",
                },
              }).ok,
            ).toBe(true);
          } else {
            // Do not register — observations may reference missing caps.
            void capabilityId;
          }
        }
      }

      const records: UmDependencyRecord[] = [];
      for (let i = 0; i < EDGE_COUNT; i += 1) {
        const from = `plat${i % PLATFORM_COUNT}`;
        records.push({
          edgeId: `${from}=>peer_kernel:um.core.edge${i}:required`,
          fromPlatformId: from,
          targetKind: "peer_kernel",
          targetId: `um.core.edge${i}`,
          strength: "required",
          reason: "scale",
          registeredAt: "2026-08-10T00:00:00.000Z",
        });
      }
      // Stable known targets for a few platforms.
      records[0] = {
        ...records[0]!,
        edgeId: "plat0=>peer_kernel:um.core:required",
        fromPlatformId: "plat0",
        targetId: "um.core",
      };

      const dependencies = countingDependencyRegistry(records);
      const observations: UmHealthSnapshot[] = [];
      for (let i = 0; i < OBSERVATION_COUNT; i += 1) {
        const platformId = `plat${i % PLATFORM_COUNT}`;
        observations.push({
          platformId,
          status: "ready",
          checkedAt: `2026-08-10T00:${String(i % 60).padStart(2, "0")}:00.000Z`,
          affectedCapabilityIds:
            i % 17 === 0 ? [`${platformId}.core.missing`] : [`${platformId}.core.ping`],
          dependencyStatuses: [
            {
              targetId: platformId === "plat0" ? "um.core" : `um.core.edge${i}`,
              status: "ready",
            },
            ...(i % 11 === 0
              ? [{ targetId: `orphan.${i}`, status: "unavailable" as const }]
              : []),
          ],
        });
      }

      const platSizeBefore = platforms.size();
      const capSizeBefore = capabilities.size();
      const depSizeBefore = dependencies.size();

      const a = validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
        healthObservations: { list: () => observations },
      });
      const b = validateReferentialIntegrity({
        platforms,
        capabilities,
        dependencies,
        healthObservations: { list: () => observations },
      });

      expect(fingerprintFindings(a.findings)).toBe(
        fingerprintFindings(b.findings),
      );
      expect(platforms.size()).toBe(platSizeBefore);
      expect(capabilities.size()).toBe(capSizeBefore);
      expect(dependencies.size()).toBe(depSizeBefore);

      // reviewDependencies + one pre-index — never per observation.
      expect(dependencies.listCallCount()).toBe(4); // 2 reviews × 2 list() each
      expect(dependencies.listCallCount()).toBeLessThan(OBSERVATION_COUNT);

      const indexedUnknown = a.findings
        .filter(
          (f) =>
            f.code ===
            UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_DEPENDENCY_TARGET,
        )
        .map((f) => {
          const target = f.message.match(/"([^"]+)"\.$/)?.[1] ?? "";
          return `${f.path}|${target}`;
        })
        .sort((x, y) => x.localeCompare(y));

      const naive = naiveObservationUnknownTargets(
        platforms,
        countingDependencyRegistry(records),
        observations,
        (id) => capabilities.get(id),
      );
      expect(indexedUnknown).toEqual(naive);

      // Ordering contract: code → path → message
      for (let i = 1; i < a.findings.length; i += 1) {
        const prev = a.findings[i - 1]!;
        const cur = a.findings[i]!;
        const code = prev.code.localeCompare(cur.code);
        if (code !== 0) {
          expect(code).toBeLessThan(0);
          continue;
        }
        const path = (prev.path ?? "").localeCompare(cur.path ?? "");
        if (path !== 0) {
          expect(path).toBeLessThan(0);
          continue;
        }
        expect(prev.message.localeCompare(cur.message)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe("compliance (P3) where applicable", () => {
    it("remains deterministic and non-mutating at larger valid manifest size", () => {
      const capabilities = Array.from({ length: MANIFEST_CAP_COUNT }, (_, i) => ({
        capabilityId: `comp.core.cap${String(i).padStart(3, "0")}`,
        moduleId: "comp.core",
        displayName: `Cap ${i}`,
        sideEffectClasses: ["read" as const],
        stability: "stable" as const,
        version: "1.0.0",
      }));
      const capabilityIds = capabilities.map((c) => c.capabilityId);
      const manifest = baseManifest("comp", {
        modules: [
          {
            moduleId: "comp.core",
            displayName: "Core",
            capabilityIds,
          },
        ],
        capabilities,
        sideEffectSummary: ["read"],
        documentationRefs: ["docs/comp/README.md", "docs/comp/OWNERS.md"],
      });
      const before = structuredClone(manifest);
      const a = assessPlatformCompliance({ manifest });
      const b = assessPlatformCompliance({ manifest });
      expect(manifest).toEqual(before);
      expect(a.status).toBe(b.status);
      expect(a.findings.map((f) => `${f.code}|${f.path ?? ""}|${f.message}`)).toEqual(
        b.findings.map((f) => `${f.code}|${f.path ?? ""}|${f.message}`),
      );
      expect(a.status).toBe("compliant");
    });
  });
});
