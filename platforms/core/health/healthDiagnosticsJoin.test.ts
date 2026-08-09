/**
 * Focused UM Core P18 health diagnostics join tests.
 * DIAGNOSTICS JOIN IS NOT PROBE EXECUTION.
 * ABSENCE OF OBSERVATION IS NOT UNAVAILABLE.
 */

import { describe, expect, it } from "vitest";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  createHealthDiagnosticsJoin,
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

function alphaManifest(): UmPlatformManifest {
  return validManifest({
    platformId: "alpha",
    modules: [
      {
        moduleId: "alpha.core",
        displayName: "Alpha Core",
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
    health: { reportsStatus: false },
  });
}

function assembleJoin(options?: {
  readonly secondPlatform?: boolean;
  readonly exampleReportsStatus?: boolean;
}) {
  const exampleReportsStatus = options?.exampleReportsStatus ?? true;
  const platforms = createInMemoryPlatformRegistry();
  expect(
    platforms.register({
      manifest: validManifest({
        health: exampleReportsStatus
          ? { reportsStatus: true, probeRef: "probe.example.health" }
          : { reportsStatus: false },
      }),
    }).ok,
  ).toBe(true);
  if (options?.secondPlatform) {
    expect(platforms.register({ manifest: alphaManifest() }).ok).toBe(true);
  }

  const declarations = createInMemoryHealthRegistry({ platforms });
  const observations = createInMemoryHealthReporter({ platforms });
  const join = createHealthDiagnosticsJoin({
    platforms,
    declarations,
    observations,
  });
  return { platforms, declarations, observations, join };
}

function registerExampleDeclaration(
  declarations: ReturnType<typeof createInMemoryHealthRegistry>,
  reportsStatus: boolean,
) {
  const result = declarations.register({
    health: reportsStatus
      ? {
          platformId: "example",
          reportsStatus: true,
          probeRef: "probe.example.health",
        }
      : {
          platformId: "example",
          reportsStatus: false,
        },
  });
  expect(result.ok).toBe(true);
  return result;
}

describe("um.core P18 health diagnostics join", () => {
  it("classifies declared_unobserved without inventing unavailable status", () => {
    const { declarations, join } = assembleJoin();
    registerExampleDeclaration(declarations, true);

    const view = join.evaluate();
    expect(view.rows).toHaveLength(1);
    expect(view.rows[0]).toMatchObject({
      platformId: "example",
      registered: true,
      hasDeclaration: true,
      reportsStatus: true,
      hasObservation: false,
      status: null,
      joinClass: "declared_unobserved",
      checkedAt: null,
    });
    expect(view.unobservedReporterPlatformIds).toEqual(["example"]);
    expect(view.statusTally).toEqual({
      ready: 0,
      degraded: 0,
      unavailable: 0,
      unobservedReporters: 1,
    });
  });

  it("classifies declared_and_observed and tallies ready status", () => {
    const { declarations, observations, join } = assembleJoin();
    registerExampleDeclaration(declarations, true);
    expect(observations.report(validSnapshot({ status: "ready" })).ok).toBe(
      true,
    );

    const view = join.evaluate();
    expect(view.rows[0]?.joinClass).toBe("declared_and_observed");
    expect(view.declaredAndObservedPlatformIds).toEqual(["example"]);
    expect(view.statusTally.ready).toBe(1);
    expect(view.statusTally.unobservedReporters).toBe(0);
  });

  it("keeps reportsStatus:false silent when unobserved", () => {
    const { declarations, join } = assembleJoin({
      exampleReportsStatus: false,
    });
    registerExampleDeclaration(declarations, false);

    const view = join.evaluate();
    expect(view.rows[0]?.joinClass).toBe("declared_silent");
    expect(view.unobservedReporterPlatformIds).toEqual([]);
    expect(view.statusTally.unobservedReporters).toBe(0);
  });

  it("allows declared_silent_but_observed (P17 orthogonality)", () => {
    const { declarations, observations, join } = assembleJoin({
      exampleReportsStatus: false,
    });
    registerExampleDeclaration(declarations, false);
    expect(
      observations.report(validSnapshot({ status: "degraded" })).ok,
    ).toBe(true);

    const view = join.evaluate();
    expect(view.rows[0]).toMatchObject({
      joinClass: "declared_silent_but_observed",
      status: "degraded",
      reportsStatus: false,
    });
    expect(view.statusTally.degraded).toBe(1);
  });

  it("classifies observed_undeclared when P10 row is absent", () => {
    const { observations, join } = assembleJoin();
    expect(observations.report(validSnapshot({ status: "unavailable" })).ok).toBe(
      true,
    );

    const view = join.evaluate();
    expect(view.rows[0]?.joinClass).toBe("observed_undeclared");
    expect(view.observedUndeclaredPlatformIds).toEqual(["example"]);
    expect(view.statusTally.unavailable).toBe(1);
  });

  it("classifies registered_only when neither declaration nor observation exist", () => {
    const { join } = assembleJoin();
    const view = join.evaluate();
    expect(view.rows[0]?.joinClass).toBe("registered_only");
    expect(view.rows[0]?.status).toBeNull();
  });

  it("orders rows deterministically by platformId", () => {
    const { platforms, declarations, observations, join } = assembleJoin({
      secondPlatform: true,
    });
    registerExampleDeclaration(declarations, true);
    expect(
      declarations.register({
        health: { platformId: "alpha", reportsStatus: false },
      }).ok,
    ).toBe(true);
    expect(
      observations.report(
        validSnapshot({
          platformId: "example",
          status: "ready",
          affectedCapabilityIds: ["example.core.ping"],
        }),
      ).ok,
    ).toBe(true);

    expect(platforms.size()).toBe(2);
    const view = join.evaluate();
    expect(view.rows.map((row) => row.platformId)).toEqual([
      "alpha",
      "example",
    ]);
    expect(view.rows.map((row) => row.joinClass)).toEqual([
      "declared_silent",
      "declared_and_observed",
    ]);
  });

  it("is side-effect free across repeated evaluate calls", () => {
    const { declarations, observations, join } = assembleJoin();
    registerExampleDeclaration(declarations, true);
    expect(observations.report(validSnapshot()).ok).toBe(true);

    const first = join.evaluate();
    const second = join.evaluate();
    expect(second).toEqual(first);
    expect(observations.size()).toBe(1);
    expect(declarations.size()).toBe(1);
  });

  it("does not expose probe/scheduler/network surfaces", () => {
    const { join } = assembleJoin();
    const surface = join as unknown as Record<string, unknown>;
    expect(surface.registerProbe).toBeUndefined();
    expect(surface.poll).toBeUndefined();
    expect(surface.schedule).toBeUndefined();
    expect(surface.fetch).toBeUndefined();
    expect(typeof join.evaluate).toBe("function");
  });
});
