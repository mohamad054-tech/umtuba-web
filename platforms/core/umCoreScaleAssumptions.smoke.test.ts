/**
 * UM Core scale-assumption smoke (no benchmark package).
 *
 * TASK: UM_CORE_PLATFORM_PERFORMANCE_AND_SCALE_ASSUMPTIONS_AUDIT_V1
 * Structural bounds only — does not assert wall-clock timing.
 */

import { describe, expect, it } from "vitest";
import { createInMemoryDependencyRegistry } from "./dependency";
import {
  aggregateFleetHealth,
  createInMemoryHealthObservationHistory,
  createInMemoryHealthRegistry,
  createInMemoryHealthReporter,
  type UmHealthSnapshot,
} from "./health";
import type { UmPlatformManifest } from "./manifest/types";
import { createInMemoryPlatformRegistry } from "./registry";
import { validateReferentialIntegrity } from "./validation";

const PLATFORM_COUNT = 48;
const HISTORY_CAPACITY = 8;

function manifestFor(platformId: string): UmPlatformManifest {
  const moduleId = `${platformId}.core`;
  const capabilityId = `${platformId}.core.ping`;
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
      },
    ],
    providesEvents: [],
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
    soTStatement: `Owns ${platformId} domain truth only.`,
    nonOwnershipStatement:
      "Does not own money, AI execution, or other platforms.",
  };
}

function snapshotFor(platformId: string, checkedAt: string): UmHealthSnapshot {
  return {
    platformId,
    status: "ready",
    checkedAt,
    affectedCapabilityIds: [],
    dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
  };
}

describe("um.core scale assumptions smoke", () => {
  it("keeps catalog VALIDATE / AGGREGATE / HISTORY bounded at moderate fleet size", () => {
    const platforms = createInMemoryPlatformRegistry();
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    const declarations = createInMemoryHealthRegistry({ platforms });
    const observations = createInMemoryHealthReporter({ platforms });

    for (let i = 0; i < PLATFORM_COUNT; i += 1) {
      const platformId = `scale${String(i).padStart(2, "0")}`;
      expect(platforms.register({ manifest: manifestFor(platformId) }).ok).toBe(
        true,
      );
      expect(
        dependencies.register({
          dependency: {
            fromPlatformId: platformId,
            targetKind: "peer_kernel",
            targetId: "um.core",
            strength: "required",
            reason: "Core contracts",
          },
        }).ok,
      ).toBe(true);
      expect(
        declarations.register({
          health: {
            platformId,
            reportsStatus: true,
            probeRef: `probe.${platformId}.health`,
          },
        }).ok,
      ).toBe(true);
      expect(
        observations.report(
          snapshotFor(platformId, `2026-08-09T12:00:${String(i).padStart(2, "0")}.000Z`),
        ).ok,
      ).toBe(true);
    }

    expect(platforms.size()).toBe(PLATFORM_COUNT);
    expect(dependencies.size()).toBe(PLATFORM_COUNT);
    expect(observations.size()).toBe(PLATFORM_COUNT);

    const historyCreate = createInMemoryHealthObservationHistory({
      platforms,
      capacity: HISTORY_CAPACITY,
    });
    expect(historyCreate.ok).toBe(true);
    if (!historyCreate.ok) return;
    const { history } = historyCreate;

    const sampleId = "scale00";
    for (let t = 0; t < HISTORY_CAPACITY + 12; t += 1) {
      const recorded = history.record(snapshotFor(sampleId, `t${t}`));
      expect(recorded.ok).toBe(true);
      expect(recorded.retainedCount).toBeLessThanOrEqual(HISTORY_CAPACITY);
    }
    expect(history.getHistory(sampleId)).toHaveLength(HISTORY_CAPACITY);
    expect(history.entryCount()).toBe(HISTORY_CAPACITY);

    const fleet = aggregateFleetHealth({
      platforms,
      observations,
      declarations,
    });
    expect(fleet.ok).toBe(true);
    expect(fleet.fleetSize).toBe(PLATFORM_COUNT);
    expect(fleet.observedCount).toBe(PLATFORM_COUNT);
    expect(fleet.coverage).toBe("full");

    const ri = validateReferentialIntegrity({
      platforms,
      dependencies,
      healthDeclarations: declarations,
      healthObservations: observations,
    });
    expect(ri.ok).toBe(true);
    expect(ri.findings).toEqual([]);
  });
});
