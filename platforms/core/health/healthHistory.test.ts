/**
 * Focused UM Core P22 bounded health observation history tests.
 * BOUNDED HISTORY IS NOT LAST-SNAPSHOT SoT / PROBE EXECUTION / DURABLE TELEMETRY.
 */

import { describe, expect, it } from "vitest";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  createInMemoryHealthObservationHistory,
  type UmInMemoryHealthObservationHistory,
} from "./healthHistory";
import { UmHealthHistoryCode } from "./healthHistoryCodes";
import type { UmHealthSnapshot } from "./types";

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

function assembleHistory(capacity = 3): {
  history: UmInMemoryHealthObservationHistory;
  platforms: ReturnType<typeof createInMemoryPlatformRegistry>;
} {
  const platforms = createInMemoryPlatformRegistry();
  expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
  expect(
    platforms.register({
      manifest: validManifest({
        platformId: "other",
        modules: [
          {
            moduleId: "other.core",
            displayName: "Other",
            capabilityIds: ["other.core.ping"],
          },
        ],
        capabilities: [
          {
            capabilityId: "other.core.ping",
            moduleId: "other.core",
            displayName: "Ping",
            sideEffectClasses: ["read"],
            stability: "stable",
            version: "1.0.0",
          },
        ],
        providesEvents: [
          {
            eventType: "other.core.pinged",
            schemaVersion: "1.0.0",
            stability: "stable",
          },
        ],
        flags: [
          {
            flagId: "other.core.enabled",
            defaultState: "off",
            linkedCapabilityIds: ["other.core.ping"],
            dangerElevated: false,
          },
        ],
      }),
    }).ok,
  ).toBe(true);

  const created = createInMemoryHealthObservationHistory({
    platforms,
    capacity,
  });
  expect(created.ok).toBe(true);
  if (!created.ok) {
    throw new Error("expected history create ok");
  }
  return { history: created.history, platforms };
}

