/**
 * Focused UM Core P17 health reporter tests.
 * HEALTH REPORTING IS NOT HEALTH DECLARATION REGISTRATION.
 * HEALTH REPORTING IS NOT PROBE EXECUTION.
 */

import { describe, expect, it } from "vitest";
import type { UmCapabilityAsserter } from "../capability/types";
import type { UmDependencyValidator } from "../dependency/types";
import type { UmEventPublisher } from "../event/types";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import type { UmCoreSdkClient } from "../sdk";
import {
  UmHealthReportCode,
  UmHealthRegistryCode,
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

function assembleReporter() {
  const platforms = createInMemoryPlatformRegistry();
  expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
  const reporter = createInMemoryHealthReporter({ platforms });
  return { platforms, reporter };
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

describe("um.core P17 in-memory health reporter", () => {
  it("accepts a valid snapshot for a registered platform", () => {
    const { reporter } = assembleReporter();
    const snapshot = validSnapshot();
    const result = reporter.report(snapshot);
    expect(result).toEqual({
      ok: true,
      platformId: "example",
      findings: [],
    });
    expect(reporter.getSnapshot("example")).toEqual(snapshot);
    expect(reporter.has("example")).toBe(true);
    expect(reporter.size()).toBe(1);
  });

  it("rejects unregistered platforms and stores nothing", () => {
    const { reporter } = assembleReporter();
    const result = reporter.report(
      validSnapshot({ platformId: "missing" }),
    );
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmHealthReportCode.UNKNOWN_PLATFORM,
    );
    expect(reporter.getSnapshot("missing")).toBeUndefined();
    expect(reporter.size()).toBe(0);
  });

  it("rejects invalid platformId naming and empty platformId", () => {
    const { reporter } = assembleReporter();
    const empty = reporter.report(validSnapshot({ platformId: "  " }));
    expect(empty.ok).toBe(false);
    expect(empty.findings.map((f) => f.code)).toContain(
      UmHealthReportCode.PLATFORM_ID_REQUIRED,
    );

    const bad = reporter.report(validSnapshot({ platformId: "Bad-Id" }));
    expect(bad.ok).toBe(false);
    expect(bad.findings.map((f) => f.code)).toContain(
      UmHealthReportCode.PLATFORM_ID_NAMING,
    );
    expect(reporter.size()).toBe(0);
  });

  it("rejects invalid status values using Standards taxonomy only", () => {
    const { reporter } = assembleReporter();
    const result = reporter.report(
      validSnapshot({ status: "healthy" as UmHealthSnapshot["status"] }),
    );
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmHealthReportCode.STATUS_INVALID,
    );
    expect(reporter.getSnapshot("example")).toBeUndefined();
  });

  it("rejects structural snapshot defects fail-closed", () => {
    const { reporter } = assembleReporter();
    const cases: Array<{
      label: string;
      snapshot: UmHealthSnapshot;
      code: string;
      path: string;
    }> = [
      {
        label: "empty checkedAt",
        snapshot: validSnapshot({ checkedAt: "" }),
        code: UmHealthReportCode.SNAPSHOT_INVALID,
        path: "checkedAt",
      },
      {
        label: "invalid capability id",
        snapshot: validSnapshot({
          affectedCapabilityIds: ["Not.Valid-Id"],
        }),
        code: UmHealthReportCode.SNAPSHOT_INVALID,
        path: "affectedCapabilityIds[0]",
      },
      {
        label: "empty dependency targetId",
        snapshot: validSnapshot({
          dependencyStatuses: [{ targetId: " ", status: "ready" }],
        }),
        code: UmHealthReportCode.SNAPSHOT_INVALID,
        path: "dependencyStatuses[0].targetId",
      },
      {
        label: "invalid dependency status",
        snapshot: validSnapshot({
          dependencyStatuses: [
            {
              targetId: "um.core",
              status: "unknown" as UmHealthSnapshot["status"],
            },
          ],
        }),
        code: UmHealthReportCode.STATUS_INVALID,
        path: "dependencyStatuses[0].status",
      },
    ];

    for (const c of cases) {
      const result = reporter.report(c.snapshot);
      expect(result.ok, c.label).toBe(false);
      expect(
        result.findings.some((f) => f.code === c.code && f.path === c.path),
        c.label,
      ).toBe(true);
    }
    expect(reporter.size()).toBe(0);
  });

  it("replaces prior observation for the same platform deterministically", () => {
    const { reporter } = assembleReporter();
    expect(reporter.report(validSnapshot({ status: "ready" })).ok).toBe(true);
    const next = validSnapshot({
      status: "degraded",
      checkedAt: "2026-08-09T13:00:00.000Z",
      detail: "partial",
    });
    expect(reporter.report(next).ok).toBe(true);
    expect(reporter.size()).toBe(1);
    expect(reporter.getSnapshot("example")).toEqual(next);
  });

  it("lists snapshots in deterministic platformId order", () => {
    const platforms = createInMemoryPlatformRegistry();
    expect(
      platforms.register({
        manifest: validManifest({
          platformId: "zeta",
          modules: [
            {
              moduleId: "zeta.core",
              displayName: "Zeta",
              capabilityIds: ["zeta.core.ping"],
            },
          ],
          capabilities: [
            {
              capabilityId: "zeta.core.ping",
              moduleId: "zeta.core",
              displayName: "Ping",
              sideEffectClasses: ["read"],
              stability: "stable",
              version: "1.0.0",
            },
          ],
          providesEvents: [
            {
              eventType: "zeta.core.pinged",
              schemaVersion: "1.0.0",
              stability: "stable",
            },
          ],
          flags: [
            {
              flagId: "zeta.core.enabled",
              defaultState: "off",
              linkedCapabilityIds: ["zeta.core.ping"],
              dangerElevated: false,
            },
          ],
        }),
      }).ok,
    ).toBe(true);
    expect(
      platforms.register({
        manifest: validManifest({
          platformId: "alpha",
          modules: [
            {
              moduleId: "alpha.core",
              displayName: "Alpha",
              capabilityIds: ["alpha.core.ping"],
            },
          ],
          capabilities: [
            {
              capabilityId: "alpha.core.ping",
              moduleId: "alpha.core",
              displayName: "Ping",
              sideEffectClasses: ["read"],
              stability: "stable",
              version: "1.0.0",
            },
          ],
          providesEvents: [
            {
              eventType: "alpha.core.pinged",
              schemaVersion: "1.0.0",
              stability: "stable",
            },
          ],
          flags: [
            {
              flagId: "alpha.core.enabled",
              defaultState: "off",
              linkedCapabilityIds: ["alpha.core.ping"],
              dangerElevated: false,
            },
          ],
        }),
      }).ok,
    ).toBe(true);

    const reporter = createInMemoryHealthReporter({ platforms });
    expect(
      reporter.report(
        validSnapshot({
          platformId: "zeta",
          affectedCapabilityIds: ["zeta.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    expect(
      reporter.report(
        validSnapshot({
          platformId: "alpha",
          affectedCapabilityIds: ["alpha.core.ping"],
          status: "unavailable",
        }),
      ).ok,
    ).toBe(true);

    expect(reporter.list().map((s) => s.platformId)).toEqual([
      "alpha",
      "zeta",
    ]);
  });

  it("does not treat P10 declarations as live health evidence", () => {
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
    expect(declarations.get("example")?.reportsStatus).toBe(true);

    const reporter = createInMemoryHealthReporter({ platforms });
    expect(reporter.getSnapshot("example")).toBeUndefined();
    expect(reporter.has("example")).toBe(false);

    // Declaration catalog remains unchanged by reporter absence/presence.
    expect(declarations.size()).toBe(1);
    expect(
      declarations
        .list()
        .every((row) =>
          [true, false].includes(row.reportsStatus),
        ),
    ).toBe(true);
    expect(
      declarations.register({
        health: {
          platformId: "example",
          reportsStatus: true,
          probeRef: "probe.example.health",
        },
      }).findings.some(
        (f) => f.code === UmHealthRegistryCode.DUPLICATE_PLATFORM,
      ),
    ).toBe(true);
  });

  it("is deterministic for identical valid snapshots", () => {
    const { reporter } = assembleReporter();
    const snapshot = Object.freeze({
      ...validSnapshot({
        affectedCapabilityIds: Object.freeze([
          "example.core.ping",
        ]) as readonly string[],
        dependencyStatuses: Object.freeze([
          Object.freeze({ targetId: "um.core", status: "ready" as const }),
        ]) as UmHealthSnapshot["dependencyStatuses"],
      }),
    });
    const a = reporter.report(snapshot);
    reporter.clear();
    const b = reporter.report(snapshot);
    expect(a).toEqual(b);
    expect(a.ok).toBe(true);
  });

  it("isolates stored snapshots from caller input mutation after report", () => {
    const { reporter } = assembleReporter();
    const snapshot = validSnapshot({
      affectedCapabilityIds: ["example.core.ping"],
      dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
      detail: "original",
    });
    expect(reporter.report(snapshot).ok).toBe(true);

    const mutableInput = snapshot as unknown as {
      checkedAt: string;
      detail?: string;
      affectedCapabilityIds: string[];
      dependencyStatuses: Array<{ targetId: string; status: string }>;
    };
    mutableInput.checkedAt = "mutated-input";
    mutableInput.affectedCapabilityIds.push("example.core.extra");
    mutableInput.dependencyStatuses[0]!.status = "unavailable";
    mutableInput.detail = "mutated-input";

    const stored = reporter.getSnapshot("example");
    expect(stored?.checkedAt).toBe("2026-08-09T12:00:00.000Z");
    expect(stored?.affectedCapabilityIds).toEqual(["example.core.ping"]);
    expect(stored?.dependencyStatuses).toEqual([
      { targetId: "um.core", status: "ready" },
    ]);
    expect(stored?.detail).toBe("original");
  });

  it("returns defensive clones from getSnapshot/list (store not mutated by caller)", () => {
    const { reporter } = assembleReporter();
    expect(
      reporter.report(
        validSnapshot({
          checkedAt: "t1",
          affectedCapabilityIds: ["example.core.ping"],
          dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
          detail: "ok",
        }),
      ).ok,
    ).toBe(true);

    const got = reporter.getSnapshot("example");
    const listed = reporter.list();
    expect(got).toBeDefined();
    expect(listed).toHaveLength(1);

    const mutableGot = got as unknown as {
      checkedAt: string;
      detail?: string;
      affectedCapabilityIds: string[];
      dependencyStatuses: Array<{ targetId: string; status: string }>;
    };
    mutableGot.checkedAt = "mutated-get";
    mutableGot.detail = "mutated-get";
    mutableGot.affectedCapabilityIds.push("example.core.extra");
    mutableGot.dependencyStatuses[0]!.status = "unavailable";

    const mutableListed = listed[0] as unknown as {
      checkedAt: string;
      affectedCapabilityIds: string[];
      dependencyStatuses: Array<{ targetId: string; status: string }>;
    };
    mutableListed.checkedAt = "mutated-list";
    mutableListed.affectedCapabilityIds.push("example.core.list");
    mutableListed.dependencyStatuses[0]!.status = "degraded";

    const again = reporter.getSnapshot("example");
    expect(again?.checkedAt).toBe("t1");
    expect(again?.detail).toBe("ok");
    expect(again?.affectedCapabilityIds).toEqual(["example.core.ping"]);
    expect(again?.dependencyStatuses).toEqual([
      { targetId: "um.core", status: "ready" },
    ]);
    expect(reporter.list()[0]?.checkedAt).toBe("t1");
    expect(reporter.list()[0]?.affectedCapabilityIds).toEqual([
      "example.core.ping",
    ]);
  });

  it("keeps independent reporter instances isolated", () => {
    const platforms = createInMemoryPlatformRegistry();
    expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
    const a = createInMemoryHealthReporter({ platforms });
    const b = createInMemoryHealthReporter({ platforms });

    expect(a.report(validSnapshot({ checkedAt: "a1", detail: "a" })).ok).toBe(
      true,
    );
    expect(b.report(validSnapshot({ checkedAt: "b1", detail: "b" })).ok).toBe(
      true,
    );

    expect(a.getSnapshot("example")?.detail).toBe("a");
    expect(b.getSnapshot("example")?.detail).toBe("b");
    a.clear();
    expect(a.size()).toBe(0);
    expect(b.size()).toBe(1);
    expect(b.getSnapshot("example")?.checkedAt).toBe("b1");
  });

  it("repeated reads are deep-equal and list ordering is stable", () => {
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
          health: { reportsStatus: true, probeRef: "probe.other.health" },
        }),
      }).ok,
    ).toBe(true);
    const reporter = createInMemoryHealthReporter({ platforms });

    expect(
      reporter.report(
        validSnapshot({
          platformId: "other",
          checkedAt: "o1",
          affectedCapabilityIds: ["other.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    expect(
      reporter.report(validSnapshot({ platformId: "example", checkedAt: "e1" }))
        .ok,
    ).toBe(true);

    const first = reporter.list();
    const second = reporter.list();
    expect(first.map((s) => s.platformId)).toEqual(["example", "other"]);
    expect(second).toEqual(first);
    expect(reporter.getSnapshot("example")).toEqual(
      reporter.getSnapshot("example"),
    );
  });

  it("clear empties observations and exposes no probe/poll surface", () => {
    const { reporter } = assembleReporter();
    expect(reporter.report(validSnapshot()).ok).toBe(true);
    reporter.clear();
    expect(reporter.size()).toBe(0);
    expect(reporter.list()).toEqual([]);
    expect(reporter.getSnapshot("example")).toBeUndefined();
    expect("registerProbe" in reporter).toBe(false);
    expect("poll" in reporter).toBe(false);
    expect("schedule" in reporter).toBe(false);
    expect("fetch" in reporter).toBe(false);
    expect("alert" in reporter).toBe(false);
  });

  it("orders findings deterministically and leaves other runtime ports untouched", () => {
    const { reporter } = assembleReporter();
    const result = reporter.report({
      platformId: "",
      status: "healthy" as UmHealthSnapshot["status"],
      checkedAt: "",
      affectedCapabilityIds: ["Bad Id"],
      dependencyStatuses: [{ targetId: "", status: "unknown" as never }],
    });
    expect(result.ok).toBe(false);
    const findings = result.findings;
    for (let i = 1; i < findings.length; i += 1) {
      const a = findings[i - 1]!;
      const b = findings[i]!;
      const code = a.code.localeCompare(b.code);
      if (code === 0) {
        const path = (a.path ?? "").localeCompare(b.path ?? "");
        if (path === 0) {
          expect(a.message.localeCompare(b.message)).toBeLessThanOrEqual(0);
        } else {
          expect(path).toBeLessThanOrEqual(0);
        }
      } else {
        expect(code).toBeLessThanOrEqual(0);
      }
    }

    const sdk: UmCoreSdkClient | undefined = undefined;
    const publisher: UmEventPublisher | undefined = undefined;
    const asserter: UmCapabilityAsserter | undefined = undefined;
    const depValidator: UmDependencyValidator | undefined = undefined;
    expect(sdk).toBeUndefined();
    expect(publisher).toBeUndefined();
    expect(asserter).toBeUndefined();
    expect(depValidator).toBeUndefined();
  });
});
