/**
 * Focused UM Core P20 fleet health aggregation tests.
 *
 * FLEET AGGREGATION IS NOT HEALTH MONITORING.
 * FLEET AGGREGATION IS NOT PROBE EXECUTION.
 * ABSENCE OF OBSERVATION IS NOT UNAVAILABLE.
 *
 * Mapping documentation (assignment wording → Core):
 * - healthy → ready (boundary only; not a Core token)
 * - unhealthy → unavailable (boundary only; not a Core token)
 * - unknown → observation absence (undefined status; not a Core token)
 */

import { describe, expect, it } from "vitest";
import type { UmPlatformManifest } from "../manifest/types";
import { createUmCoreRegistry } from "../registry/coreRegistry";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  UmFleetHealthAggregationCode,
  createFleetHealthAggregation,
  createHealthDiagnosticsJoin,
  createInMemoryHealthRegistry,
  createInMemoryHealthReporter,
  aggregateFleetHealth,
  aggregateFleetHealthFromMembers,
  type UmFleetHealthMemberInput,
  type UmHealthSnapshot,
} from "./index";
import { createInMemoryCapabilityRegistry } from "../capability";
import { createInMemoryDependencyRegistry } from "../dependency";
import { createInMemoryEventTypeRegistry } from "../event";
import { createInMemoryFlagRegistry } from "../flag";
import { createInMemoryNamingRegistry } from "../naming";

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