describe("um.core P22 bounded health observation history", () => {
  it("rejects invalid capacity and creates no store", () => {
    const platforms = createInMemoryPlatformRegistry();
    for (const capacity of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const created = createInMemoryHealthObservationHistory({
        platforms,
        capacity,
      });
      expect(created.ok).toBe(false);
      if (created.ok) continue;
      expect(created.history).toBeUndefined();
      expect(created.findings.map((f) => f.code)).toEqual([
        UmHealthHistoryCode.CAPACITY_INVALID,
      ]);
    }
  });

  it("starts empty with explicit capacity", () => {
    const { history } = assembleHistory(2);
    expect(history.capacity()).toBe(2);
    expect(history.platformCount()).toBe(0);
    expect(history.entryCount()).toBe(0);
    expect(history.listPlatformIds()).toEqual([]);
    expect(history.getHistory("example")).toEqual([]);
    expect(history.getLatest("example")).toBeUndefined();
    expect(history.has("example")).toBe(false);
  });

  it("appends successful observations in call order (oldest→newest)", () => {
    const { history } = assembleHistory(5);
    const a = validSnapshot({ checkedAt: "t1", status: "ready" });
    const b = validSnapshot({ checkedAt: "t2", status: "degraded" });
    const c = validSnapshot({ checkedAt: "t3", status: "unavailable" });

    expect(history.record(a)).toMatchObject({
      ok: true,
      retainedCount: 1,
      evicted: false,
    });
    expect(history.record(b)).toMatchObject({
      ok: true,
      retainedCount: 2,
      evicted: false,
    });
    expect(history.record(c)).toMatchObject({
      ok: true,
      retainedCount: 3,
      evicted: false,
    });

    expect(history.getHistory("example").map((s) => s.checkedAt)).toEqual([
      "t1",
      "t2",
      "t3",
    ]);
    expect(history.getLatest("example")?.checkedAt).toBe("t3");
    expect(history.entryCount()).toBe(3);
  });

  it("evicts oldest deterministically when capacity is exceeded", () => {
    const { history } = assembleHistory(2);
    expect(
      history.record(validSnapshot({ checkedAt: "t1" })).evicted,
    ).toBe(false);
    expect(
      history.record(validSnapshot({ checkedAt: "t2" })).evicted,
    ).toBe(false);
    const third = history.record(validSnapshot({ checkedAt: "t3" }));
    expect(third).toMatchObject({
      ok: true,
      retainedCount: 2,
      evicted: true,
    });
    expect(history.getHistory("example").map((s) => s.checkedAt)).toEqual([
      "t2",
      "t3",
    ]);
    expect(history.getLatest("example")?.checkedAt).toBe("t3");
  });

  it("appends duplicate payloads as distinct ring entries (no dedupe)", () => {
    const { history } = assembleHistory(3);
    const dup = validSnapshot({ checkedAt: "same", detail: "dup" });
    expect(history.record(dup).ok).toBe(true);
    expect(history.record(dup).ok).toBe(true);
    expect(history.record(dup).ok).toBe(true);
    const ring = history.getHistory("example");
    expect(ring).toHaveLength(3);
    expect(ring.every((s) => s.checkedAt === "same")).toBe(true);
    // Fourth identical append evicts oldest duplicate
    expect(history.record(dup)).toMatchObject({
      ok: true,
      retainedCount: 3,
      evicted: true,
    });
    expect(history.getHistory("example")).toHaveLength(3);
  });

  it("isolates rings by platform identity", () => {
    const { history } = assembleHistory(2);
    expect(
      history.record(validSnapshot({ platformId: "example", checkedAt: "e1" }))
        .ok,
    ).toBe(true);
    expect(
      history.record(
        validSnapshot({
          platformId: "other",
          checkedAt: "o1",
          affectedCapabilityIds: ["other.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    expect(
      history.record(validSnapshot({ platformId: "example", checkedAt: "e2" }))
        .ok,
    ).toBe(true);

    expect(history.getHistory("example").map((s) => s.checkedAt)).toEqual([
      "e1",
      "e2",
    ]);
    expect(history.getHistory("other").map((s) => s.checkedAt)).toEqual(["o1"]);
    expect(history.listPlatformIds()).toEqual(["example", "other"]);
    expect(history.platformCount()).toBe(2);
    expect(history.entryCount()).toBe(3);
  });

  it("rejects unknown / invalid platform ids without mutating state", () => {
    const { history } = assembleHistory(2);
    const before = history.entryCount();

    const unknown = history.record(
      validSnapshot({ platformId: "missing" }),
    );
    expect(unknown.ok).toBe(false);
    expect(unknown.findings.map((f) => f.code)).toEqual([
      UmHealthHistoryCode.UNKNOWN_PLATFORM,
    ]);

    const badName = history.record(
      validSnapshot({ platformId: "Bad Name" }),
    );
    expect(badName.ok).toBe(false);
    expect(badName.findings.some((f) => f.code === UmHealthHistoryCode.PLATFORM_ID_NAMING)).toBe(
      true,
    );

    const emptyId = history.record(validSnapshot({ platformId: "" }));
    expect(emptyId.ok).toBe(false);
    expect(
      emptyId.findings.some(
        (f) => f.code === UmHealthHistoryCode.PLATFORM_ID_REQUIRED,
      ),
    ).toBe(true);

    expect(history.entryCount()).toBe(before);
    expect(history.getHistory("missing")).toEqual([]);
  });

  it("rejects invalid status / snapshot structure without mutation", () => {
    const { history } = assembleHistory(2);
    const badStatus = history.record(
      validSnapshot({ status: "healthy" as UmHealthSnapshot["status"] }),
    );
    expect(badStatus.ok).toBe(false);
    expect(badStatus.findings.map((f) => f.code)).toContain(
      UmHealthHistoryCode.STATUS_INVALID,
    );

    const badCheckedAt = history.record(
      validSnapshot({ checkedAt: "   " }),
    );
    expect(badCheckedAt.ok).toBe(false);
    expect(badCheckedAt.findings.map((f) => f.code)).toContain(
      UmHealthHistoryCode.SNAPSHOT_INVALID,
    );

    expect(history.entryCount()).toBe(0);
  });

  it("returns defensive clones from queries (store not mutated by caller)", () => {
    const { history } = assembleHistory(2);
    history.record(validSnapshot({ checkedAt: "t1" }));
    const listed = history.getHistory("example");
    const latest = history.getLatest("example");
    expect(listed[0]).toBeDefined();
    expect(latest).toBeDefined();
    (listed[0] as { checkedAt: string }).checkedAt = "mutated";
    (latest as { detail: string }).detail = "mutated";
    expect(history.getHistory("example")[0]?.checkedAt).toBe("t1");
    expect(history.getLatest("example")?.detail).toBe("ok");
  });

  it("clear and clearPlatform restore empty-state semantics", () => {
    const { history } = assembleHistory(3);
    history.record(validSnapshot({ platformId: "example", checkedAt: "e1" }));
    history.record(
      validSnapshot({
        platformId: "other",
        checkedAt: "o1",
        affectedCapabilityIds: ["other.core.ping"],
      }),
    );

    history.clearPlatform("example");
    expect(history.has("example")).toBe(false);
    expect(history.getHistory("example")).toEqual([]);
    expect(history.has("other")).toBe(true);

    history.clear();
    expect(history.platformCount()).toBe(0);
    expect(history.entryCount()).toBe(0);
    expect(history.listPlatformIds()).toEqual([]);
  });

  it("is deterministic across identical record sequences", () => {
    const run = () => {
      const { history } = assembleHistory(2);
      history.record(validSnapshot({ checkedAt: "a", status: "ready" }));
      history.record(validSnapshot({ checkedAt: "b", status: "degraded" }));
      history.record(validSnapshot({ checkedAt: "c", status: "unavailable" }));
      return {
        history: history.getHistory("example").map((s) => ({
          checkedAt: s.checkedAt,
          status: s.status,
        })),
        latest: history.getLatest("example")?.checkedAt,
        entryCount: history.entryCount(),
      };
    };
    expect(run()).toEqual(run());
  });

  it("does not expose probe / network / persistence APIs", () => {
    const { history } = assembleHistory(1);
    const keys = Object.keys(history).sort();
    expect(keys).toEqual([
      "capacity",
      "clear",
      "clearPlatform",
      "entryCount",
      "getHistory",
      "getLatest",
      "has",
      "listPlatformIds",
      "platformCount",
      "record",
    ]);
    expect(keys).not.toContain("report");
    expect(keys).not.toContain("poll");
    expect(keys).not.toContain("schedule");
    expect(keys).not.toContain("probe");
  });
});
