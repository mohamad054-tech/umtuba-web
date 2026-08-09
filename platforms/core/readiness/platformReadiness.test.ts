/**
 * Focused UM Core P23 platform lifecycle readiness tests.
 *
 * HEALTH STATUS TOKEN "ready" IS NOT LIFECYCLE READINESS.
 * READINESS IS NOT PROBE EXECUTION.
 */

import { describe, expect, it } from "vitest";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  createInMemoryHealthRegistry,
  createInMemoryHealthReporter,
  type UmHealthSnapshot,
} from "../health";
import {
  UM_CORE_PLATFORM_LIFECYCLE_READINESS_PHASE,
  UmPlatformReadinessCode,
  createPlatformReadinessEvaluator,
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

function harness() {
  const platforms = createInMemoryPlatformRegistry();
  const declarations = createInMemoryHealthRegistry({ platforms });
  const observations = createInMemoryHealthReporter({ platforms });
  const readiness = createPlatformReadinessEvaluator({
    platforms,
    declarations,
    observations,
  });
  return { platforms, declarations, observations, readiness };
}

describe("UM Core platform lifecycle readiness foundation P23", () => {
  it("exports local phase constant P23", () => {
    expect(UM_CORE_PLATFORM_LIFECYCLE_READINESS_PHASE).toBe("P23");
  });

  it("R1: registered + compliant + declared reporter + health ready → READY", () => {
    const { platforms, declarations, observations, readiness } = harness();
    expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
    expect(
      declarations.register({
        health: {
          platformId: "example",
          reportsStatus: true,
          probeRef: "probe.example.health",
        },
      }).ok,
    ).toBe(true);
    expect(observations.report(validSnapshot({ status: "ready" })).ok).toBe(
      true,
    );

    const row = readiness.evaluatePlatform("example");
    expect(row.status).toBe("READY");
    expect(row.reasons).toEqual([]);
    expect(row.observationStatus).toBe("ready");
    expect(row.registered).toBe(true);
    expect(row.validationOk).toBe(true);
    expect(row.complianceStatus).toBe("compliant");
  });

  it("R2: BOUNDARY — observation health token ready alone is NOT lifecycle READY", () => {
    const { observations, readiness } = harness();
    // Bypass reporter admission by evaluating orphan observation via list union:
    // report rejects unregistered platforms; simulate orphan via evaluatePlatform
    // on unregistered id with no observation — still NOT_READY.
    const row = readiness.evaluatePlatform("example");
    expect(row.status).toBe("NOT_READY");
    expect(row.reasons.map((r) => r.code)).toContain(
      UmPlatformReadinessCode.NOT_REGISTERED,
    );
    // And even when a registered platform has observation ready but no declaration:
    const h = harness();
    expect(h.platforms.register({ manifest: validManifest() }).ok).toBe(true);
    expect(h.observations.report(validSnapshot({ status: "ready" })).ok).toBe(
      true,
    );
    const undeclared = h.readiness.evaluatePlatform("example");
    expect(undeclared.status).toBe("NOT_READY");
    expect(undeclared.observationStatus).toBe("ready");
    expect(undeclared.reasons.map((r) => r.code)).toContain(
      UmPlatformReadinessCode.HEALTH_UNDECLARED,
    );
  });

  it("R3: unregistered → NOT_READY not_registered (fail-closed)", () => {
    const { readiness } = harness();
    const row = readiness.evaluatePlatform("missing.platform");
    expect(row.status).toBe("NOT_READY");
    expect(row.registered).toBe(false);
    expect(row.reasons.map((r) => r.code)).toEqual([
      UmPlatformReadinessCode.NOT_REGISTERED,
    ]);
  });

  it("R4: declared reporter without observation → NOT_READY health_unobserved", () => {
    const { platforms, declarations, readiness } = harness();
    expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
    expect(
      declarations.register({
        health: {
          platformId: "example",
          reportsStatus: true,
          probeRef: "probe.example.health",
        },
      }).ok,
    ).toBe(true);

    const row = readiness.evaluatePlatform("example");
    expect(row.status).toBe("NOT_READY");
    expect(row.reasons.map((r) => r.code)).toContain(
      UmPlatformReadinessCode.HEALTH_UNOBSERVED,
    );
  });

  it("R5: observation degraded → NOT_READY (healthy/ready token ≠ readiness)", () => {
    const { platforms, declarations, observations, readiness } = harness();
    expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
    expect(
      declarations.register({
        health: {
          platformId: "example",
          reportsStatus: true,
          probeRef: "probe.example.health",
        },
      }).ok,
    ).toBe(true);
    expect(
      observations.report(validSnapshot({ status: "degraded" })).ok,
    ).toBe(true);

    const row = readiness.evaluatePlatform("example");
    expect(row.status).toBe("NOT_READY");
    expect(row.observationStatus).toBe("degraded");
    expect(row.reasons.map((r) => r.code)).toContain(
      UmPlatformReadinessCode.HEALTH_DEGRADED,
    );
  });

  it("R6: observation unavailable → NOT_READY", () => {
    const { platforms, declarations, observations, readiness } = harness();
    expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
    expect(
      declarations.register({
        health: {
          platformId: "example",
          reportsStatus: true,
          probeRef: "probe.example.health",
        },
      }).ok,
    ).toBe(true);
    expect(
      observations.report(validSnapshot({ status: "unavailable" })).ok,
    ).toBe(true);

    const row = readiness.evaluatePlatform("example");
    expect(row.status).toBe("NOT_READY");
    expect(row.reasons.map((r) => r.code)).toContain(
      UmPlatformReadinessCode.HEALTH_UNAVAILABLE,
    );
  });

  it("R7: silent declarer (reportsStatus:false) READY without observation", () => {
    const { platforms, declarations, readiness } = harness();
    expect(
      platforms.register({
        manifest: validManifest({
          health: { reportsStatus: false },
        }),
      }).ok,
    ).toBe(true);
    expect(
      declarations.register({
        health: { platformId: "example", reportsStatus: false },
      }).ok,
    ).toBe(true);

    const row = readiness.evaluatePlatform("example");
    expect(row.status).toBe("READY");
    expect(row.hasObservation).toBe(false);
    expect(row.reasons).toEqual([]);
  });

  it("R8: evaluate() is deterministic, sorted, and side-effect free", () => {
    const { platforms, declarations, observations, readiness } = harness();
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
    expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
    expect(
      declarations.register({
        health: {
          platformId: "example",
          reportsStatus: true,
          probeRef: "probe.example.health",
        },
      }).ok,
    ).toBe(true);
    expect(
      declarations.register({
        health: {
          platformId: "zeta",
          reportsStatus: true,
          probeRef: "probe.example.health",
        },
      }).ok,
    ).toBe(true);
    expect(observations.report(validSnapshot({ status: "ready" })).ok).toBe(
      true,
    );
    expect(
      observations.report(
        validSnapshot({
          platformId: "zeta",
          status: "ready",
          affectedCapabilityIds: ["zeta.core.ping"],
        }),
      ).ok,
    ).toBe(true);

    const a = readiness.evaluate();
    const b = readiness.evaluate();
    expect(a).toEqual(b);
    expect(a.rows.map((r) => r.platformId)).toEqual(["example", "zeta"]);
    expect(a.tally).toEqual({ ready: 2, notReady: 0 });
    expect(platforms.size()).toBe(2);
    expect(declarations.size()).toBe(2);
    expect(observations.size()).toBe(2);
  });

  it("R9: invalid platform id fail-closed with explicit reasons", () => {
    const { readiness } = harness();
    expect(readiness.evaluatePlatform("").status).toBe("NOT_READY");
    expect(readiness.evaluatePlatform("").reasons[0]?.code).toBe(
      UmPlatformReadinessCode.PLATFORM_ID_REQUIRED,
    );
    expect(readiness.evaluatePlatform("Bad-Id").reasons[0]?.code).toBe(
      UmPlatformReadinessCode.PLATFORM_ID_NAMING,
    );
  });

  it("R10: reasons are explicit and sorted; empty fleet is empty view", () => {
    const { readiness } = harness();
    const empty = readiness.evaluate();
    expect(empty.rows).toEqual([]);
    expect(empty.tally).toEqual({ ready: 0, notReady: 0 });

    const { platforms, declarations, observations, readiness: r2 } = harness();
    expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
    // no declaration, no observation
    const row = r2.evaluatePlatform("example");
    expect(row.status).toBe("NOT_READY");
    expect(row.reasons.map((x) => x.code)).toEqual([
      UmPlatformReadinessCode.HEALTH_UNDECLARED,
    ]);
    expect(declarations.size()).toBe(0);
    expect(observations.size()).toBe(0);
  });
});
