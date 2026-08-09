/**
 * UM Core public API backward-compatibility guard.
 *
 * TASK: UM_CORE_PLATFORM_PUBLIC_API_BACKWARD_COMPATIBILITY_GUARD_V1
 *
 * Freezes practical contracts from
 * docs/core/UM_CORE_PUBLIC_API_CONTRACT_MATRIX_V1.md against the root barrel.
 * Does not freeze internal modules or redesign production APIs.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as UmCore from "./index";
import type { UmPlatformManifest } from "./manifest/types";

type CompatFixture = {
  readonly schemaVersion: number;
  readonly healthStatuses: readonly string[];
  readonly p12FacadeSlots: readonly string[];
  readonly constants: Readonly<Record<string, string>>;
  readonly maturityLevels: readonly number[];
  readonly codeTables: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
  readonly deterministicIds: {
    readonly buildEventRouteId: {
      readonly args: readonly [string, string];
      readonly result: string;
    };
    readonly buildDependencyEdgeId: {
      readonly args: readonly [string, string, string, string];
      readonly result: string;
    };
  };
  readonly factoryMethods: Readonly<Record<string, readonly string[]>>;
  readonly publicCallables: readonly string[];
};

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "test",
  "publicApiBackwardCompatibility.fixture.json",
);

const fixture = JSON.parse(
  readFileSync(fixturePath, "utf8"),
) as CompatFixture;

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
    nonOwnershipStatement:
      "Does not own money, AI execution, or other platforms.",
    ...overrides,
  };
}

function expectMethods(
  target: object,
  methods: readonly string[],
  label: string,
): void {
  for (const name of methods) {
    const value = (target as Record<string, unknown>)[name];
    expect(value, `${label}.${name}`).toBeTypeOf(
      name === "manifests" || name === "registration" ? "object" : "function",
    );
  }
}

describe("UM Core public API backward-compatibility guard", () => {
  it("keeps every matrix public callable on the root barrel", () => {
    for (const name of fixture.publicCallables) {
      expect(typeof (UmCore as Record<string, unknown>)[name], name).toBe(
        "function",
      );
    }
  });

  it("freezes package identity + phase constants", () => {
    for (const [name, expected] of Object.entries(fixture.constants)) {
      expect((UmCore as Record<string, unknown>)[name], name).toBe(expected);
    }
  });

  it("freezes maturity descriptor levels 0–4", () => {
    expect(UmCore.UM_MATURITY_DESCRIPTORS.map((d) => d.level)).toEqual([
      ...fixture.maturityLevels,
    ]);
  });

  it("freezes stable public result/error code string tables", () => {
    for (const [tableName, expected] of Object.entries(fixture.codeTables)) {
      const actual = (UmCore as Record<string, unknown>)[tableName] as Record<
        string,
        string
      >;
      expect(actual, tableName).toBeTypeOf("object");
      expect(actual, tableName).not.toBeNull();
      expect(Object.keys(actual).sort(), `${tableName} keys`).toEqual(
        Object.keys(expected).sort(),
      );
      for (const [key, value] of Object.entries(expected)) {
        expect(actual[key], `${tableName}.${key}`).toBe(value);
      }
    }
  });

  it("freezes deterministic public id helpers", () => {
    const route = fixture.deterministicIds.buildEventRouteId;
    expect(UmCore.buildEventRouteId(...route.args)).toBe(route.result);
    const edge = fixture.deterministicIds.buildDependencyEdgeId;
    expect(UmCore.buildDependencyEdgeId(...edge.args)).toBe(edge.result);
  });

  it("exposes factory/port method shapes from the public barrel", () => {
    const platforms = UmCore.createInMemoryPlatformRegistry();
    expectMethods(
      platforms,
      fixture.factoryMethods.createInMemoryPlatformRegistry,
      "platforms",
    );

    const capabilities = UmCore.createInMemoryCapabilityRegistry({ platforms });
    expectMethods(
      capabilities,
      fixture.factoryMethods.createInMemoryCapabilityRegistry,
      "capabilities",
    );

    const eventTypes = UmCore.createInMemoryEventTypeRegistry({ platforms });
    expectMethods(
      eventTypes,
      fixture.factoryMethods.createInMemoryEventTypeRegistry,
      "eventTypes",
    );

    const routes = UmCore.createInMemoryEventRoutingRegistry({
      platforms,
      eventTypes,
    });
    expectMethods(
      routes,
      fixture.factoryMethods.createInMemoryEventRoutingRegistry,
      "routes",
    );

    const flags = UmCore.createInMemoryFlagRegistry({ platforms, capabilities });
    expectMethods(
      flags,
      fixture.factoryMethods.createInMemoryFlagRegistry,
      "flags",
    );

    const dependencies = UmCore.createInMemoryDependencyRegistry({
      platforms,
      capabilities,
    });
    expectMethods(
      dependencies,
      fixture.factoryMethods.createInMemoryDependencyRegistry,
      "dependencies",
    );

    const health = UmCore.createInMemoryHealthRegistry({ platforms });
    expectMethods(
      health,
      fixture.factoryMethods.createInMemoryHealthRegistry,
      "health",
    );

    const observations = UmCore.createInMemoryHealthReporter({ platforms });
    expectMethods(
      observations,
      fixture.factoryMethods.createInMemoryHealthReporter,
      "observations",
    );

    const naming = UmCore.createInMemoryNamingRegistry({
      platforms,
      capabilities,
      eventTypes,
      flags,
    });
    expectMethods(
      naming,
      fixture.factoryMethods.createInMemoryNamingRegistry,
      "naming",
    );

    expectMethods(
      UmCore.createManifestValidator(),
      fixture.factoryMethods.createManifestValidator,
      "manifestValidator",
    );
    expectMethods(
      UmCore.createRegistrationValidator(),
      fixture.factoryMethods.createRegistrationValidator,
      "registrationValidator",
    );
    expectMethods(
      UmCore.createComplianceEngine(),
      fixture.factoryMethods.createComplianceEngine,
      "complianceEngine",
    );

    const evaluator = UmCore.createInMemoryFlagEvaluator({ flags });
    expectMethods(
      evaluator,
      fixture.factoryMethods.createInMemoryFlagEvaluator,
      "flagEvaluator",
    );

    const asserter = UmCore.createInMemoryCapabilityAsserter({
      capabilities,
      flags: evaluator,
    });
    expectMethods(
      asserter,
      fixture.factoryMethods.createInMemoryCapabilityAsserter,
      "capabilityAsserter",
    );

    const publisher = UmCore.createInMemoryEventPublisher({ eventTypes });
    expectMethods(
      publisher,
      fixture.factoryMethods.createInMemoryEventPublisher,
      "eventPublisher",
    );

    const join = UmCore.createHealthDiagnosticsJoin({
      platforms,
      declarations: health,
      observations,
    });
    expectMethods(
      join,
      fixture.factoryMethods.createHealthDiagnosticsJoin,
      "diagnosticsJoin",
    );

    const fleet = UmCore.createFleetHealthAggregation({
      platforms,
      observations,
    });
    expectMethods(
      fleet,
      fixture.factoryMethods.createFleetHealthAggregation,
      "fleetAggregation",
    );

    const validator = UmCore.createUmCoreValidator({
      platforms,
      dependencies,
    });
    expectMethods(
      validator,
      fixture.factoryMethods.createUmCoreValidator,
      "coreValidator",
    );

    const sdkFactory = UmCore.createInMemoryUmCoreSdkFactory({
      flags: evaluator,
      capabilities: asserter,
      events: publisher,
      health: observations,
      platforms,
    });
    expectMethods(
      sdkFactory,
      fixture.factoryMethods.createInMemoryUmCoreSdkFactory,
      "sdkFactory",
    );
  });

  it("keeps P12 aggregate facade on the seven-slot frozen shape", () => {
    const platforms = UmCore.createInMemoryPlatformRegistry();
    const capabilities = UmCore.createInMemoryCapabilityRegistry({ platforms });
    const events = UmCore.createInMemoryEventTypeRegistry({ platforms });
    const flags = UmCore.createInMemoryFlagRegistry({ platforms, capabilities });
    const health = UmCore.createInMemoryHealthRegistry({ platforms });
    const dependencies = UmCore.createInMemoryDependencyRegistry({ platforms });
    const naming = UmCore.createInMemoryNamingRegistry({ platforms });

    const registry = UmCore.createUmCoreRegistry({
      platforms,
      capabilities,
      events,
      flags,
      health,
      dependencies,
      naming,
    });

    expect(Object.keys(registry).sort()).toEqual(
      [...fixture.p12FacadeSlots].sort(),
    );
    expect(Object.isFrozen(registry)).toBe(true);
    expect(registry.platforms).toBe(platforms);
    expect(registry.capabilities).toBe(capabilities);
    expect(registry.events).toBe(events);
    expect(registry.flags).toBe(flags);
    expect(registry.health).toBe(health);
    expect(registry.dependencies).toBe(dependencies);
    expect(registry.naming).toBe(naming);
  });

  it("keeps result-returning fail-closed shapes on validation/registry paths", () => {
    const invalid = UmCore.validatePlatformManifest({
      ...validManifest(),
      platformId: "",
    });
    expect(invalid).toEqual(
      expect.objectContaining({
        ok: false,
        findings: expect.any(Array),
      }),
    );
    expect(invalid.findings.length).toBeGreaterThan(0);
    expect(invalid.findings[0]).toEqual(
      expect.objectContaining({
        code: expect.any(String),
        severity: expect.any(String),
        message: expect.any(String),
      }),
    );

    const platforms = UmCore.createInMemoryPlatformRegistry();
    const registered = platforms.register({ manifest: validManifest() });
    expect(registered.ok).toBe(true);
    expect(Array.isArray(registered.findings)).toBe(true);
    expect(registered.record?.platformId).toBe("example");

    const dup = platforms.register({ manifest: validManifest() });
    expect(dup.ok).toBe(false);
    expect(dup.findings.map((f) => f.code)).toContain(
      UmCore.UmRegistryCode.DUPLICATE_PLATFORM_ID,
    );
  });

  it("keeps sorted validation findings deterministic for the same input", () => {
    const manifest = validManifest({ platformId: " ", displayName: " " });
    const a = UmCore.validatePlatformManifest(manifest);
    const b = UmCore.validatePlatformManifest(manifest);
    expect(a.ok).toBe(false);
    expect(a.findings.map((f) => f.code)).toEqual(
      b.findings.map((f) => f.code),
    );
  });

  it("keeps health status taxonomy ready|degraded|unavailable only", () => {
    const platforms = UmCore.createInMemoryPlatformRegistry();
    expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
    const reporter = UmCore.createInMemoryHealthReporter({ platforms });

    for (const status of fixture.healthStatuses) {
      const ok = reporter.report({
        platformId: "example",
        status: status as "ready" | "degraded" | "unavailable",
        checkedAt: "t1",
        affectedCapabilityIds: ["example.core.ping"],
        detail: "ok",
        dependencyStatuses: [],
      });
      expect(ok.ok, status).toBe(true);
    }

    const rejected = reporter.report({
      platformId: "example",
      // @ts-expect-error intentional foreign status for compat guard
      status: "healthy",
      checkedAt: "t2",
      affectedCapabilityIds: ["example.core.ping"],
      detail: "bad",
      dependencyStatuses: [],
    });
    expect(rejected.ok).toBe(false);
    expect(rejected.findings.map((f) => f.code)).toContain(
      UmCore.UmHealthReportCode.STATUS_INVALID,
    );
  });

  it("keeps P17 snapshot reads as defensive clones (readonly contract)", () => {
    const platforms = UmCore.createInMemoryPlatformRegistry();
    expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
    const reporter = UmCore.createInMemoryHealthReporter({ platforms });
    expect(
      reporter.report({
        platformId: "example",
        status: "ready",
        checkedAt: "t1",
        affectedCapabilityIds: ["example.core.ping"],
        detail: "seed",
        dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
      }).ok,
    ).toBe(true);

    const snap = reporter.getSnapshot("example");
    expect(snap).toBeDefined();
    const mutable = snap as unknown as {
      status: string;
      dependencyStatuses: Array<{ status: string }>;
    };
    mutable.status = "unavailable";
    mutable.dependencyStatuses[0]!.status = "unavailable";

    expect(reporter.getSnapshot("example")?.status).toBe("ready");
    expect(reporter.getSnapshot("example")?.dependencyStatuses[0]?.status).toBe(
      "ready",
    );
  });

  it("keeps naming registry snapshot semantics (rebuild required)", () => {
    const platforms = UmCore.createInMemoryPlatformRegistry();
    expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
    const naming = UmCore.createInMemoryNamingRegistry({ platforms });
    expect(naming.has("platform", "example")).toBe(true);

    platforms.clear();
    expect(naming.has("platform", "example")).toBe(true);
    naming.rebuild();
    expect(naming.has("platform", "example")).toBe(false);
  });

  it("keeps P22 capacity create-result discriminated union", () => {
    const platforms = UmCore.createInMemoryPlatformRegistry();
    const invalid = UmCore.createInMemoryHealthObservationHistory({
      platforms,
      capacity: 0,
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.history).toBeUndefined();
      expect(invalid.findings.map((f) => f.code)).toContain(
        UmCore.UmHealthHistoryCode.CAPACITY_INVALID,
      );
    }

    const valid = UmCore.createInMemoryHealthObservationHistory({
      platforms,
      capacity: 2,
    });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.history).toBeDefined();
      expect(typeof valid.history.capacity).toBe("function");
      expect(typeof valid.history.record).toBe("function");
      expect(typeof valid.history.getHistory).toBe("function");
      expect(typeof valid.history.getLatest).toBe("function");
      expect(typeof valid.history.clear).toBe("function");
      expect(valid.history.capacity()).toBe(2);
    }
  });

  it("keeps P21 throw-on-invalid-deps behavioral outlier", () => {
    expect(() =>
      UmCore.createInMemoryUmCoreSdkFactory({
        // @ts-expect-error intentional missing deps for compat guard
        flags: null,
      }),
    ).toThrow(/flags/i);

    expect(() =>
      UmCore.createInMemoryUmCoreSdkFactory({
        flags: { evaluate: () => ({ enabled: false }) } as never,
        capabilities: { assertEnabled: () => ({ enabled: false }) } as never,
        events: { publish: () => ({ ok: false }) } as never,
        health: { report: () => ({ ok: false }) } as never,
        platforms: { register: () => ({ ok: false }) } as never,
      }).createClient({
        serviceId: "",
        platformId: "example",
      }),
    ).toThrow(/serviceId/i);
  });

  it("keeps flag evaluation fail-closed unknown shape", () => {
    const platforms = UmCore.createInMemoryPlatformRegistry();
    const flags = UmCore.createInMemoryFlagRegistry({ platforms });
    const evaluator = UmCore.createInMemoryFlagEvaluator({ flags });
    const result = evaluator.evaluate({ flagId: "missing.flag" });
    expect(result).toEqual({
      flagId: "missing.flag",
      enabled: false,
      reasonCode: UmCore.UmFlagEvaluationCode.UNKNOWN,
      source: "unknown",
    });
  });
});
