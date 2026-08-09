/**
 * UM Core P22 bounded health history — regression / edge-case matrix (A2).
 * TESTS ONLY. Does not change product semantics.
 *
 * FILES_AREAS_RESERVED:
 *   platforms/core/health/healthHistory.regression.test.ts
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

describe("um.core P22 health history regression / edge cases", () => {
  it("accepts minimum valid capacity (=1) with exact fill then +1 eviction", () => {
    const { history } = assembleHistory(1);
    expect(history.capacity()).toBe(1);

    const first = history.record(validSnapshot({ checkedAt: "t1" }));
    expect(first).toMatchObject({
      ok: true,
      retainedCount: 1,
      evicted: false,
    });
    expect(history.getHistory("example").map((s) => s.checkedAt)).toEqual([
      "t1",
    ]);
    expect(history.getLatest("example")?.checkedAt).toBe("t1");

    const second = history.record(validSnapshot({ checkedAt: "t2" }));
    expect(second).toMatchObject({
      ok: true,
      retainedCount: 1,
      evicted: true,
    });
    expect(history.getHistory("example").map((s) => s.checkedAt)).toEqual([
      "t2",
    ]);
    expect(history.entryCount()).toBe(1);
  });

  it("rejects zero / negative / non-integer / non-finite capacity without a store", () => {
    const platforms = createInMemoryPlatformRegistry();
    const invalidCapacities = [
      0,
      -1,
      -100,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];
    for (const capacity of invalidCapacities) {
      const created = createInMemoryHealthObservationHistory({
        platforms,
        capacity,
      });
      expect(created.ok).toBe(false);
      if (created.ok) continue;
      expect(created.history).toBeUndefined();
      expect(created.findings).toEqual([
        expect.objectContaining({
          code: UmHealthHistoryCode.CAPACITY_INVALID,
          path: "capacity",
        }),
      ]);
    }
  });

  it("fills exactly to capacity without eviction, then capacity+1 evicts oldest", () => {
    const capacity = 4;
    const { history } = assembleHistory(capacity);

    for (let i = 1; i <= capacity; i += 1) {
      const result = history.record(
        validSnapshot({ checkedAt: `t${i}` }),
      );
      expect(result).toMatchObject({
        ok: true,
        retainedCount: i,
        evicted: false,
      });
    }

    expect(history.getHistory("example").map((s) => s.checkedAt)).toEqual([
      "t1",
      "t2",
      "t3",
      "t4",
    ]);
    expect(history.entryCount()).toBe(capacity);

    const overflow = history.record(validSnapshot({ checkedAt: "t5" }));
    expect(overflow).toMatchObject({
      ok: true,
      retainedCount: capacity,
      evicted: true,
    });
    expect(history.getHistory("example").map((s) => s.checkedAt)).toEqual([
      "t2",
      "t3",
      "t4",
      "t5",
    ]);
    expect(history.getLatest("example")?.checkedAt).toBe("t5");
  });

  it("retains repeated platform observations in deterministic call order", () => {
    const { history } = assembleHistory(5);
    const statuses: Array<UmHealthSnapshot["status"]> = [
      "ready",
      "degraded",
      "unavailable",
      "ready",
    ];
    statuses.forEach((status, index) => {
      expect(
        history.record(
          validSnapshot({
            checkedAt: `obs-${index}`,
            status,
          }),
        ).ok,
      ).toBe(true);
    });

    expect(
      history.getHistory("example").map((s) => ({
        checkedAt: s.checkedAt,
        status: s.status,
      })),
    ).toEqual([
      { checkedAt: "obs-0", status: "ready" },
      { checkedAt: "obs-1", status: "degraded" },
      { checkedAt: "obs-2", status: "unavailable" },
      { checkedAt: "obs-3", status: "ready" },
    ]);
  });

  it("returns empty-state for unknown / never-recorded platform queries", () => {
    const { history } = assembleHistory(3);

    expect(history.getHistory("missing")).toEqual([]);
    expect(history.getLatest("missing")).toBeUndefined();
    expect(history.has("missing")).toBe(false);

    expect(history.getHistory("example")).toEqual([]);
    expect(history.getLatest("example")).toBeUndefined();
    expect(history.has("example")).toBe(false);
    expect(history.listPlatformIds()).toEqual([]);
    expect(history.platformCount()).toBe(0);
    expect(history.entryCount()).toBe(0);
  });

  it("keeps approved duplicate-observation semantics (append, no dedupe/replace)", () => {
    const { history } = assembleHistory(2);
    const dup = validSnapshot({
      checkedAt: "same-ts",
      detail: "same-detail",
      status: "degraded",
    });

    expect(history.record(dup)).toMatchObject({
      ok: true,
      retainedCount: 1,
      evicted: false,
    });
    expect(history.record(dup)).toMatchObject({
      ok: true,
      retainedCount: 2,
      evicted: false,
    });
    expect(history.getHistory("example")).toHaveLength(2);
    expect(history.getHistory("example").every((s) => s.detail === "same-detail")).toBe(
      true,
    );

    // Third identical append must evict one duplicate, not collapse to one entry
    expect(history.record(dup)).toMatchObject({
      ok: true,
      retainedCount: 2,
      evicted: true,
    });
    expect(history.getHistory("example")).toHaveLength(2);
  });

  it("returns immutable/read-only query results including nested collections", () => {
    const { history } = assembleHistory(2);
    history.record(
      validSnapshot({
        checkedAt: "t1",
        affectedCapabilityIds: ["example.core.ping"],
        dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
        detail: "nested-ok",
      }),
    );

    const listed = history.getHistory("example");
    const latest = history.getLatest("example");
    expect(listed[0]).toBeDefined();
    expect(latest).toBeDefined();

    (listed[0] as { checkedAt: string }).checkedAt = "mutated";
    (listed[0]!.affectedCapabilityIds as string[]).push(
      "example.core.forged",
    );
    (
      listed[0]!.dependencyStatuses[0] as {
        targetId: string;
        status: UmHealthSnapshot["status"];
      }
    ).status = "unavailable";
    (latest as { detail: string }).detail = "mutated-latest";
    (latest!.affectedCapabilityIds as string[])[0] = "mutated-cap";

    const reread = history.getHistory("example")[0]!;
    expect(reread.checkedAt).toBe("t1");
    expect(reread.detail).toBe("nested-ok");
    expect(reread.affectedCapabilityIds).toEqual(["example.core.ping"]);
    expect(reread.dependencyStatuses).toEqual([
      { targetId: "um.core", status: "ready" },
    ]);
    expect(history.getLatest("example")?.detail).toBe("nested-ok");
  });

  it("isolates rings across platforms under interleaved records and eviction", () => {
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
    expect(
      history.record(
        validSnapshot({
          platformId: "other",
          checkedAt: "o2",
          affectedCapabilityIds: ["other.core.ping"],
        }),
      ).ok,
    ).toBe(true);

    const exampleOverflow = history.record(
      validSnapshot({ platformId: "example", checkedAt: "e3" }),
    );
    expect(exampleOverflow).toMatchObject({
      ok: true,
      retainedCount: 2,
      evicted: true,
    });

    expect(history.getHistory("example").map((s) => s.checkedAt)).toEqual([
      "e2",
      "e3",
    ]);
    expect(history.getHistory("other").map((s) => s.checkedAt)).toEqual([
      "o1",
      "o2",
    ]);
    expect(history.listPlatformIds()).toEqual(["example", "other"]);
    expect(history.entryCount()).toBe(4);
  });

  it("keeps large-but-reasonable capacity strictly bounded (no hidden growth)", () => {
    const capacity = 64;
    const { history } = assembleHistory(capacity);
    const totalInserts = capacity + 40;

    for (let i = 0; i < totalInserts; i += 1) {
      const result = history.record(
        validSnapshot({ checkedAt: `t${i}` }),
      );
      expect(result.ok).toBe(true);
      expect(result.retainedCount).toBeLessThanOrEqual(capacity);
      expect(result.evicted).toBe(i >= capacity);
    }

    const ring = history.getHistory("example");
    expect(ring).toHaveLength(capacity);
    expect(history.entryCount()).toBe(capacity);
    expect(ring[0]?.checkedAt).toBe(`t${totalInserts - capacity}`);
    expect(ring[ring.length - 1]?.checkedAt).toBe(`t${totalInserts - 1}`);
  });

  it("rejects invalid identity without mutating empty history", () => {
    const { history } = assembleHistory(3);
    expect(history.entryCount()).toBe(0);

    const cases: Array<{ snap: UmHealthSnapshot; code: string }> = [
      {
        snap: validSnapshot({ platformId: "" }),
        code: UmHealthHistoryCode.PLATFORM_ID_REQUIRED,
      },
      {
        snap: validSnapshot({ platformId: "Bad Name" }),
        code: UmHealthHistoryCode.PLATFORM_ID_NAMING,
      },
      {
        snap: validSnapshot({ platformId: "missing" }),
        code: UmHealthHistoryCode.UNKNOWN_PLATFORM,
      },
    ];

    for (const { snap, code } of cases) {
      const result = history.record(snap);
      expect(result.ok).toBe(false);
      expect(result.evicted).toBe(false);
      expect(result.retainedCount).toBe(0);
      expect(result.findings.some((f) => f.code === code)).toBe(true);
    }

    expect(history.entryCount()).toBe(0);
    expect(history.platformCount()).toBe(0);
    expect(history.listPlatformIds()).toEqual([]);
    expect(history.has("missing")).toBe(false);
    expect(history.getHistory("missing")).toEqual([]);
  });

  it("failed records never create platform rings or grow entry counts", () => {
    const { history } = assembleHistory(2);
    history.record(validSnapshot({ checkedAt: "keep" }));

    const beforeIds = history.listPlatformIds();
    const beforeCount = history.entryCount();

    for (let i = 0; i < 20; i += 1) {
      expect(
        history.record(validSnapshot({ platformId: "missing", checkedAt: `x${i}` }))
          .ok,
      ).toBe(false);
      expect(
        history.record(
          validSnapshot({
            checkedAt: `bad-${i}`,
            status: "healthy" as UmHealthSnapshot["status"],
          }),
        ).ok,
      ).toBe(false);
    }

    expect(history.listPlatformIds()).toEqual(beforeIds);
    expect(history.entryCount()).toBe(beforeCount);
    expect(history.getHistory("example").map((s) => s.checkedAt)).toEqual([
      "keep",
    ]);
  });

  it("exposes no persistence / DB / network / scheduler surface", () => {
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

    const forbidden = [
      "save",
      "load",
      "persist",
      "fetch",
      "request",
      "http",
      "sql",
      "db",
      "query",
      "migrate",
      "schedule",
      "setInterval",
      "setTimeout",
      "poll",
      "probe",
      "subscribe",
      "publish",
      "network",
    ];
    for (const name of forbidden) {
      expect(keys).not.toContain(name);
    }
  });
});
