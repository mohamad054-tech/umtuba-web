/**
 * Cross-cutting in-memory Core state safety regressions
 * (UM_CORE_PLATFORM_STATE_CONCURRENCY_AND_IMMUTABILITY_HARDENING_V1).
 *
 * Focus: health reporter / history / diagnostics join / fleet aggregation.
 * Does not introduce locks, persistence, or architectural redesign.
 */

import { describe, expect, it } from "vitest";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  aggregateFleetHealth,
  createFleetHealthAggregation,
  createHealthDiagnosticsJoin,
  createInMemoryHealthObservationHistory,
  createInMemoryHealthRegistry,
  createInMemoryHealthReporter,
  type UmHealthSnapshot,
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

function validSnapshot(
  overrides: Partial<UmHealthSnapshot> = {},
): UmHealthSnapshot {
  return {
    platformId: "example",
    status: "ready",
    checkedAt: "2026-08-09T12:00:00.000Z",
    affectedCapabilityIds: ["example.core.ping"],
    dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
    detail: "ok",
    ...overrides,
  };
}

function assembleHealthStack() {
  const platforms = createInMemoryPlatformRegistry();
  expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
  const declarations = createInMemoryHealthRegistry({ platforms });
  expect(
    declarations.register({
      health: {
        platformId: "example",
        reportsStatus: true,
        probeRef: "probe.example.health",
      },
    }).ok,
  ).toBe(true);
  const observations = createInMemoryHealthReporter({ platforms });
  const historyResult = createInMemoryHealthObservationHistory({
    platforms,
    capacity: 3,
  });
  expect(historyResult.ok).toBe(true);
  const history = historyResult.history!;
  return { platforms, declarations, observations, history };
}

describe("um.core state concurrency/immutability hardening", () => {
  it("P17 reporter + P22 history share input/return isolation contract", () => {
    const { observations, history } = assembleHealthStack();
    const snapshot = validSnapshot({
      checkedAt: "t-iso",
      affectedCapabilityIds: ["example.core.ping"],
      dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
    });

    expect(observations.report(snapshot).ok).toBe(true);
    expect(history.record(snapshot).ok).toBe(true);

    const mutableSnapshot = snapshot as unknown as {
      checkedAt: string;
      affectedCapabilityIds: string[];
      dependencyStatuses: Array<{ targetId: string; status: string }>;
    };
    mutableSnapshot.affectedCapabilityIds.push("example.core.extra");
    mutableSnapshot.dependencyStatuses[0]!.status = "unavailable";
    mutableSnapshot.checkedAt = "mutated";

    expect(observations.getSnapshot("example")?.checkedAt).toBe("t-iso");
    expect(observations.getSnapshot("example")?.affectedCapabilityIds).toEqual([
      "example.core.ping",
    ]);
    expect(history.getLatest("example")?.checkedAt).toBe("t-iso");
    expect(history.getHistory("example")[0]?.dependencyStatuses).toEqual([
      { targetId: "um.core", status: "ready" },
    ]);
  });

  it("diagnostics join and fleet aggregation do not mutate observation store", () => {
    const { platforms, declarations, observations } = assembleHealthStack();
    expect(observations.report(validSnapshot({ checkedAt: "join-t1" })).ok).toBe(
      true,
    );

    const join = createHealthDiagnosticsJoin({
      platforms,
      declarations,
      observations,
    });
    const fleet = createFleetHealthAggregation({
      platforms,
      observations,
      declarations,
    });

    const before = observations.getSnapshot("example");
    const view1 = join.evaluate();
    const view2 = join.evaluate();
    const fleet1 = fleet.evaluate();
    const fleet2 = aggregateFleetHealth({
      platforms,
      observations,
      declarations,
    });

    expect(view1).toEqual(view2);
    expect(fleet1).toEqual(fleet2);
    expect(observations.getSnapshot("example")).toEqual(before);
    expect(observations.size()).toBe(1);

    // Mutating a join/fleet-derived view must not leak into P17.
    (view1.rows[0] as { checkedAt: string | null }).checkedAt = "mutated-join";
    (fleet1.members[0] as { checkedAt?: string }).checkedAt = "mutated-fleet";
    expect(observations.getSnapshot("example")?.checkedAt).toBe("join-t1");
  });

  it("duplicate report replaces last snapshot deterministically; history appends", () => {
    const { observations, history } = assembleHealthStack();
    expect(
      observations.report(validSnapshot({ checkedAt: "r1", status: "ready" }))
        .ok,
    ).toBe(true);
    expect(
      observations.report(
        validSnapshot({ checkedAt: "r2", status: "degraded", detail: "next" }),
      ).ok,
    ).toBe(true);
    expect(observations.size()).toBe(1);
    expect(observations.getSnapshot("example")).toEqual(
      validSnapshot({ checkedAt: "r2", status: "degraded", detail: "next" }),
    );

    expect(history.record(validSnapshot({ checkedAt: "h1" })).ok).toBe(true);
    expect(history.record(validSnapshot({ checkedAt: "h2" })).ok).toBe(true);
    expect(history.getHistory("example").map((s) => s.checkedAt)).toEqual([
      "h1",
      "h2",
    ]);
  });

  it("clear/reset semantics are deterministic across reporter and history", () => {
    const { observations, history } = assembleHealthStack();
    expect(observations.report(validSnapshot({ checkedAt: "c1" })).ok).toBe(
      true,
    );
    expect(history.record(validSnapshot({ checkedAt: "c1" })).ok).toBe(true);

    observations.clear();
    history.clear();

    expect(observations.size()).toBe(0);
    expect(observations.list()).toEqual([]);
    expect(observations.getSnapshot("example")).toBeUndefined();
    expect(history.entryCount()).toBe(0);
    expect(history.getHistory("example")).toEqual([]);
    expect(history.listPlatformIds()).toEqual([]);
  });

  it("async interleaved callers do not expose shared mutable snapshot aliases", async () => {
    const { observations } = assembleHealthStack();
    expect(observations.report(validSnapshot({ checkedAt: "async-0" })).ok).toBe(
      true,
    );

    const tasks = Array.from({ length: 8 }, async (_, i) => {
      const local = observations.getSnapshot("example");
      expect(local).toBeDefined();
      (local as { detail: string }).detail = `mutated-${i}`;
      (local!.affectedCapabilityIds as string[]).push(`cap.${i}`);
      await Promise.resolve();
      return local!.detail;
    });

    await Promise.all(tasks);
    const stored = observations.getSnapshot("example");
    expect(stored?.detail).toBe("ok");
    expect(stored?.affectedCapabilityIds).toEqual(["example.core.ping"]);
    expect(stored?.checkedAt).toBe("async-0");
  });
});
