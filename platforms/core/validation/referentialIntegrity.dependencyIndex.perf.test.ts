/**
 * Scale proof: observation review must index dependency targets by
 * fromPlatformId once — not rescan dependencies.list() per observation.
 * FINDING_SEMANTICS_UNCHANGED.
 */

import { describe, expect, it } from "vitest";
import type { UmDependencyRecord, UmDependencyRegistry } from "../dependency/types";
import type { UmPlatformRegistry } from "../registry/interfaces";
import type { UmHealthSnapshot } from "../health/types";
import { createInMemoryPlatformRegistry } from "../registry";
import type { UmPlatformManifest } from "../manifest/types";
import {
  UmReferentialIntegrityCode,
  validateReferentialIntegrity,
} from "./index";

const EDGE_COUNT = 200;
const OBSERVATION_COUNT = 200;

function platformManifest(platformId: string): UmPlatformManifest {
  return {
    platformId,
    platformVersion: "1.0.0",
    displayName: platformId,
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

function seedPlatforms(count: number): UmPlatformRegistry {
  const platforms = createInMemoryPlatformRegistry();
  for (let i = 0; i < count; i += 1) {
    const platformId = `plat${i}`;
    expect(platforms.register({ manifest: platformManifest(platformId) }).ok).toBe(
      true,
    );
  }
  return platforms;
}

describe("um.core RI dependency-target index scale V1", () => {
  it("calls dependencies.list() a constant number of times across many observations", () => {
    const platforms = seedPlatforms(1);
    const records: UmDependencyRecord[] = [];
    for (let i = 0; i < EDGE_COUNT; i += 1) {
      records.push({
        edgeId: `plat0=>peer_kernel:um.core.edge${i}:required`,
        fromPlatformId: "plat0",
        targetKind: "peer_kernel",
        targetId: `um.core.edge${i}`,
        strength: "required",
        reason: "scale edge",
        registeredAt: "2026-08-09T12:00:00.000Z",
      });
    }
    // Keep one real declared target used by observations.
    records[0] = {
      ...records[0]!,
      edgeId: "plat0=>peer_kernel:um.core:required",
      targetId: "um.core",
    };

    const dependencies = countingDependencyRegistry(records);
    const observations: UmHealthSnapshot[] = [];
    for (let i = 0; i < OBSERVATION_COUNT; i += 1) {
      observations.push({
        platformId: "plat0",
        status: i === OBSERVATION_COUNT - 1 ? "degraded" : "ready",
        checkedAt: `2026-08-09T12:${String(i).padStart(2, "0")}:00.000Z`,
        affectedCapabilityIds: [],
        dependencyStatuses: [
          { targetId: "um.core", status: "ready" },
          // Unknown only on last row — proves lookup still finds declared + orphans.
          ...(i === OBSERVATION_COUNT - 1
            ? [{ targetId: "missing.scale.target", status: "unavailable" as const }]
            : []),
        ],
      });
    }

    const result = validateReferentialIntegrity({
      platforms,
      dependencies,
      healthObservations: { list: () => observations },
    });

    // reviewDependencies + one pre-index in observation review (not per observation).
    expect(dependencies.listCallCount()).toBe(2);
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toEqual([
      UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_DEPENDENCY_TARGET,
    ]);
    expect(result.findings[0]?.message).toContain("missing.scale.target");
  });

  it("preserves finding codes and ordering vs naive per-observation scan semantics", () => {
    const platforms = seedPlatforms(3);
    const records: UmDependencyRecord[] = [
      {
        edgeId: "plat0=>peer_kernel:um.core:required",
        fromPlatformId: "plat0",
        targetKind: "peer_kernel",
        targetId: "um.core",
        strength: "required",
        reason: "core",
        registeredAt: "2026-08-09T12:00:00.000Z",
      },
      {
        edgeId: "plat1=>platform:plat0:required",
        fromPlatformId: "plat1",
        targetKind: "platform",
        targetId: "plat0",
        strength: "required",
        reason: "needs plat0",
        registeredAt: "2026-08-09T12:00:00.000Z",
      },
    ];
    const dependencies = countingDependencyRegistry(records);
    const observations: UmHealthSnapshot[] = [
      {
        platformId: "plat0",
        status: "ready",
        checkedAt: "2026-08-09T12:00:00.000Z",
        affectedCapabilityIds: [],
        dependencyStatuses: [
          { targetId: "um.core", status: "ready" },
          { targetId: "orphan.a", status: "unavailable" },
        ],
      },
      {
        platformId: "plat1",
        status: "degraded",
        checkedAt: "2026-08-09T12:01:00.000Z",
        affectedCapabilityIds: [],
        dependencyStatuses: [
          { targetId: "plat0", status: "ready" },
          { targetId: "orphan.b", status: "unavailable" },
        ],
      },
      {
        platformId: "plat2",
        status: "ready",
        checkedAt: "2026-08-09T12:02:00.000Z",
        affectedCapabilityIds: [],
        dependencyStatuses: [{ targetId: "orphan.c", status: "unavailable" }],
      },
    ];

    const result = validateReferentialIntegrity({
      platforms,
      dependencies,
      healthObservations: { list: () => observations },
    });

    expect(dependencies.listCallCount()).toBe(2);
    expect(result.findings.map((f) => ({ code: f.code, path: f.path }))).toEqual([
      {
        code: UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_DEPENDENCY_TARGET,
        path: "healthObservations[plat0].dependencyStatuses",
      },
      {
        code: UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_DEPENDENCY_TARGET,
        path: "healthObservations[plat1].dependencyStatuses",
      },
      {
        code: UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_DEPENDENCY_TARGET,
        path: "healthObservations[plat2].dependencyStatuses",
      },
    ]);
  });
});