function platformManifest(
  platformId: string,
  capabilityLeaf = "ping",
  health: UmPlatformManifest["health"] = {
    reportsStatus: true,
    probeRef: `probe.${platformId}.health`,
  },
): UmPlatformManifest {
  const capabilityId = `${platformId}.core.${capabilityLeaf}`;
  return validManifest({
    platformId,
    modules: [
      {
        moduleId: `${platformId}.core`,
        displayName: `${platformId} Core`,
        capabilityIds: [capabilityId],
      },
    ],
    capabilities: [
      {
        capabilityId,
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
    flags: [
      {
        flagId: `${platformId}.core.enabled`,
        defaultState: "off",
        linkedCapabilityIds: [capabilityId],
        dangerElevated: false,
      },
    ],
    health,
  });
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

function assembleFleet(platformIds: string[] = []) {
  const platforms = createInMemoryPlatformRegistry();
  for (const platformId of platformIds) {
    expect(platforms.register({ manifest: platformManifest(platformId) }).ok).toBe(
      true,
    );
  }
  const reporter = createInMemoryHealthReporter({ platforms });
  const declarations = createInMemoryHealthRegistry({ platforms });
  return { platforms, reporter, declarations };
}

describe("um.core P20 fleet health aggregation", () => {
  it("F1: empty P4 + empty P17 yields ok empty fleet with coverage none", () => {
    const { platforms, reporter } = assembleFleet();
    const result = aggregateFleetHealth({
      platforms,
      observations: reporter,
    });
    expect(result).toEqual({
      ok: true,
      fleetSize: 0,
      observedCount: 0,
      unobservedCount: 0,
      statusCounts: { ready: 0, degraded: 0, unavailable: 0 },
      expectedReporterUnobservedIds: [],
      undeclaredObservationIds: [],
      observedWorstStatus: undefined,
      coverage: "none",
      members: [],
      findings: [],
    });
  });

  it("F2: one platform without snapshot is unobserved (unknown → absence)", () => {
    const { platforms, reporter } = assembleFleet(["alpha"]);
    const result = aggregateFleetHealth({
      platforms,
      observations: reporter,
    });
    expect(result.ok).toBe(true);
    expect(result.fleetSize).toBe(1);
    expect(result.observedCount).toBe(0);
    expect(result.unobservedCount).toBe(1);
    expect(result.statusCounts).toEqual({
      ready: 0,
      degraded: 0,
      unavailable: 0,
    });
    expect(result.observedWorstStatus).toBeUndefined();
    expect(result.coverage).toBe("none");
    expect(result.members[0]).toMatchObject({
      platformId: "alpha",
      observationStatus: undefined,
    });
  });

  it("F3: one ready snapshot → full coverage / worst ready (healthy→ready mapping)", () => {
    const { platforms, reporter } = assembleFleet(["alpha"]);
    expect(
      reporter.report(
        validSnapshot({
          platformId: "alpha",
          status: "ready",
          affectedCapabilityIds: ["alpha.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    const result = aggregateFleetHealth({
      platforms,
      observations: reporter,
    });
    expect(result.statusCounts.ready).toBe(1);
    expect(result.observedWorstStatus).toBe("ready");
    expect(result.coverage).toBe("full");
  });

  it("F4/F5: worst status ranks unavailable > degraded > ready", () => {
    const { platforms, reporter } = assembleFleet(["alpha", "beta", "gamma"]);
    expect(
      reporter.report(
        validSnapshot({
          platformId: "alpha",
          status: "ready",
          affectedCapabilityIds: ["alpha.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    expect(
      reporter.report(
        validSnapshot({
          platformId: "beta",
          status: "degraded",
          affectedCapabilityIds: ["beta.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    const partial = aggregateFleetHealth({
      platforms,
      observations: reporter,
    });
    expect(partial.observedWorstStatus).toBe("degraded");
    expect(partial.statusCounts).toEqual({
      ready: 1,
      degraded: 1,
      unavailable: 0,
    });

    expect(
      reporter.report(
        validSnapshot({
          platformId: "gamma",
          status: "unavailable",
          affectedCapabilityIds: ["gamma.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    const full = aggregateFleetHealth({
      platforms,
      observations: reporter,
    });
    expect(full.observedWorstStatus).toBe("unavailable");
    expect(full.coverage).toBe("full");
  });

  it("F6: mixed observed/unobserved → partial coverage; statusCounts sum = observedCount", () => {
    const { platforms, reporter } = assembleFleet(["alpha", "zeta"]);
    expect(
      reporter.report(
        validSnapshot({
          platformId: "zeta",
          status: "ready",
          affectedCapabilityIds: ["zeta.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    const result = aggregateFleetHealth({
      platforms,
      observations: reporter,
    });
    expect(result.coverage).toBe("partial");
    expect(result.observedCount).toBe(1);
    expect(result.unobservedCount).toBe(1);
    const sum =
      result.statusCounts.ready +
      result.statusCounts.degraded +
      result.statusCounts.unavailable;
    expect(sum).toBe(result.observedCount);
  });

  it("F7: members sorted by platformId regardless of register/report order", () => {
    const { platforms, reporter } = assembleFleet(["zeta", "alpha"]);
    expect(
      reporter.report(
        validSnapshot({
          platformId: "zeta",
          status: "ready",
          affectedCapabilityIds: ["zeta.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    expect(
      reporter.report(
        validSnapshot({
          platformId: "alpha",
          status: "degraded",
          affectedCapabilityIds: ["alpha.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    const result = aggregateFleetHealth({
      platforms,
      observations: reporter,
    });
    expect(result.members.map((m) => m.platformId)).toEqual(["alpha", "zeta"]);
  });

  it("F8: findings sorted by code then path then message", () => {
    const result = aggregateFleetHealthFromMembers([
      { platformId: "Bad-Id", observation: validSnapshot({ status: "ready" }) },
      { platformId: "  ", observation: validSnapshot({ status: "ready" }) },
      {
        platformId: "ok.one",
        observation: validSnapshot({
          platformId: "ok.one",
          status: "healthy" as UmHealthSnapshot["status"],
        }),
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.members).toEqual([]);
    const keys = result.findings.map(
      (f) => `${f.code}|${f.path ?? ""}|${f.message}`,
    );
    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b)));
  });

  it("F9: duplicate bag platformIds fail-closed with no members", () => {
    const result = aggregateFleetHealthFromMembers([
      { platformId: "alpha" },
      { platformId: "alpha" },
    ]);
    expect(result.ok).toBe(false);
    expect(result.members).toEqual([]);
    expect(result.findings.map((f) => f.code)).toContain(
      UmFleetHealthAggregationCode.DUPLICATE_PLATFORM,
    );
  });

  it("F10: invalid / empty platformId fail-closed", () => {
    const empty = aggregateFleetHealthFromMembers([{ platformId: "" }]);
    expect(empty.ok).toBe(false);
    expect(empty.findings.map((f) => f.code)).toContain(
      UmFleetHealthAggregationCode.PLATFORM_ID_REQUIRED,
    );

    const naming = aggregateFleetHealthFromMembers([{ platformId: "Bad-Id" }]);
    expect(naming.ok).toBe(false);
    expect(naming.findings.map((f) => f.code)).toContain(
      UmFleetHealthAggregationCode.PLATFORM_ID_NAMING,
    );
  });

  it("F11: foreign status tokens healthy/unknown rejected — no coercion", () => {
    for (const status of ["healthy", "unknown", "unhealthy"] as const) {
      const result = aggregateFleetHealthFromMembers([
        {
          platformId: "alpha",
          observation: validSnapshot({
            platformId: "alpha",
            status: status as UmHealthSnapshot["status"],
          }),
        },
      ]);
      expect(result.ok).toBe(false);
      expect(result.findings.map((f) => f.code)).toContain(
        UmFleetHealthAggregationCode.STATUS_INVALID,
      );
      expect(result.members).toEqual([]);
    }
  });

  it("F12/F13: expectedReporterUnobservedIds only when reportsStatus true", () => {
    const platforms = createInMemoryPlatformRegistry();
    expect(
      platforms.register({
        manifest: platformManifest("alpha", "ping", {
          reportsStatus: true,
          probeRef: "probe.alpha.health",
        }),
      }).ok,
    ).toBe(true);
    expect(
      platforms.register({
        manifest: platformManifest("beta", "ping", {
          reportsStatus: false,
        }),
      }).ok,
    ).toBe(true);
    const reporter = createInMemoryHealthReporter({ platforms });
    const declarations = createInMemoryHealthRegistry({ platforms });
    expect(
      declarations.register({
        health: {
          platformId: "alpha",
          reportsStatus: true,
          probeRef: "probe.alpha.health",
        },
      }).ok,
    ).toBe(true);
    expect(
      declarations.register({
        health: { platformId: "beta", reportsStatus: false },
      }).ok,
    ).toBe(true);

    const result = aggregateFleetHealth({
      platforms,
      observations: reporter,
      declarations,
    });
    expect(result.expectedReporterUnobservedIds).toEqual(["alpha"]);
    expect(result.expectedReporterUnobservedIds).not.toContain("beta");
    expect(result.unobservedCount).toBe(2);
    expect(result.observedWorstStatus).toBeUndefined();
  });

  it("F14: observation without P10 row listed in undeclaredObservationIds", () => {
    const { platforms, reporter, declarations } = assembleFleet(["alpha"]);
    expect(
      reporter.report(
        validSnapshot({
          platformId: "alpha",
          status: "ready",
          affectedCapabilityIds: ["alpha.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    // declarations catalog empty — observed but undeclared
    const result = aggregateFleetHealth({
      platforms,
      observations: reporter,
      declarations,
    });
    expect(result.undeclaredObservationIds).toEqual(["alpha"]);
    expect(result.statusCounts.ready).toBe(1);
  });

  it("F15: P10 declaration alone does not invent ready", () => {
    const { platforms, reporter, declarations } = assembleFleet(["alpha"]);
    expect(
      declarations.register({
        health: {
          platformId: "alpha",
          reportsStatus: true,
          probeRef: "probe.alpha.health",
        },
      }).ok,
    ).toBe(true);
    const result = aggregateFleetHealth({
      platforms,
      observations: reporter,
      declarations,
    });
    expect(result.observedCount).toBe(0);
    expect(result.statusCounts.ready).toBe(0);
    expect(result.members[0]?.observationStatus).toBeUndefined();
    expect(result.expectedReporterUnobservedIds).toEqual(["alpha"]);
  });

  it("F16/F17: aggregation does not mutate P17 or P10 stores", () => {
    const { platforms, reporter, declarations } = assembleFleet(["alpha"]);
    expect(
      declarations.register({
        health: {
          platformId: "alpha",
          reportsStatus: true,
          probeRef: "probe.alpha.health",
        },
      }).ok,
    ).toBe(true);
    expect(
      reporter.report(
        validSnapshot({
          platformId: "alpha",
          status: "ready",
          affectedCapabilityIds: ["alpha.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    const beforeReporterSize = reporter.size();
    const beforeDeclSize = declarations.size();
    const beforeSnapshot = reporter.getSnapshot("alpha");
    const beforeDecl = declarations.get("alpha");

    aggregateFleetHealth({
      platforms,
      observations: reporter,
      declarations,
    });

    expect(reporter.size()).toBe(beforeReporterSize);
    expect(declarations.size()).toBe(beforeDeclSize);
    expect(reporter.getSnapshot("alpha")).toEqual(beforeSnapshot);
    expect(declarations.get("alpha")).toEqual(beforeDecl);
  });

  it("F18: consecutive aggregates are deep-equal (deterministic)", () => {
    const { platforms, reporter, declarations } = assembleFleet([
      "zeta",
      "alpha",
    ]);
    expect(
      declarations.register({
        health: {
          platformId: "alpha",
          reportsStatus: true,
          probeRef: "probe.alpha.health",
        },
      }).ok,
    ).toBe(true);
    expect(
      reporter.report(
        validSnapshot({
          platformId: "zeta",
          status: "degraded",
          affectedCapabilityIds: ["zeta.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    const a = aggregateFleetHealth({
      platforms,
      observations: reporter,
      declarations,
    });
    const b = aggregateFleetHealth({
      platforms,
      observations: reporter,
      declarations,
    });
    expect(a).toEqual(b);
  });

  it("F19: dependencyStatuses ignored for fleet observedWorstStatus (v1)", () => {
    const { platforms, reporter } = assembleFleet(["alpha"]);
    expect(
      reporter.report(
        validSnapshot({
          platformId: "alpha",
          status: "ready",
          affectedCapabilityIds: ["alpha.core.ping"],
          dependencyStatuses: [{ targetId: "um.core", status: "unavailable" }],
        }),
      ).ok,
    ).toBe(true);
    const result = aggregateFleetHealth({
      platforms,
      observations: reporter,
    });
    expect(result.observedWorstStatus).toBe("ready");
    expect(result.members[0]?.observationStatus).toBe("ready");
  });

  it("F20: facade freeze — aggregator external; health slot remains declaration registry", () => {
    const platforms = createInMemoryPlatformRegistry();
    const health = createInMemoryHealthRegistry({ platforms });
    const registry = createUmCoreRegistry({
      platforms,
      capabilities: createInMemoryCapabilityRegistry({ platforms }),
      events: createInMemoryEventTypeRegistry({ platforms }),
      flags: createInMemoryFlagRegistry({ platforms }),
      dependencies: createInMemoryDependencyRegistry({ platforms }),
      health,
      naming: createInMemoryNamingRegistry({ platforms }),
    });
    const reporter = createInMemoryHealthReporter({ platforms });
    const aggregator = createFleetHealthAggregation({
      platforms,
      observations: reporter,
      declarations: health,
    });

    expect(registry.health).toBe(health);
    expect(Object.keys(registry).sort()).toEqual(
      [
        "capabilities",
        "dependencies",
        "events",
        "flags",
        "health",
        "naming",
        "platforms",
      ].sort(),
    );
    expect(Object.keys(registry)).toHaveLength(7);
    expect("fleet" in registry).toBe(false);
    expect("reporter" in registry).toBe(false);
    expect(typeof aggregator.evaluate).toBe("function");
    expect("poll" in aggregator).toBe(false);
    expect("schedule" in aggregator).toBe(false);
    expect("registerProbe" in aggregator).toBe(false);
    expect("report" in aggregator).toBe(false);
  });

  it("F21: finding codes use health.fleet.* namespace only", () => {
    const result = aggregateFleetHealthFromMembers([
      { platformId: "Bad-Id" },
      { platformId: "dup" },
      { platformId: "dup" },
    ]);
    for (const f of result.findings) {
      expect(f.code.startsWith("health.fleet.")).toBe(true);
      expect(f.code.startsWith("health.report.")).toBe(false);
      expect(f.code.startsWith("health.registry.")).toBe(false);
    }
  });

  it("F22: mapping docs — Core exports only ready|degraded|unavailable (+ absence)", () => {
    const bag: UmFleetHealthMemberInput[] = [
      {
        platformId: "alpha",
        observation: validSnapshot({
          platformId: "alpha",
          status: "ready",
          affectedCapabilityIds: ["alpha.core.ping"],
        }),
      },
      { platformId: "beta" }, // unknown → absence
    ];
    const result = aggregateFleetHealthFromMembers(bag);
    expect(result.ok).toBe(true);
    expect(result.members[0]?.observationStatus).toBe("ready");
    expect(result.members[1]?.observationStatus).toBeUndefined();
    // No foreign tokens appear in result surfaces
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("healthy");
    expect(serialized).not.toContain("unhealthy");
    expect(serialized).not.toContain('"unknown"');
  });

  it("F23: A1 diagnostics lists preferred for expected-unobserved / undeclared", () => {
    const platforms = createInMemoryPlatformRegistry();
    expect(
      platforms.register({
        manifest: platformManifest("alpha", "ping", {
          reportsStatus: true,
          probeRef: "probe.alpha.health",
        }),
      }).ok,
    ).toBe(true);
    expect(
      platforms.register({
        manifest: platformManifest("beta", "ping", { reportsStatus: false }),
      }).ok,
    ).toBe(true);
    const declarations = createInMemoryHealthRegistry({ platforms });
    expect(
      declarations.register({
        health: {
          platformId: "alpha",
          reportsStatus: true,
          probeRef: "probe.alpha.health",
        },
      }).ok,
    ).toBe(true);
    expect(
      declarations.register({
        health: { platformId: "beta", reportsStatus: false },
      }).ok,
    ).toBe(true);
    const reporter = createInMemoryHealthReporter({ platforms });
    expect(
      reporter.report(
        validSnapshot({
          platformId: "beta",
          status: "ready",
          affectedCapabilityIds: ["beta.core.ping"],
        }),
      ).ok,
    ).toBe(true);

    const join = createHealthDiagnosticsJoin({
      platforms,
      declarations,
      observations: reporter,
    }).evaluate();

    const fromPorts = aggregateFleetHealth({
      platforms,
      observations: reporter,
      declarations,
    });
    const fromJoin = aggregateFleetHealth({
      platforms,
      observations: reporter,
      declarations,
      diagnostics: join,
    });

    expect(fromPorts.expectedReporterUnobservedIds).toEqual(["alpha"]);
    expect(fromJoin.expectedReporterUnobservedIds).toEqual(
      join.unobservedReporterPlatformIds,
    );
    expect(fromJoin.statusCounts).toEqual(fromPorts.statusCounts);
    expect(fromJoin.observedWorstStatus).toBe(fromPorts.observedWorstStatus);
  });

  it("F24: unknown platform observation vs P4 fails closed", () => {
    const { platforms, reporter } = assembleFleet(["alpha"]);
    const orphanSource = {
      getSnapshot(platformId: string) {
        if (platformId === "orphan") {
          return validSnapshot({
            platformId: "orphan",
            status: "ready",
            affectedCapabilityIds: ["orphan.core.ping"],
          });
        }
        return reporter.getSnapshot(platformId);
      },
      list() {
        return [
          ...reporter.list(),
          validSnapshot({
            platformId: "orphan",
            status: "ready",
            affectedCapabilityIds: ["orphan.core.ping"],
          }),
        ];
      },
    };
    const result = aggregateFleetHealth({
      platforms,
      observations: orphanSource,
    });
    expect(result.ok).toBe(false);
    expect(result.members).toEqual([]);
    expect(result.findings.map((f) => f.code)).toContain(
      UmFleetHealthAggregationCode.UNKNOWN_PLATFORM,
    );
  });

  it("N1/N2/N3: no monitoring APIs; checkedAt echoed opaquely; no product imports", () => {
    const { platforms, reporter } = assembleFleet(["alpha"]);
    const checkedAt = "2026-08-09T15:30:00.000Z";
    expect(
      reporter.report(
        validSnapshot({
          platformId: "alpha",
          status: "ready",
          checkedAt,
          affectedCapabilityIds: ["alpha.core.ping"],
        }),
      ).ok,
    ).toBe(true);
    const aggregator = createFleetHealthAggregation({
      platforms,
      observations: reporter,
    });
    const result = aggregator.evaluate();
    expect(result.members[0]?.checkedAt).toBe(checkedAt);
    expect(Object.getOwnPropertyNames(aggregator)).toEqual(["evaluate"]);
  });
});
